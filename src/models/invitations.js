import db from './db.js';

const MAX_NAME_LENGTH = 150;
const MAX_COMPANIONS = 20;
const INVITATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_RESPONSE_STATUSES = new Set([
    'CONFIRMED',
    'VIRTUAL',
    'REJECTED'
]);

function normalizeName(value) {
    return typeof value === 'string'
        ? value.trim().replace(/\s+/g, ' ')
        : '';
}

function normalizeCompanions(value) {
    const rawValues = Array.isArray(value) ? value : [value];

    return rawValues
        .flatMap((item) => String(item ?? '').split(/\r?\n|,/))
        .map(normalizeName)
        .filter(Boolean);
}

function isValidDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getBogotaDate() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function validateInvitationId(id) {
    if (!INVITATION_ID_PATTERN.test(String(id || ''))) {
        const error = new Error('El identificador de la invitación no es válido.');
        error.statusCode = 400;
        throw error;
    }
}

export async function expirePendingInvitations() {
    await db.query(`
        UPDATE invitations
        SET group_status = 'EXPIRED'
        WHERE
            group_status = 'PENDING'
            AND expiration_date < (
                CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota'
            )::date
    `);
}

export async function getAllInvitations() {
    await expirePendingInvitations();

    const result = await db.query(`
        SELECT
            i.id,
            i.primary_guest,
            i.is_foreign,
            i.expiration_date,
            i.group_status,
            i.created_at,
            i.max_attendees,
            COALESCE(COUNT(fm.id), 0)::int AS companion_count,
            COALESCE(COUNT(fm.id) FILTER (WHERE fm.is_attending = true), 0)::int
                AS confirmed_companions
        FROM invitations i
        LEFT JOIN family_members fm
            ON fm.invitation_id = i.id
        GROUP BY i.id
        ORDER BY i.created_at DESC
    `);

    return result.rows.map((invitation) => ({
        ...invitation,
        confirmed_attendees:
            (['CONFIRMED', 'VIRTUAL'].includes(invitation.group_status) ? 1 : 0) +
            invitation.confirmed_companions
    }));
}

export async function createInvitation(input) {
    const primaryGuest = normalizeName(input.primaryGuest);
    const companions = normalizeCompanions(input.companions);
    const expirationDate = input.expirationDate;
    const isForeign = input.isForeign === true;

    if (!primaryGuest) {
        const error = new Error('El invitado principal es obligatorio.');
        error.statusCode = 400;
        throw error;
    }

    if (primaryGuest.length > MAX_NAME_LENGTH) {
        const error = new Error(`El nombre no puede superar ${MAX_NAME_LENGTH} caracteres.`);
        error.statusCode = 400;
        throw error;
    }

    if (companions.length > MAX_COMPANIONS) {
        const error = new Error(`Solo puedes agregar hasta ${MAX_COMPANIONS} acompañantes.`);
        error.statusCode = 400;
        throw error;
    }

    if (companions.some((name) => name.length > MAX_NAME_LENGTH)) {
        const error = new Error(`Cada nombre debe tener máximo ${MAX_NAME_LENGTH} caracteres.`);
        error.statusCode = 400;
        throw error;
    }

    if (!isValidDate(expirationDate) || expirationDate < getBogotaDate()) {
        const error = new Error('Selecciona una fecha de expiración válida.');
        error.statusCode = 400;
        throw error;
    }

    const client = await db.connect();

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
            [primaryGuest, isForeign, expirationDate, companions.length + 1]
        );

        const invitationId = invitationResult.rows[0].id;

        for (const companion of companions) {
            await client.query(
                `
                    INSERT INTO family_members (invitation_id, name)
                    VALUES ($1, $2)
                `,
                [invitationId, companion]
            );
        }

        await client.query('COMMIT');

        return invitationId;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function deleteInvitation(id) {
    validateInvitationId(id);

    const result = await db.query(
        'DELETE FROM invitations WHERE id = $1',
        [id]
    );

    return result.rowCount > 0;
}

