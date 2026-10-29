'use strict';

const AppError = require('../utils/app-error.util');

/** Last route in the chain: nothing above handled the request. */
const notFoundMiddleware = (req, res, next) => {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFoundMiddleware;
