-- Sample data for the Movie Ticket Booking System
-- Posters are loaded from Wikipedia (upload.wikimedia.org)

INSERT INTO category_pricing (category, multiplier) VALUES
    ('SILVER',   1.00),
    ('GOLD',     1.30),
    ('PLATINUM', 1.75);

INSERT INTO movies (title, genre, language, duration_min, rating, release_date, description, poster_url) VALUES
    ('Interstellar', 'Sci-Fi', 'English', 169, 'UA', '2014-11-07',
     'With Earth dying, a former pilot leads a team of explorers through a wormhole to find humanity a new home among the stars.',
     'https://upload.wikimedia.org/wikipedia/en/b/bc/Interstellar_film_poster.jpg'),
    ('Inception', 'Sci-Fi', 'English', 148, 'UA', '2010-07-16',
     'A thief who steals secrets from inside dreams is offered one last job: planting an idea in a target''s mind.',
     'https://upload.wikimedia.org/wikipedia/en/2/2e/Inception_%282010%29_theatrical_poster.jpg'),
    ('3 Idiots', 'Comedy', 'Hindi', 170, 'U', '2009-12-25',
     'Two friends search for their long-lost college buddy and relive memories of an engineering college that valued marks over learning.',
     'https://upload.wikimedia.org/wikipedia/en/d/df/3_idiots_poster.jpg'),
    ('Avatar: The Way of Water', 'Sci-Fi', 'English', 192, 'UA', '2022-12-16',
     'Jake Sully and his family leave the forests of Pandora and seek refuge with the ocean clans when an old threat returns.',
     'https://upload.wikimedia.org/wikipedia/en/5/54/Avatar_The_Way_of_Water_poster.jpg'),
    ('Iron Man 3', 'Action', 'English', 130, 'UA', '2013-04-26',
     'Tony Stark faces a powerful enemy called the Mandarin and must rely on his own skills when his world is torn apart.',
     'https://upload.wikimedia.org/wikipedia/en/1/19/Iron_Man_3_poster.jpg'),
    ('The Hobbit: The Battle of the Five Armies', 'Fantasy', 'English', 144, 'UA', '2014-12-17',
     'Bilbo and the dwarves face the fury of the dragon Smaug as armies gather for a war over the treasure of the Lonely Mountain.',
     'https://upload.wikimedia.org/wikipedia/en/e/e7/The_Hobbit_-_The_Battle_of_the_Five_Armies.png'),
    ('Wonder Woman 1984', 'Action', 'English', 151, 'UA', '2020-12-25',
     'In 1984, Diana Prince comes into conflict with a businessman whose wish-granting stone threatens the whole world.',
     'https://upload.wikimedia.org/wikipedia/en/4/4f/Wonder_Woman_1984_poster.png'),
    ('RRR', 'Action', 'Telugu', 187, 'UA', '2022-03-25',
     'Two revolutionaries in 1920s India form an unlikely friendship while fighting on opposite sides of the law.',
     'https://upload.wikimedia.org/wikipedia/en/d/d7/RRR_Poster.jpg'),
    -- "Coming soon": movies without any scheduled show
    ('Oppenheimer', 'Drama', 'English', 180, 'UA', '2023-07-21',
     'The story of physicist J. Robert Oppenheimer and his role in developing the atomic bomb.',
     'https://upload.wikimedia.org/wikipedia/en/4/4a/Oppenheimer_%28film%29.jpg'),
    ('Jawan', 'Action', 'Hindi', 169, 'UA', '2023-09-07',
     'A man driven by a personal vendetta sets out to fix wrongs in society, while facing a ruthless arms dealer.',
     'https://upload.wikimedia.org/wikipedia/en/3/39/Jawan_film_poster.jpg'),
    ('The Dark Knight', 'Action', 'English', 152, 'UA', '2008-07-18',
     'Batman faces the Joker, a criminal mastermind who plunges Gotham City into chaos.',
     'https://upload.wikimedia.org/wikipedia/en/1/1c/The_Dark_Knight_%282008_film%29.jpg');

INSERT INTO theatres (name, city, address) VALUES
    ('PVR Cinemas',  'Delhi',  'Select City Walk, Saket'),
    ('INOX',         'Mumbai', 'R City Mall, Ghatkopar');

INSERT INTO screens (theatre_id, name) VALUES
    (1, 'Screen 1'), (1, 'Screen 2'), (2, 'Audi 1'), (2, 'Audi 2');

-- 6 rows x 10 seats per screen
SELECT create_seats(1, 6, 10);
SELECT create_seats(2, 6, 10);
SELECT create_seats(3, 6, 10);
SELECT create_seats(4, 6, 10);

-- Schedule: next 3 days x 4 screens x 4 time slots, movies 1-8 rotated.
-- (show_seats rows are auto-created by trigger; overlap trigger checks every show)
INSERT INTO shows (movie_id, screen_id, start_time, base_price)
SELECT ((d * 4 + slot + sc * 3) % 8) + 1,
       sc,
       CURRENT_DATE + d + slot_time,
       price
FROM generate_series(1, 3) AS d,
     generate_series(1, 4) AS sc,
     (VALUES (0, TIME '10:00', 150),
             (1, TIME '14:00', 180),
             (2, TIME '18:00', 220),
             (3, TIME '21:30', 200)) AS t(slot, slot_time, price)
ORDER BY d, sc, slot;
