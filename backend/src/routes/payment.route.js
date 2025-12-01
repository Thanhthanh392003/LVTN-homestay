// src/routes/payment.route.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/payment.controller");

// Tạo checkout VNPay (tạo booking + payment pending)
router.post("/checkout", ctrl.createCheckout);

// Kiểm tra trạng thái theo Booking_ID
router.get("/status/:bookingId", ctrl.getStatus);

// VNPay return (user quay về sau OTP) -> cập nhật DB + render HTML + nút quay lại
router.get("/vnpay/return", ctrl.vnpayReturn);

// VNPay IPN (server to server) -> cập nhật DB, trả JSON
router.get("/vnpay/ipn", ctrl.vnpayIpn);

module.exports = router;
