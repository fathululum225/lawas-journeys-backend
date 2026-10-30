'use strict';

// Paksa Node.js memuat file .env dari folder utama (backend)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first'); // Mengatasi error ECONNREFUSED

const { Pool } = require('pg');

// Cek apakah URL terbaca (Pastikan di terminal tertulis TERBACA ✅)
console.log("👉 Cek URL Database:", process.env.DATABASE_URL ? "TERBACA ✅" : "KOSONG ❌");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Error koneksi database:', err.message);
  }
  console.log('✅ Berhasil terhubung ke database Supabase (PostgreSQL)!');
  release();
});

module.exports = pool;