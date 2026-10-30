'use strict';

const env = require('./config/env.config');
const db = require('./config/database.config');
const createApp = require('./app');

// FUNGSI prepareDatabase() DAN IMPORT MIGRATOR KITA HAPUS
// Karena database sudah dimigrasi secara manual ke Supabase

const startServer = () => {
  const server = createApp().listen(env.port, () => {
    console.log(`[api] Lawas Journeys API ready on http://localhost:${env.port}/api (${env.nodeEnv})`);
    if (env.serveFrontend) console.log(`[web] frontend served on http://localhost:${env.port}`);
    if (env.whatsapp.usesFallbackNumber) {
      console.log('[wa]  WHATSAPP_BUSINESS_NUMBER is not set, using the demo number 6281234567890');
    }
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[api] Port ${env.port} is already in use. Stop the other process or change PORT in .env.`);
    } else {
      console.error('[api] Failed to start the server:', error);
    }
    process.exit(1);
  });

  const shutdown = (signal) => {
    console.log(`\n[api] ${signal} received, shutting down`);
    server.close(() => {
      // Untuk PostgreSQL (pg), kita menggunakan db.end(), bukan db.close()
      if (db && typeof db.end === 'function') {
        db.end(); 
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

// Langsung jalankan server tanpa prepareDatabase()
startServer();