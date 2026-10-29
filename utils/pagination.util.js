'use strict';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/** Reads ?page= and ?limit= from a query object and derives the SQL offset. */
const parsePagination = (query, { defaultLimit = DEFAULT_LIMIT } = {}) => {
  const page = toPositiveInteger(query.page, 1);
  const limit = Math.min(toPositiveInteger(query.limit, defaultLimit), MAX_LIMIT);

  return { page, limit, offset: (page - 1) * limit };
};

module.exports = { parsePagination };
