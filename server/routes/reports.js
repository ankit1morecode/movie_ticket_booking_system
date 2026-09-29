const router = require('express').Router();
const pool = require('../db');

// Simple analytics using GROUP BY / aggregate queries
router.get('/', async (req, res, next) => {
  try {
    const revenueByMovie = await pool.query(`
      SELECT m.title,
             COUNT(DISTINCT b.booking_id)          AS bookings,
             COUNT(bs.seat_id)                     AS tickets_sold,
             COALESCE(SUM(bs.price), 0)            AS revenue
      FROM movies m
      LEFT JOIN shows sh    ON sh.movie_id = m.movie_id
      LEFT JOIN bookings b  ON b.show_id = sh.show_id AND b.status = 'CONFIRMED'
      LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
      GROUP BY m.movie_id
      ORDER BY revenue DESC`);

    const occupancy = await pool.query(`
      SELECT show_id, title, theatre_name, screen_name, start_time,
             total_seats - available_seats AS booked,
             total_seats,
             ROUND(100.0 * (total_seats - available_seats) / NULLIF(total_seats, 0), 1) AS occupancy_pct
      FROM v_show_details
      ORDER BY start_time`);

    res.json({ revenueByMovie: revenueByMovie.rows, occupancy: occupancy.rows });
  } catch (err) { next(err); }
});

module.exports = router;
