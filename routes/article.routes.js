'use strict';

const { Router } = require('express');
const controller = require('../controllers/article.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', controller.listArticles);
// Fixed paths must be declared before "/:slug" so they are not read as a slug.
router.get('/categories', controller.listCategories);
router.get('/tags', controller.listPopularTags);
router.get('/:slug', controller.getArticle);

router.post('/', authenticate, requireAdmin, controller.createArticle);
router.put('/:id', authenticate, requireAdmin, controller.updateArticle);
router.delete('/:id', authenticate, requireAdmin, controller.deleteArticle);

module.exports = router;
