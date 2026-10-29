'use strict';

/** One line per request: METHOD /path STATUS duration. Only mounted outside production. */
const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs.toFixed(1)}ms`);
  });

  next();
};

module.exports = requestLogger;
