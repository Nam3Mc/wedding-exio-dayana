import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

// Importaciones con try/catch para identificar errores
let pool, auth, adminRoutes, publicRoutes;
try {
  pool = (await import('./api/db.js')).default;
  auth = (await import('./api/auth.js')).default;
  adminRoutes = (await import('./api/routes/admin.js')).default;
  publicRoutes = (await import('./api/routes/public.js')).default;
} catch (err) {
  console.error('❌ Error al importar módulos:', err);
  // Si falla, exportamos un app que devuelve error 500 en todas las rutas
  const app = express();
  app.use((req, res) => {
    res.status(500).json({ error: 'Error interno del servidor: ' + err.message });
  });
  export default app;
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Validar variables de entorno
if (!process.env.DATABASE_URL) {
  console.error('❌ FALTA DATABASE_URL en variables de entorno');
}
if (!process.env.JWT_SECRET) {
  console.error('❌ FALTA JWT_SECRET en variables de entorno');
}
if (!process.env.ADMIN_PASSWORD) {
  console.error('❌ FALTA ADMIN_PASSWORD en variables de entorno');
}

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Archivos estáticos (solo para desarrollo local)
app.use(express.static(path.join(__dirname, 'public')));

// ========== RUTAS PARA LOCAL ==========
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/invitation/:uuid', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'invitation.html'));
});

// ========== LOGIN ==========
app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  try {
    if (!process.env.ADMIN_PASSWORD) {
      return res.status(500).json({ error: 'Servidor mal configurado: falta ADMIN_PASSWORD' });
    }
    if (password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign(
        { admin: true },
        process.env.JWT_SECRET || 'fallback_secret',
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

// ========== RUTAS ADMIN ==========
app.use('/api/invitations', adminRoutes(pool, auth));

// ========== RUTAS PÚBLICAS ==========
app.use('/api/public', publicRoutes(pool));

// ========== MANEJADOR DE ERRORES ==========
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