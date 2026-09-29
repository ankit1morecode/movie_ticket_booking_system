import { useEffect, useState } from 'react';
import { api, formatDate, rupees } from '../api';

export default function Shows({ onSelect }) {
  const [shows, setShows] = useState([]);
  const [movies, setMovies] = useState([]);
  const [cities, setCities] = useState([]);
  const [filters, setFilters] = useState({ movie_id: '', city: '', date: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/movies').then(setMovies).catch((e) => setError(e.message));
    api.get('/theatres').then((ts) => setCities([...new Set(ts.map((t) => t.city))])).catch(() => {});
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    api.get(`/shows?${qs}`).then(setShows).catch((e) => setError(e.message));
  }, [filters]);

  const setFilter = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <section>
      <h2>Now Showing</h2>
      {error && <p className="error">{error}</p>}

      <div className="filters">
        <select value={filters.movie_id} onChange={setFilter('movie_id')}>
          <option value="">All movies</option>
          {movies.map((m) => <option key={m.movie_id} value={m.movie_id}>{m.title}</option>)}
        </select>
        <select value={filters.city} onChange={setFilter('city')}>
          <option value="">All cities</option>
          {cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input type="date" value={filters.date} onChange={setFilter('date')} />
      </div>

      <div className="grid">
        {shows.map((s) => (
          <div key={s.show_id} className="card">
            <h3>{s.title}</h3>
            <p className="muted">{s.genre} · {s.language} · {s.duration_min} min · {s.rating}</p>
            <p><b>{s.theatre_name}</b>, {s.city} — {s.screen_name}</p>
            <p>{formatDate(s.start_time)}</p>
            <p>From {rupees(s.base_price)} · <b>{s.available_seats}</b>/{s.total_seats} seats left</p>
            <button disabled={Number(s.available_seats) === 0} onClick={() => onSelect(s.show_id)}>
              {Number(s.available_seats) === 0 ? 'Housefull' : 'Book Seats'}
            </button>
          </div>
        ))}
        {!shows.length && <p className="muted">No upcoming shows found.</p>}
      </div>
    </section>
  );
}
