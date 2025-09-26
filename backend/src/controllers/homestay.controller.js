// src/controllers/homestay.controller.js
const service = require("../services/homestay.service");
const db = require("../database/knex");
const path = require("path");

const PUBLIC_ROOT = path.resolve(__dirname, "../../public");
/** Helper: lấy ownerId từ session/body cho chắc */
function getOwnerId(req) {
    return Number(
        req.session?.user_id ??
        req.session?.user?.U_ID ??
        req.user?.U_ID ??
        req.body?.U_ID ??
        req.body?.u_id ??
        req.query?.U_ID ??
        req.query?.u_id
    );
}

// GET /api/homestays  (public)
exports.listPublic = async (req, res) => {
    try {
        const rows = await db("HOMESTAY as h")
            .leftJoin("IMAGE as i", function () {
                this.on("i.H_ID", "h.H_ID").andOn("i.IsMain", "=", 1);
            })
            .select(
                "h.H_ID",
                "h.H_Name",
                "h.H_Address",
                "h.H_City",
                "h.H_Description",
                "h.Price_per_day",
                "h.Status",
                "i.Image_url as Cover"
            )
            // nới điều kiện: status null cũng hiển thị; nếu có thì chuẩn hoá về lower-trim
            .where(function () {
                this.whereNull("h.Status")
                    .orWhereRaw("LOWER(TRIM(h.Status)) IN (?, ?)", ["active", "available"]);
            })
            .orderBy("h.H_ID", "desc");

        return res.json({ status: "success", data: { homestays: rows } });
    } catch (err) {
        console.error("[LIST PUBLIC ERROR]", err?.sqlMessage || err?.message || err);
        return res.status(500).json({ message: "Lỗi lấy danh sách homestay" });
    }
};

// GET /api/homestays/:id  (public) – trả chi tiết + ảnh chính
exports.getOne = async (req, res) => {
    try {
        const H_ID = Number(req.params.id);
        const row = await db("HOMESTAY as h")
            .leftJoin("IMAGE as i", function () {
                this.on("i.H_ID", "h.H_ID").andOn("i.IsMain", "=", 1);
            })
            .select(
                "h.H_ID",
                "h.U_ID",
                "h.H_Name",
                "h.H_Address",
                "h.H_City",
                "h.H_Description",
                "h.Price_per_day",
                "h.Status",
                "i.Image_url as Cover"
            )
            .where("h.H_ID", H_ID)
            .first();

        if (!row) return res.status(404).json({ message: "Homestay không tồn tại" });
        return res.json({ status: "success", data: { homestay: row } });
    } catch (e) {
        console.error("[GET ONE ERROR]", e);
        return res.status(500).json({ message: "Lỗi lấy chi tiết homestay" });
    }
};

// GET /api/homestays/:id/images (public) – trả danh sách ảnh
exports.listImagesPublic = async (req, res) => {
    try {
        const H_ID = Number(req.params.id);
        const imgs = await db("IMAGE")
            .where({ H_ID })
            .orderBy([
                { column: "IsMain", order: "desc" },
                { column: "Sort_order", order: "asc" },
                { column: "Image_ID", order: "desc" },
            ])
            .select("Image_ID", "H_ID", "Image_url", "IsMain", "Sort_order");

        return res.json({ status: "success", images: imgs });
    } catch (e) {
        console.error("[LIST IMG PUBLIC ERROR]", e);
        return res.status(500).json({ message: "Lỗi lấy ảnh homestay" });
    }
};



exports.uploadImages = async (req, res) => {
    try {
        const H_ID = Number(req.params.id);
        const files = req.files || [];
        if (!H_ID) return res.status(400).json({ message: "Missing H_ID" });
        if (!files.length) return res.status(400).json({ message: "No files" });

        const [{ maxSort = 0 } = {}] = await db("IMAGE").where({ H_ID }).max({ maxSort: "Sort_order" });
        let nextSort = Number(maxSort) || 0;

        const inserted = [];
        for (const f of files) {
            const rel = path.relative(PUBLIC_ROOT, f.path).replace(/\\/g, "/");
            const url = `/${rel}`;
            nextSort += 1;
            const [Image_ID] = await db("IMAGE").insert({
                H_ID,
                Image_url: url,
                IsMain: 0,
                Sort_order: nextSort,
            });
            inserted.push({ Image_ID, H_ID, Image_url: url, IsMain: 0, Sort_order: nextSort });
        }

        return res.status(201).json({ status: "success", images: inserted });
    } catch (e) {
        console.error("[UPLOAD IMG ERROR]", e.sqlMessage || e.message || e);
        return res.status(500).json({ message: "Upload failed", detail: e.sqlMessage || e.message });
    }
};

