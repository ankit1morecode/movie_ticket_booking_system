const router = require('express').Router();
const pool = require('../db');

// GET category multipliers
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM category_pricing ORDER BY multiplier');
    res.json(rows);
  } catch (err) { next(err); }
});

// PUT update multiplier of a category
router.put('/:category', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'UPDATE category_pricing SET multiplier = $1 WHERE category = $2 RETURNING *',
      [req.body.multiplier, req.params.category]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
