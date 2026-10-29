'use strict';

/**
 * Every API response shares one envelope:
 *   { success: boolean, message: string, data: any, meta?: object, errors?: array }
 */

const sendSuccess = (res, { data = null, message = 'OK', statusCode = 200, meta } = {}) => {
  const payload = { success: true, message, data };
  if (meta) payload.meta = meta;

  return res.status(statusCode).json(payload);
};

const sendError = (res, { message = 'Something went wrong', statusCode = 500, errors } = {}) => {
  const payload = { success: false, message, data: null };
  if (errors && errors.length > 0) payload.errors = errors;

  return res.status(statusCode).json(payload);
};

const buildPagination = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

module.exports = { sendSuccess, sendError, buildPagination };
