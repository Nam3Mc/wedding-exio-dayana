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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos (útil en desarrollo local)
app.use(express.static(path.join(__dirname, 'public')));

// Redirigir raíz a admin.html (opcional)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Servir invitation.html para rutas /invitation/:uuid
app.get('/invitation/:uuid', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'invitation.html'));
});

// ========== LOGIN ==========
app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  try {
    if (password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign(
        { admin: true },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({ token });
    }
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ========== RUTAS ADMIN (protegidas) ==========
app.use('/api/invitations', adminRoutes(pool, auth));

// ========== RUTAS PÚBLICAS ==========
app.use('/api/public', publicRoutes(pool));

// ========== MANEJADOR DE ERRORES GLOBAL ==========
app.use((err, req, res, next) => {
  console.error('Error no capturado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ========== INICIAR SERVIDOR (solo en desarrollo) ==========
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  });
}

// ========== EXPORTAR para Vercel ==========
export default app;