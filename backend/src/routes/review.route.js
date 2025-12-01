// backend/src/routes/review.route.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/review.controller");

// Nếu có middleware đăng nhập thì import; nếu chưa có, để middleware rỗng vẫn chạy
let requireLogin = (_req, _res, next) => next();
try {
    requireLogin = require("../middlewares/requireLogin");
} catch (_e) { /* optional */ }

// Log nhanh các request vào router này
router.use((req, _res, next) => {
    console.log("[reviews.route]", req.method, req.originalUrl);
    next();
});

// LIST reviews theo homestay (PUBLIC)
router.get("/homestays/:hid", ctrl.listByHomestay);

// Lấy review của chính mình theo booking
router.get("/bookings/:id/mine", requireLogin, ctrl.getMineByBooking);
router.get("/mine", requireLogin, ctrl.getMineByBooking); // ?booking=:id

// CRUD review
router.post("/", requireLogin, ctrl.create);
router.patch("/:id", requireLogin, ctrl.update);
router.delete("/:id", requireLogin, ctrl.remove);

// Owner reply
router.post("/:id/replies", requireLogin, ctrl.replyCreate);
router.delete("/replies/:rid", requireLogin, ctrl.replyRemove);
router.put("/replies/:rid", requireLogin, ctrl.replyUpdate);
module.exports = router;

// --- ADMIN ONLY ---
// Ẩn/hiện review (soft hide/restore)
router.put(
    "/admin/:id/visible",
    requireLogin.role("admin"),
    ctrl.adminToggleVisible
);

// Xóa hẳn review (hard delete)
router.delete(
    "/admin/:id",
    requireLogin.role("admin"),
    ctrl.adminRemove
);

router.get("/admin/h-ids", /* requireLogin.role("admin"), */ ctrl.adminHomestaysHavingReviews);
