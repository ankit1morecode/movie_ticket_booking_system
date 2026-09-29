const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/movies', require('./routes/movies'));
app.use('/api/theatres', require('./routes/theatres'));
app.use('/api/shows', require('./routes/shows'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reports', require('./routes/reports'));

// Central error handler: send DB / validation errors back as JSON
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 400).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
