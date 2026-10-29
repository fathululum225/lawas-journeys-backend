'use strict';

const bookingModel = require('../models/booking.model');
const whatsappService = require('../services/whatsapp.service');
const AppError = require('../utils/app-error.util');
const { validate } = require('../utils/validators.util');
const { sendSuccess } = require('../utils/response.util');

const getWhatsappConfig = (req, res) => {
  sendSuccess(res, { data: whatsappService.getPublicConfig() });
};

const notifyBooking = async (req, res) => {
  const v = validate(req.body);
  const bookingCode = v.string('bookingCode', { max: 40 });
  v.throwIfInvalid();

  const booking = bookingModel.findByCode(bookingCode);
  if (!booking) throw AppError.notFound('Booking not found');

  const notification = await whatsappService.sendBookingNotification(booking);
  sendSuccess(res, { data: notification, message: 'WhatsApp confirmation prepared' });
};

module.exports = { getWhatsappConfig, notifyBooking };
