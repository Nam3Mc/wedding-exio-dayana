import pg from 'pg';

import { env } from './env.js';

const { Pool } = pg;

function isLocalDatabase(connectionString) {
    try {
        const hostname = new URL(connectionString).hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1';
    } catch {
        return false;
    }
}

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: isLocalDatabase(env.DATABASE_URL)
        ? false
        : {
            rejectUnauthorized: false
        },
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
    application_name: 'wedding-exio-dayana'
});

pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error);
});
