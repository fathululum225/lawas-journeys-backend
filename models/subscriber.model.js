'use strict';

const db = require('../config/database.config');

/** Returns true when the address was newly added, false when it was already subscribed. */
const subscribe = (email) => db
  .prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)')
  .run(email).changes > 0;

const count = () => db.prepare('SELECT COUNT(*) AS total FROM subscribers').get().total;

module.exports = { subscribe, count };
