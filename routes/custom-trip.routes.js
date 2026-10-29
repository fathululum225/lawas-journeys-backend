'use strict';

const { Router } = require('express');
const controller = require('../controllers/custom-trip.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = Router();

router.post('/', controller.createCustomTrip);

router.get('/', authenticate, requireAdmin, controller.listCustomTrips);
router.patch('/:id/status', authenticate, requireAdmin, controller.updateCustomTripStatus);
router.delete('/:id', authenticate, requireAdmin, controller.deleteCustomTrip);

module.exports = router;
