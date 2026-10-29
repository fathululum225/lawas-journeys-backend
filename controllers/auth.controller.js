'use strict';

const userModel = require('../models/user.model');
const authService = require('../services/auth.service');
const AppError = require('../utils/app-error.util');
const { validate } = require('../utils/validators.util');
const { sendSuccess } = require('../utils/response.util');

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

const present = (user) => ({ user, token: authService.issueToken(user) });

const register = (req, res) => {
  const v = validate(req.body);
  const payload = {
    name: v.string('name', { min: 2, max: 80 }),
    email: v.email('email'),
    password: v.string('password', { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH }),
  };
  v.throwIfInvalid();

  if (userModel.findByEmail(payload.email)) {
    throw AppError.conflict('An account with this email already exists');
  }

  const user = userModel.create({
    name: payload.name,
    email: payload.email,
    passwordHash: authService.hashPassword(payload.password),
  });

  sendSuccess(res, { data: present(user), message: 'Account created', statusCode: 201 });
};

const login = (req, res) => {
  const v = validate(req.body);
  const email = v.email('email');
  const password = v.string('password', { max: MAX_PASSWORD_LENGTH });
  v.throwIfInvalid();

  const credentials = userModel.findCredentialsByEmail(email);
  if (!credentials || !authService.verifyPassword(password, credentials.password_hash)) {
    throw AppError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  sendSuccess(res, { data: present(userModel.findById(credentials.id)), message: 'Signed in' });
};

const getCurrentUser = (req, res) => {
  sendSuccess(res, { data: req.user });
};

module.exports = { register, login, getCurrentUser };
