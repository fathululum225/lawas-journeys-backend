'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const ensureTrackingTable = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);
};

const listMigrationFiles = () => fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((filename) => filename.endsWith('.sql'))
  .sort();

/**
 * Applies every SQL file in database/migrations that has not run yet.
 * Each file runs inside its own transaction. Returns the list of applied files.
 */
const runMigrations = (db) => {
  ensureTrackingTable(db);

  const applied = new Set(db.prepare('SELECT filename FROM schema_migrations').all().map((row) => row.filename));
  const markApplied = db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)');
  const executed = [];

  listMigrationFiles()
    .filter((filename) => !applied.has(filename))
    .forEach((filename) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');

      db.transaction(() => {
        db.exec(sql);
        markApplied.run(filename);
      })();

      executed.push(filename);
    });

  return executed;
};

module.exports = { runMigrations };
