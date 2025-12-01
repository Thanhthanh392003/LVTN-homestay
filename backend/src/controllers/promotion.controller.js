const knex = require('../database/knex'); // <- THÊM DÒNG NÀY
const promoService = require('../services/promotion.service');
const JSend = require('../jsend');
const ApiError = require('../api-error');

async function createPromotion(req, res) {
    try {
        const promotion = await promoService.createPromotion(req, req.body);
        return res.status(201).json(JSend.success(promotion, 'Promotion created'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        console.error('[promotion.controller] create error:', error);
        return res.status(status).json(JSend.fail(error.message || 'Create promotion failed'));
    }
}

async function updatePromotion(req, res) {
    try {
        const { id } = req.params;
        const promotion = await promoService.updatePromotion(req, id, req.body);
        return res.json(JSend.success(promotion, 'Promotion updated'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Update promotion failed'));
    }
}

async function deletePromotion(req, res) {
    try {
        const { id } = req.params;
        await promoService.deletePromotion(req, id);
        return res.json(JSend.success({}, 'Promotion deleted'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Delete promotion failed'));
    }
}

async function forHomestay(req, res) {
    const rawHid = req.params.hId ?? req.params.h_id;
    const hId = Number(rawHid);
    if (!Number.isInteger(hId) || hId <= 0) {
        return res.status(400).json(JSend.fail("Invalid hId"));
    }

    try {
        const hasPH = await knex.schema.hasTable("PROMOTION_HOMESTAY");
        const hasPA = await knex.schema.hasTable("PROMOTION_APPLICABLE");

        let rows = [];
        if (hasPH) {
            rows = await knex("PROMOTION_HOMESTAY as PH")
                .join("PROMOTION as P", "P.Promotion_ID", "PH.Promotion_ID")
                .select("P.*")
                .where("PH.H_ID", hId)
                .orderBy("P.Promotion_ID", "desc");
        } else if (hasPA) {
            rows = await knex("PROMOTION_HOMESTAY as PH")
                .join("PROMOTION as P", "P.Promotion_ID", "PH.Promotion_ID")
                .distinct("P.Promotion_ID")       // <-- thêm
                .select("P.*")
                .where("PH.H_ID", hId)
                .orderBy("P.Promotion_ID", "desc");
        } // nếu chưa có bảng scope → coi như chưa gán gì

        return res.json(JSend.success({ promotions: rows }));
    } catch (e) {
        console.error("[promotion.controller] forHomestay:", e);
        // Trả rỗng để FE không gãy flow
        return res.json(JSend.success({ promotions: [] }));
    }
}

async function replaceHomestayPromotions(req, res) {
    const hId = Number(req.params.h_id);
    const ids = Array.isArray(req.body?.promotion_ids) ? req.body.promotion_ids : [];
    if (!Number.isInteger(hId) || hId <= 0) {
        return res.status(400).json({ status: "fail", message: "Invalid h_id" });
    }
    // lọc id hợp lệ và uniq
    const uniqIds = Array.from(new Set(ids.map(Number).filter(n => Number.isInteger(n) && n > 0)));

    try {
        // kiểm tra homestay tồn tại
        const hs = await knex("HOMESTAY").select("H_ID").where("H_ID", hId).first();
        if (!hs) return res.status(404).json({ status: "fail", message: "Homestay not found" });

        await knex.transaction(async (trx) => {
            // Xóa tất cả gán cũ
            await trx("PROMOTION_HOMESTAY").where({ H_ID: hId }).del();

            if (uniqIds.length) {
                // Chỉ insert các id tồn tại trong PROMOTION (tránh FK fail)
                const validIds = await trx("PROMOTION")
                    .pluck("Promotion_ID")
                    .whereIn("Promotion_ID", uniqIds);

                if (validIds.length) {
                    const rows = validIds.map((pid) => ({ Promotion_ID: pid, H_ID: hId }));
                    // bulk insert
                    await trx("PROMOTION_HOMESTAY").insert(rows);
                }
            }
        });

        // trả về danh sách đã gán sau khi replace
        const after = await knex("PROMOTION_HOMESTAY as PH")
            .join("PROMOTION as P", "P.Promotion_ID", "PH.Promotion_ID")
            .select("P.*")
            .where("PH.H_ID", hId)
            .orderBy("P.Promotion_ID", "desc");

        return res.json({ status: "success", data: { promotions: after } });
    } catch (e) {
        console.error("[PROMO][REPLACE] error:", e);
        return res.status(500).json({ status: "fail", message: "Replace promotions failed" });
    }
}

async function getPromotionById(req, res) {
    try {
        const { id } = req.params;
        const data = await promoService.getPromotionById(req, id);
        return res.json(JSend.success(data));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 404;
        return res.status(status).json(JSend.fail(error.message || 'Promotion not found'));
    }
}

async function listPromotions(req, res) {
    try {
        const promotions = await promoService.listPromotions(req.query, req);
        // FE đọc: res.data.data.promotions
        return res.json(JSend.success({ promotions }));
    } catch (err) {
        return res.status(400).json(JSend.fail(err.message || "Cannot list promotions"));
    }
}

async function applyPromotionToHomestay(req, res) {
    const pid = Number(req.body?.promotion_id);
    const hId = Number(req.body?.h_id);
    if (!Number.isInteger(pid) || !Number.isInteger(hId) || pid <= 0 || hId <= 0) {
        return res.status(400).json({ status: "fail", message: "Invalid promotion_id or h_id" });
    }

    const promo = await knex("PROMOTION").where("Promotion_ID", pid).first();
    if (!promo) return res.status(404).json({ status: "fail", message: "Promotion not found" });

    try {
        // ✅ MySQL-safe: chèn nếu chưa có, bỏ qua nếu trùng (PK (Promotion_ID,H_ID))
        await knex.raw(
            "INSERT IGNORE INTO PROMOTION_HOMESTAY (Promotion_ID, H_ID) VALUES (?,?)",
            [pid, hId]
        );
        console.log("[PROMO][APPLY] insert IGNORE =>", { pid, hId });
        return res.json({ status: "success", data: { applied: true } });
    } catch (e) {
        console.error("[PROMO][APPLY] error:", e);
        return res.status(500).json({ status: "fail", message: "Apply promotion failed" });
    }
}


async function removePromotionFromHomestay(req, res) {
    const pid = Number(req.body?.promotion_id);
    const hId = Number(req.body?.h_id);
    if (!Number.isInteger(pid) || !Number.isInteger(hId) || pid <= 0 || hId <= 0) {
        return res.status(400).json({ status: "fail", message: "Invalid promotion_id or h_id" });
    }
    try {
        const { [0]: { affectedRows } = { affectedRows: 0 } } = await knex.raw(
            "DELETE FROM PROMOTION_HOMESTAY WHERE Promotion_ID=? AND H_ID=?",
            [pid, hId]
        );
        console.log("[PROMO][REMOVE] delete =>", { pid, hId, affectedRows });
        return res.json({ status: "success", data: { removed: affectedRows > 0 } });
    } catch (e) {
        console.error("[PROMO][REMOVE] error:", e);
        return res.status(500).json({ status: "fail", message: "Remove promotion failed" });
    }
}

async function listActivePromotionsByHomestay(req, res) {
    const hId = Number(req.params.h_id);
    if (!Number.isInteger(hId) || hId <= 0) {
        return res.status(400).json(JSend.fail("Invalid h_id"));
    }

    try {
        const own = await knex("HOMESTAY").select("U_ID").where("H_ID", hId).first();
        if (!own) return res.status(404).json(JSend.fail("Homestay not found"));
        const ownerId = own.U_ID;

        const rows = await knex("PROMOTION as P")
            .select("P.*")
            .where("P.P_Status", "active")
            .whereRaw("CURDATE() BETWEEN P.Start_date AND P.End_date")
            .andWhere(function () {
                this.whereNull("P.Owner_ID").orWhere("P.Owner_ID", ownerId);
            })
            .orderBy("P.Discount", "desc")
            .orderBy("P.Promotion_ID", "desc");

        return res.json(JSend.success({ promotions: rows }));
    } catch (e) {
        console.error("[promotion.controller] listActivePromotionsByHomestay:", e);
        return res.json(JSend.success({ promotions: [] }));
    }
}
async function validatePromotion(req, res) {
    try {
        const r = await promoService.validatePromotion(req.body);
        return res.status(r.ok ? 200 : 400).json(r);
    } catch (error) {
        return res.status(400).json(JSend.fail(error.message || 'Validate failed'));
    }
}

async function applyPromotionUsage(req, res) {
    try {
        const r = await promoService.applyPromotionUsage(req.body);
        return res.json(r);
    } catch (error) {
        return res.status(400).json(JSend.fail(error.message || 'Apply usage failed'));
    }
}

module.exports = {
    createPromotion,
    updatePromotion,
    deletePromotion,
    replaceHomestayPromotions,
    getPromotionById,
    listPromotions,
    applyPromotionToHomestay,
    removePromotionFromHomestay,
    listActivePromotionsByHomestay,
    validatePromotion,
    applyPromotionUsage,
    // 🔹 thêm export mới:
    forHomestay,
};
