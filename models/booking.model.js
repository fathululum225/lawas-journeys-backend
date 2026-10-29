'use strict';

const crypto = require('node:crypto');
const db = require('../config/database.config');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid misreading

const BOOKING_STATUSES = Object.freeze(['pending', 'confirmed', 'cancelled']);

const toBooking = (row) => (row ? {
  id: row.id,
  code: row.code,
  packageId: row.package_id,
  packageTitle: row.package_title,
  packageSlug: row.package_slug ?? null,
  packageImage: row.package_image ?? null,
  userId: row.user_id,
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  customerPhone: row.customer_phone,
  travelDate: row.travel_date,
  guests: row.guests,
  unitPrice: row.unit_price,
  totalPrice: row.total_price,
  notes: row.notes,
  status: row.status,
  paymentStatus: row.payment_status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
} : null);

const BASE_SELECT = `
  SELECT b.*, p.slug AS package_slug, p.image AS package_image
  FROM bookings b
  LEFT JOIN packages p ON p.id = b.package_id
`;

/** Example: LJ-261029-7K4Q */
const generateCode = () => {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Array.from(crypto.randomBytes(4), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
  return `LJ-${datePart}-${randomPart}`;
};

const generateUniqueCode = () => {
  const exists = db.prepare('SELECT 1 FROM bookings WHERE code = ?');
  let code = generateCode();
  while (exists.get(code)) code = generateCode();
  return code;
};

const findByCode = (code) => toBooking(db.prepare(`${BASE_SELECT} WHERE b.code = ?`).get(code));

const findById = (id) => toBooking(db.prepare(`${BASE_SELECT} WHERE b.id = ?`).get(id));

const findByCodeAndEmail = (code, email) => toBooking(
  db.prepare(`${BASE_SELECT} WHERE b.code = ? AND LOWER(b.customer_email) = LOWER(?)`).get(code, email),
);

const findByUser = (user) => db
  .prepare(`${BASE_SELECT} WHERE b.user_id = @id OR LOWER(b.customer_email) = LOWER(@email) ORDER BY b.created_at DESC`)
  .all({ id: user.id, email: user.email })
  .map(toBooking);

const findAll = ({ status, q } = {}, { limit = 50, offset = 0 } = {}) => {
  const conditions = [];
  const params = {};

  if (status) {
    conditions.push('b.status = @status');
    params.status = status;
  }
  if (q) {
    conditions.push('(b.code LIKE @q OR b.customer_name LIKE @q OR b.customer_email LIKE @q OR b.package_title LIKE @q)');
    params.q = `%${q}%`;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const items = db
    .prepare(`${BASE_SELECT} ${where} ORDER BY b.created_at DESC, b.id DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset })
    .map(toBooking);

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM bookings b ${where}`).get(params);

  return { items, total };
};

const create = (data) => {
  const code = generateUniqueCode();

  db.prepare(`
    INSERT INTO bookings (
      code, package_id, package_title, user_id, customer_name, customer_email, customer_phone,
      travel_date, guests, unit_price, total_price, notes
    ) VALUES (
      @code, @packageId, @packageTitle, @userId, @customerName, @customerEmail, @customerPhone,
      @travelDate, @guests, @unitPrice, @totalPrice, @notes
    )
  `).run({ ...data, code, userId: data.userId ?? null, notes: data.notes || null });

  return findByCode(code);
};

const updateStatus = (code, status) => {
  db.prepare("UPDATE bookings SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE code = ?")
    .run(status, code);
  return findByCode(code);
};

const updatePaymentState = (bookingId, { paymentStatus, status }) => {
  db.prepare(`
    UPDATE bookings
    SET payment_status = @paymentStatus,
        status = COALESCE(@status, status),
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = @bookingId
  `).run({ bookingId, paymentStatus, status: status ?? null });

  return findById(bookingId);
};

module.exports = {
  BOOKING_STATUSES,
  generateUniqueCode,
  findByCode,
  findById,
  findByCodeAndEmail,
  findByUser,
  findAll,
  create,
  updateStatus,
  updatePaymentState,
};
