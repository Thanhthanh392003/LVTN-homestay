const router = require('express').Router();
const ctrl = require('../controllers/booking.controller');
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');

router.post('/', requireLogin, requireRole(3), ctrl.createBooking);
router.get('/mine', requireLogin, requireRole(3), ctrl.listMyBookings);

router.get('/:id', requireLogin, ctrl.getBookingById);
router.patch('/:id/cancel', requireLogin, ctrl.cancelBooking);
router.patch('/:id/decision', requireLogin, requireRole(1, 2), ctrl.ownerDecision);

module.exports = router;
