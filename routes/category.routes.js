'use strict';

const { Router } = require('express');
const controller = require('../controllers/category.controller');

const router = Router();

router.get('/', controller.listCategories);

module.exports = router;
