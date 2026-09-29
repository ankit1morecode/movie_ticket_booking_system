import { useState } from 'react';
import Shows from './pages/Shows';
import SeatBooking from './pages/SeatBooking';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';

export default function App() {
  const [page, setPage] = useState('shows');
  const [selectedShow, setSelectedShow] = useState(null);

  const openShow = (showId) => {
    setSelectedShow(showId);
    setPage('book');
  };

  return (
    <>
      <header>
        <h1>🎬 MovieBook</h1>
        <nav>
          <button className={page === 'shows' || page === 'book' ? 'active' : ''} onClick={() => setPage('shows')}>Shows</button>
          <button className={page === 'bookings' ? 'active' : ''} onClick={() => setPage('bookings')}>My Bookings</button>
          <button className={page === 'admin' ? 'active' : ''} onClick={() => setPage('admin')}>Admin</button>
        </nav>
      </header>
      <main>
        {page === 'shows' && <Shows onSelect={openShow} />}
        {page === 'book' && <SeatBooking showId={selectedShow} onBack={() => setPage('shows')} />}
        {page === 'bookings' && <MyBookings />}
        {page === 'admin' && <Admin />}
      </main>
    </>
  );
}
