import 'dotenv/config';

import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';

import auth from './api/auth.js';
import pool from './api/db.js';
import adminRoutes from './api/routes/admin.js';
import publicRoutes from './api/routes/public.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const publicDirectory = path.join(__dirname, 'public');

app.disable('x-powered-by');

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(
    express.json({
        limit: '100kb'
    })
);

app.use(
    express.urlencoded({
        extended: false
    })
);

function passwordsMatch(providedPassword, configuredPassword) {
    const providedBuffer = Buffer.from(providedPassword);
    const configuredBuffer = Buffer.from(configuredPassword);

    if (providedBuffer.length !== configuredBuffer.length) {
        return false;
    }

    return timingSafeEqual(
        providedBuffer,
        configuredBuffer
    );
}

// ============================================================
// PRUEBA SIMPLE DEL SERVIDOR
// ============================================================

app.get('/api/ping', (_req, res) => {
    return res.status(200).json({
        status: 'ok',
        message: 'Servidor Express funcionando'
    });
});

// ============================================================
// PRUEBA DE BASE DE DATOS
// ============================================================

app.get('/api/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');

        return res.status(200).json({
            status: 'ok',
            database: 'connected'
        });
    } catch (error) {
        console.error('Database health check failed:', error);

        return res.status(503).json({
            status: 'error',
            database: 'disconnected'
        });
    }
});

// ============================================================
// LOGIN
// ============================================================

app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
        return res.status(400).json({
            error: 'La contraseña es obligatoria'
        });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminPassword) {
        console.error('ADMIN_PASSWORD is not configured');

        return res.status(500).json({
            error: 'La contraseña administrativa no está configurada'
        });
    }

    if (!jwtSecret) {
        console.error('JWT_SECRET is not configured');

        return res.status(500).json({
            error: 'El secreto JWT no está configurado'
        });
    }

    try {
        if (!passwordsMatch(password, adminPassword)) {
            return res.status(401).json({
                error: 'Contraseña incorrecta'
            });
        }

        const token = jwt.sign(
            {
                admin: true
            },
            jwtSecret,
            {
                expiresIn: '24h'
            }
        );

        return res.status(200).json({
            token
        });
    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
});

// ============================================================
// RUTAS
// ============================================================

app.use(
    '/api/invitations',
    adminRoutes(pool, auth)
);

app.use(
    '/api/public',
    publicRoutes(pool)
);

// ============================================================
// API 404
// ============================================================

app.use('/api', (_req, res) => {
    return res.status(404).json({
        error: 'Ruta API no encontrada'
    });
});

// ============================================================
// ARCHIVOS ESTÁTICOS PARA DESARROLLO LOCAL
// ============================================================

app.use(express.static(publicDirectory));

app.get('/', (_req, res) => {
    return res.sendFile(
        path.join(publicDirectory, 'admin.html')
    );
});

app.get('/admin', (_req, res) => {
    return res.sendFile(
        path.join(publicDirectory, 'admin.html')
    );
});

app.get('/invitation/:uuid', (_req, res) => {
    return res.sendFile(
        path.join(publicDirectory, 'invitation.html')
    );
});

// ============================================================
// PÁGINA NO ENCONTRADA
// ============================================================

app.use((_req, res) => {
    return res.status(404).sendFile(
        path.join(publicDirectory, 'admin.html')
    );
});

// ============================================================
// MANEJADOR DE ERRORES
// ============================================================

app.use((error, _req, res, _next) => {
    console.error('Unhandled server error:', error);

    return res.status(500).json({
        error: 'Error interno del servidor'
    });
});

// ============================================================
// SERVIDOR LOCAL
// ============================================================

const PORT = Number(process.env.PORT) || 3000;

if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(
            `✅ Servidor corriendo en http://localhost:${PORT}`
        );
    });
}

export default app;