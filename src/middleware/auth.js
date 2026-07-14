import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

export const ADMIN_COOKIE_NAME = 'wedding_admin_session';

export function getAdminCookieOptions() {
    return {
        httpOnly: true,
        secure: env.isProduction || env.isVercel,
        sameSite: 'strict',
        path: '/api',
        maxAge: env.ADMIN_SESSION_HOURS * 60 * 60 * 1000
    };
}

function extractToken(req) {
    const cookieToken = req.cookies?.[ADMIN_COOKIE_NAME];

    if (cookieToken) {
        return cookieToken;
    }

    const authorization = req.get('authorization');

    if (!authorization) {
        return null;
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return null;
    }

    return token;
}

export function requireAdmin(req, res, next) {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({
            error: 'Debes iniciar sesión para continuar.'
        });
    }

    try {
        const payload = jwt.verify(token, env.JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: 'wedding-exio-dayana',
            audience: 'wedding-admin'
        });

        if (payload.role !== 'admin') {
            return res.status(403).json({
                error: 'No tienes permisos para realizar esta acción.'
            });
        }

        req.admin = payload;
        return next();
    } catch (error) {
        const isExpired = error?.name === 'TokenExpiredError';

        return res.status(401).json({
            error: isExpired
                ? 'La sesión expiró. Inicia sesión nuevamente.'
                : 'La sesión no es válida.'
        });
    }
}
