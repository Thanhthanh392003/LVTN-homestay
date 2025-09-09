const router = require('express').Router();
const ctrl = require('../controllers/feedback.controller');
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');

router.post('/', requireLogin, requireRole(3, 1), ctrl.createFeedback);
router.get('/homestay/:h_id', ctrl.listFeedbackByHomestay);
router.patch('/:id/respond', requireLogin, requireRole(1, 2), ctrl.respondFeedback);

module.exports = router;
