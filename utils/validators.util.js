'use strict';

const AppError = require('./app-error.util');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9 ()-]{8,20}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isBlank = (value) => value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

const todayAsIsoDate = () => new Date().toISOString().slice(0, 10);

/** "customerName" -> "Customer name": field names are shown to people in validation messages. */
const toLabel = (field) => {
  const words = field.replace(/([A-Z])/g, ' $1').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * Collects every problem found in a payload so the client can show all of them at once.
 *
 *   const v = validate(req.body);
 *   const data = { title: v.string('title', { min: 3 }), price: v.integer('price', { min: 0 }) };
 *   v.throwIfInvalid();
 */
class Validator {
  constructor(source) {
    this.source = source && typeof source === 'object' ? source : {};
    this.errors = [];
  }

  fail(field, message) {
    this.errors.push({ field, message });
    return undefined;
  }

  string(field, { required = true, min = 1, max = 5000 } = {}) {
    const raw = this.source[field];
    if (isBlank(raw)) return required ? this.fail(field, `${toLabel(field)} is required`) : '';
    if (typeof raw !== 'string') return this.fail(field, `${toLabel(field)} must be text`);

    const value = raw.trim();
    if (value.length < min) return this.fail(field, `${toLabel(field)} must be at least ${min} characters`);
    if (value.length > max) return this.fail(field, `${toLabel(field)} must be at most ${max} characters`);
    return value;
  }

  email(field, { required = true } = {}) {
    const value = this.string(field, { required, max: 160 });
    if (!value) return value;
    if (!EMAIL_PATTERN.test(value)) return this.fail(field, `${toLabel(field)} must be a valid email address`);
    return value.toLowerCase();
  }

  phone(field, { required = true } = {}) {
    const value = this.string(field, { required, max: 30 });
    if (!value) return value;
    if (!PHONE_PATTERN.test(value)) return this.fail(field, `${toLabel(field)} must be a valid phone number`);
    return value;
  }

  integer(field, { required = true, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, fallback } = {}) {
    const raw = this.source[field];
    if (isBlank(raw)) return required ? this.fail(field, `${toLabel(field)} is required`) : fallback;

    const value = Number(raw);
    if (!Number.isInteger(value)) return this.fail(field, `${toLabel(field)} must be a whole number`);
    if (value < min) return this.fail(field, `${toLabel(field)} must be at least ${min}`);
    if (value > max) return this.fail(field, `${toLabel(field)} must be at most ${max}`);
    return value;
  }

  number(field, { required = true, min = -Infinity, max = Infinity, fallback } = {}) {
    const raw = this.source[field];
    if (isBlank(raw)) return required ? this.fail(field, `${toLabel(field)} is required`) : fallback;

    const value = Number(raw);
    if (Number.isNaN(value)) return this.fail(field, `${toLabel(field)} must be a number`);
    if (value < min) return this.fail(field, `${toLabel(field)} must be at least ${min}`);
    if (value > max) return this.fail(field, `${toLabel(field)} must be at most ${max}`);
    return value;
  }

  boolean(field, { fallback = false } = {}) {
    const raw = this.source[field];
    if (raw === undefined || raw === null || raw === '') return fallback;
    if (typeof raw === 'boolean') return raw;
    return ['true', '1', 'yes', 'on'].includes(String(raw).toLowerCase());
  }

  oneOf(field, allowed, { required = true, fallback } = {}) {
    const raw = this.source[field];
    if (isBlank(raw)) return required ? this.fail(field, `${toLabel(field)} is required`) : fallback;
    if (!allowed.includes(raw)) return this.fail(field, `${toLabel(field)} must be one of: ${allowed.join(', ')}`);
    return raw;
  }

  date(field, { required = true, notInPast = false } = {}) {
    const raw = this.source[field];
    if (isBlank(raw)) return required ? this.fail(field, `${toLabel(field)} is required`) : '';
    if (typeof raw !== 'string' || !DATE_PATTERN.test(raw) || Number.isNaN(Date.parse(raw))) {
      return this.fail(field, `${toLabel(field)} must be a date formatted as YYYY-MM-DD`);
    }
    if (notInPast && raw < todayAsIsoDate()) return this.fail(field, `${toLabel(field)} cannot be in the past`);
    return raw;
  }

  stringList(field, { required = false, maxItems = 50, maxLength = 500 } = {}) {
    const raw = this.source[field];
    if (isBlank(raw) || (Array.isArray(raw) && raw.length === 0)) {
      return required ? this.fail(field, `${toLabel(field)} must contain at least one item`) : [];
    }
    if (!Array.isArray(raw)) return this.fail(field, `${toLabel(field)} must be a list`);
    if (raw.length > maxItems) return this.fail(field, `${toLabel(field)} can contain at most ${maxItems} items`);

    const items = raw.map((item) => String(item).trim()).filter(Boolean);
    if (items.some((item) => item.length > maxLength)) {
      return this.fail(field, `each item in ${field} must be at most ${maxLength} characters`);
    }
    return items;
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  throwIfInvalid() {
    if (this.hasErrors()) throw AppError.validation(this.errors);
  }
}

const validate = (source) => new Validator(source);

module.exports = { validate, Validator, EMAIL_PATTERN, todayAsIsoDate };
