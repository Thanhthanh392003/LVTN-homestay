// backend/src/routes/user.route.js
const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');

router.post('/register', ctrl.register);

router.get('/me', requireLogin, ctrl.getMe);
router.put('/me/profile', requireLogin, ctrl.updateProfile);
router.put('/me/password', requireLogin, ctrl.changePassword);

router.get('/', requireLogin, requireRole(1), ctrl.listUsers);
router.get('/:id', requireLogin, ctrl.getUserById);
router.put('/:id', requireLogin, ctrl.updateUser);
router.patch('/:id/status', requireLogin, requireRole(1), ctrl.updateUserStatus);
router.delete('/:id', requireLogin, requireRole(1), ctrl.deleteUser);

module.exports = router;
