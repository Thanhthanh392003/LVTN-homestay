// src/routes/rasa.route.js
const express = require("express");
const axios = require("axios");

const router = express.Router();

const RASA_URL =
    process.env.RASA_URL ||
    "http://localhost:5005/webhooks/rest/webhook";

// POST /api/rasa/webhook
router.post("/webhook", async (req, res) => {
    try {
        const { sender, message } = req.body;

        const resp = await axios.post(RASA_URL, {
            sender,
            message,
        });

        return res.json(resp.data);
    } catch (e) {
        console.error("[RASA] proxy error:", e?.response?.data || e.message);
        return res.status(500).json({
            error: "Cannot connect to RASA server",
        });
    }
});

module.exports = router;
