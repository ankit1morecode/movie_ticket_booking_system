import { useEffect, useState } from 'react';
import { api, formatDate, rupees } from '../api';
import Poster from '../components/Poster';

const MAX_TICKETS = 10; // per customer per show (also checked by server + DB trigger)

export default function SeatBooking({ showId, onBack }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [message, setMessage] = useState(null);

  const load = () => api.get(`/shows/${showId}/seats`).then(setData).catch((e) => setMessage({ error: e.message }));

  useEffect(() => { load(); }, [showId]);

  if (!data) return <div className="container page"><p className={message?.error ? 'error' : ''}>{message?.error || 'Loading...'}</p></div>;

  // group seats by row for the seat map
  const rows = {};
  data.seats.forEach((s) => (rows[s.row_label] ||= []).push(s));

  const toggle = (seat) => {
    if (seat.status !== 'AVAILABLE') return;
    const isSelected = selected.some((s) => s.seat_id === seat.seat_id);
    if (!isSelected && selected.length >= MAX_TICKETS) {
      setMessage({ error: `You can select at most ${MAX_TICKETS} seats` });
      return;
    }
    setMessage(null);
    setSelected(isSelected ? selected.filter((s) => s.seat_id !== seat.seat_id) : [...selected, seat]);
  };

  const total = selected.reduce((sum, s) => sum + Number(s.price), 0);

  const book = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const b = await api.post('/bookings', {
        ...customer,
        show_id: showId,
        seat_ids: selected.map((s) => s.seat_id),
      });
      setMessage({ success: `Booking #${b.booking_id} confirmed! Seats: ${b.seats} · Total ${rupees(b.total_amount)}` });
      setSelected([]);
    } catch (err) {
      // e.g. someone else booked the seat a moment ago
      setMessage({ error: err.message });
      setSelected([]);
    }
    load();
  };

  const { show } = data;
  return (
    <section className="container page">
      <button className="link" onClick={onBack}>← Back to movies</button>
      <div className="show-header">
        <Poster src={show.poster_url} title={show.title} className="show-poster" />
        <div>
          <h2>{show.title}</h2>
          <p className="muted">{show.genre} · {show.language} · {show.duration_min} min · <span className="tag">{show.rating}</span></p>
          <p><b>{show.theatre_name}</b>, {show.city} — {show.screen_name}</p>
          <p>{formatDate(show.start_time)}</p>
          <p className="muted small">Maximum {MAX_TICKETS} tickets per customer for a show.</p>
        </div>
      </div>

      <div className="legend">
        <span><i className="seat SILVER" /> Silver</span>
        <span><i className="seat GOLD" /> Gold</span>
        <span><i className="seat PLATINUM" /> Platinum</span>
        <span><i className="seat BOOKED" /> Booked</span>
        <span><i className="seat selected" /> Selected</span>
      </div>

      <div className="screen">SCREEN THIS WAY</div>
      <div className="seatmap">
        {Object.entries(rows).map(([row, seats]) => (
          <div key={row} className="seat-row">
            <span className="row-label">{row}</span>
            {seats.map((s) => {
              const isSel = selected.some((x) => x.seat_id === s.seat_id);
              return (
                <button
                  key={s.seat_id}
                  className={`seat ${s.status === 'BOOKED' ? 'BOOKED' : s.category} ${isSel ? 'selected' : ''}`}
                  title={`${row}${s.seat_number} · ${s.category} · ${rupees(s.price)}`}
                  disabled={s.status === 'BOOKED'}
                  onClick={() => toggle(s)}
                >
                  {s.seat_number}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {message?.error && <p className="error">{message.error}</p>}
      {message?.success && <p className="success">{message.success}</p>}

      {selected.length > 0 && (
        <form className="card booking-form" onSubmit={book}>
          <p>
            Selected ({selected.length}/{MAX_TICKETS}): <b>{selected.map((s) => s.row_label + s.seat_number).join(', ')}</b> · Total: <b>{rupees(total)}</b>
          </p>
          <input required placeholder="Name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
          <input required type="email" placeholder="Email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
          <input placeholder="Phone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          <button type="submit" className="btn">Confirm Booking</button>
        </form>
      )}
    </section>
  );
}
