import { Router } from 'express';

const allowedStatuses = new Set([
    'CONFIRMED',
    'VIRTUAL',
    'REJECTED'
]);

export default function createPublicRoutes(pool) {
    const router = Router();

    // ============================================================
    // OBTENER INVITACIÓN PÚBLICA
    // ============================================================

    router.get('/invitation/:uuid', async (req, res) => {
        const { uuid } = req.params;

        if (!uuid) {
            return res.status(400).json({
                error: 'El identificador es obligatorio'
            });
        }

        try {
            const invitationResult = await pool.query(
                `
                    SELECT
                        id,
                        primary_guest,
                        is_foreign,
                        expiration_date,
                        group_status,
                        max_attendees,
                        (
                            expiration_date <
                            (
                                CURRENT_TIMESTAMP
                                AT TIME ZONE 'America/Bogota'
                            )::date
                        ) AS is_expired
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

            const invitation =
                invitationResult.rows[0];

            if (
                invitation.group_status === 'PENDING' &&
                invitation.is_expired
            ) {
                await pool.query(
                    `
                        UPDATE invitations
                        SET
                            group_status = 'EXPIRED',
                            updated_at = NOW()
                        WHERE id = $1
                    `,
                    [uuid]
                );

                invitation.group_status = 'EXPIRED';
            }

            const familyResult = await pool.query(
                `
                    SELECT
                        id,
                        name,
                        is_attending
                    FROM family_members
                    WHERE invitation_id = $1
                    ORDER BY id ASC
                `,
                [uuid]
            );

            return res.status(200).json({
                invitation: {
                    id: invitation.id,
                    primary_guest: invitation.primary_guest,
                    is_foreign: invitation.is_foreign,
                    expiration_date: invitation.expiration_date,
                    group_status: invitation.group_status,
                    max_attendees: invitation.max_attendees
                },
                family_members: familyResult.rows
            });
        } catch (error) {
            console.error(
                'Error al obtener invitación pública:',
                error
            );

            return res.status(500).json({
                error: 'Error al obtener invitación'
            });
        }
    });

    // ============================================================
    // RESPONDER INVITACIÓN
    // ============================================================

    router.post('/respond', async (req, res) => {
        const {
            uuid,
            responses,
            status
        } = req.body;

        if (!uuid || !Array.isArray(responses)) {
            return res.status(400).json({
                error: 'Datos inválidos'
            });
        }

        const normalizedResponses = responses.map(
            (response) => ({
                id: response?.id,
                is_attending: response?.is_attending
            })
        );

        const hasInvalidResponse =
            normalizedResponses.some(
                (response) =>
                    !response.id ||
                    typeof response.is_attending !== 'boolean'
            );

        if (hasInvalidResponse) {
            return res.status(400).json({
                error: 'Las respuestas de los acompañantes no son válidas'
            });
        }

        const normalizedStatus =
            typeof status === 'string'
                ? status.toUpperCase()
                : null;

        if (
            normalizedStatus &&
            !allowedStatuses.has(normalizedStatus)
        ) {
            return res.status(400).json({
                error: 'Estado de confirmación inválido'
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
                        (
                            expiration_date <
                            (
                                CURRENT_TIMESTAMP
                                AT TIME ZONE 'America/Bogota'
                            )::date
                        ) AS is_expired
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

            const invitation =
                invitationResult.rows[0];

            if (
                invitation.group_status === 'EXPIRED' ||
                invitation.is_expired
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

            for (const response of normalizedResponses) {
                await client.query(
                    `
                        UPDATE family_members
                        SET is_attending = $1
                        WHERE
                            id = $2
                            AND invitation_id = $3
                    `,
                    [
                        response.is_attending,
                        response.id,
                        uuid
                    ]
                );
            }

            let newStatus = normalizedStatus;

            if (!newStatus) {
                const hasAttendingMember =
                    normalizedResponses.some(
                        (response) =>
                            response.is_attending === true
                    );

                newStatus = hasAttendingMember
                    ? 'CONFIRMED'
                    : 'REJECTED';
            }

            if (
                newStatus === 'REJECTED' ||
                newStatus === 'VIRTUAL'
            ) {
                await client.query(
                    `
                        UPDATE family_members
                        SET is_attending = false
                        WHERE invitation_id = $1
                    `,
                    [uuid]
                );
            }

            await client.query(
                `
                    UPDATE invitations
                    SET
                        group_status = $1,
                        updated_at = NOW()
                    WHERE id = $2
                `,
                [
                    newStatus,
                    uuid
                ]
            );

            await client.query('COMMIT');

            return res.status(200).json({
                message: 'Respuesta guardada correctamente',
                status: newStatus
            });
        } catch (error) {
            await client.query('ROLLBACK');

            console.error(
                'Error al procesar respuesta:',
                error
            );

            return res.status(500).json({
                error: 'Error al procesar respuesta'
            });
        } finally {
            client.release();
        }
    });

    return router;
}