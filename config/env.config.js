'use strict';

const path = require('node:path');
const dotenv = require('dotenv');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const FRONTEND_ROOT = path.resolve(BACKEND_ROOT, '..', 'frontend-legacy');

dotenv.config({ path: path.join(BACKEND_ROOT, '.env'), quiet: true });

const FALLBACK_WHATSAPP_NUMBER = '6281234567890';
const FALLBACK_JWT_SECRET = 'change-this-development-secret';

const readString = (key, fallback = '') => {
  const value = process.env[key];
  return value === undefined || value.trim() === '' ? fallback : value.trim();
};

const readInteger = (key, fallback) => {
  const parsed = Number.parseInt(readString(key), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const readBoolean = (key, fallback) => {
  const value = readString(key).toLowerCase();
  if (value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(value);
};

const readList = (key, fallback) => {
  const value = readString(key);
  return value === '' ? fallback : value.split(',').map((item) => item.trim()).filter(Boolean);
};

/** A value still holding the placeholder from .env.example (e.g. "isi_token_anda"). */
const isPlaceholder = (value) => value === '' || value.startsWith('isi_') || value.includes('xxxx');

const resolveFromBackend = (target) => (path.isAbsolute(target) ? target : path.resolve(BACKEND_ROOT, target));

const buildConfig = () => {
  const whatsappNumber = readString('WHATSAPP_BUSINESS_NUMBER');
  const hasValidWhatsappNumber = /^\d{8,15}$/.test(whatsappNumber);
  const paymentServerKey = readString('PAYMENT_GATEWAY_SERVER_KEY');
  const whatsappToken = readString('WHATSAPP_API_TOKEN');

  return {
    nodeEnv: readString('NODE_ENV', 'development'),
    port: readInteger('PORT', 3000),
    corsOrigins: readList('CORS_ORIGIN', ['*']),
    serveFrontend: readBoolean('SERVE_FRONTEND', false),
    frontendRoot: FRONTEND_ROOT,

    database: {
      path: readString('DATABASE_PATH') === ':memory:'
        ? ':memory:'
        : resolveFromBackend(readString('DATABASE_PATH', './database/lawas-journeys.sqlite')),
      autoSeed: readBoolean('AUTO_SEED', true),
    },

    auth: {
      jwtSecret: readString('JWT_SECRET', FALLBACK_JWT_SECRET),
      tokenTtlSeconds: readInteger('JWT_EXPIRES_IN_HOURS', 24) * 60 * 60,
      admin: {
        name: readString('ADMIN_NAME', 'Lawas Admin'),
        email: readString('ADMIN_EMAIL', 'admin@lawasjourneys.com').toLowerCase(),
        password: readString('ADMIN_PASSWORD', 'admin12345'),
      },
    },

    payment: {
      provider: readString('PAYMENT_GATEWAY_PROVIDER', 'midtrans').toLowerCase(),
      serverKey: paymentServerKey,
      clientKey: readString('PAYMENT_GATEWAY_CLIENT_KEY'),
      mode: readString('PAYMENT_GATEWAY_MODE', 'sandbox').toLowerCase(),
      simulation: readBoolean('PAYMENT_SIMULATION', true),
      hasCredentials: !isPlaceholder(paymentServerKey),
    },

    whatsapp: {
      provider: readString('WHATSAPP_API_PROVIDER', 'wa_business_api').toLowerCase(),
      token: whatsappToken,
      businessNumber: hasValidWhatsappNumber ? whatsappNumber : FALLBACK_WHATSAPP_NUMBER,
      usesFallbackNumber: !hasValidWhatsappNumber,
      hasCredentials: !isPlaceholder(whatsappToken),
    },
  };
};

const validateConfig = (config) => {
  const problems = [];

  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    problems.push('PORT must be a number between 1 and 65535.');
  }
  if (!['sandbox', 'production'].includes(config.payment.mode)) {
    problems.push('PAYMENT_GATEWAY_MODE must be "sandbox" or "production".');
  }
  if (!['midtrans', 'xendit'].includes(config.payment.provider)) {
    problems.push('PAYMENT_GATEWAY_PROVIDER must be "midtrans" or "xendit".');
  }
  if (config.nodeEnv === 'production' && config.auth.jwtSecret === FALLBACK_JWT_SECRET) {
    problems.push('JWT_SECRET must be changed from its default value in production.');
  }
  if (config.nodeEnv === 'production' && config.payment.simulation && config.payment.mode === 'production') {
    problems.push('PAYMENT_SIMULATION must be false when PAYMENT_GATEWAY_MODE is "production".');
  }

  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration:\n - ${problems.join('\n - ')}`);
  }
};

const env = buildConfig();
validateConfig(env);

module.exports = Object.freeze(env);

