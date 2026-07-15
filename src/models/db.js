import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is not configured. Database requests will fail.');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error);
});

export async function testConnection() {
    const result = await pool.query('SELECT NOW() AS current_time');

    return result.rows[0].current_time;
}

export default pool;
