import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error(
        'DATABASE_URL environment variable is not configured.'
    );
}

const pool = new Pool({
    connectionString: databaseUrl,
    max: process.env.NODE_ENV === 'production' ? 5 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error);
});

export default pool;