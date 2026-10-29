'use strict';

const destinationModel = require('../models/destination.model');
const packageModel = require('../models/package.model');
const AppError = require('../utils/app-error.util');
const { validate } = require('../utils/validators.util');
const { createUniqueSlug } = require('../utils/slug.util');
const { sendSuccess } = require('../utils/response.util');

const DESTINATION_PACKAGE_LIMIT = 8;

const readSeason = (value) => {
  const season = value && typeof value === 'object' ? value : {};
  return {
    months: typeof season.months === 'string' ? season.months.trim().slice(0, 80) : '',
    note: typeof season.note === 'string' ? season.note.trim().slice(0, 160) : '',
  };
};

const readBestTime = (value) => {
  const bestTime = value && typeof value === 'object' ? value : {};
  return {
    summary: typeof bestTime.summary === 'string' ? bestTime.summary.trim().slice(0, 600) : '',
    dry: readSeason(bestTime.dry),
    rainy: readSeason(bestTime.rainy),
  };
};

const resolveSlug = (body, name, current) => {
  const requested = typeof body.slug === 'string' ? body.slug.trim() : '';
  const base = requested || (current ? current.slug : name);

  if (current && base === current.slug) return current.slug;
  return createUniqueSlug(base, (candidate) => destinationModel.isSlugTaken(candidate, current?.id));
};

const buildDestinationPayload = (body, current = null) => {
  const v = validate(body);

  const name = v.string('name', { min: 2, max: 80 });
  const payload = {
    name,
    tagline: v.string('tagline', { required: false, max: 160 }),
    description: v.string('description', { required: false, max: 3000 }),
    image: v.string('image', { required: false, max: 300 }),
    bestTime: readBestTime(body.bestTime),
    sortOrder: v.integer('sortOrder', { required: false, min: 0, fallback: 0 }),
  };

  v.throwIfInvalid();
  return { ...payload, slug: resolveSlug(body, name, current) };
};

const findExistingOrFail = (id) => {
  const existing = destinationModel.findById(Number(id));
  if (!existing) throw AppError.notFound('Destination not found');
  return existing;
};

const listDestinations = (req, res) => {
  sendSuccess(res, { data: destinationModel.findAll() });
};

/** Destination page payload: the destination, its top attractions and recommended packages. */
const getDestination = (req, res) => {
  const destination = destinationModel.findBySlug(req.params.slug);
  if (!destination) throw AppError.notFound('Destination not found');

  const { items: packages } = packageModel.findAll(
    { destination: destination.slug },
    { limit: DESTINATION_PACKAGE_LIMIT },
  );

  sendSuccess(res, {
    data: {
      ...destination,
      attractions: destinationModel.findAttractions(destination.id),
      packages,
    },
  });
};

const createDestination = (req, res) => {
  const created = destinationModel.create(buildDestinationPayload(req.body));
  sendSuccess(res, { data: created, message: 'Destination created', statusCode: 201 });
};

const updateDestination = (req, res) => {
  const existing = findExistingOrFail(req.params.id);
  const updated = destinationModel.update(existing.id, buildDestinationPayload(req.body, existing));

  sendSuccess(res, { data: updated, message: 'Destination updated' });
};

const deleteDestination = (req, res) => {
  const existing = findExistingOrFail(req.params.id);
  destinationModel.remove(existing.id);

  sendSuccess(res, { message: 'Destination deleted' });
};

module.exports = {
  listDestinations,
  getDestination,
  createDestination,
  updateDestination,
  deleteDestination,
};
