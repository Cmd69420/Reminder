require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Connection error:', err.message);
  } else {
    console.log('✅ Connected! Server time:', res.rows[0].now);
  }
  pool.end();
});