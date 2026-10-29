'use strict';

/**
 * WhatsApp Business wrapper.
 *
 * Controllers call sendBookingNotification(booking) and never care how the
 * message travels. Today it returns a wa.me deep link that the frontend opens;
 * later the same function can push a template message through the official
 * WhatsApp Business Cloud API.
 */

const env = require('../config/env.config');

const formatRupiah = (amount) => `Rp ${Number(amount).toLocaleString('id-ID')}`;

const formatTravelDate = (isoDate) => new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const buildBookingMessage = (booking) => [
  'Hello Lawas Journeys, I would like to confirm my booking.',
  '',
  `Booking code : ${booking.code}`,
  `Package      : ${booking.packageTitle}`,
  `Travel date  : ${formatTravelDate(booking.travelDate)}`,
  `Guests       : ${booking.guests}`,
  `Total        : ${formatRupiah(booking.totalPrice)} (${booking.paymentStatus})`,
  `Name         : ${booking.customerName}`,
].join('\n');

const buildChatLink = (number, message) => `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

/** Public data used by the floating WhatsApp button on every page. */
const getPublicConfig = () => ({
  provider: env.whatsapp.provider,
  number: env.whatsapp.businessNumber,
  greeting: 'Hello Lawas Journeys, I would like to ask about your heritage journeys.',
  chatUrl: buildChatLink(
    env.whatsapp.businessNumber,
    'Hello Lawas Journeys, I would like to ask about your heritage journeys.',
  ),
});

/**
 * Notifies the business about a booking.
 * @returns {Promise<{ channel: string, delivered: boolean, url: string, message: string }>}
 */
const sendBookingNotification = async (booking) => {
  const message = buildBookingMessage(booking);

  // TODO: Switch to official WhatsApp Business Cloud API when token is provided
  //   POST https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages
  //     headers: Authorization: Bearer WHATSAPP_API_TOKEN
  //     body:    { messaging_product: "whatsapp", to: <recipient>, type: "template", template: {...} }
  //   Use env.whatsapp.hasCredentials to branch between the Cloud API and the fallback below.
  return {
    channel: 'wa-link',
    delivered: false,
    url: buildChatLink(env.whatsapp.businessNumber, message),
    message,
  };
};

module.exports = { getPublicConfig, sendBookingNotification, buildBookingMessage };
