const router = require("express").Router();
const rule = require("../controllers/rule.controller");
const requireLogin = require("../middlewares/requireLogin");

// Public: danh mục nội quy
router.get("/", rule.listMaster);

// ☑ Public: nội quy của homestay (bỏ requireLogin)
router.get("/homestays/:id", rule.listByHomestay);

// Cập nhật thì mới yêu cầu quyền
router.put("/homestays/:id", requireLogin.role("owner", "admin"), rule.syncForHomestay);

module.exports = router;
