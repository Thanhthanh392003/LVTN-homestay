// src/routes/amenity.route.js
const router = require("express").Router();
const amen = require("../controllers/amenity.controller");
const requireLogin = require("../middlewares/requireLogin");

// Public: danh mục tiện nghi
router.get("/", amen.listMaster);

// Lấy tiện nghi của 1 homestay (cần đăng nhập)
router.get("/homestays/:id", requireLogin, amen.listByHomestay);

// Cập nhật tiện nghi (Owner/Admin)
router.put("/homestays/:id", requireLogin.role("owner", "admin"), amen.syncForHomestay);

module.exports = router;
