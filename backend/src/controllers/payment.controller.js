// src/controllers/payment.controller.js
const paymentService = require("../services/payment.service");

async function createCheckout(req, res) {
    try {
        const data = await paymentService.createCheckout(req, req.body);
        return res.json(data);
    } catch (err) {
        console.error("[PAYMENTS] createCheckout error:", err);
        return res.status(400).json({ message: err.message || "Create checkout failed" });
    }
}

async function getStatus(req, res) {
    try {
        const bookingId = Number(req.params.bookingId);
        const data = await paymentService.getStatus(bookingId);
        return res.json(data);
    } catch (err) {
        console.error("[PAYMENTS] getStatus error:", err);
        return res.status(400).json({ message: err.message || "Get status failed" });
    }
}

async function vnpayReturn(req, res) {
    try {
        const html = await paymentService.handleVnpayReturn(req.query);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(html);
    } catch (err) {
        console.error("[PAYMENTS] vnpayReturn error:", err);
        return res.status(400).send(err.message || "vnpayReturn failed");
    }
}

async function vnpayIpn(req, res) {
    try {
        const json = await paymentService.handleVnpayIpn(req.query);
        return res.json(json);
    } catch (err) {
        console.error("[PAYMENTS] vnpayIpn error:", err);
        return res.json({ RspCode: "99", Message: "Unknown error" });
    }
}

module.exports = { createCheckout, getStatus, vnpayReturn, vnpayIpn };
