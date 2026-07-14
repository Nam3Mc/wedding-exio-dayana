import crypto from 'node:crypto';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { env } from '../config/env.js';
import {
    ADMIN_COOKIE_NAME,
    getAdminCookieOptions,
    requireAdmin
} from '../middleware/auth.js';
import { parseSchema } from '../utils/validation.js';

const router = Router();

const loginSchema = z.object({
    password: z.string().min(1).max(256)
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
        return res.status(429).json({
            error: 'Demasiados intentos. Inténtalo nuevamente en unos minutos.'
        });
    }
});

function safeCompare(left, right) {
    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));

    if (leftBuffer.length !== rightBuffer.length) {
        crypto.timingSafeEqual(leftBuffer, leftBuffer);
        return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

router.post('/login', loginLimiter, (req, res) => {
    const parsed = parseSchema(loginSchema, req.body);

    if (!parsed.success) {
        return res.status(400).json({
            error: 'Debes ingresar una contraseña válida.'
        });
    }

    if (!safeCompare(parsed.data.password, env.ADMIN_PASSWORD)) {
        return res.status(401).json({
            error: 'Contraseña incorrecta.'
        });
    }

    const token = jwt.sign(
        {
            role: 'admin'
        },
        env.JWT_SECRET,
        {
            algorithm: 'HS256',
            expiresIn: `${env.ADMIN_SESSION_HOURS}h`,
            issuer: 'wedding-exio-dayana',
            audience: 'wedding-admin',
            subject: 'admin'
        }
    );

    res.cookie(ADMIN_COOKIE_NAME, token, getAdminCookieOptions());

    return res.status(200).json({
        success: true,
        expiresInSeconds: env.ADMIN_SESSION_HOURS * 60 * 60
    });
});

router.get('/session', requireAdmin, (req, res) => {
    return res.status(200).json({
        authenticated: true
    });
});

router.post('/logout', (req, res) => {
    const { maxAge, ...clearCookieOptions } = getAdminCookieOptions();
    res.clearCookie(ADMIN_COOKIE_NAME, clearCookieOptions);

    return res.status(200).json({
        success: true
    });
});

export default router;
