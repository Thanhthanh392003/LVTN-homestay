const router = require('express').Router();
const ctrl = require('../controllers/complaint.controller');
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');

router.post('/', requireLogin, requireRole(3, 1), ctrl.createComplaint);
router.get('/mine', requireLogin, requireRole(3, 1), ctrl.listMyComplaints);
router.get('/', requireLogin, requireRole(1, 2), ctrl.listComplaintsForOwner);
router.patch('/:id/status', requireLogin, requireRole(1, 2), ctrl.updateComplaintStatus);

module.exports = router;
