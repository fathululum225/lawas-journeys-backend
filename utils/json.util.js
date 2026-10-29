'use strict';

/** Parses a JSON column, returning `fallback` when the value is empty or malformed. */
const parseJson = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const stringifyJson = (value, fallback = []) => JSON.stringify(value ?? fallback);

module.exports = { parseJson, stringifyJson };
