const { Pool } = require('pg');
require('dotenv').config();

// Two ways to connect:
//  1. DATABASE_URL  -> a hosted database such as Supabase (uses SSL)
//  2. DB_HOST, DB_USER, ... -> a local PostgreSQL server
const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };

// On Vercel each serverless instance keeps only a few connections
const pool = new Pool({ ...config, max: process.env.VERCEL ? 3 : 10 });

module.exports = pool;
module.exports.config = config;
