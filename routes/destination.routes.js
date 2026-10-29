'use strict';

const { Router } = require('express');
const controller = require('../controllers/destination.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', controller.listDestinations);
router.get('/:slug', controller.getDestination);

router.post('/', authenticate, requireAdmin, controller.createDestination);
router.put('/:id', authenticate, requireAdmin, controller.updateDestination);
router.delete('/:id', authenticate, requireAdmin, controller.deleteDestination);

module.exports = router;
