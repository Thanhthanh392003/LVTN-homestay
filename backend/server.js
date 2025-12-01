// server.js
require("dotenv").config({ override: true });
const app = require("./src/app");
app.set("trust proxy", 1);
// ===== VNPay ENV diagnostics (giúp debug code=70) =====
(function showVnpEnv() {
    const len = (s) => String(s || "").trim().length;
    const pick = (k) => (process.env[k] || "").trim();

    const info = {
        TMN_len: len(process.env.VNP_TMNCODE),     // thường = 8
        SECRET_len: len(process.env.VNP_HASHSECRET), // thường = 64 (SHA512 secret)
        URL: pick("VNP_URL"),
        RETURN: pick("VNP_RETURNURL"),
        FRONTEND: pick("FRONTEND_BASE"),
        NODE_ENV: process.env.NODE_ENV || "development",
    };

    console.log("[VNP ENV]", info);
})();

// ===== Hardening: bắt lỗi rơi =====
process.on("unhandledRejection", (err) => {
    console.error("[UNHANDLED REJECTION]", err);
});
process.on("uncaughtException", (err) => {
    console.error("[UNCAUGHT EXCEPTION]", err);
});

// ===== Start server =====
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
});
