import { Router } from 'express';

import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';
import {
    createInvitationSchema,
    isUuid,
    isValidDateOnly,
    parseSchema
} from '../utils/validation.js';

const router = Router();

router.use(requireAdmin);

router.get('/', async (req, res) => {
    await pool.query(`
        UPDATE invitations
        SET group_status = 'EXPIRED'
        WHERE group_status = 'PENDING'
          AND expiration_date < NOW()
    `);

    const { rows } = await pool.query(`
        SELECT
            i.id,
            i.primary_guest,
            i.is_foreign,
            i.expiration_date,
            i.group_status,
            i.max_attendees,
            i.created_at,
            i.updated_at,
            COUNT(fm.id)::int AS total_family_members,
            COUNT(fm.id) FILTER (WHERE fm.is_attending = TRUE)::int AS confirmed_attendees
        FROM invitations AS i
        LEFT JOIN family_members AS fm
            ON fm.invitation_id = i.id
        GROUP BY i.id
        ORDER BY i.created_at DESC
    `);

    return res.status(200).json(rows);
});

router.post('/', async (req, res) => {
    const parsed = parseSchema(createInvitationSchema, req.body);

    if (!parsed.success) {
        return res.status(400).json({
            error: 'Los datos de la invitación no son válidos.',
            details: parsed.errors
        });
    }

    const {
        primary_guest: primaryGuest,
        family_members: familyMembers,
        is_foreign: isForeign,
        expiration_date: expirationDate,
        max_attendees: requestedMaxAttendees
    } = parsed.data;

    if (!isValidDateOnly(expirationDate)) {
        return res.status(400).json({
            error: 'La fecha de expiración no es válida.'
        });
    }

    const totalGuests = familyMembers.length + 1;
    const maxAttendees = requestedMaxAttendees ?? totalGuests;

    if (maxAttendees < totalGuests) {
        return res.status(400).json({
            error: 'El máximo de asistentes no puede ser menor que el grupo invitado.'
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const expirationCheck = await client.query(
            `
                SELECT
                    (($1::date + TIME '23:59:59.999999')
                    AT TIME ZONE 'America/Bogota') > NOW() AS is_valid
            `,
            [expirationDate]
        );

        if (!expirationCheck.rows[0].is_valid) {
            await client.query('ROLLBACK');

            return res.status(400).json({
                error: 'La fecha límite debe ser posterior al momento actual.'
            });
        }

        const invitationResult = await client.query(
            `
                INSERT INTO invitations (
                    primary_guest,
                    is_foreign,
                    expiration_date,
                    group_status,
                    max_attendees
                )
                VALUES (
                    $1,
                    $2,
                    (($3::date + TIME '23:59:59.999999')
                    AT TIME ZONE 'America/Bogota'),
                    'PENDING',
                    $4
                )
                RETURNING id
            `,
            [primaryGuest, isForeign, expirationDate, maxAttendees]
        );

        const invitationId = invitationResult.rows[0].id;

        await client.query(
            `
                INSERT INTO family_members (invitation_id, name)
                SELECT $1, member_name
                FROM UNNEST($2::text[]) AS members(member_name)
            `,
            [invitationId, familyMembers]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            id: invitationId,
            message: 'Invitación creada exitosamente.'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    if (!isUuid(id)) {
        return res.status(400).json({
            error: 'El identificador de la invitación no es válido.'
        });
    }

    const result = await pool.query(
        'DELETE FROM invitations WHERE id = $1',
        [id]
    );

    if (result.rowCount === 0) {
        return res.status(404).json({
            error: 'Invitación no encontrada.'
        });
    }

    return res.status(200).json({
        message: 'Invitación eliminada exitosamente.'
    });
});

export default router;
