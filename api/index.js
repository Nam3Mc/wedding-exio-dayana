import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

import pool from './db.js';
import auth from './auth.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';

// Configurar __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permite peticiones desde cualquier origen
app.use(express.json()); // Parsear JSON

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, '../public')));

// ========== RUTA DE LOGIN (pública) ==========
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

app.get('/invite/:uuid', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/invitation.html'));
});

// ========== RUTAS ADMIN (protegidas) ==========
app.use('/api/invitations', adminRoutes(pool, auth));

// ========== RUTAS PÚBLICAS ==========
app.use('/api/public', publicRoutes(pool));



// ========== MANEJADOR DE ERRORES GENÉRICO ==========
app.use((err, req, res, next) => {
  console.error('Error no capturado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});