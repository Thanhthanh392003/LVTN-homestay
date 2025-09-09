const router = require('express').Router();
const ctrl = require('../controllers/amenity.controller');
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');

router.get('/', ctrl.listAmenities);
router.post('/', requireLogin, requireRole(1, 2), ctrl.createAmenity);
router.post('/assign', requireLogin, requireRole(1, 2), ctrl.assignAmenity);
router.delete('/assign', requireLogin, requireRole(1, 2), ctrl.removeAmenity);

module.exports = router;
