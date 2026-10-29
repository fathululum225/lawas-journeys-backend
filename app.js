'use strict';

const express = require('express');
const cors = require('cors');
const env = require('./config/env.config');
const apiRoutes = require('./routes/index.routes');
const requestLogger = require('./middlewares/request-logger.middleware');
const notFoundMiddleware = require('./middlewares/not-found.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

const buildCorsOptions = () => ({
  origin: env.corsOrigins.includes('*') ? '*' : env.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

/** Builds the Express application without starting it (keeps server.js thin and the app testable). */
const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '1mb' }));

  if (env.nodeEnv !== 'production') app.use(requestLogger);

  app.use('/api', apiRoutes);

  if (env.serveFrontend) app.use(express.static(env.frontendRoot));

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};

module.exports = createApp;
