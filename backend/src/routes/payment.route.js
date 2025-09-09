const router = require('express').Router();
const ctrl = require('../controllers/payment.controller');
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');

router.post('/', requireLogin, requireRole(1, 2, 3), ctrl.createPayment);
router.get('/booking/:bookingId', requireLogin, requireRole(1, 2, 3), ctrl.listPaymentsByBooking);
router.patch('/:id/status', requireLogin, requireRole(1), ctrl.updatePaymentStatus);

module.exports = router;
