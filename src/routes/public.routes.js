import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { pool } from '../config/db.js';
import {
    isUuid,
    parseSchema,
    respondInvitationSchema
} from '../utils/validation.js';

const router = Router();

const responseLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
        return res.status(429).json({
            error: 'Se realizaron demasiadas solicitudes. Inténtalo más tarde.'
        });
    }
});

router.get('/invitation/:uuid', async (req, res) => {
    const { uuid } = req.params;

    if (!isUuid(uuid)) {
        return res.status(400).json({
            error: 'El identificador de la invitación no es válido.'
        });
    }

    await pool.query(
        `
            UPDATE invitations
            SET group_status = 'EXPIRED'
            WHERE id = $1
              AND group_status = 'PENDING'
              AND expiration_date < NOW()
        `,
        [uuid]
    );

    const invitationResult = await pool.query(
        `
            SELECT
                id,
                primary_guest,
                is_foreign,
                expiration_date,
                group_status,
                max_attendees
            FROM invitations
            WHERE id = $1
        `,
        [uuid]
    );

    if (invitationResult.rowCount === 0) {
        return res.status(404).json({
            error: 'Invitación no encontrada.'
        });
    }

    const familyResult = await pool.query(
        `
            SELECT id, name, is_attending
            FROM family_members
            WHERE invitation_id = $1
            ORDER BY name ASC, id ASC
        `,
        [uuid]
    );

    return res.status(200).json({
        invitation: invitationResult.rows[0],
        family_members: familyResult.rows
    });
});

router.post('/respond', responseLimiter, async (req, res) => {
    const parsed = parseSchema(respondInvitationSchema, req.body);

    if (!parsed.success) {
        return res.status(400).json({
            error: 'Los datos de confirmación no son válidos.',
            details: parsed.errors
        });
    }

    const { uuid, status, responses } = parsed.data;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const invitationResult = await client.query(
            `
                SELECT id, is_foreign, group_status, expiration_date
                FROM invitations
                WHERE id = $1
                FOR UPDATE
            `,
            [uuid]
        );

        if (invitationResult.rowCount === 0) {
            await client.query('ROLLBACK');

            return res.status(404).json({
                error: 'Invitación no encontrada.'
            });
        }

        const invitation = invitationResult.rows[0];

        if (invitation.group_status === 'EXPIRED') {
            await client.query('ROLLBACK');

            return res.status(410).json({
                error: 'La invitación ha expirado.'
            });
        }

        if (invitation.group_status !== 'PENDING') {
            await client.query('ROLLBACK');

            return res.status(409).json({
                error: 'Esta invitación ya fue respondida.'
            });
        }

        if (new Date(invitation.expiration_date).getTime() < Date.now()) {
            await client.query(
                `
                    UPDATE invitations
                    SET group_status = 'EXPIRED'
                    WHERE id = $1
                `,
                [uuid]
            );
            await client.query('COMMIT');

            return res.status(410).json({
                error: 'La invitación ha expirado.'
            });
        }

        if (status === 'VIRTUAL' && !invitation.is_foreign) {
            await client.query('ROLLBACK');

            return res.status(400).json({
                error: 'La asistencia virtual no está habilitada para esta invitación.'
            });
        }

        const familyResult = await client.query(
            `
                SELECT id
                FROM family_members
                WHERE invitation_id = $1
                FOR UPDATE
            `,
            [uuid]
        );

        const expectedIds = new Set(
            familyResult.rows.map((member) => String(member.id))
        );
        const responseIds = responses.map((response) => String(response.id));
        const uniqueResponseIds = new Set(responseIds);

        const hasExactMembers =
            expectedIds.size === uniqueResponseIds.size &&
            responseIds.length === uniqueResponseIds.size &&
            [...expectedIds].every((id) => uniqueResponseIds.has(id));

        if (!hasExactMembers) {
            await client.query('ROLLBACK');

            return res.status(400).json({
                error: 'La lista de acompañantes no coincide con la invitación.'
            });
        }

        const normalizedResponses = responses.map((response) => ({
            id: response.id,
            is_attending:
                status === 'REJECTED' ? false : response.is_attending
        }));

        if (normalizedResponses.length > 0) {
            const updateResult = await client.query(
                `
                    UPDATE family_members AS fm
                    SET is_attending = response.is_attending
                    FROM JSONB_TO_RECORDSET($1::jsonb)
                        AS response(id uuid, is_attending boolean)
                    WHERE fm.id = response.id
                      AND fm.invitation_id = $2
                `,
                [JSON.stringify(normalizedResponses), uuid]
            );

            if (updateResult.rowCount !== normalizedResponses.length) {
                throw new Error('Not all family member responses were updated.');
            }
        }

        await client.query(
            `
                UPDATE invitations
                SET group_status = $1
                WHERE id = $2
            `,
            [status, uuid]
        );

        await client.query('COMMIT');

        return res.status(200).json({
            message: 'Respuesta guardada correctamente.',
            status
        });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
});

export default router;
