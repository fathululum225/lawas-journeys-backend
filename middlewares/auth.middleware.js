'use strict';

const AppError = require('../utils/app-error.util');
const { verifyToken } = require('../services/auth.service');
const userModel = require('../models/user.model');

const readBearerToken = (req) => {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
};

const resolveUser = (req) => {
  const token = readBearerToken(req);
  if (!token) return null;

  const claims = verifyToken(token);
  return claims ? userModel.findById(claims.sub) : null;
};

/** Rejects the request unless it carries a valid login token. */
const authenticate = (req, res, next) => {
  const user = resolveUser(req);
  if (!user) return next(AppError.unauthorized('Please sign in to continue'));

  req.user = user;
  return next();
};

/** Attaches req.user when a valid token is present, but never blocks the request. */
const optionalAuthenticate = (req, res, next) => {
  req.user = resolveUser(req);
  next();
};

/** Must run after `authenticate`. */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') return next(AppError.forbidden('Administrator access only'));
  return next();
};

module.exports = { authenticate, optionalAuthenticate, requireAdmin };
