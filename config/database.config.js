'use strict';

const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first'); // Agar tidak error IPv6

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1, // PENTING: Batasi maksimal 1 koneksi di Vercel Serverless
  connectionTimeoutMillis: 5000, // Jangan tunggu selamanya jika koneksi macet
  idleTimeoutMillis: 10000, 
});

module.exports = pool;