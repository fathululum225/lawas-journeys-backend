'use strict';

const { Router } = require('express');
const controller = require('../controllers/whatsapp.controller');

const router = Router();

router.get('/config', controller.getWhatsappConfig);
router.post('/notify', controller.notifyBooking);

module.exports = router;
