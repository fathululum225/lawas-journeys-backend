'use strict';

const { Router } = require('express');
const controller = require('../controllers/package.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', controller.listPackages);
router.get('/:slug', controller.getPackage);

router.post('/', authenticate, requireAdmin, controller.createPackage);
router.put('/:id', authenticate, requireAdmin, controller.updatePackage);
router.delete('/:id', authenticate, requireAdmin, controller.deletePackage);

module.exports = router;
