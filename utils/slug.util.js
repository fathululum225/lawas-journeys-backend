'use strict';

const slugify = (text) => String(text)
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

/**
 * Returns `base`, or `base-2`, `base-3`... until `isTaken(candidate)` is false.
 * `isTaken` receives the candidate slug and must return a boolean.
 */
const createUniqueSlug = (base, isTaken) => {
  const root = slugify(base) || 'item';
  let candidate = root;
  let suffix = 2;

  while (isTaken(candidate)) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

module.exports = { slugify, createUniqueSlug };
