import 'dotenv/config';

import pg from 'pg';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error(
        'DATABASE_URL environment variable is not configured.'
    );
}

const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1';

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
        rejectUnauthorized: false
    },
    max: isProduction ? 5 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.on('error', (error) => {
    console.error(
        'Unexpected PostgreSQL pool error:',
        error
    );
});

export default pool;