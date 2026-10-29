'use strict';

/**
 * Seeds the database with the content shown in the design reference.
 *
 *   npm run seed        add demo data (skips when the database already has packages)
 *   npm run db:reset    wipe every table, then seed again
 *
 * The server also calls seedDatabase() on first start when AUTO_SEED=true.
 */

const env = require('../../config/env.config');
const authService = require('../../services/auth.service');
const bookingModel = require('../../models/booking.model');
const { stringifyJson } = require('../../utils/json.util');

const categories = require('./data/categories.data');
const destinations = require('./data/destinations.data');
const packages = require('./data/packages.data');
const articles = require('./data/articles.data');
const demoActivity = require('./data/demo-activity.data');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const isoDateInDays = (days) => new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
const isoTimestampHoursAgo = (hours) => new Date(Date.now() - hours * HOUR_MS).toISOString();

/** Children first, so foreign keys never block the deletes. */
const TABLES_TO_CLEAR = [
  'payments',
  'bookings',
  'custom_trips',
  'subscribers',
  'packages',
  'attractions',
  'destinations',
  'articles',
  'categories',
  'users',
];

const clearTables = (db) => {
  TABLES_TO_CLEAR.forEach((table) => db.exec(`DELETE FROM ${table}`));
  db.exec(`DELETE FROM sqlite_sequence WHERE name IN (${TABLES_TO_CLEAR.map((table) => `'${table}'`).join(', ')})`);
};

const isDatabaseEmpty = (db) => db.prepare('SELECT COUNT(*) AS total FROM packages').get().total === 0;

const seedCategories = (db) => {
  const insert = db.prepare(
    'INSERT INTO categories (slug, name, tagline, image, sort_order) VALUES (@slug, @name, @tagline, @image, @sortOrder)',
  );
  categories.forEach((category, index) => insert.run({ ...category, sortOrder: index + 1 }));
};

/** Returns a map of destination slug -> id, needed to link packages. */
const seedDestinations = (db) => {
  const insertDestination = db.prepare(`
    INSERT INTO destinations (slug, name, tagline, description, image, best_time, sort_order)
    VALUES (@slug, @name, @tagline, @description, @image, @bestTime, @sortOrder)
  `);
  const insertAttraction = db.prepare(`
    INSERT INTO attractions (destination_id, name, description, location, image, sort_order)
    VALUES (@destinationId, @name, @description, @location, @image, @sortOrder)
  `);

  const idsBySlug = {};

  destinations.forEach(({ attractions, bestTime, ...destination }) => {
    const { lastInsertRowid } = insertDestination.run({ ...destination, bestTime: stringifyJson(bestTime, {}) });
    idsBySlug[destination.slug] = Number(lastInsertRowid);

    attractions.forEach((attraction, index) => insertAttraction.run({
      ...attraction,
      destinationId: idsBySlug[destination.slug],
      sortOrder: index + 1,
    }));
  });

  return idsBySlug;
};

/** Returns a map of package slug -> { id, title, price }, needed to link demo bookings. */
const seedPackages = (db, destinationIds) => {
  const insert = db.prepare(`
    INSERT INTO packages (
      slug, title, destination_id, categories, summary, description, duration_days, duration_nights,
      group_type, min_pax, max_pax, difficulty, price, original_price, rating, review_count, image,
      highlights, itinerary, includes, excludes, is_featured
    ) VALUES (
      @slug, @title, @destinationId, @categories, @summary, @description, @durationDays, @durationNights,
      @groupType, @minPax, @maxPax, @difficulty, @price, @originalPrice, @rating, @reviewCount, @image,
      @highlights, @itinerary, @includes, @excludes, @isFeatured
    )
  `);

  const bySlug = {};

  packages.forEach((tourPackage) => {
    const { lastInsertRowid } = insert.run({
      slug: tourPackage.slug,
      title: tourPackage.title,
      destinationId: destinationIds[tourPackage.destination],
      categories: stringifyJson(tourPackage.categories),
      summary: tourPackage.summary,
      description: tourPackage.description,
      durationDays: tourPackage.durationDays,
      durationNights: tourPackage.durationNights,
      groupType: tourPackage.groupType,
      minPax: tourPackage.minPax,
      maxPax: tourPackage.maxPax,
      difficulty: tourPackage.difficulty,
      price: tourPackage.price,
      originalPrice: tourPackage.originalPrice,
      rating: tourPackage.rating,
      reviewCount: tourPackage.reviewCount,
      image: tourPackage.image,
      highlights: stringifyJson(tourPackage.highlights),
      itinerary: stringifyJson(tourPackage.itinerary.map(([title, description], index) => ({
        day: index + 1,
        title,
        description,
      }))),
      includes: stringifyJson(tourPackage.includes),
      excludes: stringifyJson(tourPackage.excludes),
      isFeatured: tourPackage.isFeatured ? 1 : 0,
    });

    bySlug[tourPackage.slug] = { id: Number(lastInsertRowid), title: tourPackage.title, price: tourPackage.price };
  });

  return bySlug;
};

