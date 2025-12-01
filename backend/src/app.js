// src/app.js
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const app = express();

const ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.set("trust proxy", 1); // 🔥 QUAN TRỌNG

// ===== Middlewares =====
app.use(
    cors({
        origin: ORIGIN,
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());

app.use(
    session({
        name: "sid",
        secret: process.env.SESSION_SECRET || "dev-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",   // 🔥 GIỮ SESSION SAU VNPay redirect (CHUẨN LOCALHOST)
            secure: false,     // 🔥 LOCALHOST phải để false
            maxAge: 7 * 24 * 60 * 60 * 1000,
        },
    })
);

// 🔎 Log tất cả request để debug prefix
app.use((req, _res, next) => {
    console.log(`[APP] ${req.method} ${req.originalUrl}`);
    next();
});

/* STATIC (giữ nguyên) */
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
const IMAGES_DIR = path.join(PUBLIC_DIR, "images");

for (const d of [PUBLIC_DIR, UPLOADS_DIR, IMAGES_DIR]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

app.use("/public", express.static(PUBLIC_DIR, { maxAge: "30d" }));
app.use("/images", express.static(IMAGES_DIR, { maxAge: "30d" }));
app.use("/api/images", express.static(IMAGES_DIR, { maxAge: "30d" }));
app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "30d" }));
app.use("/api/uploads", express.static(UPLOADS_DIR, { maxAge: "30d" }));

/* ROUTES (giữ nguyên) */
app.use("/api/auth", require("./routes/auth.route"));
app.use("/api/users", require("./routes/user.route"));
app.use("/api/homestays", require("./routes/homestay.route"));
app.use("/api/amenities", require("./routes/amenity.route"));
app.use("/api/rules", require("./routes/rule.route"));
app.use("/api/promotions", require("./routes/promotion.route"));
app.use("/api/bookings", require("./routes/booking.route"));
app.use("/api/payments", require("./routes/payment.route"));
app.use("/api/reviews", require("./routes/review.route"));
app.use("/api/complaints", require("./routes/complaint.route"));
app.use("/api/rasa", require("./routes/rasa.route"));

app.get("/api/reviews/ping", (_req, res) =>
    res.json({ ok: true, where: "/api/reviews" })
);

app.use((req, res) => res.status(404).json({ message: "Not Found" }));

module.exports = app;
