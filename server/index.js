const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/movies', require('./routes/movies'));
app.use('/api/theatres', require('./routes/theatres'));
app.use('/api/shows', require('./routes/shows'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reports', require('./routes/reports'));

// Central error handler: send DB / validation errors back as JSON
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 400).json({ error: err.message });
});

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
