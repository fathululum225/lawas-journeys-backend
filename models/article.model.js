'use strict';

const db = require('../config/database.config');
const { parseJson, stringifyJson } = require('../utils/json.util');

const toArticle = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  excerpt: row.excerpt,
  content: row.content,
  category: row.category,
  image: row.image,
  author: row.author,
  tags: parseJson(row.tags, []),
  readMinutes: row.read_minutes,
  isFeatured: row.is_featured === 1,
  publishedAt: row.published_at,
});

/** The list view does not need the (long) article body. */
const toArticleSummary = ({ content, ...summary }) => summary;

const buildFilters = (filters) => {
  const conditions = [];
  const params = {};

  if (filters.category) {
    conditions.push('LOWER(category) = LOWER(@category)');
    params.category = filters.category;
  }
  if (filters.tag) {
    conditions.push('EXISTS (SELECT 1 FROM json_each(articles.tags) WHERE LOWER(value) = LOWER(@tag))');
    params.tag = filters.tag;
  }
  if (filters.q) {
    conditions.push('(title LIKE @q OR excerpt LIKE @q OR tags LIKE @q)');
    params.q = `%${filters.q}%`;
  }
  if (filters.featured !== undefined) {
    conditions.push('is_featured = @featured');
    params.featured = filters.featured ? 1 : 0;
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
};

const findAll = (filters = {}, { limit = 10, offset = 0 } = {}) => {
  const { where, params } = buildFilters(filters);

  const items = db
    .prepare(`SELECT * FROM articles ${where} ORDER BY published_at DESC, id DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset })
    .map((row) => toArticleSummary(toArticle(row)));

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM articles ${where}`).get(params);

  return { items, total };
};

const findById = (id) => {
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  return row ? toArticle(row) : null;
};

const findBySlug = (slug) => {
  const row = db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug);
  return row ? toArticle(row) : null;
};

const findRelated = (article, limit = 3) => db
  .prepare('SELECT * FROM articles WHERE category = ? AND id != ? ORDER BY published_at DESC LIMIT ?')
  .all(article.category, article.id, limit)
  .map((row) => toArticleSummary(toArticle(row)));

const countByCategory = () => db
  .prepare('SELECT category AS name, COUNT(*) AS count FROM articles GROUP BY category ORDER BY name ASC')
  .all();

const findPopularTags = (limit = 12) => db.prepare(`
  SELECT j.value AS tag, COUNT(*) AS count
  FROM articles a, json_each(a.tags) j
  GROUP BY j.value
  ORDER BY count DESC, tag ASC
  LIMIT ?
`).all(limit);

const isSlugTaken = (slug, ignoreId = 0) => Boolean(
  db.prepare('SELECT 1 FROM articles WHERE slug = ? AND id != ?').get(slug, ignoreId),
);

const toColumns = (data) => ({
  slug: data.slug,
  title: data.title,
  excerpt: data.excerpt,
  content: data.content,
  category: data.category,
  image: data.image,
  author: data.author,
  tags: stringifyJson(data.tags),
  readMinutes: data.readMinutes,
  isFeatured: data.isFeatured ? 1 : 0,
  publishedAt: data.publishedAt,
});

const create = (data) => {
  const result = db.prepare(`
    INSERT INTO articles (slug, title, excerpt, content, category, image, author, tags, read_minutes, is_featured, published_at)
    VALUES (@slug, @title, @excerpt, @content, @category, @image, @author, @tags, @readMinutes, @isFeatured, @publishedAt)
  `).run(toColumns(data));

  return findById(result.lastInsertRowid);
};

const update = (id, data) => {
  db.prepare(`
    UPDATE articles SET
      slug = @slug, title = @title, excerpt = @excerpt, content = @content, category = @category,
      image = @image, author = @author, tags = @tags, read_minutes = @readMinutes,
      is_featured = @isFeatured, published_at = @publishedAt
    WHERE id = @id
  `).run({ ...toColumns(data), id });

  return findById(id);
};

const remove = (id) => db.prepare('DELETE FROM articles WHERE id = ?').run(id).changes > 0;

module.exports = {
  findAll,
  findById,
  findBySlug,
  findRelated,
  countByCategory,
  findPopularTags,
  isSlugTaken,
  create,
  update,
  remove,
};
