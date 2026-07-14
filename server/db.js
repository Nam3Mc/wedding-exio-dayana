import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
let poolInstance = null;

function createPool() {
    const databaseUrl = process.env.DATABASE_URL?.trim();

    if (!databaseUrl) {
        throw new Error('DATABASE_URL no está definida');
    }

    const parsedPoolMax = Number.parseInt(
        process.env.DB_POOL_MAX || '5',
        10
    );

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false
        },
        max: Number.isInteger(parsedPoolMax) && parsedPoolMax > 0
            ? parsedPoolMax
            : 5,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        allowExitOnIdle: true
    });

    pool.on('error', (error) => {
        console.error('PostgreSQL pool error:', error);
    });

    return pool;
}

function getPool() {
    if (!poolInstance) {
        poolInstance = createPool();
    }

    return poolInstance;
}

const pool = {
    query(...args) {
        return getPool().query(...args);
    },

    connect() {
        return getPool().connect();
    }
};

export default pool;
