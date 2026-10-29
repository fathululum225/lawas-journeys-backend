'use strict';

const bookingModel = require('../models/booking.model');
const statsModel = require('../models/stats.model');
const { sendSuccess } = require('../utils/response.util');

const RECENT_BOOKINGS_LIMIT = 6;

const getDashboard = (req, res) => {
  const { items: recentBookings } = bookingModel.findAll({}, { limit: RECENT_BOOKINGS_LIMIT });

  sendSuccess(res, {
    data: {
      totals: statsModel.getDashboardTotals(),
      recentBookings,
    },
  });
};

module.exports = { getDashboard };
