# 🎬 Movie Ticket Booking System (DBMS Project)

A simple **PERN stack** (PostgreSQL, Express, React, Node.js) application that handles
**theatre schedules, seat reservations, pricing, and customer bookings** with
**concurrent transaction management**.

## Features

| Feature | How it is implemented |
|---|---|
| Theatre schedules | `theatres → screens → shows` tables. A trigger computes each show's `end_time` and **rejects overlapping shows** on the same screen. |
| Seat reservations | `seats` (physical seats) + `show_seats` (status of each seat for each show). A trigger auto-creates `show_seats` when a show is added. |
| Pricing | `category_pricing` table (SILVER / GOLD / PLATINUM multipliers) and SQL function `seat_price()` → `base_price × multiplier`, +20% on weekends. |
| Customer bookings | `customers`, `bookings`, `booking_seats`. Book, view by email, and cancel (seats are released). |
| Ticket limit | A customer can hold **max 10 tickets per show** (across all bookings). Enforced in the UI, the API and by the DB trigger `max_tickets_per_customer`. |
| Concurrent transactions | Booking runs in one transaction with `SELECT … FOR UPDATE` row locks, so the same seat can never be sold twice. See `server/scripts/concurrencyTest.js`. |
| Reports | Revenue per movie and occupancy per show using `GROUP BY` / aggregate queries and views. |
| Cinema-style UI | Dark theme with a rotating hero banner, date/time picker with "Buy ticket", poster grid with show times, "Coming soon" tab, filters and search. Posters are stored as `movies.poster_url` (sample data links to Wikipedia posters). |

A full project report is included: `Movie_Ticket_Booking_System_Report.docx`.

## Project structure

```
database/
  schema.sql        tables, constraints, indexes, triggers, functions, views
  seed.sql          sample data
server/             Express + pg REST API
  services/bookingService.js   transactional booking & cancellation logic
  scripts/setupDb.js           creates schema + loads seed data
  scripts/concurrencyTest.js   10 parallel bookings of the same seat demo
client/             React (Vite) frontend
```

## ER overview

```
theatres 1─* screens 1─* seats *─1 category_pricing
movies   1─* shows *─1 screens
shows    1─* show_seats *─1 seats
customers 1─* bookings *─1 shows
bookings 1─* booking_seats *─1 seats
```

## Setup

**Requirements:** Node.js 18+ and PostgreSQL 13+.

### Quick start (from the project root)

```bash
npm run install:all      # installs server + client packages
# copy server/.env.example to server/.env and set DB_PASSWORD
npm run db:setup         # creates database, tables + sample data
npm run server           # terminal 1 -> http://localhost:5000
npm run client           # terminal 2 -> http://localhost:5173
```

### Or step by step

1. Configure and start the backend:
   ```bash
   cd server
   cp .env.example .env      # then put your PostgreSQL password in .env
   npm install
   npm run db:setup          # creates the database, tables + sample data
   npm run dev               # http://localhost:5000
   ```
2. Start the frontend (new terminal):
   ```bash
   cd client
   npm install
   npm run dev               # http://localhost:5173
   ```

## Concurrency demo

```bash
cd server
npm run test:concurrency
```

Ten simulated customers try to book the **same seat at the same time**. Output shows exactly
**1 success and 9 failures** ("Seat(s) already booked"). You can also try it manually: open
the same show in two browser windows, select the same seat in both, and confirm both —
the second one gets an error.

### How it works

```sql
BEGIN;
  SELECT ... FROM show_seats
  WHERE show_id = $1 AND seat_id = ANY($2)
  ORDER BY seat_id
  FOR UPDATE;                    -- lock the seat rows
  -- if any seat is not AVAILABLE -> ROLLBACK
  INSERT INTO bookings ...;
  INSERT INTO booking_seats ...; -- price from seat_price()
  UPDATE show_seats SET status = 'BOOKED' ...;
COMMIT;
```

- The second transaction **waits** on the row lock until the first commits, then sees
  `BOOKED` and rolls back → no double booking (prevents lost update).
- Seats are locked in `seat_id` order → no deadlocks between overlapping bookings.
- Any error → `ROLLBACK`, so the database is never left half-updated (atomicity).

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/movies` | List / add movies |
| GET/POST | `/api/theatres` | List (with screens) / add theatres |
| POST | `/api/theatres/:id/screens` | Add screen + generate seats |
| GET/POST | `/api/shows` | List upcoming shows (filters: `movie_id`, `city`, `date`) / schedule show |
| DELETE | `/api/shows/:id` | Delete a show without bookings |
| GET | `/api/shows/:id/seats` | Seat map with status and price |
| GET | `/api/pricing` · PUT `/api/pricing/:category` | View / update multipliers |
| GET/POST | `/api/bookings` | List (`?email=`) / create booking |
| POST | `/api/bookings/:id/cancel` | Cancel booking |
| GET | `/api/reports` | Revenue and occupancy |
