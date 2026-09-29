import { useEffect, useState } from 'react';
import { api, formatDate, rupees } from '../api';

// Reusable little form: fields = [{ name, placeholder, type, options }]
function SimpleForm({ title, fields, onSubmit }) {
  const empty = Object.fromEntries(fields.map((f) => [f.name, '']));
  const [values, setValues] = useState(empty);
  const submit = async (e) => {
    e.preventDefault();
    if (await onSubmit(values)) setValues(empty);
  };
  return (
    <form className="card" onSubmit={submit}>
      <h3>{title}</h3>
      {fields.map((f) =>
        f.options ? (
          <select key={f.name} required value={values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}>
            <option value="">{f.placeholder}</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input
            key={f.name}
            required={!f.optional}
            type={f.type || 'text'}
            placeholder={f.placeholder}
            value={values[f.name]}
            onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
          />
        )
      )}
      <button type="submit">Save</button>
    </form>
  );
}

export default function Admin() {
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [shows, setShows] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [reports, setReports] = useState(null);
  const [message, setMessage] = useState(null);

  const loadAll = () => {
    api.get('/movies').then(setMovies);
    api.get('/theatres').then(setTheatres);
    api.get('/shows').then(setShows);
    api.get('/pricing').then(setPricing);
    api.get('/reports').then(setReports);
  };
  useEffect(loadAll, []);

  // wraps an API call: shows message, reloads data, returns true on success
  const run = async (fn, okText) => {
    try {
      await fn();
      setMessage({ success: okText });
      loadAll();
      return true;
    } catch (err) {
      setMessage({ error: err.message });
      return false;
    }
  };

  const screenOptions = theatres.flatMap((t) =>
    t.screens.map((s) => ({ value: s.screen_id, label: `${t.name} (${t.city}) - ${s.name}` }))
  );

  return (
    <section>
      <h2>Admin Panel</h2>
      {message?.error && <p className="error">{message.error}</p>}
      {message?.success && <p className="success">{message.success}</p>}

      <div className="grid">
        <SimpleForm
          title="Add Movie"
          fields={[
            { name: 'title', placeholder: 'Title' },
            { name: 'genre', placeholder: 'Genre' },
            { name: 'language', placeholder: 'Language' },
            { name: 'duration_min', placeholder: 'Duration (min)', type: 'number' },
            { name: 'rating', placeholder: 'Rating', options: ['U', 'UA', 'A'].map((r) => ({ value: r, label: r })) },
            { name: 'release_date', placeholder: 'Release date', type: 'date', optional: true },
          ]}
          onSubmit={(v) => run(() => api.post('/movies', v), 'Movie added')}
        />

        <SimpleForm
          title="Add Theatre"
          fields={[
            { name: 'name', placeholder: 'Theatre name' },
            { name: 'city', placeholder: 'City' },
            { name: 'address', placeholder: 'Address', optional: true },
          ]}
          onSubmit={(v) => run(() => api.post('/theatres', v), 'Theatre added')}
        />

        <SimpleForm
          title="Add Screen"
          fields={[
            { name: 'theatre_id', placeholder: 'Select theatre', options: theatres.map((t) => ({ value: t.theatre_id, label: `${t.name} (${t.city})` })) },
            { name: 'name', placeholder: 'Screen name' },
            { name: 'rows', placeholder: 'Rows (max 26)', type: 'number' },
            { name: 'seats_per_row', placeholder: 'Seats per row', type: 'number' },
          ]}
          onSubmit={(v) => run(() => api.post(`/theatres/${v.theatre_id}/screens`, v), 'Screen and seats created')}
        />

        <SimpleForm
          title="Schedule Show"
          fields={[
            { name: 'movie_id', placeholder: 'Select movie', options: movies.map((m) => ({ value: m.movie_id, label: m.title })) },
            { name: 'screen_id', placeholder: 'Select screen', options: screenOptions },
            { name: 'start_time', placeholder: 'Start time', type: 'datetime-local' },
            { name: 'base_price', placeholder: 'Base price (₹)', type: 'number' },
          ]}
          onSubmit={(v) => run(() => api.post('/shows', v), 'Show scheduled')}
        />

        <div className="card">
          <h3>Seat Pricing</h3>
          <p className="muted">Price = base price × multiplier (+20% on weekends)</p>
          {pricing.map((p) => (
            <div key={p.category} className="price-row">
              <span>{p.category}</span>
              <input
                type="number"
                step="0.05"
                defaultValue={p.multiplier}
                onBlur={(e) =>
                  e.target.value !== String(p.multiplier) &&
                  run(() => api.put(`/pricing/${p.category}`, { multiplier: e.target.value }), `${p.category} price updated`)
                }
              />
            </div>
          ))}
        </div>
      </div>

      <h3>Upcoming Shows</h3>
      <table>
        <thead>
          <tr><th>ID</th><th>Movie</th><th>Theatre / Screen</th><th>Start</th><th>End</th><th>Base</th><th>Occupancy</th><th></th></tr>
        </thead>
        <tbody>
          {shows.map((s) => (
            <tr key={s.show_id}>
              <td>{s.show_id}</td>
              <td>{s.title}</td>
              <td>{s.theatre_name} / {s.screen_name}</td>
              <td>{formatDate(s.start_time)}</td>
              <td>{formatDate(s.end_time)}</td>
              <td>{rupees(s.base_price)}</td>
              <td>{s.total_seats - s.available_seats}/{s.total_seats}</td>
              <td><button className="danger" onClick={() => run(() => api.del(`/shows/${s.show_id}`), 'Show deleted')}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {reports && (
        <>
          <h3>Revenue by Movie</h3>
          <table>
            <thead><tr><th>Movie</th><th>Bookings</th><th>Tickets</th><th>Revenue</th></tr></thead>
            <tbody>
              {reports.revenueByMovie.map((r) => (
                <tr key={r.title}><td>{r.title}</td><td>{r.bookings}</td><td>{r.tickets_sold}</td><td>{rupees(r.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
