const pool = require('../db');

const MAX_SEATS_PER_BOOKING = 10;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Book seats for a show inside a single transaction.
 *
 * Concurrency control:
 *  - SELECT ... FOR UPDATE takes a row-level lock on the requested show_seats rows.
 *  - If two customers try to book the same seat at the same time, the second
 *    transaction WAITS until the first one commits, then re-reads the row,
 *    sees status = 'BOOKED' and fails. So a seat can never be sold twice.
 *  - Rows are locked in seat_id order so two bookings with overlapping seats
 *    always lock in the same order (prevents deadlocks).
 */
async function bookSeats({ name, email, phone, show_id, seat_ids }) {
  if (!name || !email) throw httpError(400, 'Name and email are required');
  if (!Array.isArray(seat_ids) || seat_ids.length === 0) throw httpError(400, 'Select at least one seat');
  if (seat_ids.length > MAX_SEATS_PER_BOOKING) throw httpError(400, `Maximum ${MAX_SEATS_PER_BOOKING} seats per booking`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create customer or update existing one (UPSERT)
    const cust = await client.query(
      `INSERT INTO customers (name, email, phone) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name,
                                         phone = COALESCE(EXCLUDED.phone, customers.phone)
       RETURNING customer_id`,
      [name, email.toLowerCase(), phone || null]
    );
    const customerId = cust.rows[0].customer_id;

    // 2. Show must exist and must not have started
    const show = await client.query('SELECT start_time FROM shows WHERE show_id = $1', [show_id]);
    if (!show.rows.length) throw httpError(404, 'Show not found');
    if (new Date(show.rows[0].start_time) <= new Date()) throw httpError(400, 'Show has already started');

    // 3. Lock the requested seats (row-level locks)
    const locked = await client.query(
      `SELECT ss.seat_id, ss.status, s.row_label || s.seat_number AS label
       FROM show_seats ss JOIN seats s ON s.seat_id = ss.seat_id
       WHERE ss.show_id = $1 AND ss.seat_id = ANY($2::int[])
       ORDER BY ss.seat_id
       FOR UPDATE OF ss`,
      [show_id, seat_ids]
    );
    if (locked.rows.length !== seat_ids.length) throw httpError(400, 'Some seats do not belong to this show');

    const taken = locked.rows.filter((r) => r.status !== 'AVAILABLE').map((r) => r.label);
    if (taken.length) throw httpError(409, `Seat(s) already booked: ${taken.join(', ')}`);

    // 4. Create booking + booking_seats with computed price
    const booking = await client.query(
      'INSERT INTO bookings (customer_id, show_id) VALUES ($1, $2) RETURNING booking_id',
      [customerId, show_id]
    );
    const bookingId = booking.rows[0].booking_id;

    await client.query(
      `INSERT INTO booking_seats (booking_id, seat_id, price)
       SELECT $1, sid, seat_price($2, sid) FROM UNNEST($3::int[]) AS sid`,
      [bookingId, show_id, seat_ids]
    );

    // 5. Mark seats as booked
    await client.query(
      `UPDATE show_seats SET status = 'BOOKED', booking_id = $1
       WHERE show_id = $2 AND seat_id = ANY($3::int[])`,
      [bookingId, show_id, seat_ids]
    );

    // 6. Total amount
    await client.query(
      `UPDATE bookings SET total_amount =
         (SELECT SUM(price) FROM booking_seats WHERE booking_id = $1)
       WHERE booking_id = $1`,
      [bookingId]
    );

    await client.query('COMMIT');

    const { rows } = await pool.query('SELECT * FROM v_booking_details WHERE booking_id = $1', [bookingId]);
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Cancel a booking and release its seats - also a single transaction. */
async function cancelBooking(bookingId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT b.status, sh.start_time FROM bookings b
       JOIN shows sh ON sh.show_id = b.show_id
       WHERE b.booking_id = $1
       FOR UPDATE OF b`,
      [bookingId]
    );
    if (!rows.length) throw httpError(404, 'Booking not found');
    if (rows[0].status === 'CANCELLED') throw httpError(400, 'Booking is already cancelled');
    if (new Date(rows[0].start_time) <= new Date()) throw httpError(400, 'Cannot cancel after show has started');

    await client.query("UPDATE bookings SET status = 'CANCELLED' WHERE booking_id = $1", [bookingId]);
    await client.query(
      "UPDATE show_seats SET status = 'AVAILABLE', booking_id = NULL WHERE booking_id = $1",
      [bookingId]
    );

    await client.query('COMMIT');
    return { message: 'Booking cancelled, seats released' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { bookSeats, cancelBooking };
