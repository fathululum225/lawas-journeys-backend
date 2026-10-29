'use strict';

const { Router } = require('express');
const { sendSuccess } = require('../utils/response.util');

const adminRoutes = require('./admin.routes');
const articleRoutes = require('./article.routes');
const authRoutes = require('./auth.routes');
const bookingRoutes = require('./booking.routes');
const categoryRoutes = require('./category.routes');
const customTripRoutes = require('./custom-trip.routes');
const destinationRoutes = require('./destination.routes');
const newsletterRoutes = require('./newsletter.routes');
const packageRoutes = require('./package.routes');
const paymentRoutes = require('./payment.routes');
const whatsappRoutes = require('./whatsapp.routes');

const router = Router();

router.get('/health', (req, res) => {
  sendSuccess(res, {
    data: { status: 'ok', uptimeSeconds: Math.round(process.uptime()), timestamp: new Date().toISOString() },
  });
});

router.use('/admin', adminRoutes);
router.use('/articles', articleRoutes);
router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/categories', categoryRoutes);
router.use('/custom-trips', customTripRoutes);
router.use('/destinations', destinationRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/packages', packageRoutes);
router.use('/payments', paymentRoutes);
router.use('/whatsapp', whatsappRoutes);

module.exports = router;
