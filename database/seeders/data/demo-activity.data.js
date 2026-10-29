'use strict';

/**
 * Sample bookings and custom trip requests so the admin dashboard is not empty on first run.
 * Dates are offsets from "now", so the data never looks stale:
 *   travelInDays - how far ahead the trip departs
 *   createdHoursAgo - how long ago the booking was made
 * All people and contact details are fictional.
 */

const bookings = [
  {
    packageSlug: 'ancient-yogyakarta-borobudur',
    customerName: 'Dewi Anggraini',
    customerEmail: 'dewi.anggraini@example.com',
    customerPhone: '+62 812 1111 2222',
    guests: 2,
    travelInDays: 21,
    createdHoursAgo: 5,
    status: 'pending',
    paymentStatus: 'unpaid',
    notes: 'Vegetarian meals please.',
  },
  {
    packageSlug: 'java-archaeology-trail',
    customerName: 'Michael Tan',
    customerEmail: 'michael.tan@example.com',
    customerPhone: '+65 9123 4567',
    guests: 3,
    travelInDays: 45,
    createdHoursAgo: 30,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentType: 'bca_va',
    notes: null,
  },
  {
    packageSlug: 'majapahit-heritage-journey',
    customerName: 'Sari Wulandari',
    customerEmail: 'sari.wulandari@example.com',
    customerPhone: '+62 813 3333 4444',
    guests: 4,
    travelInDays: 60,
    createdHoursAgo: 52,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentType: 'qris',
    notes: 'Family trip with two teenagers.',
  },
  {
    packageSlug: 'banda-neira-historical-voyage',
    customerName: 'Claire Dubois',
    customerEmail: 'claire.dubois@example.com',
    customerPhone: '+33 6 12 34 56 78',
    guests: 2,
    travelInDays: 90,
    createdHoursAgo: 76,
    status: 'pending',
    paymentStatus: 'unpaid',
    notes: 'Interested in the history of the exile period.',
  },
  {
    packageSlug: 'javanese-culinary-trail',
    customerName: 'Hendra Pratama',
    customerEmail: 'hendra.pratama@example.com',
    customerPhone: '+62 811 5555 6666',
    guests: 2,
    travelInDays: 14,
    createdHoursAgo: 120,
    status: 'cancelled',
    paymentStatus: 'unpaid',
    notes: 'Cancelled due to a schedule change.',
  },
  {
    packageSlug: 'toraja-highland-rituals',
    customerName: 'Budi Santoso',
    customerEmail: 'budi.santoso@example.com',
    customerPhone: '+62 878 7777 8888',
    guests: 2,
    travelInDays: 75,
    createdHoursAgo: 200,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentType: 'gopay',
    notes: null,
  },
];

const customTrips = [
  {
    name: 'Anita Rahmawati',
    email: 'anita.rahmawati@example.com',
    phone: '+62 815 9999 0000',
    destinations: ['Yogyakarta', 'East Java'],
    interests: ['Heritage', 'Culinary'],
    travelInDays: 100,
    durationDays: 7,
    guests: 4,
    budgetRange: 'Rp 15.000.000 - 25.000.000',
    message: 'A multi-generational family trip with a grandmother who loves traditional food.',
    status: 'new',
    createdHoursAgo: 8,
  },
  {
    name: 'Tom Henderson',
    email: 'tom.henderson@example.com',
    phone: '+44 7700 900123',
    destinations: ['Central Java'],
    interests: ['Archaeology'],
    travelInDays: 150,
    durationDays: 10,
    guests: 2,
    budgetRange: 'Rp 25.000.000+',
    message: 'We are retired archaeologists looking for a deep-dive itinerary with site access.',
    status: 'contacted',
    createdHoursAgo: 60,
  },
  {
    name: 'Rina Kusuma',
    email: 'rina.kusuma@example.com',
    phone: '+62 821 2468 1357',
    destinations: ['Eastern Indonesia'],
    interests: ['Nature', 'Culture'],
    travelInDays: 120,
    durationDays: 8,
    guests: 3,
    budgetRange: 'Rp 15.000.000 - 25.000.000',
    message: 'Photography-focused trip, with time in villages.',
    status: 'quoted',
    createdHoursAgo: 140,
  },
];

module.exports = { bookings, customTrips };
