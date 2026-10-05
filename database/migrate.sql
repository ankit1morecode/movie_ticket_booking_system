-- Upgrades an existing database to the latest schema WITHOUT deleting data.
-- Safe to run more than once.  Usage: npm run db:migrate

-- 1. New movie columns (poster + description)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS poster_url  VARCHAR(500);

-- Fill posters/descriptions for the sample movies that don't have one yet
UPDATE movies m
SET poster_url  = COALESCE(m.poster_url, v.poster_url),
    description = COALESCE(m.description, v.description)
FROM (VALUES
    ('Interstellar', 'https://upload.wikimedia.org/wikipedia/en/b/bc/Interstellar_film_poster.jpg',
     'With Earth dying, a former pilot leads a team of explorers through a wormhole to find humanity a new home among the stars.'),
    ('Inception', 'https://upload.wikimedia.org/wikipedia/en/2/2e/Inception_%282010%29_theatrical_poster.jpg',
     'A thief who steals secrets from inside dreams is offered one last job: planting an idea in a target''s mind.'),
    ('3 Idiots', 'https://upload.wikimedia.org/wikipedia/en/d/df/3_idiots_poster.jpg',
     'Two friends search for their long-lost college buddy and relive memories of an engineering college that valued marks over learning.'),
    ('Avatar: The Way of Water', 'https://upload.wikimedia.org/wikipedia/en/5/54/Avatar_The_Way_of_Water_poster.jpg',
     'Jake Sully and his family leave the forests of Pandora and seek refuge with the ocean clans when an old threat returns.'),
    ('Iron Man 3', 'https://upload.wikimedia.org/wikipedia/en/1/19/Iron_Man_3_poster.jpg',
     'Tony Stark faces a powerful enemy called the Mandarin and must rely on his own skills when his world is torn apart.'),
    ('The Hobbit: The Battle of the Five Armies', 'https://upload.wikimedia.org/wikipedia/en/e/e7/The_Hobbit_-_The_Battle_of_the_Five_Armies.png',
     'Bilbo and the dwarves face the fury of the dragon Smaug as armies gather for a war over the treasure of the Lonely Mountain.'),
    ('Wonder Woman 1984', 'https://upload.wikimedia.org/wikipedia/en/4/4f/Wonder_Woman_1984_poster.png',
     'In 1984, Diana Prince comes into conflict with a businessman whose wish-granting stone threatens the whole world.'),
    ('RRR', 'https://upload.wikimedia.org/wikipedia/en/d/d7/RRR_Poster.jpg',
     'Two revolutionaries in 1920s India form an unlikely friendship while fighting on opposite sides of the law.'),
    ('Oppenheimer', 'https://upload.wikimedia.org/wikipedia/en/4/4a/Oppenheimer_%28film%29.jpg',
     'The story of physicist J. Robert Oppenheimer and his role in developing the atomic bomb.'),
    ('Jawan', 'https://upload.wikimedia.org/wikipedia/en/3/39/Jawan_film_poster.jpg',
     'A man driven by a personal vendetta sets out to fix wrongs in society, while facing a ruthless arms dealer.'),
    ('The Dark Knight', 'https://upload.wikimedia.org/wikipedia/en/1/1c/The_Dark_Knight_%282008_film%29.jpg',
     'Batman faces the Joker, a criminal mastermind who plunges Gotham City into chaos.')
) AS v(title, poster_url, description)
WHERE m.title = v.title;

-- 2. Max 10 tickets per customer per show (trigger)
CREATE OR REPLACE FUNCTION trg_max_tickets_per_customer() RETURNS TRIGGER AS $$
DECLARE
    v_customer INT;
    v_show     INT;
    v_count    INT;
BEGIN
    SELECT customer_id, show_id INTO v_customer, v_show
    FROM bookings WHERE booking_id = NEW.booking_id;

    SELECT COUNT(*) INTO v_count
    FROM booking_seats bs
    JOIN bookings b ON b.booking_id = bs.booking_id
    WHERE b.customer_id = v_customer
      AND b.show_id     = v_show
      AND b.status      = 'CONFIRMED';

    IF v_count > 10 THEN
        RAISE EXCEPTION 'A customer can book at most 10 tickets per show';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS max_tickets_per_customer ON booking_seats;
CREATE TRIGGER max_tickets_per_customer
AFTER INSERT ON booking_seats
FOR EACH ROW EXECUTE FUNCTION trg_max_tickets_per_customer();

-- 3. Recreate the show view so it includes the new movie columns
DROP VIEW IF EXISTS v_show_details;
CREATE VIEW v_show_details WITH (security_invoker = on) AS
SELECT sh.show_id, sh.start_time, sh.end_time, sh.base_price,
       m.movie_id, m.title, m.genre, m.language, m.duration_min, m.rating,
       m.release_date, m.description, m.poster_url,
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

-- ---------------------------------------------------------------------
-- Row Level Security: block direct access through Supabase's public API.
-- The Express server connects as the table owner, which bypasses RLS,
-- so all data access goes through our API (and its transactions).
-- ---------------------------------------------------------------------
ALTER TABLE customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE theatres         ENABLE ROW LEVEL SECURITY;
ALTER TABLE screens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats            ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows            ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_seats       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_seats    ENABLE ROW LEVEL SECURITY;
