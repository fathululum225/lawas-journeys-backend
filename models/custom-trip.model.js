'use strict';

const db = require('../config/database.config');
const { parseJson, stringifyJson } = require('../utils/json.util');

const CUSTOM_TRIP_STATUSES = Object.freeze(['new', 'contacted', 'quoted', 'closed']);

const toCustomTrip = (row) => (row ? {
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  destinations: parseJson(row.destinations, []),
  interests: parseJson(row.interests, []),
  travelDate: row.travel_date,
  durationDays: row.duration_days,
  guests: row.guests,
  budgetRange: row.budget_range,
  message: row.message,
  status: row.status,
  createdAt: row.created_at,
} : null);

const findById = (id) => toCustomTrip(db.prepare('SELECT * FROM custom_trips WHERE id = ?').get(id));

const findAll = ({ status } = {}) => {
  const rows = status
    ? db.prepare('SELECT * FROM custom_trips WHERE status = ? ORDER BY created_at DESC, id DESC').all(status)
    : db.prepare('SELECT * FROM custom_trips ORDER BY created_at DESC, id DESC').all();

  return rows.map(toCustomTrip);
};

const create = (data) => {
  const result = db.prepare(`
    INSERT INTO custom_trips (name, email, phone, destinations, interests, travel_date, duration_days, guests, budget_range, message)
    VALUES (@name, @email, @phone, @destinations, @interests, @travelDate, @durationDays, @guests, @budgetRange, @message)
  `).run({
    ...data,
    destinations: stringifyJson(data.destinations),
    interests: stringifyJson(data.interests),
    travelDate: data.travelDate || null,
    durationDays: data.durationDays ?? null,
    budgetRange: data.budgetRange || null,
    message: data.message || null,
  });

  return findById(result.lastInsertRowid);
};

const updateStatus = (id, status) => {
  db.prepare('UPDATE custom_trips SET status = ? WHERE id = ?').run(status, id);
  return findById(id);
};

const remove = (id) => db.prepare('DELETE FROM custom_trips WHERE id = ?').run(id).changes > 0;

module.exports = { CUSTOM_TRIP_STATUSES, findById, findAll, create, updateStatus, remove };
