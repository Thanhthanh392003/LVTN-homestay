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

/* ===================== PUBLIC ===================== */
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
                "h.Max_guests",
                "h.Status",
                "i.Image_url as Cover"
            )
            // public chỉ hiển thị active/available (vẫn cho phép null để tương thích dữ liệu cũ)
            .where(function () {
                this.whereNull("h.Status").orWhereRaw(
                    "LOWER(TRIM(h.Status)) IN (?, ?)",
                    ["active", "available"]
                );
            })
            .orderBy("h.H_ID", "desc");

        return res.json({ status: "success", data: { homestays: rows } });
    } catch (err) {
        console.error("[LIST PUBLIC ERROR]", err?.sqlMessage || err?.message || err);
        return res.status(500).json({ message: "Lỗi lấy danh sách homestay" });
    }
};

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
                "h.Max_guests",
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

exports.searchAvailable = async (req, res) => {
    try {
        const city = (req.query.city ?? "").toString().trim();
        const start = (req.query.start ?? "").toString().trim();
        const end = (req.query.end ?? "").toString().trim();
        const guests = Math.max(1, Number(req.query.guests ?? 1));

        if (!start || !end) {
            return res.status(400).json({ message: "Thiếu start/end (YYYY-MM-DD)" });
        }
        if (new Date(start) >= new Date(end)) {
            return res.status(400).json({ message: "start phải nhỏ hơn end" });
        }

        const q = db("HOMESTAY as h")
            .where(function () {
                this.whereNull("h.Status").orWhereRaw(
                    "LOWER(TRIM(h.Status)) IN (?, ?)",
                    ["active", "available"]
                );
            })
            .andWhere("h.Max_guests", ">=", guests);

        if (city) q.andWhere("h.H_City", city);

        q.whereNotExists(
            db("BOOKING as b")
                .join("BOOKING_DETAIL as d", "d.Booking_ID", "b.Booking_ID")
                .whereRaw("b.H_ID = h.H_ID")
                .whereIn("b.Booking_status", ["pending", "confirmed"])
                .andWhere("d.Checkin_date", "<", end)
                .andWhere("d.Checkout_date", ">", start)
                .select(1)
        );

        const list = await q
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
                "h.Max_guests",
                "h.Status",
                "i.Image_url as Cover"
            )
            .orderBy("h.Price_per_day", "asc");

        res.json({ status: "success", data: { homestays: list } });
    } catch (e) {
        console.error("[SEARCH AVAILABLE ERROR]", e?.sqlMessage || e?.message || e);
        return res.status(500).json({ message: "Lỗi tìm kiếm phòng trống" });
    }
};

/* ===================== OWNER ===================== */
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
            Max_guests: Math.max(1, Number(body.Max_guests ?? body.max_guests ?? 2)),
            // ✅ luôn pending khi Owner tạo, khớp DEFAULT trong DB
            Status: "pending",
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

exports.update = async (req, res) => {
    try {
        const ownerId = getOwnerId(req);
        if (!ownerId) return res.status(401).json({ message: "Unauthorized" });

        const H_ID = Number(req.params.id ?? req.body?.H_ID ?? req.body?.h_id);
        if (!H_ID) return res.status(400).json({ message: "Missing H_ID" });

        const existed = await service.getHomestayById(H_ID);
        if (!existed) return res.status(404).json({ message: "Homestay không tồn tại" });
        if (existed.U_ID !== ownerId) {
            return res.status(403).json({ message: "Bạn không có quyền cập nhật homestay này" });
        }

        const b = req.body || {};
        const safe = {
            H_Name: b.H_Name ?? b.h_name ?? b.name,
            H_Address: b.H_Address ?? b.h_address ?? b.address,
            H_City: b.H_City ?? b.h_city ?? b.city,
            H_Description: b.H_Description ?? b.h_description ?? b.description,
            Price_per_day: b.Price_per_day ?? b.price_per_day,
            Max_guests: b.Max_guests ?? b.max_guests,
            Status: b.Status ?? b.status, // admin mới nên đổi trạng thái
        };

        const updated = await service.updateHomestay(H_ID, safe);
        return res.json({ status: "success", data: { homestay: updated } });
    } catch (err) {
        console.error("[UPDATE HOMESTAY ERROR]", err?.sqlMessage || err?.message || err);
        const code = Number(err?.status || err?.code) || 500;
        return res.status(code).json({
            message: "Cập nhật homestay thất bại",
            detail: err?.sqlMessage || err?.message || "Unknown error",
        });
    }
};

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

/* ===================== ADMIN ===================== */
/** GET /api/admin/homestays?status=pending&q=... (path mapping ở router) */
exports.adminList = async (req, res) => {
    try {
        const status = (req.query.status ?? "").toString().trim().toLowerCase();
        const q = (req.query.q ?? "").toString().trim();

        const builder = db("HOMESTAY as h")
            // ✅ Ten bảng đúng theo schema: USER
            .leftJoin("USER as u", "u.U_ID", "h.U_ID")
            .leftJoin("IMAGE as i", function () {
                this.on("i.H_ID", "h.H_ID").andOn("i.IsMain", "=", 1);
            })
            .select(
                "h.H_ID",
                "h.H_Name",
                "h.H_City",
                "h.Status",
                "h.U_ID",
                "u.U_Email as OwnerEmail",
                "i.Image_url as Image_url"
            )
            .orderBy("h.H_ID", "desc");

        if (status) builder.whereRaw("LOWER(TRIM(h.Status)) = ?", [status]);

        if (q) {
            builder.andWhere(function () {
                this.whereILike("h.H_Name", `%${q}%`)
                    .orWhereILike("h.H_City", `%${q}%`)
                    .orWhereILike("u.U_Email", `%${q}%`);
            });
        }

        const rows = await builder;
        return res.json({ status: "success", data: rows });
    } catch (e) {
        console.error("[ADMIN LIST HS ERROR]", e?.sqlMessage || e?.message || e);
        return res.status(500).json({ message: "Lỗi lấy danh sách homestay (admin)" });
    }
};

/** POST /api/admin/homestays/:id/approve */
exports.adminApprove = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await db("HOMESTAY").where({ H_ID: id }).update({ Status: "active" });
        return res.json({ status: "success" });
    } catch (e) {
        console.error("[ADMIN APPROVE ERROR]", e);
        return res.status(500).json({ message: "Phê duyệt thất bại" });
    }
};

/** POST /api/admin/homestays/:id/reject */
exports.adminReject = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await db("HOMESTAY").where({ H_ID: id }).update({ Status: "rejected" });
        return res.json({ status: "success" });
    } catch (e) {
        console.error("[ADMIN REJECT ERROR]", e);
        return res.status(500).json({ message: "Từ chối thất bại" });
    }
};

/** DELETE /api/admin/homestays/:id */
exports.adminRemove = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await db("HOMESTAY").where({ H_ID: id }).del();
        return res.json({ status: "success" });
    } catch (e) {
        console.error("[ADMIN REMOVE ERROR]", e);
        return res.status(500).json({ message: "Xoá thất bại" });
    }
};
