import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),
    DATABASE_URL: z
        .string()
        .min(1, 'DATABASE_URL is required')
        .refine((value) => {
            try {
                const url = new URL(value);
                return ['postgres:', 'postgresql:'].includes(url.protocol);
            } catch {
                return false;
            }
        }, 'DATABASE_URL must be a valid PostgreSQL URL'),
    ADMIN_PASSWORD: z
        .string()
        .min(8, 'ADMIN_PASSWORD must contain at least 8 characters'),
    JWT_SECRET: z
        .string()
        .min(32, 'JWT_SECRET must contain at least 32 characters'),
    PORT: z.coerce.number().int().positive().default(3000),
    ADMIN_SESSION_HOURS: z.coerce.number().int().min(1).max(24).default(8),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
    VERCEL: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    const details = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n');

    throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = Object.freeze({
    ...parsed.data,
    isProduction: parsed.data.NODE_ENV === 'production',
    isTest: parsed.data.NODE_ENV === 'test',
    isVercel: Boolean(parsed.data.VERCEL)
});
