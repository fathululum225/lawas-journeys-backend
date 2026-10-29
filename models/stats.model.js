'use strict';

const db = require('../config/database.config');

const countRows = (table, where = '') => db
  .prepare(`SELECT COUNT(*) AS total FROM ${table} ${where}`)
  .get().total;

/** Aggregated figures for the admin dashboard cards. */
const getDashboardTotals = () => ({
  bookings: countRows('bookings'),
  pendingBookings: countRows('bookings', "WHERE status = 'pending'"),
  confirmedBookings: countRows('bookings', "WHERE status = 'confirmed'"),
  cancelledBookings: countRows('bookings', "WHERE status = 'cancelled'"),
  revenue: db
    .prepare("SELECT COALESCE(SUM(total_price), 0) AS total FROM bookings WHERE payment_status = 'paid' AND status != 'cancelled'")
    .get().total,
  packages: countRows('packages'),
  destinations: countRows('destinations'),
  articles: countRows('articles'),
  newCustomTrips: countRows('custom_trips', "WHERE status = 'new'"),
  subscribers: countRows('subscribers'),
});

module.exports = { getDashboardTotals };
