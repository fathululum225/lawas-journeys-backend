'use strict';

const { Router } = require('express');
const controller = require('../controllers/booking.controller');
const { authenticate, optionalAuthenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = Router();

router.post('/', optionalAuthenticate, controller.createBooking);
router.get('/', authenticate, requireAdmin, controller.listBookings);

// Fixed paths must be declared before "/:code".
router.get('/mine', authenticate, controller.listMyBookings);
router.get('/lookup', controller.lookupBooking);

router.get('/:code', controller.getBooking);
router.patch('/:code/status', authenticate, requireAdmin, controller.updateBookingStatus);

module.exports = router;
