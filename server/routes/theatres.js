const router = require('express').Router();
const pool = require('../db');

// GET theatres with their screens
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*,
             COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
               'screen_id', sc.screen_id,
               'name', sc.name,
               'seats', (SELECT COUNT(*) FROM seats s WHERE s.screen_id = sc.screen_id)
             ) ORDER BY sc.name) FILTER (WHERE sc.screen_id IS NOT NULL), '[]') AS screens
      FROM theatres t
      LEFT JOIN screens sc ON sc.theatre_id = t.theatre_id
      GROUP BY t.theatre_id
      ORDER BY t.name`);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST add a theatre
router.post('/', async (req, res, next) => {
  try {
    const { name, city, address } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO theatres (name, city, address) VALUES ($1, $2, $3) RETURNING *',
      [name, city, address]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// POST add a screen (and its seats) to a theatre - done in ONE transaction
router.post('/:id/screens', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, rows: seatRows, seats_per_row } = req.body;
    if (!(seatRows >= 1 && seatRows <= 26) || !(seats_per_row >= 1 && seats_per_row <= 30)) {
      throw new Error('Rows must be 1-26 and seats per row 1-30');
    }
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO screens (theatre_id, name) VALUES ($1, $2) RETURNING *',
      [req.params.id, name]
    );
    await client.query('SELECT create_seats($1, $2, $3)', [rows[0].screen_id, seatRows, seats_per_row]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