export async function getInvitationById(id) {
    validateInvitationId(id);

    await db.query(
        `
            UPDATE invitations
            SET group_status = 'EXPIRED'
            WHERE
                id = $1
                AND group_status = 'PENDING'
                AND expiration_date < (
                    CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota'
                )::date
        `,
        [id]
    );

    const invitationResult = await db.query(
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
        [id]
    );

    if (invitationResult.rowCount === 0) {
        return null;
    }

    const companionResult = await db.query(
        `
            SELECT id, name, is_attending
            FROM family_members
            WHERE invitation_id = $1
            ORDER BY created_at ASC
        `,
        [id]
    );

    return {
        invitation: invitationResult.rows[0],
        companions: companionResult.rows
    };
}

export async function getInvitationGuests(id) {
    validateInvitationId(id);

    const invitationResult = await db.query(
        `
            SELECT
                primary_guest,
                group_status
            FROM invitations
            WHERE id = $1
        `,
        [id]
    );

    if (invitationResult.rowCount === 0) {
        return [];
    }

    const invitation = invitationResult.rows[0];

    const companionResult = await db.query(
        `
            SELECT
                name,
                is_attending
            FROM family_members
            WHERE invitation_id = $1
            ORDER BY created_at
        `,
        [id]
    );

    const guests = [
        {
            name: invitation.primary_guest,
            is_primary: true,
            is_attending:
                invitation.group_status === 'CONFIRMED' ||
                invitation.group_status === 'VIRTUAL'
        }
    ];

    companionResult.rows.forEach((guest) => {
        guests.push({
            name: guest.name,
            is_primary: false,
            is_attending: guest.is_attending
        });
    });

    return guests;
}

export async function respondToInvitation(id, status, attendingCompanionIds = []) {
    validateInvitationId(id);

    const normalizedStatus = String(status || '').toUpperCase();

    if (!ALLOWED_RESPONSE_STATUSES.has(normalizedStatus)) {
        const error = new Error('La respuesta seleccionada no es válida.');
        error.statusCode = 400;
        throw error;
    }

    const selectedIds = Array.isArray(attendingCompanionIds)
        ? attendingCompanionIds.map(String)
        : [String(attendingCompanionIds || '')].filter(Boolean);

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const invitationResult = await client.query(
            `
                SELECT
                    id,
                    group_status,
                    expiration_date < (
                        CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota'
                    )::date AS is_expired
                FROM invitations
                WHERE id = $1
                FOR UPDATE
            `,
            [id]
        );

        if (invitationResult.rowCount === 0) {
            const error = new Error('Invitación no encontrada.');
            error.statusCode = 404;
            throw error;
        }

        const invitation = invitationResult.rows[0];

        if (invitation.group_status === 'EXPIRED' || invitation.is_expired) {
            await client.query(
                "UPDATE invitations SET group_status = 'EXPIRED' WHERE id = $1",
                [id]
            );

            const error = new Error('Esta invitación ya expiró.');
            error.statusCode = 410;
            throw error;
        }

        if (invitation.group_status !== 'PENDING') {
            const error = new Error('Esta invitación ya fue respondida.');
            error.statusCode = 409;
            throw error;
        }

        const companionResult = await client.query(
            `
                SELECT id::text AS id
                FROM family_members
                WHERE invitation_id = $1
                FOR UPDATE
            `,
            [id]
        );

        const validIds = new Set(companionResult.rows.map((row) => row.id));

        if (selectedIds.some((selectedId) => !validIds.has(selectedId))) {
            const error = new Error('Uno de los acompañantes seleccionados no pertenece a esta invitación.');
            error.statusCode = 400;
            throw error;
        }

        await client.query(
            'UPDATE family_members SET is_attending = false WHERE invitation_id = $1',
            [id]
        );

        if (normalizedStatus !== 'REJECTED' && selectedIds.length > 0) {
            await client.query(
                `
                    UPDATE family_members
                    SET is_attending = true
                    WHERE
                        invitation_id = $1
                        AND id = ANY($2::uuid[])
                `,
                [id, selectedIds]
            );
        }

        await client.query(
            'UPDATE invitations SET group_status = $1 WHERE id = $2',
            [normalizedStatus, id]
        );

        await client.query('COMMIT');

        return normalizedStatus;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
