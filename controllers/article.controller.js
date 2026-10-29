'use strict';

const articleModel = require('../models/article.model');
const AppError = require('../utils/app-error.util');
const { validate, todayAsIsoDate } = require('../utils/validators.util');
const { createUniqueSlug } = require('../utils/slug.util');
const { parsePagination } = require('../utils/pagination.util');
const { sendSuccess, buildPagination } = require('../utils/response.util');

const WORDS_PER_MINUTE = 200;

const readOptionalText = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? undefined : text;
};

const parseFilters = (query) => ({
  category: readOptionalText(query.category),
  tag: readOptionalText(query.tag),
  q: readOptionalText(query.q),
  featured: query.featured === undefined ? undefined : ['true', '1'].includes(String(query.featured)),
});

const estimateReadMinutes = (content) => {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
};

const resolveSlug = (body, title, current) => {
  const requested = typeof body.slug === 'string' ? body.slug.trim() : '';
  const base = requested || (current ? current.slug : title);

  if (current && base === current.slug) return current.slug;
  return createUniqueSlug(base, (candidate) => articleModel.isSlugTaken(candidate, current?.id));
};

const buildArticlePayload = (body, current = null) => {
  const v = validate(body);

  const title = v.string('title', { min: 5, max: 160 });
  const content = v.string('content', { min: 20, max: 30000 });

  const payload = {
    title,
    excerpt: v.string('excerpt', { required: false, max: 400 }),
    content,
    category: v.string('category', { min: 2, max: 40 }),
    image: v.string('image', { required: false, max: 300 }),
    author: v.string('author', { required: false, max: 80 }) || 'Lawas Journeys Editorial',
    tags: v.stringList('tags', { maxItems: 8, maxLength: 30 }),
    readMinutes: v.integer('readMinutes', { required: false, min: 1, max: 120 }),
    isFeatured: v.boolean('isFeatured'),
    publishedAt: v.date('publishedAt', { required: false }) || todayAsIsoDate(),
  };

  v.throwIfInvalid();

  return {
    ...payload,
    readMinutes: payload.readMinutes ?? estimateReadMinutes(content),
    slug: resolveSlug(body, title, current),
  };
};

const findExistingOrFail = (id) => {
  const existing = articleModel.findById(Number(id));
  if (!existing) throw AppError.notFound('Article not found');
  return existing;
};

const listArticles = (req, res) => {
  const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 5 });
  const { items, total } = articleModel.findAll(parseFilters(req.query), { limit, offset });

  sendSuccess(res, { data: items, meta: buildPagination({ page, limit, total }) });
};

const listCategories = (req, res) => {
  const categories = articleModel.countByCategory();
  const total = categories.reduce((sum, category) => sum + category.count, 0);

  sendSuccess(res, { data: { total, categories } });
};

const listPopularTags = (req, res) => {
  sendSuccess(res, { data: articleModel.findPopularTags(12) });
};

const getArticle = (req, res) => {
  const article = articleModel.findBySlug(req.params.slug);
  if (!article) throw AppError.notFound('Article not found');

  sendSuccess(res, { data: { ...article, related: articleModel.findRelated(article) } });
};

const createArticle = (req, res) => {
  const created = articleModel.create(buildArticlePayload(req.body));
  sendSuccess(res, { data: created, message: 'Article created', statusCode: 201 });
};

const updateArticle = (req, res) => {
  const existing = findExistingOrFail(req.params.id);
  const updated = articleModel.update(existing.id, buildArticlePayload(req.body, existing));

  sendSuccess(res, { data: updated, message: 'Article updated' });
};

const deleteArticle = (req, res) => {
  const existing = findExistingOrFail(req.params.id);
  articleModel.remove(existing.id);

  sendSuccess(res, { message: 'Article deleted' });
};

module.exports = {
  listArticles,
  listCategories,
  listPopularTags,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
};
