const router = require('express').Router();
const pool = require('../db');

// GET upcoming shows (optional filters: movie_id, city, date)
router.get('/', async (req, res, next) => {
  try {
    const { movie_id, city, date } = req.query;
    const params = [];
    let where = 'WHERE start_time >= NOW()';
    if (movie_id) { params.push(movie_id); where += ` AND movie_id = $${params.length}`; }
    if (city)     { params.push(city);     where += ` AND city = $${params.length}`; }
    if (date)     { params.push(date);     where += ` AND start_time::date = $${params.length}`; }

    const { rows } = await pool.query(
      `SELECT * FROM v_show_details ${where} ORDER BY start_time`, params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST schedule a new show (trigger checks overlap + creates show_seats)
router.post('/', async (req, res, next) => {
  try {
    const { movie_id, screen_id, start_time, base_price } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO shows (movie_id, screen_id, start_time, base_price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [movie_id, screen_id, start_time, base_price]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE a show (only if nobody has booked it)
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT 1 FROM bookings WHERE show_id = $1 AND status = 'CONFIRMED' LIMIT 1", [req.params.id]
    );
    if (rows.length) throw new Error('Cannot delete a show that has confirmed bookings');
    await pool.query('DELETE FROM shows WHERE show_id = $1', [req.params.id]);
    res.json({ message: 'Show deleted' });
  } catch (err) { next(err); }
});

// GET one show + its seat map with live status and price
router.get('/:id/seats', async (req, res, next) => {
  try {
    const show = await pool.query('SELECT * FROM v_show_details WHERE show_id = $1', [req.params.id]);
    if (!show.rows.length) return res.status(404).json({ error: 'Show not found' });

    const seats = await pool.query(
      `SELECT s.seat_id, s.row_label, s.seat_number, s.category, ss.status,
              seat_price(ss.show_id, s.seat_id) AS price
       FROM show_seats ss
       JOIN seats s ON s.seat_id = ss.seat_id
       WHERE ss.show_id = $1
       ORDER BY s.row_label, s.seat_number`,
      [req.params.id]
    );
    res.json({ show: show.rows[0], seats: seats.rows });
  } catch (err) { next(err); }
});

module.exports = router;
