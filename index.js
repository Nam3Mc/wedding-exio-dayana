import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { pool } from './src/config/db.js';
import { env } from './src/config/env.js';
import {
    errorHandler,
    notFoundHandler
} from './src/middleware/error-handler.js';
import {
    noStore,
    requireSameOrigin
} from './src/middleware/security.js';
import adminRoutes from './src/routes/admin.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import publicRoutes from './src/routes/public.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectory = path.join(__dirname, 'public');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    })
);
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false
});

app.use('/api', apiLimiter, noStore, requireSameOrigin);

app.get('/api/health', async (req, res) => {
    const result = await pool.query('SELECT NOW() AS database_time');

    return res.status(200).json({
        status: 'ok',
        database: 'connected',
        databaseTime: result.rows[0].database_time
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/invitations', adminRoutes);
app.use('/api/public', publicRoutes);

app.use('/api', notFoundHandler);

if (!env.isVercel) {
    app.use(express.static(publicDirectory));

    app.get('/', (req, res) => {
        return res.sendFile(path.join(publicDirectory, 'admin.html'));
    });

    app.get('/invitation/:uuid', (req, res) => {
        return res.sendFile(path.join(publicDirectory, 'invitation.html'));
    });
}

app.use(errorHandler);

if (!env.isVercel && !env.isTest) {
    app.listen(env.PORT, () => {
        console.log(`Server running at http://localhost:${env.PORT}`);
    });
}

export default app;
