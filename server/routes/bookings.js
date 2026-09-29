const router = require('express').Router();
const pool = require('../db');
const { bookSeats, cancelBooking } = require('../services/bookingService');

// GET bookings (optionally for one customer email)
router.get('/', async (req, res, next) => {
  try {
    const { email } = req.query;
    const { rows } = email
      ? await pool.query('SELECT * FROM v_booking_details WHERE email = $1 ORDER BY booking_time DESC', [email.toLowerCase()])
      : await pool.query('SELECT * FROM v_booking_details ORDER BY booking_time DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST create a booking
router.post('/', async (req, res, next) => {
  try {
    const booking = await bookSeats(req.body);
    res.status(201).json(booking);
  } catch (err) { next(err); }
});

// POST cancel a booking
router.post('/:id/cancel', async (req, res, next) => {
  try {
    res.json(await cancelBooking(req.params.id));
  } catch (err) { next(err); }
});

module.exports = router;
