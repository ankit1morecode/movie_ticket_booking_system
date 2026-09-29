import { useState } from 'react';
import Shows from './pages/Shows';
import SeatBooking from './pages/SeatBooking';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';

const NAV = [
  { key: 'shows', label: 'Movies' },
  { key: 'bookings', label: 'My Bookings' },
  { key: 'admin', label: 'Admin' },
];

function Logo({ onClick }) {
  return (
    <button className="logo" onClick={onClick}>
      <span className="logo-icon">🎬</span> MOVIE<span>Book</span>
    </button>
  );
}

export default function App() {
  const [page, setPage] = useState('shows');
  const [selectedShow, setSelectedShow] = useState(null);

  const go = (p) => {
    setPage(p);
    window.scrollTo(0, 0);
  };
  const openShow = (showId) => {
    setSelectedShow(showId);
    go('book');
  };
  const active = page === 'book' ? 'shows' : page;

  return (
    <div className="app">
      <header className="topbar">
        <Logo onClick={() => go('shows')} />
        <nav>
          {NAV.map((n) => (
            <button key={n.key} className={active === n.key ? 'active' : ''} onClick={() => go(n.key)}>
              {n.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {page === 'shows' && <Shows onSelect={openShow} />}
        {page === 'book' && <SeatBooking showId={selectedShow} onBack={() => go('shows')} />}
        {page === 'bookings' && <div className="container page"><MyBookings /></div>}
        {page === 'admin' && <div className="container page"><Admin /></div>}
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <Logo onClick={() => go('shows')} />
          <nav>
            {NAV.map((n) => <button key={n.key} onClick={() => go(n.key)}>{n.label}</button>)}
          </nav>
          <span className="muted">DBMS Project · PERN Stack</span>
        </div>
      </footer>
    </div>
  );
}
