'use strict';

const db = require('../config/database.config');
const { parseJson, stringifyJson } = require('../utils/json.util');

const toDestination = (row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  tagline: row.tagline,
  description: row.description,
  image: row.image,
  bestTime: parseJson(row.best_time, {}),
  sortOrder: row.sort_order ?? 0,
  packageCount: row.package_count ?? 0,
});

const toAttraction = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  location: row.location,
  image: row.image,
});

const SELECT_WITH_COUNT = `
  SELECT d.*, (SELECT COUNT(*) FROM packages p WHERE p.destination_id = d.id) AS package_count
  FROM destinations d
`;

const findAll = () => db
  .prepare(`${SELECT_WITH_COUNT} ORDER BY d.sort_order ASC, d.name ASC`)
  .all()
  .map(toDestination);

const findById = (id) => {
  const row = db.prepare(`${SELECT_WITH_COUNT} WHERE d.id = ?`).get(id);
  return row ? toDestination(row) : null;
};

const findBySlug = (slug) => {
  const row = db.prepare(`${SELECT_WITH_COUNT} WHERE d.slug = ?`).get(slug);
  return row ? toDestination(row) : null;
};

const isSlugTaken = (slug, ignoreId = 0) => Boolean(
  db.prepare('SELECT 1 FROM destinations WHERE slug = ? AND id != ?').get(slug, ignoreId),
);

const findAttractions = (destinationId) => db
  .prepare('SELECT * FROM attractions WHERE destination_id = ? ORDER BY sort_order ASC, id ASC')
  .all(destinationId)
  .map(toAttraction);

const create = (data) => {
  const result = db.prepare(`
    INSERT INTO destinations (slug, name, tagline, description, image, best_time, sort_order)
    VALUES (@slug, @name, @tagline, @description, @image, @bestTime, @sortOrder)
  `).run({ ...data, bestTime: stringifyJson(data.bestTime, {}) });

  return findById(result.lastInsertRowid);
};

const update = (id, data) => {
  db.prepare(`
    UPDATE destinations
    SET slug = @slug, name = @name, tagline = @tagline, description = @description,
        image = @image, best_time = @bestTime, sort_order = @sortOrder
    WHERE id = @id
  `).run({ ...data, id, bestTime: stringifyJson(data.bestTime, {}) });

  return findById(id);
};

const remove = (id) => db.prepare('DELETE FROM destinations WHERE id = ?').run(id).changes > 0;

module.exports = { findAll, findById, findBySlug, findAttractions, isSlugTaken, create, update, remove };
