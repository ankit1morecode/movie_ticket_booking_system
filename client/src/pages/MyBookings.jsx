import { useState } from 'react';
import { api, formatDate, rupees } from '../api';

export default function MyBookings() {
  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState(null);
  const [message, setMessage] = useState(null);

  const search = async (e) => {
    e?.preventDefault();
    try {
      setBookings(await api.get(`/bookings?email=${encodeURIComponent(email)}`));
    } catch (err) { setMessage({ error: err.message }); }
  };

  const cancel = async (id) => {
    if (!confirm(`Cancel booking #${id}?`)) return;
    try {
      const r = await api.post(`/bookings/${id}/cancel`);
      setMessage({ success: r.message });
      search();
    } catch (err) { setMessage({ error: err.message }); }
  };

  return (
    <section>
      <h2>My Bookings</h2>
      <form className="filters" onSubmit={search}>
        <input type="email" required placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit">Find</button>
      </form>

      {message?.error && <p className="error">{message.error}</p>}
      {message?.success && <p className="success">{message.success}</p>}

      {bookings && (
        <table>
          <thead>
            <tr><th>#</th><th>Movie</th><th>Theatre</th><th>Show Time</th><th>Seats</th><th>Amount</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.booking_id}>
                <td>{b.booking_id}</td>
                <td>{b.title}</td>
                <td>{b.theatre_name} ({b.screen_name})</td>
                <td>{formatDate(b.start_time)}</td>
                <td>{b.seats}</td>
                <td>{rupees(b.total_amount)}</td>
                <td><span className={`badge ${b.status}`}>{b.status}</span></td>
                <td>
                  {b.status === 'CONFIRMED' && new Date(b.start_time) > new Date() && (
                    <button className="danger" onClick={() => cancel(b.booking_id)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
            {!bookings.length && <tr><td colSpan="8" className="muted">No bookings found.</td></tr>}
          </tbody>
        </table>
      )}
    </section>
  );
}
