'use strict';

const crypto = require('node:crypto');
const env = require('../config/env.config');

const SCRYPT_KEY_LENGTH = 64;
const TOKEN_HEADER = { alg: 'HS256', typ: 'JWT' };

const encodeSegment = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const decodeSegment = (segment) => JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));

const sign = (content) => crypto
  .createHmac('sha256', env.auth.jwtSecret)
  .update(content)
  .digest('base64url');

const safeEqual = (a, b) => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
};

/** Returns "salt:hash" (both hex) so the salt travels with the hash. */
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  const [salt, expected] = String(storedHash).split(':');
  if (!salt || !expected) return false;

  const actual = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex');
  return safeEqual(actual, expected);
};

/** Creates a standard HS256 JWT for the given user. */
const issueToken = (user) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    role: user.role,
    iat: issuedAt,
    exp: issuedAt + env.auth.tokenTtlSeconds,
  };

  const content = `${encodeSegment(TOKEN_HEADER)}.${encodeSegment(payload)}`;
  return `${content}.${sign(content)}`;
};

/** Returns the token payload, or null when the token is malformed, tampered with or expired. */
const verifyToken = (token) => {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  if (!safeEqual(sign(`${header}.${payload}`), signature)) return null;

  try {
    const claims = decodeSegment(payload);
    return claims.exp > Math.floor(Date.now() / 1000) ? claims : null;
  } catch {
    return null;
  }
};

module.exports = { hashPassword, verifyPassword, issueToken, verifyToken };
