'use strict';

const env = require('./config/env.config');
const db = require('./config/database.config');
const { runMigrations } = require('./database/migrator');
const { seedDatabase, isDatabaseEmpty } = require('./database/seeders/seed');
const createApp = require('./app');

const prepareDatabase = () => {
  const applied = runMigrations(db);
  if (applied.length > 0) console.log(`[db] applied migrations: ${applied.join(', ')}`);

  if (env.database.autoSeed && isDatabaseEmpty(db)) {
    seedDatabase(db);
    console.log('[db] empty database detected, demo data has been seeded');
  }
};

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
      db.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

prepareDatabase();
startServer();
