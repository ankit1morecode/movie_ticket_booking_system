-- =====================================================================
--  Movie Ticket Booking System  -  PostgreSQL schema
--  Covers: theatre schedules, seat reservations, pricing,
--          customer bookings, concurrent transaction management
-- =====================================================================

DROP VIEW IF EXISTS v_booking_details, v_show_details CASCADE;
DROP TABLE IF EXISTS booking_seats, bookings, show_seats, shows, seats,
                     screens, theatres, movies, customers, category_pricing CASCADE;

-- ---------------------------------------------------------------------
-- 1. MASTER TABLES
-- ---------------------------------------------------------------------
CREATE TABLE customers (
    customer_id  SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(120) NOT NULL UNIQUE,
    phone        VARCHAR(15),
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE movies (
    movie_id      SERIAL PRIMARY KEY,
    title         VARCHAR(150) NOT NULL,
    genre         VARCHAR(50),
    language      VARCHAR(30),
    duration_min  INT NOT NULL CHECK (duration_min > 0),
    rating        VARCHAR(5) CHECK (rating IN ('U', 'UA', 'A')),
    release_date  DATE
);

CREATE TABLE theatres (
    theatre_id  SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    city        VARCHAR(50)  NOT NULL,
    address     VARCHAR(200)
);

CREATE TABLE screens (
    screen_id   SERIAL PRIMARY KEY,
    theatre_id  INT NOT NULL REFERENCES theatres(theatre_id) ON DELETE CASCADE,
    name        VARCHAR(50) NOT NULL,
    UNIQUE (theatre_id, name)
);

-- Seat categories and their price multiplier (pricing rules)
CREATE TABLE category_pricing (
    category    VARCHAR(10) PRIMARY KEY CHECK (category IN ('SILVER', 'GOLD', 'PLATINUM')),
    multiplier  NUMERIC(4,2) NOT NULL CHECK (multiplier > 0)
);

-- Physical seats inside a screen
CREATE TABLE seats (
    seat_id      SERIAL PRIMARY KEY,
    screen_id    INT NOT NULL REFERENCES screens(screen_id) ON DELETE CASCADE,
    row_label    CHAR(1) NOT NULL,
    seat_number  INT NOT NULL CHECK (seat_number > 0),
    category     VARCHAR(10) NOT NULL REFERENCES category_pricing(category),
    UNIQUE (screen_id, row_label, seat_number)
);

-- ---------------------------------------------------------------------
-- 2. SCHEDULES
-- ---------------------------------------------------------------------
CREATE TABLE shows (
    show_id     SERIAL PRIMARY KEY,
    movie_id    INT NOT NULL REFERENCES movies(movie_id)  ON DELETE CASCADE,
    screen_id   INT NOT NULL REFERENCES screens(screen_id) ON DELETE CASCADE,
    start_time  TIMESTAMP NOT NULL,
    end_time    TIMESTAMP,                       -- filled by trigger
    base_price  NUMERIC(8,2) NOT NULL CHECK (base_price > 0)
);

-- Seat status per show (one row per seat per show).
-- This is the table that gets row-level locked during booking.
CREATE TABLE show_seats (
    show_id     INT NOT NULL REFERENCES shows(show_id) ON DELETE CASCADE,
    seat_id     INT NOT NULL REFERENCES seats(seat_id) ON DELETE CASCADE,
    status      VARCHAR(10) NOT NULL DEFAULT 'AVAILABLE'
                CHECK (status IN ('AVAILABLE', 'BOOKED')),
    booking_id  INT,
    PRIMARY KEY (show_id, seat_id)
);

-- ---------------------------------------------------------------------
-- 3. BOOKINGS
-- ---------------------------------------------------------------------
CREATE TABLE bookings (
    booking_id    SERIAL PRIMARY KEY,
    customer_id   INT NOT NULL REFERENCES customers(customer_id),
    show_id       INT NOT NULL REFERENCES shows(show_id),
    booking_time  TIMESTAMP NOT NULL DEFAULT NOW(),
    total_amount  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status        VARCHAR(10) NOT NULL DEFAULT 'CONFIRMED'
                  CHECK (status IN ('CONFIRMED', 'CANCELLED'))
);

ALTER TABLE show_seats
    ADD CONSTRAINT fk_show_seats_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id);

-- Seats that belong to a booking (kept even after cancellation, for history)
CREATE TABLE booking_seats (
    booking_id  INT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    seat_id     INT NOT NULL REFERENCES seats(seat_id),
    price       NUMERIC(8,2) NOT NULL,
    PRIMARY KEY (booking_id, seat_id)
);

-- Indexes for frequent lookups
CREATE INDEX idx_shows_movie      ON shows(movie_id);
CREATE INDEX idx_shows_start      ON shows(start_time);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);

-- ---------------------------------------------------------------------
-- 4. FUNCTIONS & TRIGGERS
-- ---------------------------------------------------------------------

