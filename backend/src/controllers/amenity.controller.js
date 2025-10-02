// src/controllers/amenity.controller.js
const db = require("../database/knex");

// helper
const uniqBy = (arr, keyFn) => {
    const seen = new Set();
    return (arr || []).filter((x) => {
        const k = keyFn(x);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
};

// GET /api/amenities
exports.listMaster = async (_req, res) => {
    try {
        const rows = await db("AMENITY")
            .select("Amenity_ID", "Code", "Name")
            .orderBy("Name");
        const dedup = uniqBy(
            rows,
            (x) => (x.Code ? x.Code : (x.Name || "").toLowerCase().trim())
        );
        res.json({ status: "success", data: dedup });
    } catch (e) {
        console.error("[AMENITY MASTER ERROR]", e);
        res.status(500).json({ message: "Lỗi lấy danh mục tiện nghi" });
    }
};

// GET /api/amenities/homestays/:id
exports.listByHomestay = async (req, res) => {
    try {
        const H_ID = Number(req.params.id);
        const rows = await db("HOMESTAY_AMENITY as ha")
            .join("AMENITY as a", "a.Amenity_ID", "ha.Amenity_ID")
            .where("ha.H_ID", H_ID)
            .select("a.Amenity_ID", "a.Code", "a.Name")
            .orderBy("a.Name");

        const dedup = uniqBy(
            rows,
            (x) => (x.Code ? x.Code : (x.Name || "").toLowerCase().trim())
        );

        res.json({ status: "success", data: dedup });
    } catch (e) {
        console.error("[AMENITY BY HS ERROR]", e);
        res.status(500).json({ message: "Lỗi lấy tiện nghi homestay" });
    }
};

// PUT /api/amenities/homestays/:id
// body: { codes: string[] } hoặc { ids: number[] }
exports.syncForHomestay = async (req, res) => {
    const trx = await db.transaction();
    try {
        const H_ID = Number(req.params.id);
        const codes = Array.isArray(req.body?.codes) ? req.body.codes : null;
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : null;

        console.log("[SYNC AMENITIES] H_ID=", H_ID, "codes=", codes, "ids=", ids);

        if (!H_ID) {
            await trx.rollback();
            return res.status(400).json({ message: "Missing H_ID" });
        }
        if (!codes && !ids) {
            await trx.rollback();
            return res.status(400).json({ message: "Missing codes/ids" });
        }

        let amenityIds = ids ?? [];
        if (codes) {
            const rows = await trx("AMENITY").select("Amenity_ID").whereIn("Code", codes);
            amenityIds = rows.map((r) => r.Amenity_ID);
        }
        amenityIds = Array.from(new Set(amenityIds)).filter(Boolean);

        console.log("[SYNC AMENITIES] mapped Amenity_IDs =", amenityIds);

        // Nếu không map được tiện nghi nào → 422
        if (!amenityIds.length) {
            await trx.rollback();
            return res.status(422).json({ message: "Không tìm thấy tiện nghi hợp lệ từ danh sách đã chọn" });
        }

        await trx("HOMESTAY_AMENITY").where({ H_ID }).del();

        const rows = amenityIds.map((aid) => ({ H_ID, Amenity_ID: aid }));
        await trx("HOMESTAY_AMENITY")
            .insert(rows)
            .onConflict(["H_ID", "Amenity_ID"])
            .ignore();

        await trx.commit();
        res.json({ status: "success" });
    } catch (e) {
        await trx.rollback();
        console.error("[AMENITY SYNC ERROR]", e);
        res.status(500).json({ message: "Cập nhật tiện nghi thất bại" });
    }
};
