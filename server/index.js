// Local server: upgrades the database schema, then starts the API.
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./db');
const app = require('./app');

// Bring an older database up to date (safe to run every start, keeps data)
async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'migrate.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Database schema is up to date');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database upgrade failed:', err.message, '\nTry: npm run db:setup');
  } finally {
    client.release();
  }
}

const PORT = process.env.PORT || 5000;
migrate().finally(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
