'use strict';

const bookingModel = require('../models/booking.model');
const packageModel = require('../models/package.model');
const AppError = require('../utils/app-error.util');
const { validate } = require('../utils/validators.util');
const { parsePagination } = require('../utils/pagination.util');
const { sendSuccess, buildPagination } = require('../utils/response.util');

const findPackageFromBody = (body) => {
  if (body.packageId) return packageModel.findById(Number(body.packageId));
  if (body.packageSlug) return packageModel.findBySlug(String(body.packageSlug));
  return null;
};

const findBookingOrFail = (code) => {
  const booking = bookingModel.findByCode(code);
  if (!booking) throw AppError.notFound('Booking not found');
  return booking;
};

const createBooking = (req, res) => {
  const tourPackage = findPackageFromBody(req.body);
  if (!tourPackage) throw AppError.notFound('Package not found');

  const v = validate(req.body);
  const guests = v.integer('guests', { min: 1, max: tourPackage.maxPax });

  const payload = {
    customerName: v.string('customerName', { min: 2, max: 80 }),
    customerEmail: v.email('customerEmail'),
    customerPhone: v.phone('customerPhone'),
    travelDate: v.date('travelDate', { notInPast: true }),
    guests,
    notes: v.string('notes', { required: false, max: 1000 }),
  };
  v.throwIfInvalid();

  const booking = bookingModel.create({
    ...payload,
    packageId: tourPackage.id,
    packageTitle: tourPackage.title,
    userId: req.user?.id ?? null,
    unitPrice: tourPackage.price,
    totalPrice: tourPackage.price * payload.guests,
  });

  sendSuccess(res, { data: booking, message: 'Booking created', statusCode: 201 });
};

const getBooking = (req, res) => {
  sendSuccess(res, { data: findBookingOrFail(req.params.code) });
};

const lookupBooking = (req, res) => {
  const v = validate(req.query);
  const code = v.string('code', { max: 40 });
  const email = v.email('email');
  v.throwIfInvalid();

  const booking = bookingModel.findByCodeAndEmail(code.toUpperCase(), email);
  if (!booking) throw AppError.notFound('No booking matches that code and email address');

  sendSuccess(res, { data: booking });
};

const listMyBookings = (req, res) => {
  sendSuccess(res, { data: bookingModel.findByUser(req.user) });
};

const listBookings = (req, res) => {
  const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 20 });
  const status = bookingModel.BOOKING_STATUSES.includes(req.query.status) ? req.query.status : undefined;
  const q = typeof req.query.q === 'string' && req.query.q.trim() !== '' ? req.query.q.trim() : undefined;

  const { items, total } = bookingModel.findAll({ status, q }, { limit, offset });

  sendSuccess(res, { data: items, meta: buildPagination({ page, limit, total }) });
};

const updateBookingStatus = (req, res) => {
  const booking = findBookingOrFail(req.params.code);

  const v = validate(req.body);
  const status = v.oneOf('status', bookingModel.BOOKING_STATUSES);
  v.throwIfInvalid();

  sendSuccess(res, {
    data: bookingModel.updateStatus(booking.code, status),
    message: `Booking marked as ${status}`,
  });
};

module.exports = {
  createBooking,
  getBooking,
  lookupBooking,
  listMyBookings,
  listBookings,
  updateBookingStatus,
};
