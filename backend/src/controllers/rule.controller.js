// src/controllers/rule.controller.js
const db = require("../database/knex");

// GET /api/rules  -> danh mục nội quy (master)
exports.listMaster = async (_req, res) => {
    try {
        const rows = await db("RULE_MASTER")
            .select("Rule_ID", "Code", "Name")
            .orderBy("Name");
        res.json({ status: "success", data: rows });
    } catch (e) {
        console.error("[RULE MASTER ERROR]", e);
        res.status(500).json({ message: "Lỗi lấy danh mục nội quy" });
    }
};

// GET /api/rules/homestays/:id -> nội quy đã gắn cho homestay
// Trả về 2 loại:
// - { isMaster:true, code, name }  từ RULE_MASTER
// - { isMaster:false, name }       từ Custom_Text
exports.listByHomestay = async (req, res) => {
    try {
        const H_ID = Number(req.params.id);
        const rows = await db("HOMESTAY_RULE as hr")
            .leftJoin("RULE_MASTER as rm", "rm.Rule_ID", "hr.Rule_ID")
            .where("hr.H_ID", H_ID)
            .select("hr.RuleItem_ID", "hr.Custom_Text", "rm.Code", "rm.Name")
            .orderBy([{ column: "rm.Name", order: "asc" }, { column: "hr.Custom_Text", order: "asc" }]);

        const mapped = rows.map(r =>
            r.Code
                ? { isMaster: true, code: r.Code, name: r.Name }
                : { isMaster: false, name: (r.Custom_Text || "").trim() }
        );

        res.json({ status: "success", data: mapped });
    } catch (e) {
        console.error("[RULE BY HS ERROR]", e);
        res.status(500).json({ message: "Lỗi lấy nội quy homestay" });
    }
};

// PUT /api/rules/homestays/:id
// Body: { codes?: string[], customs?: string[] }
exports.syncForHomestay = async (req, res) => {
    const trx = await db.transaction();
    try {
        const H_ID = Number(req.params.id);
        const codes = Array.isArray(req.body?.codes) ? req.body.codes : [];
        const customs = Array.isArray(req.body?.customs)
            ? req.body.customs.map(s => String(s || "").trim()).filter(Boolean)
            : [];

        if (!H_ID) {
            await trx.rollback();
            return res.status(400).json({ message: "Missing H_ID" });
        }

        // Map codes -> Rule_ID
        let ruleIds = [];
        if (codes.length) {
            const rows = await trx("RULE_MASTER")
                .select("Rule_ID")
                .whereIn("Code", codes);
            ruleIds = rows.map(r => r.Rule_ID);
        }

        // Replace all
        await trx("HOMESTAY_RULE").where({ H_ID }).del();

        const inserts = [];
        for (const rid of new Set(ruleIds)) {
            inserts.push({ H_ID, Rule_ID: rid, Custom_Text: null });
        }
        for (const text of new Set(customs)) {
            inserts.push({ H_ID, Rule_ID: null, Custom_Text: text });
        }

        if (inserts.length) {
            await trx("HOMESTAY_RULE").insert(inserts);
        }

        await trx.commit();
        res.json({ status: "success" });
    } catch (e) {
        await trx.rollback();
        console.error("[RULE SYNC ERROR]", e);
        res.status(500).json({ message: "Cập nhật nội quy thất bại" });
    }
};
