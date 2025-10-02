// src/controllers/rule.controller.js
const db = require("../database/knex");

/** Danh mục rule (master) */
exports.listMaster = async (_req, res) => {
    try {
        const rows = await db("RULE_MASTER").select("Rule_ID", "Code", "Name").orderBy("Name");
        res.json({ status: "success", data: rows });
    } catch (e) {
        console.error("[RULE MASTER ERROR]", e);
        res.status(500).json({ message: "Lỗi lấy danh mục nội quy" });
    }
};

/** Lấy rules (master + custom) của 1 homestay */
exports.listByHomestay = async (req, res) => {
    try {
        const H_ID = Number(req.params.id);
        const rows = await db("HOMESTAY_RULE as hr")
            .leftJoin("RULE_MASTER as rm", "rm.Rule_ID", "hr.Rule_ID")
            .where("hr.H_ID", H_ID)
            .select(
                "hr.RuleItem_ID",
                "hr.H_ID",
                "hr.Rule_ID",
                "hr.Custom_Text",
                "rm.Code as RuleCode",
                "rm.Name as RuleName"
            )
            .orderByRaw("COALESCE(rm.Name, hr.Custom_Text)");
        // Chuẩn hoá output
        const data = rows.map((r) => ({
            RuleItem_ID: r.RuleItem_ID,
            H_ID: r.H_ID,
            isMaster: !!r.Rule_ID,
            code: r.RuleCode || null,
            name: r.RuleName || r.Custom_Text || "",
        }));
        res.json({ status: "success", data });
    } catch (e) {
        console.error("[RULE BY HS ERROR]", e);
        res.status(500).json({ message: "Lỗi lấy nội quy homestay" });
    }
};

/** Sync (replace all) rules cho 1 homestay
 * Body: { codes?: string[], customs?: string[] }
 */
exports.syncForHomestay = async (req, res) => {
    const trx = await db.transaction();
    try {
        const H_ID = Number(req.params.id);
        if (!H_ID) return res.status(400).json({ message: "Missing H_ID" });

        const codes = Array.isArray(req.body?.codes) ? req.body.codes : [];
        const customs = Array.isArray(req.body?.customs) ? req.body.customs : [];

        // Xoá tất cả rule cũ
        await trx("HOMESTAY_RULE").where({ H_ID }).del();

        // Thêm master theo code
        if (codes.length) {
            const masters = await trx("RULE_MASTER").select("Rule_ID").whereIn("Code", codes);
            const rows = masters.map((m) => ({ H_ID, Rule_ID: m.Rule_ID, Custom_Text: null }));
            if (rows.length) await trx("HOMESTAY_RULE").insert(rows);
        }

        // Thêm custom text
        if (customs.length) {
            const rows = customs
                .map((t) => String(t).trim())
                .filter(Boolean)
                .map((t) => ({ H_ID, Rule_ID: null, Custom_Text: t }));
            if (rows.length) await trx("HOMESTAY_RULE").insert(rows);
        }

        await trx.commit();
        res.json({ status: "success" });
    } catch (e) {
        await trx.rollback();
        console.error("[RULE SYNC ERROR]", e);
        res.status(500).json({ message: "Cập nhật nội quy thất bại" });
    }
};
