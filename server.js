import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import adminRoutes from './src/routes/admin-routes.js';
import invitationRoutes from './src/routes/invitation-routes.js';
import { testConnection } from './src/models/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);
const cookieSecret = process.env.ADMIN_PASSWORD || 'local-wedding-password';

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

app.use(express.urlencoded({
    extended: true,
    limit: '32kb'
}));
app.use(cookieParser(cookieSecret));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', async (req, res) => {
    try {
        const databaseTime = await testConnection();

        return res.json({
            ok: true,
            database: 'connected',
            databaseTime
        });
    } catch (error) {
        console.error('Health check failed:', error);

        return res.status(503).json({
            ok: false,
            database: 'unavailable'
        });
    }
});

app.use(adminRoutes);
app.use(invitationRoutes);

app.use((req, res) => {
    return res.status(404).render('error', {
        title: 'Página no encontrada',
        message: 'La página solicitada no existe.'
    });
});

app.use((error, req, res, next) => {
    console.error('Unhandled application error:', error);

    if (res.headersSent) {
        return next(error);
    }

    return res.status(error.statusCode || 500).render('error', {
        title: 'No fue posible completar la solicitud',
        message: error.message || 'Ocurrió un error interno.'
    });
});

app.listen(port, () => {
    console.log(`Wedding app running at http://localhost:${port}`);
});

export default app;
