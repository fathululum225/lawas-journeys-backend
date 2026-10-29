'use strict';

const { Router } = require('express');
const controller = require('../controllers/newsletter.controller');

const router = Router();

router.post('/', controller.subscribe);

module.exports = router;
