const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const app = express();

const ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173"; // Vite
app.use(cors({
    origin: ORIGIN,
    credentials: true, // QUAN TRỌNG để cookie qua FE
}));

app.use(express.json());
app.use(cookieParser());

// session cho login theo phiên
app.use(session({
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,           // true nếu chạy https
        maxAge: 7 * 24 * 60 * 60 * 1000,
    },
}));

// static ảnh upload (để Customer xem được)
app.use("/uploads", express.static(require("path").join(__dirname, "..", "public", "uploads")));
// ✅ phục vụ toàn bộ thư mục public (trong đó có /uploads)
app.use(express.static(path.join(__dirname, "public")));
// hoặc chỉ mount riêng nếu bạn muốn:
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
// routes
app.use("/api/auth", require("./routes/auth.route"));
app.use("/api/users", require("./routes/user.route"));
app.use("/api/homestays", require("./routes/homestay.route"));

module.exports = app;
