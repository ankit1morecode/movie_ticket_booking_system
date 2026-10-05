// Creates the database (if missing), all tables/functions/views and loads sample data.
// WARNING: this resets all data.  Usage: npm run db:setup
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { config } = require('../db');

(async () => {
  try {
    // 1. Local PostgreSQL only: create the database if it doesn't exist
    //    (a hosted database like Supabase already has one)
    if (!process.env.DATABASE_URL) {
      const admin = new Client({ ...config, database: 'postgres' });
      await admin.connect();
      const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [config.database]);
      if (!exists.rows.length) {
        await admin.query(`CREATE DATABASE "${config.database}"`);
        console.log(`Database "${config.database}" created`);
      }
      await admin.end();
    }

    // 2. Create schema and load sample data
    const db = new Client(config);
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