const seedArticles = (db) => {
  const insert = db.prepare(`
    INSERT INTO articles (slug, title, excerpt, content, category, image, tags, read_minutes, is_featured, published_at)
    VALUES (@slug, @title, @excerpt, @content, @category, @image, @tags, @readMinutes, @isFeatured, @publishedAt)
  `);

  articles.forEach((article) => insert.run({
    ...article,
    tags: stringifyJson(article.tags),
    isFeatured: article.isFeatured ? 1 : 0,
  }));
};

const seedAdminUser = (db) => {
  const { admin } = env.auth;
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(admin.email);
  if (exists) return;

  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
    .run(admin.name, admin.email, authService.hashPassword(admin.password));
};

const seedDemoActivity = (db, packagesBySlug) => {
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      code, package_id, package_title, customer_name, customer_email, customer_phone, travel_date,
      guests, unit_price, total_price, notes, status, payment_status, created_at, updated_at
    ) VALUES (
      @code, @packageId, @packageTitle, @customerName, @customerEmail, @customerPhone, @travelDate,
      @guests, @unitPrice, @totalPrice, @notes, @status, @paymentStatus, @createdAt, @createdAt
    )
  `);
  const insertPayment = db.prepare(`
    INSERT INTO payments (order_id, booking_id, provider, amount, status, payment_type, snap_token, expires_at, paid_at, created_at)
    VALUES (@orderId, @bookingId, @provider, @amount, 'settlement', @paymentType, @snapToken, @expiresAt, @paidAt, @createdAt)
  `);

  demoActivity.bookings.forEach((demo) => {
    const tourPackage = packagesBySlug[demo.packageSlug];
    const code = bookingModel.generateUniqueCode();
    const createdAt = isoTimestampHoursAgo(demo.createdHoursAgo);

    const { lastInsertRowid } = insertBooking.run({
      code,
      packageId: tourPackage.id,
      packageTitle: tourPackage.title,
      customerName: demo.customerName,
      customerEmail: demo.customerEmail,
      customerPhone: demo.customerPhone,
      travelDate: isoDateInDays(demo.travelInDays),
      guests: demo.guests,
      unitPrice: tourPackage.price,
      totalPrice: tourPackage.price * demo.guests,
      notes: demo.notes,
      status: demo.status,
      paymentStatus: demo.paymentStatus,
      createdAt,
    });

    if (demo.paymentStatus === 'paid') {
      insertPayment.run({
        orderId: `${code}-DEMO`,
        bookingId: Number(lastInsertRowid),
        provider: env.payment.provider,
        amount: tourPackage.price * demo.guests,
        paymentType: demo.paymentType,
        snapToken: 'SIM-DEMO',
        expiresAt: new Date(Date.parse(createdAt) + DAY_MS).toISOString(),
        paidAt: new Date(Date.parse(createdAt) + HOUR_MS).toISOString(),
        createdAt,
      });
    }
  });

  const insertCustomTrip = db.prepare(`
    INSERT INTO custom_trips (name, email, phone, destinations, interests, travel_date, duration_days, guests, budget_range, message, status, created_at)
    VALUES (@name, @email, @phone, @destinations, @interests, @travelDate, @durationDays, @guests, @budgetRange, @message, @status, @createdAt)
  `);

  demoActivity.customTrips.forEach(({ travelInDays, createdHoursAgo, ...request }) => insertCustomTrip.run({
    ...request,
    destinations: stringifyJson(request.destinations),
    interests: stringifyJson(request.interests),
    travelDate: isoDateInDays(travelInDays),
    createdAt: isoTimestampHoursAgo(createdHoursAgo),
  }));
};

/**
 * Inserts all seed data inside one transaction.
 * @param {import('better-sqlite3').Database} db
 * @param {{ reset?: boolean, withDemoActivity?: boolean }} [options]
 */
const seedDatabase = (db, { reset = false, withDemoActivity = true } = {}) => {
  db.transaction(() => {
    if (reset) clearTables(db);

    seedCategories(db);
    const destinationIds = seedDestinations(db);
    const packagesBySlug = seedPackages(db, destinationIds);
    seedArticles(db);
    seedAdminUser(db);

    if (withDemoActivity) seedDemoActivity(db, packagesBySlug);
  })();
};

const runCli = () => {
  const db = require('../../config/database.config');
  const { runMigrations } = require('../migrator');

  const reset = process.argv.includes('--reset');
  runMigrations(db);

  if (!reset && !isDatabaseEmpty(db)) {
    console.log('Database already contains data. Run "npm run db:reset" to wipe it and seed again.');
  } else {
    seedDatabase(db, { reset });
    console.log(`Seeded ${packages.length} packages, ${destinations.length} destinations and ${articles.length} articles.`);
    console.log(`Admin account: ${env.auth.admin.email}`);
  }

  db.close();
};

if (require.main === module) runCli();

module.exports = { seedDatabase, isDatabaseEmpty };
