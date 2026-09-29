// Demonstrates concurrent transaction management.
// 10 customers try to book the SAME seat of the SAME show at the same moment.
// Expected result: exactly 1 succeeds, 9 fail with "already booked".
//
// Usage: npm run test:concurrency
const pool = require('../db');
const { bookSeats, cancelBooking } = require('../services/bookingService');

(async () => {
  try {
    const { rows } = await pool.query(`
      SELECT ss.show_id, ss.seat_id, s.row_label || s.seat_number AS label
      FROM show_seats ss
      JOIN shows sh ON sh.show_id = ss.show_id
      JOIN seats s  ON s.seat_id = ss.seat_id
      WHERE ss.status = 'AVAILABLE' AND sh.start_time > NOW()
      ORDER BY ss.show_id, ss.seat_id LIMIT 1`);
    if (!rows.length) throw new Error('No available seat found. Run npm run db:setup first.');
    const { show_id, seat_id, label } = rows[0];

    console.log(`10 users trying to book seat ${label} of show ${show_id} simultaneously...\n`);

    const attempts = Array.from({ length: 10 }, (_, i) =>
      bookSeats({
        name: `Test User ${i + 1}`,
        email: `testuser${i + 1}@example.com`,
        show_id,
        seat_ids: [seat_id],
      })
        .then((b) => ({ user: i + 1, ok: true, booking: b.booking_id }))
        .catch((e) => ({ user: i + 1, ok: false, error: e.message }))
    );

    const results = await Promise.all(attempts);
    results.forEach((r) =>
      console.log(`User ${r.user}: ${r.ok ? `SUCCESS (booking #${r.booking})` : `FAILED - ${r.error}`}`)
    );

    const winners = results.filter((r) => r.ok);
    console.log(`\nSuccessful bookings: ${winners.length} (expected 1)`);

    // Clean up so the test can be run again
    for (const w of winners) await cancelBooking(w.booking);
    console.log('Test booking cancelled, seat released.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await pool.end();
  }
})();