-- (a) Compute end_time and reject overlapping shows on the same screen
CREATE OR REPLACE FUNCTION trg_show_before_insert() RETURNS TRIGGER AS $$
DECLARE
    dur INT;
BEGIN
    SELECT duration_min INTO dur FROM movies WHERE movie_id = NEW.movie_id;
    -- movie duration + 15 min cleaning gap
    NEW.end_time := NEW.start_time + make_interval(mins => dur + 15);

    IF EXISTS (
        SELECT 1 FROM shows s
        WHERE s.screen_id = NEW.screen_id
          AND s.show_id  <> COALESCE(NEW.show_id, -1)
          AND NEW.start_time < s.end_time
          AND s.start_time  < NEW.end_time
    ) THEN
        RAISE EXCEPTION 'Show timing overlaps with another show on this screen';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER show_before_insert
BEFORE INSERT OR UPDATE ON shows
FOR EACH ROW EXECUTE FUNCTION trg_show_before_insert();

-- (b) When a show is created, create an AVAILABLE show_seat for every seat
CREATE OR REPLACE FUNCTION trg_show_after_insert() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO show_seats (show_id, seat_id)
    SELECT NEW.show_id, seat_id FROM seats WHERE screen_id = NEW.screen_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER show_after_insert
AFTER INSERT ON shows
FOR EACH ROW EXECUTE FUNCTION trg_show_after_insert();

-- (c) Pricing function:
--     price = base_price * category multiplier * 1.20 on weekends (Sat/Sun)
CREATE OR REPLACE FUNCTION seat_price(p_show_id INT, p_seat_id INT)
RETURNS NUMERIC AS $$
    SELECT ROUND(
        sh.base_price * cp.multiplier *
        CASE WHEN EXTRACT(ISODOW FROM sh.start_time) IN (6, 7) THEN 1.20 ELSE 1.00 END
    , 2)
    FROM shows sh
    JOIN seats s            ON s.seat_id = p_seat_id
    JOIN category_pricing cp ON cp.category = s.category
    WHERE sh.show_id = p_show_id;
$$ LANGUAGE sql STABLE;

-- (d) Helper to create a grid of seats for a screen.
--     Last 2 rows = PLATINUM, first 2 rows = SILVER, rest = GOLD
CREATE OR REPLACE FUNCTION create_seats(p_screen_id INT, p_rows INT, p_per_row INT)
RETURNS VOID AS $$
    INSERT INTO seats (screen_id, row_label, seat_number, category)
    SELECT p_screen_id,
           CHR(64 + r),
           n,
           CASE WHEN r > p_rows - 2 THEN 'PLATINUM'
                WHEN r <= 2         THEN 'SILVER'
                ELSE 'GOLD' END
    FROM generate_series(1, p_rows) r, generate_series(1, p_per_row) n;
$$ LANGUAGE sql;

-- ---------------------------------------------------------------------
-- 5. VIEWS
-- ---------------------------------------------------------------------
CREATE VIEW v_show_details AS
SELECT sh.show_id, sh.start_time, sh.end_time, sh.base_price,
       m.movie_id, m.title, m.genre, m.language, m.duration_min, m.rating,
       t.theatre_id, t.name AS theatre_name, t.city,
       sc.screen_id, sc.name AS screen_name,
       COUNT(ss.seat_id) FILTER (WHERE ss.status = 'AVAILABLE') AS available_seats,
       COUNT(ss.seat_id)                                         AS total_seats
FROM shows sh
JOIN movies   m  ON m.movie_id   = sh.movie_id
JOIN screens  sc ON sc.screen_id = sh.screen_id
JOIN theatres t  ON t.theatre_id = sc.theatre_id
LEFT JOIN show_seats ss ON ss.show_id = sh.show_id
GROUP BY sh.show_id, m.movie_id, t.theatre_id, sc.screen_id;

CREATE VIEW v_booking_details AS
SELECT b.booking_id, b.booking_time, b.total_amount, b.status,
       c.customer_id, c.name AS customer_name, c.email,
       m.title, t.name AS theatre_name, sc.name AS screen_name, sh.start_time,
       STRING_AGG(s.row_label || s.seat_number, ', ' ORDER BY s.row_label, s.seat_number) AS seats
FROM bookings b
JOIN customers c      ON c.customer_id = b.customer_id
JOIN shows sh         ON sh.show_id    = b.show_id
JOIN movies m         ON m.movie_id    = sh.movie_id
JOIN screens sc       ON sc.screen_id  = sh.screen_id
JOIN theatres t       ON t.theatre_id  = sc.theatre_id
JOIN booking_seats bs ON bs.booking_id = b.booking_id
JOIN seats s          ON s.seat_id     = bs.seat_id
GROUP BY b.booking_id, c.customer_id, m.title, t.name, sc.name, sh.start_time;
