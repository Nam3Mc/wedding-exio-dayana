import { Router } from 'express';

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const ALLOWED_STATUSES = new Set([
    'CONFIRMED',
    'VIRTUAL',
    'REJECTED'
]);

function isSafeIdentifier(value) {
    return typeof value === 'string' && SAFE_ID_PATTERN.test(value);
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

export default function createPublicRoutes(pool) {
    const router = Router();

    router.get('/invitation/:uuid', async (req, res) => {
        const { uuid } = req.params;

        if (!isSafeIdentifier(uuid)) {
            return res.status(400).json({
                error: 'El identificador de la invitación no es válido'
            });
        }

        try {
            await pool.query(
                `
                    UPDATE invitations
                    SET
                        group_status = 'EXPIRED',
                        updated_at = NOW()
                    WHERE
                        id = $1
                        AND group_status = 'PENDING'
                        AND expiration_date < (
                            CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota'
                        )::date
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
                    error: 'Invitación no encontrada'
                });
            }

            const familyResult = await pool.query(
                `
                    SELECT id, name, is_attending
                    FROM family_members
                    WHERE invitation_id = $1
                `,
                [uuid]
            );

            return res.json({
                invitation: invitationResult.rows[0],
                family_members: familyResult.rows
            });
        } catch (error) {
            return handleDatabaseError(
                error,
                res,
                'Error al obtener invitación'
            );
        }
    });

    router.post('/respond', async (req, res) => {
        const uuid = req.body?.uuid;
        const status = typeof req.body?.status === 'string'
            ? req.body.status.toUpperCase()
            : '';
        const responses = req.body?.responses;

        if (!isSafeIdentifier(uuid)) {
            return res.status(400).json({
                error: 'El identificador de la invitación no es válido'
            });
        }

        if (!ALLOWED_STATUSES.has(status)) {
            return res.status(400).json({
                error: 'Estado de confirmación inválido'
            });
        }

        if (!Array.isArray(responses) || responses.length > 20) {
            return res.status(400).json({
                error: 'Las respuestas de acompañantes no son válidas'
            });
        }

        const normalizedResponses = [];
        const responseIds = new Set();

        for (const response of responses) {
            const responseId = String(response?.id || '');

            if (!isSafeIdentifier(responseId)) {
                return res.status(400).json({
                    error: 'Uno de los acompañantes tiene un identificador inválido'
                });
            }

            if (responseIds.has(responseId)) {
                return res.status(400).json({
                    error: 'Hay acompañantes repetidos en la respuesta'
                });
            }

            responseIds.add(responseId);
            normalizedResponses.push({
                id: responseId,
                isAttending: response?.is_attending === true
            });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const invitationResult = await client.query(
                `
                    SELECT
                        id,
                        group_status,
                        expiration_date,
                        expiration_date < (
                            CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota'
                        )::date AS is_expired
                    FROM invitations
                    WHERE id = $1
                    FOR UPDATE
                `,
                [uuid]
            );

            if (invitationResult.rowCount === 0) {
                await client.query('ROLLBACK');

                return res.status(404).json({
                    error: 'Invitación no encontrada'
                });
            }

            const invitation = invitationResult.rows[0];

            if (
                invitation.group_status === 'EXPIRED' ||
                invitation.is_expired === true
            ) {
                await client.query(
                    `
                        UPDATE invitations
                        SET
                            group_status = 'EXPIRED',
                            updated_at = NOW()
                        WHERE id = $1
                    `,
                    [uuid]
                );
                await client.query('COMMIT');

                return res.status(410).json({
                    error: 'La invitación ha expirado'
                });
            }

            if (invitation.group_status !== 'PENDING') {
                await client.query('ROLLBACK');

                return res.status(409).json({
                    error: 'Esta invitación ya fue respondida'
                });
            }

            const familyResult = await client.query(
                `
                    SELECT id::text AS id
                    FROM family_members
                    WHERE invitation_id = $1
                    FOR UPDATE
                `,
                [uuid]
            );

            const validFamilyIds = new Set(
                familyResult.rows.map((member) => member.id)
            );

            if (
                normalizedResponses.some(
                    (response) => !validFamilyIds.has(response.id)
                )
            ) {
                await client.query('ROLLBACK');

                return res.status(400).json({
                    error: 'La respuesta contiene un acompañante que no pertenece a esta invitación'
                });
            }

            await client.query(
                `
                    UPDATE family_members
                    SET is_attending = false
                    WHERE invitation_id = $1
                `,
                [uuid]
            );

            if (status !== 'REJECTED') {
                for (const response of normalizedResponses) {
                    await client.query(
                        `
                            UPDATE family_members
                            SET is_attending = $1
                            WHERE
                                id = $2
                                AND invitation_id = $3
                        `,
                        [response.isAttending, response.id, uuid]
                    );
                }
            }

            await client.query(
                `
                    UPDATE invitations
                    SET
                        group_status = $1,
                        updated_at = NOW()
                    WHERE id = $2
                `,
                [status, uuid]
            );

            await client.query('COMMIT');

            return res.json({
                message: 'Respuesta guardada correctamente',
                status
            });
        } catch (error) {
            await client.query('ROLLBACK');

            return handleDatabaseError(
                error,
                res,
                'Error al procesar respuesta'
            );
        } finally {
            client.release();
        }
    });

    return router;
}
