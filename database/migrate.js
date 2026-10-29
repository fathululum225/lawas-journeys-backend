'use strict';

/** CLI entry point: `npm run migrate` */

const db = require('../config/database.config');
const { runMigrations } = require('./migrator');

const executed = runMigrations(db);

console.log(executed.length > 0
  ? `Applied migrations: ${executed.join(', ')}`
  : 'Database is already up to date.');

db.close();
