import { z } from 'zod';

const uuidSchema = z.string().uuid();
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const invitationNameSchema = z
    .string()
    .trim()
    .min(1)
    .max(100);

export const invitationStatusSchema = z.enum([
    'CONFIRMED',
    'VIRTUAL',
    'REJECTED'
]);

export const createInvitationSchema = z.object({
    primary_guest: invitationNameSchema,
    family_members: z
        .array(invitationNameSchema)
        .min(1)
        .max(30),
    is_foreign: z.boolean().default(false),
    expiration_date: dateOnlySchema,
    max_attendees: z
        .number()
        .int()
        .positive()
        .nullable()
        .optional()
});

export const respondInvitationSchema = z.object({
    uuid: uuidSchema,
    status: invitationStatusSchema,
    responses: z
        .array(
            z.object({
                id: uuidSchema,
                is_attending: z.boolean()
            })
        )
        .max(30)
});

export function isUuid(value) {
    return uuidSchema.safeParse(value).success;
}

export function isValidDateOnly(value) {
    if (!dateOnlySchema.safeParse(value).success) {
        return false;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

export function parseSchema(schema, value) {
    const result = schema.safeParse(value);

    if (result.success) {
        return {
            success: true,
            data: result.data
        };
    }

    return {
        success: false,
        errors: result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
        }))
    };
}
