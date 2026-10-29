'use strict';

const { Router } = require('express');
const controller = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = Router();

router.use(authenticate, requireAdmin);
router.get('/dashboard', controller.getDashboard);

module.exports = router;
