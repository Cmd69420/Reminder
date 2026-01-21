const { Pool } = require('pg');

// Parse the DATABASE_URL
const isRenderDB = process.env.DATABASE_URL?.includes('render.com');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderDB ? {
    rejectUnauthorized: false,
    require: true
  } : false,
  // Add connection timeout settings
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on PostgreSQL client', err);
  process.exit(-1);
});

module.exports = pool;