'use strict';

const env = require('../config/env.config');
const bookingModel = require('../models/booking.model');
const paymentModel = require('../models/payment.model');
const paymentService = require('../services/payment.service');
const AppError = require('../utils/app-error.util');
const { validate } = require('../utils/validators.util');
const { sendSuccess } = require('../utils/response.util');

const isExpired = (payment) => Date.parse(payment.expiresAt) < Date.now();

/** What a booking looks like once its payment state changes. */
const buildBookingPatch = (paymentStatus, booking) => {
  switch (paymentStatus) {
    case 'settlement':
      return { paymentStatus: 'paid', status: booking.status === 'pending' ? 'confirmed' : undefined };
    case 'expire':
      return { paymentStatus: 'expired' };
    case 'cancel':
    case 'deny':
      return { paymentStatus: 'failed' };
    default:
      return null;
  }
};

/** Shape returned to payment.html: the payment session plus a summary of its booking. */
const presentPayment = (payment, booking) => ({
  orderId: payment.orderId,
  status: payment.status,
  paymentType: payment.paymentType,
  amount: payment.amount,
  provider: payment.provider,
  mode: env.payment.mode,
  simulated: env.payment.simulation,
  clientKey: env.payment.clientKey || null,
  snapToken: payment.snapToken,
  redirectUrl: payment.redirectUrl,
  expiresAt: payment.expiresAt,
  paidAt: payment.paidAt,
  methods: paymentService.PAYMENT_METHODS,
  booking: {
    code: booking.code,
    packageTitle: booking.packageTitle,
    packageImage: booking.packageImage,
    travelDate: booking.travelDate,
    guests: booking.guests,
    totalPrice: booking.totalPrice,
    customerName: booking.customerName,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
  },
});

/** Asks the gateway for the latest state and mirrors it onto the payment and its booking. */
const refreshPayment = async (orderId) => {
  const result = await paymentService.verifyTransaction(orderId);

  const payment = paymentModel.updateStatus(orderId, {
    status: result.status,
    paymentType: result.paymentType,
    paidAt: result.paidAt,
  });

  const booking = bookingModel.findById(payment.bookingId);
  const patch = buildBookingPatch(result.status, booking);
  const syncedBooking = patch ? bookingModel.updatePaymentState(booking.id, patch) : booking;

  return presentPayment(payment, syncedBooking);
};

const createPayment = async (req, res) => {
  const v = validate(req.body);
  const bookingCode = v.string('bookingCode', { max: 40 });
  v.throwIfInvalid();

  const booking = bookingModel.findByCode(bookingCode);
  if (!booking) throw AppError.notFound('Booking not found');
  if (booking.paymentStatus === 'paid') throw AppError.conflict('This booking has already been paid');
  if (booking.status === 'cancelled') throw AppError.conflict('This booking has been cancelled');

  const openPayment = paymentModel.findLatestByBooking(booking.id);
  if (openPayment && openPayment.status === 'pending' && !isExpired(openPayment)) {
    return sendSuccess(res, { data: presentPayment(openPayment, booking), message: 'Payment session resumed' });
  }

  const transaction = await paymentService.createTransaction({
    bookingCode: booking.code,
    amount: booking.totalPrice,
    customer: { name: booking.customerName, email: booking.customerEmail, phone: booking.customerPhone },
    items: [{
      id: String(booking.packageId),
      name: booking.packageTitle,
      price: booking.unitPrice,
      quantity: booking.guests,
    }],
  });

  const payment = paymentModel.create({
    orderId: transaction.orderId,
    bookingId: booking.id,
    provider: transaction.provider,
    amount: transaction.amount,
    snapToken: transaction.snapToken,
    redirectUrl: transaction.redirectUrl,
    expiresAt: transaction.expiresAt,
  });

  return sendSuccess(res, {
    data: presentPayment(payment, booking),
    message: 'Payment session created',
    statusCode: 201,
  });
};

const getPayment = async (req, res) => {
  sendSuccess(res, { data: await refreshPayment(req.params.orderId) });
};

const verifyPayment = async (req, res) => {
  const v = validate(req.body);
  const orderId = v.string('orderId', { max: 80 });
  v.throwIfInvalid();

  sendSuccess(res, { data: await refreshPayment(orderId), message: 'Payment status refreshed' });
};

/** Sandbox only: stands in for the customer completing payment inside the gateway popup. */
const simulatePayment = async (req, res) => {
  const v = validate(req.body);
  const method = v.string('method', { max: 40 });
  v.throwIfInvalid();

  await paymentService.simulatePayment(req.params.orderId, method);
  sendSuccess(res, { data: await refreshPayment(req.params.orderId), message: 'Payment completed (simulation)' });
};

/** Endpoint for the gateway's server-to-server notification (webhook). */
const handleNotification = async (req, res) => {
  // TODO: Verify the notification signature (Midtrans: SHA512(order_id + status_code + gross_amount + serverKey))
  const orderId = req.body?.order_id || req.body?.orderId;
  if (!orderId) throw AppError.badRequest('order_id is required');

  await refreshPayment(String(orderId));
  sendSuccess(res, { message: 'Notification processed' });
};

module.exports = { createPayment, getPayment, verifyPayment, simulatePayment, handleNotification };