// POST /api/homestays
exports.create = async (req, res) => {
    try {
        const ownerId = getOwnerId(req);
        if (!ownerId) {
            return res.status(401).json({ message: "Unauthorized (missing owner id)" });
        }

        const body = req.body || {};
        const safe = {
            H_Name: (body.H_Name ?? body.h_name ?? "").toString().trim(),
            H_Address: (body.H_Address ?? body.h_address ?? "").toString().trim(),
            H_City: (body.H_City ?? body.h_city ?? "").toString().trim(),
            H_Description: (body.H_Description ?? body.h_description ?? "").toString().trim(),
            Price_per_day: Number(body.Price_per_day ?? body.price_per_day ?? 0),
            Status: (body.Status ?? body.status ?? "active").toString().trim(),
            U_ID: ownerId,
        };

        const created = await service.createHomestay(safe);
        return res.status(201).json({ status: "success", data: { homestay: created } });
    } catch (err) {
        console.error("[CREATE HOMESTAY ERROR]", err?.sqlMessage || err?.message || err);
        return res.status(500).json({
            message: "Lỗi tạo homestay",
            detail: err?.sqlMessage || err?.message || "Unknown error",
        });
    }
};

// GET /api/homestays/owner/mine
exports.listMine = async (req, res) => {
    try {
        const ownerId = getOwnerId(req);
        if (!ownerId) return res.status(401).json({ message: "Unauthorized" });

        const rows = await service.getHomestaysByOwner(ownerId);
        return res.json({ status: "success", data: { homestays: rows } });
    } catch (err) {
        console.error("[LIST MINE ERROR]", err?.sqlMessage || err?.message || err);
        return res.status(500).json({ message: "Lỗi lấy danh sách" });
    }
};

// DELETE /api/homestays/:id
exports.remove = async (req, res) => {
    try {
        const ownerId = getOwnerId(req);
        if (!ownerId) return res.status(401).json({ message: "Unauthorized" });

        const H_ID = Number(req.params.id);
        if (!H_ID) return res.status(400).json({ message: "Missing H_ID" });

        const affected = await db("HOMESTAY").where({ H_ID, U_ID: ownerId }).del();
        if (!affected) return res.status(404).json({ message: "Homestay không tồn tại hoặc bạn không có quyền xoá" });

        return res.json({ status: "success" });
    } catch (err) {
        console.error("[DELETE HOMESTAY ERROR]", err?.sqlMessage || err?.message || err);
        return res.status(500).json({ message: "Xoá homestay thất bại", detail: err?.sqlMessage || err?.message });
    }
};

// GET /api/homestays/:id/images
exports.listImages = async (req, res) => {
    try {
        const H_ID = Number(req.params.id);
        const rows = await db("IMAGE")
            .select("Image_ID", "H_ID", "Image_url", "IsMain", "Sort_order")
            .where({ H_ID })
            .orderBy([
                { column: "IsMain", order: "desc" },
                { column: "Sort_order", order: "asc" },
                { column: "Image_ID", order: "desc" },
            ]);
        return res.json({ status: "success", images: rows });
    } catch (e) {
        console.error("[LIST IMG ERROR]", e);
        return res.status(500).json({ message: "List images failed" });
    }
};

// PATCH /api/homestays/:id/images/:imageId/main
exports.setMainImage = async (req, res) => {
    try {
        const H_ID = Number(req.params.id);
        const Image_ID = Number(req.params.imageId);
        await db("IMAGE").update({ IsMain: 0 }).where({ H_ID });
        await db("IMAGE").update({ IsMain: 1 }).where({ Image_ID, H_ID });
        return res.json({ status: "success" });
    } catch (e) {
        console.error("[SET MAIN IMG ERROR]", e);
        return res.status(500).json({ message: "Set main failed" });
    }
};

// DELETE /api/homestays/:id/images/:imageId
exports.deleteImage = async (req, res) => {
    try {
        const H_ID = Number(req.params.id);
        const Image_ID = Number(req.params.imageId);
        const row = await db("IMAGE").where({ Image_ID, H_ID }).first();
        if (!row) return res.status(404).json({ message: "Not found" });

        await db("IMAGE").where({ Image_ID, H_ID }).del();
        return res.json({ status: "success" });
    } catch (e) {
        console.error("[DELETE IMG ERROR]", e);
        return res.status(500).json({ message: "Delete image failed" });
    }
};
