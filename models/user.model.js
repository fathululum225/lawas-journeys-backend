'use strict';

const db = require('../config/database.config');

const toUser = (row) => (row ? {
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  createdAt: row.created_at,
} : null);

const findRowByEmail = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email);

/** Returns the user together with the password hash, for credential checks only. */
const findCredentialsByEmail = (email) => findRowByEmail(email) ?? null;

const findByEmail = (email) => toUser(findRowByEmail(email));

const findById = (id) => toUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));

const create = ({ name, email, passwordHash, role = 'customer' }) => {
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, passwordHash, role);

  return findById(result.lastInsertRowid);
};

const count = () => db.prepare('SELECT COUNT(*) AS total FROM users').get().total;

module.exports = { findByEmail, findById, findCredentialsByEmail, create, count };
