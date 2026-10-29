'use strict';

const { Router } = require('express');
const controller = require('../controllers/payment.controller');

const router = Router();

router.post('/create', controller.createPayment);
router.post('/verify', controller.verifyPayment);
router.post('/notification', controller.handleNotification);

router.get('/:orderId', controller.getPayment);
router.post('/:orderId/simulate', controller.simulatePayment);

module.exports = router;
