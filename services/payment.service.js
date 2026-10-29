'use strict';

/**
 * Payment gateway wrapper (Midtrans / Xendit ready).
 *
 * The rest of the application only talks to the two functions exported here:
 *   - createTransaction(payload)  -> opens a payment session for a booking
 *   - verifyTransaction(orderId)  -> asks the gateway what happened to it
 *
 * Right now both run a local simulation that mirrors the shape of a real Snap
 * response, so controllers and the frontend will not change when the real
 * calls are wired in. See "CARA INTEGRASI" in the main README.
 */

const crypto = require('node:crypto');
const env = require('../config/env.config');
const AppError = require('../utils/app-error.util');
const paymentModel = require('../models/payment.model');

const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Methods offered on payment.html. In production these come from the gateway. */
const PAYMENT_METHODS = Object.freeze([
  { id: 'bca_va', group: 'Virtual Account', label: 'BCA Virtual Account' },
  { id: 'bni_va', group: 'Virtual Account', label: 'BNI Virtual Account' },
  { id: 'mandiri_va', group: 'Virtual Account', label: 'Mandiri Virtual Account' },
  { id: 'qris', group: 'E-Wallet & QR', label: 'QRIS' },
  { id: 'gopay', group: 'E-Wallet & QR', label: 'GoPay' },
  { id: 'credit_card', group: 'Card', label: 'Credit / Debit Card' },
]);

const generateOrderId = (bookingCode) => `${bookingCode}-${Date.now().toString(36).toUpperCase()}`;

const toTransactionResult = (payment) => ({
  orderId: payment.orderId,
  status: payment.status,
  paymentType: payment.paymentType,
  paidAt: payment.paidAt,
  amount: payment.amount,
  provider: payment.provider,
  simulated: true,
});

/**
 * Opens a payment session.
 * @param {{ bookingCode: string, amount: number, customer: {name: string, email: string, phone: string},
 *           items: Array<{id: string, name: string, price: number, quantity: number}> }} payload
 */
const createTransaction = async (payload) => {
  // TODO: Implement actual Midtrans/Xendit Snap API call here
  //   Midtrans Snap -> POST https://app.sandbox.midtrans.com/snap/v1/transactions
  //     headers: Authorization: Basic base64(PAYMENT_GATEWAY_SERVER_KEY + ':')
  //     body:    { transaction_details: { order_id, gross_amount }, customer_details, item_details }
  //     returns: { token, redirect_url }  -> map them to snapToken / redirectUrl below
  //   Xendit    -> POST https://api.xendit.co/v2/invoices  (returns invoice_url)
  const orderId = generateOrderId(payload.bookingCode);

  return {
    orderId,
    provider: env.payment.provider,
    mode: env.payment.mode,
    simulated: true,
    amount: payload.amount,
    snapToken: `SIM-${crypto.randomBytes(12).toString('hex')}`,
    redirectUrl: null,
    expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MS).toISOString(),
    methods: PAYMENT_METHODS,
  };
};

/**
 * Asks the gateway for the current state of an order.
 * Resolves to { orderId, status, paymentType, paidAt, amount, provider, simulated }
 * where status is one of: pending | settlement | expire | cancel | deny.
 */
const verifyTransaction = async (orderId) => {
  // TODO: Implement actual Midtrans/Xendit status API call here
  //   Midtrans -> GET https://api.sandbox.midtrans.com/v2/{orderId}/status
  //     map transaction_status: settlement|capture -> "settlement", pending -> "pending",
  //     expire -> "expire", cancel -> "cancel", deny -> "deny"
  //   Xendit   -> GET https://api.xendit.co/v2/invoices?external_id={orderId}
  const payment = paymentModel.findByOrderId(orderId);
  if (!payment) throw AppError.notFound('Payment order not found');

  const hasExpired = payment.status === 'pending' && Date.parse(payment.expiresAt) < Date.now();
  if (hasExpired) return toTransactionResult(paymentModel.updateStatus(orderId, { status: 'expire' }));

  return toTransactionResult(payment);
};

/**
 * Sandbox helper standing in for the customer finishing payment inside the gateway popup.
 * Disabled automatically when PAYMENT_SIMULATION=false.
 */
const simulatePayment = async (orderId, methodId) => {
  if (!env.payment.simulation) throw AppError.forbidden('Payment simulation is disabled');

  const method = PAYMENT_METHODS.find((candidate) => candidate.id === methodId);
  if (!method) throw AppError.badRequest('Unknown payment method');

  const payment = paymentModel.findByOrderId(orderId);
  if (!payment) throw AppError.notFound('Payment order not found');
  if (payment.status === 'settlement') return toTransactionResult(payment);
  if (payment.status !== 'pending') throw AppError.conflict(`Payment is already ${payment.status}`);
  if (Date.parse(payment.expiresAt) < Date.now()) throw AppError.conflict('Payment window has expired');

  return toTransactionResult(paymentModel.updateStatus(orderId, {
    status: 'settlement',
    paymentType: method.id,
    paidAt: new Date().toISOString(),
  }));
};

module.exports = { PAYMENT_METHODS, createTransaction, verifyTransaction, simulatePayment };
