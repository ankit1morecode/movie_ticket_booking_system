import { useEffect, useMemo, useState } from 'react';
import { api, rupees } from '../api';
import Poster from '../components/Poster';

// ---------- date helpers ----------
const dateKey = (d) => new Date(d).toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDay = (key) => {
  const d = new Date(`${key}T00:00`);
  return {
    day: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
    long: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
  };
};
const year = (d) => (d ? new Date(d).getFullYear() : '');

export default function Shows({ onSelect }) {
  const [movies, setMovies] = useState([]);
  const [shows, setShows] = useState([]);
  const [error, setError] = useState('');

  // hero state
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [heroDate, setHeroDate] = useState('');
  const [heroShow, setHeroShow] = useState(null);

  // filter state
  const [tab, setTab] = useState('now');
  const [filters, setFilters] = useState({ city: '', genre: '', date: '', q: '' });

  useEffect(() => {
    Promise.all([api.get('/movies'), api.get('/shows')])
      .then(([m, s]) => { setMovies(m); setShows(s); })
      .catch((e) => setError(e.message));
  }, []);

  const showsByMovie = useMemo(() => {
    const map = {};
    shows.forEach((s) => (map[s.movie_id] ||= []).push(s));
    return map;
  }, [shows]);

  const nowShowing = movies.filter((m) => showsByMovie[m.movie_id]);
  const comingSoon = movies.filter((m) => !showsByMovie[m.movie_id]);
  const featured = nowShowing[featuredIdx % (nowShowing.length || 1)];

  // auto-rotate the hero banner
  useEffect(() => {
    if (nowShowing.length < 2) return;
    const t = setInterval(() => setFeaturedIdx((i) => (i + 1) % nowShowing.length), 8000);
    return () => clearInterval(t);
  }, [nowShowing.length, featuredIdx]);

  // dates / times for the featured movie
  const featuredShows = featured ? showsByMovie[featured.movie_id] : [];
  const heroDates = [...new Set(featuredShows.map((s) => dateKey(s.start_time)))];
  const activeHeroDate = heroDates.includes(heroDate) ? heroDate : heroDates[0];
  const heroTimes = featuredShows.filter((s) => dateKey(s.start_time) === activeHeroDate);

  const pickFeatured = (movieId) => {
    const idx = nowShowing.findIndex((m) => m.movie_id === movieId);
    if (idx >= 0) setFeaturedIdx(idx);
    setHeroShow(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // filter options
  const cities = [...new Set(shows.map((s) => s.city))];
  const genres = [...new Set(movies.map((m) => m.genre).filter(Boolean))];
  const allDates = [...new Set(shows.map((s) => dateKey(s.start_time)))];
  const setFilter = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  const matchesMovie = (m) =>
    (!filters.genre || m.genre === filters.genre) &&
    (!filters.q || m.title.toLowerCase().includes(filters.q.toLowerCase()));

  // shows of a movie after city/date filters; default to the first day it plays
  const cardShows = (movieId) => {
    let list = (showsByMovie[movieId] || []).filter((s) => !filters.city || s.city === filters.city);
    const day = filters.date || (list[0] && dateKey(list[0].start_time));
    list = list.filter((s) => dateKey(s.start_time) === day);
    return { day, list };
  };

  const grid = (tab === 'now' ? nowShowing : comingSoon)
    .filter(matchesMovie)
    .map((m) => ({ movie: m, ...(tab === 'now' ? cardShows(m.movie_id) : { list: [] }) }))
    .filter((c) => tab === 'soon' || c.list.length); // hide movies with no show for the chosen city/date

  return (
    <>
      {/* ---------- HERO ---------- */}
      {featured && (
        <section className="hero">
          <div className="hero-bg" style={{ backgroundImage: `url("${featured.poster_url}")` }} />
          <div className="container hero-inner">
            <div className="hero-text">
              <span className="hero-year">{year(featured.release_date)}</span>
              <h1>{featured.title}</h1>
              <p className="hero-meta">
                {featured.genre} · {featured.language} · {featured.duration_min} min · <span className="tag">{featured.rating}</span>
              </p>
              <p className="hero-desc">{featured.description}</p>
              <a href="#movies" className="btn">▶ Browse all movies</a>
              <div className="dots">
                {nowShowing.map((m, i) => (
                  <button
                    key={m.movie_id}
                    className={i === featuredIdx % nowShowing.length ? 'dot active' : 'dot'}
                    onClick={() => { setFeaturedIdx(i); setHeroShow(null); }}
                    aria-label={m.title}
                  />
                ))}
              </div>
            </div>
            <Poster src={featured.poster_url} title={featured.title} className="hero-poster" />
          </div>
        </section>
      )}

      {/* ---------- DATE / TIME / BUY BAR ---------- */}
      {featured && (
        <section className="booking-bar">
          <div className="container booking-bar-inner">
            <div>
              <h4>CHOOSE DATE</h4>
              <div className="chips">
                {heroDates.map((d) => (
                  <button
                    key={d}
                    className={`date-chip ${d === activeHeroDate ? 'active' : ''}`}
                    onClick={() => { setHeroDate(d); setHeroShow(null); }}
                  >
                    <small>{fmtDay(d).date}</small>
                    {fmtDay(d).day}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4>CHOOSE TIME</h4>
              <div className="chips">
                {heroTimes.map((s) => (
                  <button
                    key={s.show_id}
                    className={`time-chip ${heroShow === s.show_id ? 'active' : ''}`}
                    disabled={Number(s.available_seats) === 0}
                    title={`${s.theatre_name}, ${s.city} — ${s.screen_name} · from ${rupees(s.base_price)}`}
                    onClick={() => setHeroShow(s.show_id)}
                  >
                    {fmtTime(s.start_time)}
                    <small>{s.theatre_name}</small>
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-lg" disabled={!heroShow} onClick={() => onSelect(heroShow)}>
              Buy ticket
            </button>
          </div>
        </section>
      )}

      {/* ---------- FILTERS + GRID ---------- */}
      <section className="container movies-section" id="movies">
        {error && <p className="error">{error}</p>}

        <div className="filter-bar">
          <button className={`tab ${tab === 'now' ? 'active' : ''}`} onClick={() => setTab('now')}>Now showing</button>
          <button className={`tab ${tab === 'soon' ? 'active' : ''}`} onClick={() => setTab('soon')}>Coming soon</button>
          {tab === 'now' && (
            <>
              <select value={filters.date} onChange={setFilter('date')}>
                <option value="">By date</option>
                {allDates.map((d) => <option key={d} value={d}>{fmtDay(d).long}</option>)}
              </select>
              <select value={filters.city} onChange={setFilter('city')}>
                <option value="">By city</option>
                {cities.map((c) => <option key={c}>{c}</option>)}
              </select>
            </>
          )}
          <select value={filters.genre} onChange={setFilter('genre')}>
            <option value="">By category</option>
            {genres.map((g) => <option key={g}>{g}</option>)}
          </select>
          <div className="search">
            <input placeholder="Search movie" value={filters.q} onChange={setFilter('q')} />
            <span>🔍</span>
          </div>
        </div>

        <div className="movie-grid">
          {grid.map(({ movie: m, day, list }) => {
            return (
              <div key={m.movie_id} className="movie-card">
                <div className="poster-wrap" onClick={() => tab === 'now' && pickFeatured(m.movie_id)}>
                  <Poster src={m.poster_url} title={m.title} />
                  {tab === 'soon' && <span className="badge-soon">Coming soon</span>}
                  <span className="rating-badge">{m.rating}</span>
                </div>
                <h3>{m.title}</h3>
                <p className="muted small">{m.genre} · {m.language} · {m.duration_min} min</p>
                {tab === 'now' && (
                  <>
                    <p className="muted small">{fmtDay(day).long}</p>
                    <div className="times">
                      {list.map((s) => (
                        <button
                          key={s.show_id}
                          className="time-link"
                          disabled={Number(s.available_seats) === 0}
                          title={`${s.theatre_name}, ${s.city} — ${s.screen_name} · ${s.available_seats} seats left`}
                          onClick={() => onSelect(s.show_id)}
                        >
                          {fmtTime(s.start_time)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {!grid.length && <p className="muted center">No movies found.</p>}
      </section>
    </>
  );
}
