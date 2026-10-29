'use strict';

const db = require('../config/database.config');
const { parseJson, stringifyJson } = require('../utils/json.util');

const SORT_CLAUSES = Object.freeze({
  recommended: 'p.is_featured DESC, p.rating DESC, p.review_count DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  rating: 'p.rating DESC, p.review_count DESC',
  duration: 'p.duration_days ASC',
  newest: 'p.created_at DESC, p.id DESC',
});

const BASE_SELECT = `
  SELECT p.*, d.slug AS destination_slug, d.name AS destination_name
  FROM packages p
  JOIN destinations d ON d.id = p.destination_id
`;

const toPackage = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  destination: { id: row.destination_id, slug: row.destination_slug, name: row.destination_name },
  categories: parseJson(row.categories, []),
  summary: row.summary,
  description: row.description,
  durationDays: row.duration_days,
  durationNights: row.duration_nights,
  durationLabel: `${row.duration_days}D ${row.duration_nights}N`,
  groupType: row.group_type,
  minPax: row.min_pax,
  maxPax: row.max_pax,
  difficulty: row.difficulty,
  price: row.price,
  originalPrice: row.original_price,
  rating: row.rating,
  reviewCount: row.review_count,
  image: row.image,
  highlights: parseJson(row.highlights, []),
  itinerary: parseJson(row.itinerary, []),
  includes: parseJson(row.includes, []),
  excludes: parseJson(row.excludes, []),
  isFeatured: row.is_featured === 1,
  createdAt: row.created_at,
});

/** Translates the optional list filters into a WHERE clause plus named parameters. */
const buildFilters = (filters) => {
  const conditions = [];
  const params = {};

  if (filters.q) {
    conditions.push('(p.title LIKE @q OR p.summary LIKE @q OR d.name LIKE @q)');
    params.q = `%${filters.q}%`;
  }
  if (filters.destination) {
    conditions.push('d.slug = @destination');
    params.destination = filters.destination;
  }
  if (filters.category) {
    conditions.push('EXISTS (SELECT 1 FROM json_each(p.categories) WHERE LOWER(value) = LOWER(@category))');
    params.category = filters.category;
  }
  if (filters.minPrice !== undefined) {
    conditions.push('p.price >= @minPrice');
    params.minPrice = filters.minPrice;
  }
  if (filters.maxPrice !== undefined) {
    conditions.push('p.price <= @maxPrice');
    params.maxPrice = filters.maxPrice;
  }
  if (filters.minDays !== undefined) {
    conditions.push('p.duration_days >= @minDays');
    params.minDays = filters.minDays;
  }
  if (filters.maxDays !== undefined) {
    conditions.push('p.duration_days <= @maxDays');
    params.maxDays = filters.maxDays;
  }
  if (filters.guests !== undefined) {
    conditions.push('p.max_pax >= @guests');
    params.guests = filters.guests;
  }
  if (filters.featured !== undefined) {
    conditions.push('p.is_featured = @featured');
    params.featured = filters.featured ? 1 : 0;
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
};

const findAll = (filters = {}, { limit = 50, offset = 0 } = {}) => {
  const { where, params } = buildFilters(filters);
  const orderBy = SORT_CLAUSES[filters.sort] ?? SORT_CLAUSES.recommended;

  const items = db
    .prepare(`${BASE_SELECT} ${where} ORDER BY ${orderBy}, p.id ASC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset })
    .map(toPackage);

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM packages p JOIN destinations d ON d.id = p.destination_id ${where}`)
    .get(params);

  return { items, total };
};

const findById = (id) => {
  const row = db.prepare(`${BASE_SELECT} WHERE p.id = ?`).get(id);
  return row ? toPackage(row) : null;
};

const findBySlug = (slug) => {
  const row = db.prepare(`${BASE_SELECT} WHERE p.slug = ?`).get(slug);
  return row ? toPackage(row) : null;
};

const isSlugTaken = (slug, ignoreId = 0) => Boolean(
  db.prepare('SELECT 1 FROM packages WHERE slug = ? AND id != ?').get(slug, ignoreId),
);

const toColumns = (data) => ({
  slug: data.slug,
  title: data.title,
  destinationId: data.destinationId,
  categories: stringifyJson(data.categories),
  summary: data.summary,
  description: data.description,
  durationDays: data.durationDays,
  durationNights: data.durationNights,
  groupType: data.groupType,
  minPax: data.minPax,
  maxPax: data.maxPax,
  difficulty: data.difficulty,
  price: data.price,
  originalPrice: data.originalPrice ?? null,
  rating: data.rating,
  reviewCount: data.reviewCount,
  image: data.image,
  highlights: stringifyJson(data.highlights),
  itinerary: stringifyJson(data.itinerary),
  includes: stringifyJson(data.includes),
  excludes: stringifyJson(data.excludes),
  isFeatured: data.isFeatured ? 1 : 0,
});

const create = (data) => {
  const result = db.prepare(`
    INSERT INTO packages (
      slug, title, destination_id, categories, summary, description, duration_days, duration_nights,
      group_type, min_pax, max_pax, difficulty, price, original_price, rating, review_count, image,
      highlights, itinerary, includes, excludes, is_featured
    ) VALUES (
      @slug, @title, @destinationId, @categories, @summary, @description, @durationDays, @durationNights,
      @groupType, @minPax, @maxPax, @difficulty, @price, @originalPrice, @rating, @reviewCount, @image,
      @highlights, @itinerary, @includes, @excludes, @isFeatured
    )
  `).run(toColumns(data));

  return findById(result.lastInsertRowid);
};

const update = (id, data) => {
  db.prepare(`
    UPDATE packages SET
      slug = @slug, title = @title, destination_id = @destinationId, categories = @categories,
      summary = @summary, description = @description, duration_days = @durationDays,
      duration_nights = @durationNights, group_type = @groupType, min_pax = @minPax, max_pax = @maxPax,
      difficulty = @difficulty, price = @price, original_price = @originalPrice, rating = @rating,
      review_count = @reviewCount, image = @image, highlights = @highlights, itinerary = @itinerary,
      includes = @includes, excludes = @excludes, is_featured = @isFeatured
    WHERE id = @id
  `).run({ ...toColumns(data), id });

  return findById(id);
};

const remove = (id) => db.prepare('DELETE FROM packages WHERE id = ?').run(id).changes > 0;

module.exports = { findAll, findById, findBySlug, isSlugTaken, create, update, remove };
