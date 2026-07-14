import { Router } from 'express';

const MAX_NAME_LENGTH = 150;
const MAX_COMPANIONS = 20;
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function normalizeName(value) {
    return typeof value === 'string'
        ? value.trim().replace(/\s+/g, ' ')
        : '';
}

function isValidDateString(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsedDate = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === value;
}

function getBogotaDateString() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date());

    const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}`;
}

function handleDatabaseError(error, res, publicMessage) {
    console.error(publicMessage, error);

    if (error?.code === '22P02') {
        return res.status(400).json({
            error: 'El identificador proporcionado no es válido'
        });
    }

    return res.status(500).json({
        error: publicMessage
    });
}

export default function createAdminRoutes(pool, authMiddleware) {
    const router = Router();

    router.use(authMiddleware);

    router.get('/', async (req, res) => {
        try {
            await pool.query(`
                UPDATE invitations
                SET
                    group_status = 'EXPIRED',
                    updated_at = NOW()
                WHERE
                    group_status = 'PENDING'
                    AND expiration_date < (
                        CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota'
                    )::date
            `);

            const { rows } = await pool.query(`
                SELECT
                    i.id,
                    i.primary_guest,
                    i.is_foreign,
                    i.expiration_date,
                    i.group_status,
                    i.created_at,
                    i.updated_at,
                    i.max_attendees,
                    (
                        CASE
                            WHEN i.group_status IN ('CONFIRMED', 'VIRTUAL')
                                THEN 1
                            ELSE 0
                        END
                        + COALESCE((
                            SELECT COUNT(*)::int
                            FROM family_members fm
                            WHERE
                                fm.invitation_id = i.id
                                AND fm.is_attending = true
                        ), 0)
                    )::int AS confirmed_attendees,
                    COALESCE((
                        SELECT COUNT(*)::int
                        FROM family_members fm
                        WHERE fm.invitation_id = i.id
                    ), 0)::int AS total_family_members,
                    (
                        1 + COALESCE((
                            SELECT COUNT(*)::int
                            FROM family_members fm
                            WHERE fm.invitation_id = i.id
                        ), 0)
                    )::int AS total_attendees
                FROM invitations i
                ORDER BY i.created_at DESC
            `);

            return res.json(rows);
        } catch (error) {
            return handleDatabaseError(
                error,
                res,
                'Error al obtener invitaciones'
            );
        }
    });

    router.post('/', async (req, res) => {
        const primaryGuest = normalizeName(req.body?.primary_guest);
        const expirationDate = req.body?.expiration_date;
        const isForeign = req.body?.is_foreign === true;
        const rawFamilyMembers = req.body?.family_members;

        if (!primaryGuest) {
            return res.status(400).json({
                error: 'El invitado principal es obligatorio'
            });
        }

        if (primaryGuest.length > MAX_NAME_LENGTH) {
            return res.status(400).json({
                error: `El nombre del invitado principal no puede superar ${MAX_NAME_LENGTH} caracteres`
            });
        }

        if (
            rawFamilyMembers !== undefined &&
            !Array.isArray(rawFamilyMembers)
        ) {
            return res.status(400).json({
                error: 'Los acompañantes deben enviarse como un arreglo'
            });
        }

        const familyMembers = (rawFamilyMembers || [])
            .map(normalizeName)
            .filter(Boolean);

        if (familyMembers.length > MAX_COMPANIONS) {
            return res.status(400).json({
                error: `No se pueden agregar más de ${MAX_COMPANIONS} acompañantes`
            });
        }

        if (
            familyMembers.some((name) => name.length > MAX_NAME_LENGTH)
        ) {
            return res.status(400).json({
                error: `Cada nombre debe tener máximo ${MAX_NAME_LENGTH} caracteres`
            });
        }

        if (!isValidDateString(expirationDate)) {
            return res.status(400).json({
                error: 'La fecha de expiración no es válida'
            });
        }

        if (expirationDate < getBogotaDateString()) {
            return res.status(400).json({
                error: 'La fecha de expiración no puede estar en el pasado'
            });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const invitationResult = await client.query(
                `
                    INSERT INTO invitations (
                        primary_guest,
                        is_foreign,
                        expiration_date,
                        max_attendees,
                        group_status
                    )
                    VALUES ($1, $2, $3, $4, 'PENDING')
                    RETURNING id
                `,
                [
                    primaryGuest,
                    isForeign,
                    expirationDate,
                    familyMembers.length + 1
                ]
            );

            const invitationId = invitationResult.rows[0].id;

            if (familyMembers.length > 0) {
                const values = [];
                const placeholders = familyMembers.map((name, index) => {
                    const offset = index * 2;
                    values.push(invitationId, name);

                    return `($${offset + 1}, $${offset + 2})`;
                });

                await client.query(
                    `
                        INSERT INTO family_members (invitation_id, name)
                        VALUES ${placeholders.join(', ')}
                    `,
                    values
                );
            }

            await client.query('COMMIT');

            return res.status(201).json({
                id: invitationId,
                message: 'Invitación creada exitosamente'
            });
        } catch (error) {
            await client.query('ROLLBACK');

            return handleDatabaseError(
                error,
                res,
                'Error al crear invitación'
            );
        } finally {
            client.release();
        }
    });

    router.delete('/:id', async (req, res) => {
        const { id } = req.params;

        if (!SAFE_ID_PATTERN.test(id)) {
            return res.status(400).json({
                error: 'El identificador de la invitación no es válido'
            });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            await client.query(
                'DELETE FROM family_members WHERE invitation_id = $1',
                [id]
            );

            const result = await client.query(
                'DELETE FROM invitations WHERE id = $1',
                [id]
            );

            if (result.rowCount === 0) {
                await client.query('ROLLBACK');

                return res.status(404).json({
                    error: 'Invitación no encontrada'
                });
            }

            await client.query('COMMIT');

            return res.json({
                message: 'Invitación eliminada exitosamente'
            });
        } catch (error) {
            await client.query('ROLLBACK');

            return handleDatabaseError(
                error,
                res,
                'Error al eliminar invitación'
            );
        } finally {
            client.release();
        }
    });

    return router;
}
