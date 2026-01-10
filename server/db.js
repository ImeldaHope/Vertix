const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/vertix';
const pool = new Pool({ connectionString });

async function migrate() {
  // create users and ledger tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT,
      email TEXT,
      avatar TEXT,
      balance BIGINT DEFAULT 0
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id SERIAL PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      type TEXT,
      amount BIGINT,
      video_id TEXT,
      seconds INTEGER,
      ts_bigint BIGINT,
      meta JSONB
    );
  `);
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  migrate
};
