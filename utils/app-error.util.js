'use strict';

/** Operational error that the central error middleware converts into a JSON response. */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
  }

  static badRequest(message, errors) {
    return new AppError(message, 400, errors);
  }

  static unauthorized(message = 'Authentication is required') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'You do not have permission to do this') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message) {
    return new AppError(message, 409);
  }

  static validation(errors) {
    return new AppError('Validation failed', 422, errors);
  }
}

module.exports = AppError;
