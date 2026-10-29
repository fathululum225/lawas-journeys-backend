'use strict';

const env = require('../config/env.config');
const AppError = require('../utils/app-error.util');
const { sendError } = require('../utils/response.util');

const DUPLICATE_MESSAGE = 'A record with the same unique value already exists';
const IN_USE_MESSAGE = 'This record is still referenced by other data, remove or change that data first';

const SQLITE_CONFLICT_MESSAGES = {
  SQLITE_CONSTRAINT_UNIQUE: DUPLICATE_MESSAGE,
  SQLITE_CONSTRAINT_PRIMARYKEY: DUPLICATE_MESSAGE,
  SQLITE_CONSTRAINT_FOREIGNKEY: IN_USE_MESSAGE,
};

/** ON DELETE RESTRICT reports SQLITE_CONSTRAINT_TRIGGER, so foreign keys are also matched by message. */
const isForeignKeyViolation = (error) => typeof error.message === 'string'
  && error.message.includes('FOREIGN KEY constraint failed');

/** Translates anything thrown inside a request into an AppError. */
const normalizeError = (error) => {
  if (error instanceof AppError) return error;

  if (error.type === 'entity.parse.failed') {
    return AppError.badRequest('Request body is not valid JSON');
  }
  if (error.type === 'entity.too.large') {
    return new AppError('Request body is too large', 413);
  }
  if (SQLITE_CONFLICT_MESSAGES[error.code]) {
    return AppError.conflict(SQLITE_CONFLICT_MESSAGES[error.code]);
  }
  if (isForeignKeyViolation(error)) {
    return AppError.conflict(IN_USE_MESSAGE);
  }
  if (typeof error.code === 'string' && error.code.startsWith('SQLITE_CONSTRAINT')) {
    return AppError.validation([{ field: null, message: error.message }]);
  }

  return new AppError('Internal server error', 500);
};

/** Server faults only expose their real message outside production. */
const resolveClientMessage = (normalized, original) => {
  const isServerFault = normalized.statusCode >= 500;
  if (!isServerFault) return normalized.message;

  return env.nodeEnv === 'production' ? 'Internal server error' : original.message || normalized.message;
};

// Express identifies error handlers by their four-argument signature.
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (error, req, res, next) => {
  const normalized = normalizeError(error);

  if (normalized.statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, error);
  }

  return sendError(res, {
    message: resolveClientMessage(normalized, error),
    statusCode: normalized.statusCode,
    errors: normalized.errors,
  });
};

module.exports = errorMiddleware;
