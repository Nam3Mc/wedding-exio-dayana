import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import pool from './server/db.js';
import authMiddleware from './server/auth.js';
import createAdminRoutes from './server/routes/admin.js';
import createPublicRoutes from './server/routes/public.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectory = path.join(__dirname, 'public');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

function getSessionHours() {
    const parsedValue = Number.parseInt(
        process.env.ADMIN_SESSION_HOURS || '8',
        10
    );

    if (!Number.isInteger(parsedValue) || parsedValue < 1) {
        return 8;
    }

    return Math.min(parsedValue, 168);
}

function safePasswordMatch(receivedPassword, expectedPassword) {
    const receivedBuffer = Buffer.from(receivedPassword, 'utf8');
    const expectedBuffer = Buffer.from(expectedPassword, 'utf8');

    if (receivedBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');

        return res.json({
            ok: true,
            database: 'connected'
        });
    } catch (error) {
        console.error('Health check error:', error);

        return res.status(503).json({
            ok: false,
            database: 'unavailable',
            error: 'No fue posible conectar con la base de datos'
        });
    }
});

app.post('/api/auth/login', (req, res) => {
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();
    const jwtSecret = process.env.JWT_SECRET?.trim();
    const password = typeof req.body?.password === 'string'
        ? req.body.password
        : '';

    if (!adminPassword || !jwtSecret) {
        console.error(
            'Missing ADMIN_PASSWORD or JWT_SECRET environment variable'
        );

        return res.status(500).json({
            error: 'El servidor no tiene configuradas las credenciales de administración'
        });
    }

    if (!password || !safePasswordMatch(password, adminPassword)) {
        return res.status(401).json({
            error: 'Contraseña incorrecta'
        });
    }

    const sessionHours = getSessionHours();
    const token = jwt.sign(
        {
            admin: true
        },
        jwtSecret,
        {
            expiresIn: `${sessionHours}h`,
            issuer: 'wedding-exio-dayana'
        }
    );

    return res.json({
        token,
        expiresInHours: sessionHours
    });
});

app.use('/api/invitations', createAdminRoutes(pool, authMiddleware));
app.use('/api/public', createPublicRoutes(pool));

app.use('/api', (req, res) => {
    return res.status(404).json({
        error: 'Ruta de API no encontrada'
    });
});

if (!process.env.VERCEL) {
    app.use(express.static(publicDirectory));

    app.get('/', (req, res) => {
        return res.sendFile(path.join(publicDirectory, 'admin.html'));
    });

    app.get('/invitation/:uuid', (req, res) => {
        return res.sendFile(path.join(publicDirectory, 'invitation.html'));
    });
}

app.use((error, req, res, next) => {
    console.error('Unhandled application error:', error);

    if (res.headersSent) {
        return next(error);
    }

    if (error instanceof SyntaxError && error.status === 400) {
        return res.status(400).json({
            error: 'El cuerpo de la solicitud no contiene JSON válido'
        });
    }

    return res.status(500).json({
        error: 'Error interno del servidor'
    });
});

if (!process.env.VERCEL) {
    const port = Number.parseInt(process.env.PORT || '3000', 10);

    app.listen(port, () => {
        console.log(`✅ Servidor corriendo en http://localhost:${port}`);
    });
}

export default app;
