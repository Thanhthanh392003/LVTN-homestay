// src/routes/rule.route.js
const router = require("express").Router();
const rule = require("../controllers/rule.controller");
const requireLogin = require("../middlewares/requireLogin");

// Danh mục rule (master)
router.get("/", rule.listMaster);

// Rule của từng homestay
router.get("/homestays/:id", requireLogin, rule.listByHomestay);
router.put("/homestays/:id", requireLogin, rule.syncForHomestay);

module.exports = router;
