// src/routes/owner.route.js
const express = require('express');
const router = express.Router();

const ownerCtrl = require('../controllers/owner.controller');
const requireLogin = require('../middlewares/requireLogin');
const { uploadManyImages } = require('../middlewares/imageUpload');
const JSend = require('../jsend');

// (Tuỳ chọn) chặn vai trò khác: chỉ owner(2)/admin(1)
function ensureOwnerOrAdmin(req, res, next) {
    const role = req.session?.role;
    if (role === 1 || role === 2) return next();
    return res.status(403).json(JSend.fail('Chỉ dành cho Chủ nhà (Owner) / Admin'));
}

// Dashboard
router.get('/dashboard', requireLogin, ensureOwnerOrAdmin, ownerCtrl.dashboard);

// CRUD Homestays (của tôi)
router.get('/homestays', requireLogin, ensureOwnerOrAdmin, ownerCtrl.listHomestays);
router.post('/homestays', requireLogin, ensureOwnerOrAdmin, ownerCtrl.createHomestay);
router.get('/homestays/:id', requireLogin, ensureOwnerOrAdmin, ownerCtrl.getHomestay);
router.put('/homestays/:id', requireLogin, ensureOwnerOrAdmin, ownerCtrl.updateHomestay);
router.delete('/homestays/:id', requireLogin, ensureOwnerOrAdmin, ownerCtrl.deleteHomestay);

// Upload images cho 1 homestay
router.post(
    '/homestays/:id/images',
    requireLogin,
    ensureOwnerOrAdmin,
    (req, res, next) =>
        uploadManyImages(req, res, (err) => (err ? res.status(400).json(JSend.fail(err.message)) : next())),
    ownerCtrl.addImages
);

// Booking thuộc homestay của tôi
router.get('/bookings', requireLogin, ensureOwnerOrAdmin, ownerCtrl.listBookings);
router.patch('/bookings/:id/status', requireLogin, ensureOwnerOrAdmin, ownerCtrl.updateBookingStatus);

module.exports = router;
