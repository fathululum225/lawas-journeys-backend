'use strict';

const packageModel = require('../models/package.model');
const destinationModel = require('../models/destination.model');
const AppError = require('../utils/app-error.util');
const { validate } = require('../utils/validators.util');
const { createUniqueSlug } = require('../utils/slug.util');
const { parsePagination } = require('../utils/pagination.util');
const { sendSuccess, buildPagination } = require('../utils/response.util');

const DIFFICULTY_LEVELS = ['Easy', 'Moderate', 'Challenging'];

const readOptionalInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const readOptionalText = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? undefined : text;
};

const parseFilters = (query) => ({
  q: readOptionalText(query.q),
  destination: readOptionalText(query.destination),
  category: readOptionalText(query.category),
  minPrice: readOptionalInteger(query.minPrice),
  maxPrice: readOptionalInteger(query.maxPrice),
  minDays: readOptionalInteger(query.minDays),
  maxDays: readOptionalInteger(query.maxDays),
  guests: readOptionalInteger(query.guests),
  featured: query.featured === undefined ? undefined : ['true', '1'].includes(String(query.featured)),
  sort: readOptionalText(query.sort),
});

/** Validates an itinerary sent as [{ title, description }] and numbers the days. */
const parseItinerary = (validator, source) => {
  const raw = source.itinerary;
  if (raw === undefined || raw === null || raw === '') return [];
  if (!Array.isArray(raw)) return validator.fail('itinerary', 'itinerary must be a list');

  return raw.map((entry, index) => {
    const title = typeof entry?.title === 'string' ? entry.title.trim() : '';
    const description = typeof entry?.description === 'string' ? entry.description.trim() : '';

    if (!title) validator.fail(`itinerary[${index}].title`, 'each itinerary day needs a title');
    return { day: index + 1, title, description };
  });
};

const resolveSlug = (body, title, current) => {
  const requested = typeof body.slug === 'string' ? body.slug.trim() : '';
  const base = requested || (current ? current.slug : title);

  if (current && base === current.slug) return current.slug;
  return createUniqueSlug(base, (candidate) => packageModel.isSlugTaken(candidate, current?.id));
};

/** Builds a clean package record from a request body, or throws a 422 describing every problem. */
const buildPackagePayload = (body, current = null) => {
  const v = validate(body);

  const title = v.string('title', { min: 3, max: 140 });
  const destinationId = v.integer('destinationId', { min: 1 });
  const minPax = v.integer('minPax', { required: false, min: 1, max: 100, fallback: 2 });
  const maxPax = v.integer('maxPax', { required: false, min: 1, max: 100, fallback: 10 });
  const price = v.integer('price', { min: 0 });
  const originalPrice = v.integer('originalPrice', { required: false, min: 0 });

  if (destinationId && !destinationModel.findById(destinationId)) {
    v.fail('destinationId', 'destination does not exist');
  }
  if (minPax && maxPax && maxPax < minPax) v.fail('maxPax', 'maxPax cannot be lower than minPax');
  if (originalPrice !== undefined && price !== undefined && originalPrice < price) {
    v.fail('originalPrice', 'originalPrice must be greater than or equal to price');
  }

  const payload = {
    title,
    destinationId,
    categories: v.stringList('categories', { required: true, maxItems: 6, maxLength: 40 }),
    summary: v.string('summary', { required: false, max: 300 }),
    description: v.string('description', { required: false, max: 6000 }),
    durationDays: v.integer('durationDays', { min: 1, max: 30 }),
    durationNights: v.integer('durationNights', { min: 0, max: 30 }),
    groupType: v.string('groupType', { required: false, max: 40 }) || 'Small Group',
    minPax,
    maxPax,
    difficulty: v.oneOf('difficulty', DIFFICULTY_LEVELS, { required: false, fallback: 'Easy' }),
    price,
    originalPrice,
    rating: v.number('rating', { required: false, min: 0, max: 5, fallback: 0 }),
    reviewCount: v.integer('reviewCount', { required: false, min: 0, fallback: 0 }),
    image: v.string('image', { required: false, max: 300 }),
    highlights: v.stringList('highlights', { maxItems: 12 }),
    itinerary: parseItinerary(v, body),
    includes: v.stringList('includes', { maxItems: 20 }),
    excludes: v.stringList('excludes', { maxItems: 20 }),
    isFeatured: v.boolean('isFeatured'),
  };

  v.throwIfInvalid();
  return { ...payload, slug: resolveSlug(body, title, current) };
};

const findExistingOrFail = (id) => {
  const existing = packageModel.findById(Number(id));
  if (!existing) throw AppError.notFound('Package not found');
  return existing;
};

const listPackages = (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { items, total } = packageModel.findAll(parseFilters(req.query), { limit, offset });

  sendSuccess(res, { data: items, meta: buildPagination({ page, limit, total }) });
};

const getPackage = (req, res) => {
  const found = packageModel.findBySlug(req.params.slug);
  if (!found) throw AppError.notFound('Package not found');

  sendSuccess(res, { data: found });
};

const createPackage = (req, res) => {
  const created = packageModel.create(buildPackagePayload(req.body));
  sendSuccess(res, { data: created, message: 'Package created', statusCode: 201 });
};

const updatePackage = (req, res) => {
  const existing = findExistingOrFail(req.params.id);
  const updated = packageModel.update(existing.id, buildPackagePayload(req.body, existing));

  sendSuccess(res, { data: updated, message: 'Package updated' });
};

const deletePackage = (req, res) => {
  const existing = findExistingOrFail(req.params.id);
  packageModel.remove(existing.id);

  sendSuccess(res, { message: 'Package deleted' });
};

module.exports = { listPackages, getPackage, createPackage, updatePackage, deletePackage };
