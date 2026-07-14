import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida');
  // No lanzamos error para que el servidor pueda iniciar, pero fallará en las consultas
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: parseInt(process.env.DB_POOL_MAX, 10) || 5,
});

pool.on('connect', () => {
  console.log('✅ Conectado a Neon (PostgreSQL)');
});

pool.on('error', (err) => {
  console.error('❌ Error en el pool de PostgreSQL:', err);
});

export default pool;