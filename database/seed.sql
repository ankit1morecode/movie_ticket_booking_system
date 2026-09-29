-- Sample data for the Movie Ticket Booking System

INSERT INTO category_pricing (category, multiplier) VALUES
    ('SILVER',   1.00),
    ('GOLD',     1.30),
    ('PLATINUM', 1.75);

INSERT INTO movies (title, genre, language, duration_min, rating, release_date) VALUES
    ('Inception',        'Sci-Fi',  'English', 148, 'UA', '2010-07-16'),
    ('3 Idiots',         'Comedy',  'Hindi',   170, 'U',  '2009-12-25'),
    ('Interstellar',     'Sci-Fi',  'English', 169, 'UA', '2014-11-07'),
    ('Dangal',           'Drama',   'Hindi',   161, 'U',  '2016-12-23');

INSERT INTO theatres (name, city, address) VALUES
    ('PVR Cinemas',  'Delhi',  'Select City Walk, Saket'),
    ('INOX',         'Mumbai', 'R City Mall, Ghatkopar');

INSERT INTO screens (theatre_id, name) VALUES
    (1, 'Screen 1'), (1, 'Screen 2'), (2, 'Audi 1');

-- 6 rows x 10 seats per screen
SELECT create_seats(1, 6, 10);
SELECT create_seats(2, 6, 10);
SELECT create_seats(3, 6, 10);

-- Shows for the next few days (show_seats are auto-created by trigger)
INSERT INTO shows (movie_id, screen_id, start_time, base_price) VALUES
    (1, 1, CURRENT_DATE + INTERVAL '1 day 10 hours', 200),
    (2, 1, CURRENT_DATE + INTERVAL '1 day 14 hours', 180),
    (3, 2, CURRENT_DATE + INTERVAL '1 day 18 hours', 250),
    (4, 3, CURRENT_DATE + INTERVAL '2 day 12 hours', 150),
    (1, 3, CURRENT_DATE + INTERVAL '2 day 19 hours', 220);
