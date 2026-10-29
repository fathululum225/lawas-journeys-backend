'use strict';

const db = require('../config/database.config');

const toPayment = (row) => (row ? {
  id: row.id,
  orderId: row.order_id,
  bookingId: row.booking_id,
  provider: row.provider,
  amount: row.amount,
  status: row.status,
  paymentType: row.payment_type,
  snapToken: row.snap_token,
  redirectUrl: row.redirect_url,
  expiresAt: row.expires_at,
  paidAt: row.paid_at,
  createdAt: row.created_at,
} : null);

const findByOrderId = (orderId) => toPayment(db.prepare('SELECT * FROM payments WHERE order_id = ?').get(orderId));

const findLatestByBooking = (bookingId) => toPayment(
  db.prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY id DESC LIMIT 1').get(bookingId),
);

const create = (data) => {
  db.prepare(`
    INSERT INTO payments (order_id, booking_id, provider, amount, snap_token, redirect_url, expires_at)
    VALUES (@orderId, @bookingId, @provider, @amount, @snapToken, @redirectUrl, @expiresAt)
  `).run(data);

  return findByOrderId(data.orderId);
};

const updateStatus = (orderId, { status, paymentType = null, paidAt = null }) => {
  db.prepare(`
    UPDATE payments
    SET status = @status,
        payment_type = COALESCE(@paymentType, payment_type),
        paid_at = COALESCE(@paidAt, paid_at)
    WHERE order_id = @orderId
  `).run({ orderId, status, paymentType, paidAt });

  return findByOrderId(orderId);
};

module.exports = { findByOrderId, findLatestByBooking, create, updateStatus };
