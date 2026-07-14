import { Router } from 'express';

export default function createAdminRoutes(pool, auth) {
    const router = Router();

    router.use(auth);

    // ============================================================
    // LISTAR INVITACIONES
    // ============================================================

    router.get('/', async (_req, res) => {
        try {
            const query = `
                SELECT
                    i.id,
                    i.primary_guest,
                    i.is_foreign,
                    i.expiration_date,
                    i.group_status,
                    i.created_at,
                    i.updated_at,
                    i.max_attendees,
                    COALESCE(
                        (
                            SELECT COUNT(*)::integer
                            FROM family_members fm
                            WHERE
                                fm.invitation_id = i.id
                                AND fm.is_attending = true
                        ),
                        0
                    ) AS confirmed_attendees,
                    COALESCE(
                        (
                            SELECT COUNT(*)::integer
                            FROM family_members fm
                            WHERE fm.invitation_id = i.id
                        ),
                        0
                    ) AS total_family_members
                FROM invitations i
                ORDER BY i.created_at DESC
            `;

            const { rows } = await pool.query(query);

            return res.status(200).json(rows);
        } catch (error) {
            console.error(
                'Error al obtener invitaciones:',
                error
            );

            return res.status(500).json({
                error: 'Error al obtener invitaciones'
            });
        }
    });

    // ============================================================
    // CREAR INVITACIÓN
    // ============================================================

    router.post('/', async (req, res) => {
        const {
            primary_guest,
            family_members,
            is_foreign,
            expiration_date,
            max_attendees
        } = req.body;

        if (
            typeof primary_guest !== 'string' ||
            !primary_guest.trim()
        ) {
            return res.status(400).json({
                error: 'El invitado principal es obligatorio'
            });
        }

        if (
            !Array.isArray(family_members) ||
            family_members.length === 0
        ) {
            return res.status(400).json({
                error: 'Debe incluir al menos un acompañante'
            });
        }

        if (
            typeof expiration_date !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(expiration_date)
        ) {
            return res.status(400).json({
                error: 'La fecha de expiración no es válida'
            });
        }

        const cleanPrimaryGuest = primary_guest.trim();

        const cleanFamilyMembers = family_members
            .filter((name) => typeof name === 'string')
            .map((name) => name.trim())
            .filter(Boolean);

        if (cleanFamilyMembers.length === 0) {
            return res.status(400).json({
                error: 'Debe incluir al menos un acompañante válido'
            });
        }

        if (cleanPrimaryGuest.length > 150) {
            return res.status(400).json({
                error: 'El nombre del invitado principal es demasiado largo'
            });
        }

        if (
            cleanFamilyMembers.some(
                (name) => name.length > 150
            )
        ) {
            return res.status(400).json({
                error: 'El nombre de un acompañante es demasiado largo'
            });
        }

        const parsedMaxAttendees =
            max_attendees === null ||
            max_attendees === undefined ||
            max_attendees === ''
                ? null
                : Number(max_attendees);

        if (
            parsedMaxAttendees !== null &&
            (
                !Number.isInteger(parsedMaxAttendees) ||
                parsedMaxAttendees < 1
            )
        ) {
            return res.status(400).json({
                error: 'La cantidad máxima de asistentes no es válida'
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
                    cleanPrimaryGuest,
                    is_foreign === true,
                    expiration_date,
                    parsedMaxAttendees
                ]
            );

            const invitationId =
                invitationResult.rows[0].id;

            for (const name of cleanFamilyMembers) {
                await client.query(
                    `
                        INSERT INTO family_members (
                            invitation_id,
                            name
                        )
                        VALUES ($1, $2)
                    `,
                    [
                        invitationId,
                        name
                    ]
                );
            }

            await client.query('COMMIT');

            return res.status(201).json({
                id: invitationId,
                message: 'Invitación creada exitosamente'
            });
        } catch (error) {
            await client.query('ROLLBACK');

            console.error(
                'Error al crear invitación:',
                error
            );

            return res.status(500).json({
                error: 'Error al crear invitación'
            });
        } finally {
            client.release();
        }
    });

    // ============================================================
    // ELIMINAR INVITACIÓN
    // ============================================================

    router.delete('/:id', async (req, res) => {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                error: 'El identificador es obligatorio'
            });
        }

        try {
            const result = await pool.query(
                `
                    DELETE FROM invitations
                    WHERE id = $1
                `,
                [id]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({
                    error: 'Invitación no encontrada'
                });
            }

            return res.status(200).json({
                message: 'Invitación eliminada exitosamente'
            });
        } catch (error) {
            console.error(
                'Error al eliminar invitación:',
                error
            );

            return res.status(500).json({
                error: 'Error al eliminar invitación'
            });
        }
    });

    return router;
}