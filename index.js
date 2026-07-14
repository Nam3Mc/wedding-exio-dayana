import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

import pool from './api/db.js';
import auth from './api/auth.js';
import adminRoutes from './api/routes/admin.js';
import publicRoutes from './api/routes/public.js';

dotenv.config();

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

app.use(express.json({
    limit: '100kb'
}));

app.use(express.urlencoded({
    extended: false
}));

// ============================================================
// API
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

app.post('/api/auth/login', async (req, res) => {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
        return res.status(400).json({
            error: 'La contraseña es obligatoria'
        });
    }

    try {
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({
                error: 'Contraseña incorrecta'
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        const token = jwt.sign(
            {
                admin: true
            },
            process.env.JWT_SECRET,
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

app.use('/api/invitations', adminRoutes(pool, auth));
app.use('/api/public', publicRoutes(pool));

// ============================================================
// ARCHIVOS ESTÁTICOS
// ============================================================

app.use(express.static(publicDirectory));

// Página principal.
app.get('/', (_req, res) => {
    return res.sendFile(
        path.join(publicDirectory, 'admin.html')
    );
});

// Ruta alternativa para el administrador.
app.get('/admin', (_req, res) => {
    return res.sendFile(
        path.join(publicDirectory, 'admin.html')
    );
});

// Ruta bonita utilizada por los enlaces creados en admin.html.
app.get('/invitation/:uuid', (_req, res) => {
    return res.sendFile(
        path.join(publicDirectory, 'invitation.html')
    );
});

// ============================================================
// 404
// ============================================================

app.use('/api', (_req, res) => {
    return res.status(404).json({
        error: 'Ruta API no encontrada'
    });
});

app.use((_req, res) => {
    return res.status(404).sendFile(
        path.join(publicDirectory, 'admin.html')
    );
});

// ============================================================
// ERRORES
// ============================================================

app.use((error, _req, res, _next) => {
    console.error('Unhandled server error:', error);

    return res.status(500).json({
        error: 'Error interno del servidor'
    });
});

// ============================================================
// DESARROLLO LOCAL
// ============================================================

const PORT = Number(process.env.PORT) || 3000;

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(
            `✅ Servidor corriendo en http://localhost:${PORT}`
        );
    });
}

export default app;