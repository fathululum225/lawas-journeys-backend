'use strict';

const db = require('../config/database.config');

const toCategory = (row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  tagline: row.tagline,
  image: row.image,
});

const findAll = () => db
  .prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC')
  .all()
  .map(toCategory);

module.exports = { findAll };
