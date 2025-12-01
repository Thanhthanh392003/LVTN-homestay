// src/routes/promotion.route.js
const router = require("express").Router();
const ctrl = require("../controllers/promotion.controller");
const requireLogin = require("../middlewares/requireLogin");
const requireRole = require("../middlewares/requireRole");
const knex = require("../database/knex");

/**
 * ===== READ-ONLY (PUBLIC) =====
 * Các endpoint đọc dữ liệu cho FE hiển thị — KHÔNG yêu cầu đăng nhập
 */

// ---- Lấy toàn bộ mã đang active ----
router.get("/active", async (req, res) => {
    try {
        const rows = await knex("PROMOTION")
            .select("*")
            .where("P_Status", "active")
            .whereRaw("CURDATE() BETWEEN Start_date AND End_date")
            .orderBy("Discount", "desc");

        return res.json({
            status: "success",
            data: { promotions: rows }
        });
    } catch (err) {
        console.error("[PROMO][ACTIVE] error:", err);
        return res.json({
            status: "success",
            data: { promotions: [] }
        });
    }
});

/**
 * ⭐⭐⭐ ROUTE FIX QUAN TRỌNG — PHẢI NẰM TRÊN /:id ⭐⭐⭐
 * API RASA gọi: /api/promotions/homestays?code=SUPERDEAL
 */
router.get("/homestays", async (req, res) => {
    const code = String(req.query.code || "").trim();

    if (!code) {
        return res.json({ status: "success", data: { homestays: [] } });
    }

    try {
        // 1) Lấy Promotion_ID theo P_Code
        const promo = await knex("PROMOTION")
            .select("Promotion_ID")
            .where("P_Code", code)
            .where("P_Status", "active")
            .whereRaw("CURDATE() BETWEEN Start_date AND End_date")
            .first();

        if (!promo) {
            return res.json({ status: "success", data: { homestays: [] } });
        }

        // 2) Lấy danh sách homestay áp dụng từ pivot
        const rows = await knex("PROMOTION_HOMESTAY as PH")
            .join("HOMESTAY as H", "H.H_ID", "PH.H_ID")
            .select(
                "H.H_ID",
                "H.H_Name",
                "H.H_Address",
                "H.H_City",
                "H.Price_per_day",
                "H.Status"
            )
            .where("PH.Promotion_ID", promo.Promotion_ID);

        return res.json({
            status: "success",
            data: { homestays: rows }
        });

    } catch (err) {
        console.error("[PROMO][HOMESTAYS] ERROR:", err);
        return res.json({
            status: "success",
            data: { homestays: [] }
        });
    }
});


router.get("/for-homestay/:hId", ctrl.forHomestay);
router.get("/homestay/:h_id/assigned", ctrl.forHomestay);
router.get("/homestay/:h_id/active", ctrl.listActivePromotionsByHomestay);

/**
 * ===== WRITE (YÊU CẦU QUYỀN) =====
 */
router.put(
    "/homestay/:h_id/assigned",
    requireLogin,
    requireRole(0, 1, 2),
    ctrl.replaceHomestayPromotions
);

/**
 * CRUD & ID
 */
router.get("/", ctrl.listPromotions);

// ❗ PHẢI ĐỂ SAU cùng để không nuốt các route khác
router.get("/:id", ctrl.getPromotionById);

router.post("/", requireLogin, requireRole(0, 1, 2), ctrl.createPromotion);
router.put("/:id", requireLogin, requireRole(0, 1, 2), ctrl.updatePromotion);
router.delete("/:id", requireLogin, requireRole(0, 1, 2), ctrl.deletePromotion);

/**
 * APPLY PROMO
 */
router.post("/apply", requireLogin, requireRole(0, 1, 2), ctrl.applyPromotionToHomestay);
router.delete("/apply", requireLogin, requireRole(0, 1, 2), ctrl.removePromotionFromHomestay);

router.post("/validate", requireLogin, ctrl.validatePromotion);
router.post("/apply-usage", requireLogin, ctrl.applyPromotionUsage);

module.exports = router;
