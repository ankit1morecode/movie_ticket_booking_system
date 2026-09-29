const router = require('express').Router();
const pool = require('../db');

// GET all movies
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM movies ORDER BY title');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST add a movie
router.post('/', async (req, res, next) => {
  try {
    const { title, genre, language, duration_min, rating, release_date, description, poster_url } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO movies (title, genre, language, duration_min, rating, release_date, description, poster_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, genre, language, duration_min, rating, release_date || null, description || null, poster_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE a movie
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM movies WHERE movie_id = $1', [req.params.id]);
    res.json({ message: 'Movie deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
