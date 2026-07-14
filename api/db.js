import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necesario para Neon
  }
});

// Verificar conexión (opcional)
pool.on('connect', () => {
  console.log('✅ Conectado a Neon (PostgreSQL)');
});

export default pool;