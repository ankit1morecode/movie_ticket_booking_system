// Creates all tables/functions/views and loads sample data.
// Usage: npm run db:setup   (database named in .env must already exist)
const fs = require('fs');
const path = require('path');
const pool = require('../db');

(async () => {
  try {
    const dir = path.join(__dirname, '..', '..', 'database');
    await pool.query(fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8'));
    console.log('Schema created');
    await pool.query(fs.readFileSync(path.join(dir, 'seed.sql'), 'utf8'));
    console.log('Sample data inserted');
  } catch (err) {
    console.error('Setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
