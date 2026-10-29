'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const env = require('./env.config');

const ensureDatabaseDirectory = (databasePath) => {
  if (databasePath === ':memory:') return;
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
};

const createConnection = () => {
  ensureDatabaseDirectory(env.database.path);

  const connection = new Database(env.database.path);
  connection.pragma('journal_mode = WAL');
  connection.pragma('foreign_keys = ON');

  return connection;
};

/** Single shared connection for the whole process. */
const db = createConnection();

module.exports = db;
