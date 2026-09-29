// Creates the database (if missing), all tables/functions/views and loads sample data.
// Usage: npm run db:setup
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

(async () => {
  try {
    // 1. Connect to the default "postgres" database and create ours if needed
    const admin = new Client({ ...config, database: 'postgres' });
    await admin.connect();
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [process.env.DB_NAME]);
    if (!exists.rows.length) {
      await admin.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
      console.log(`Database "${process.env.DB_NAME}" created`);
    }
    await admin.end();

    // 2. Create schema and load sample data
    const db = new Client({ ...config, database: process.env.DB_NAME });
    await db.connect();
    const dir = path.join(__dirname, '..', '..', 'database');
    await db.query(fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8'));
    console.log('Schema created');
    await db.query(fs.readFileSync(path.join(dir, 'seed.sql'), 'utf8'));
    console.log('Sample data inserted');
    await db.end();
  } catch (err) {
    console.error('Setup failed:', err.message);
    process.exitCode = 1;
  }
})();
