const router = require('express').Router();
const ctrl = require('../controllers/promotion.controller');
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');

// Public / read
router.get('/', ctrl.listPromotions);
router.get('/:id', ctrl.getPromotionById);
router.get('/homestay/:h_id/active', ctrl.listActivePromotionsByHomestay);

// Admin CRUD
router.post('/', requireLogin, requireRole(1), ctrl.createPromotion);
router.put('/:id', requireLogin, requireRole(1), ctrl.updatePromotion);
router.delete('/:id', requireLogin, requireRole(1), ctrl.deletePromotion);

// Owner/Admin apply/remove
router.post('/apply', requireLogin, requireRole(1, 2), ctrl.applyPromotionToHomestay);
router.delete('/apply', requireLogin, requireRole(1, 2), ctrl.removePromotionFromHomestay);

module.exports = router;
