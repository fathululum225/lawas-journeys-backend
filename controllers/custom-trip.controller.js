'use strict';

const customTripModel = require('../models/custom-trip.model');
const AppError = require('../utils/app-error.util');
const { validate } = require('../utils/validators.util');
const { sendSuccess } = require('../utils/response.util');

const findOrFail = (id) => {
  const request = customTripModel.findById(Number(id));
  if (!request) throw AppError.notFound('Custom trip request not found');
  return request;
};

const createCustomTrip = (req, res) => {
  const v = validate(req.body);

  const payload = {
    name: v.string('name', { min: 2, max: 80 }),
    email: v.email('email'),
    phone: v.phone('phone'),
    destinations: v.stringList('destinations', { maxItems: 10, maxLength: 60 }),
    interests: v.stringList('interests', { maxItems: 10, maxLength: 40 }),
    travelDate: v.date('travelDate', { required: false, notInPast: true }),
    durationDays: v.integer('durationDays', { required: false, min: 1, max: 60 }),
    guests: v.integer('guests', { required: false, min: 1, max: 100, fallback: 2 }),
    budgetRange: v.string('budgetRange', { required: false, max: 60 }),
    message: v.string('message', { required: false, max: 2000 }),
  };
  v.throwIfInvalid();

  sendSuccess(res, {
    data: customTripModel.create(payload),
    message: 'Thank you! Our team will craft your custom journey and contact you shortly.',
    statusCode: 201,
  });
};

const listCustomTrips = (req, res) => {
  const status = customTripModel.CUSTOM_TRIP_STATUSES.includes(req.query.status) ? req.query.status : undefined;
  sendSuccess(res, { data: customTripModel.findAll({ status }) });
};

const updateCustomTripStatus = (req, res) => {
  const request = findOrFail(req.params.id);

  const v = validate(req.body);
  const status = v.oneOf('status', customTripModel.CUSTOM_TRIP_STATUSES);
  v.throwIfInvalid();

  sendSuccess(res, { data: customTripModel.updateStatus(request.id, status), message: `Request marked as ${status}` });
};

const deleteCustomTrip = (req, res) => {
  const request = findOrFail(req.params.id);
  customTripModel.remove(request.id);

  sendSuccess(res, { message: 'Custom trip request deleted' });
};

module.exports = { createCustomTrip, listCustomTrips, updateCustomTripStatus, deleteCustomTrip };
