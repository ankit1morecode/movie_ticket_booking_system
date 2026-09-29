// Upgrades an existing database to the latest schema, keeping all data.
// Usage: npm run db:migrate
const fs = require('fs');
const path = require('path');
const pool = require('../db');

(async () => {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'migrate.sql'), 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Database upgraded to the latest schema (existing data kept)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
