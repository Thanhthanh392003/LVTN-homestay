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
/**
 * Tìm kiếm homestay có sẵn (để router không lỗi nếu dùng /search)
 * Query hỗ trợ:
 *   - q: chuỗi tìm theo tên/city/địa chỉ
 *   - city: tên thành phố
 *   - guests: số khách tối thiểu
 *   - checkin, checkout: yyyy-mm-dd (loại trừ ngày trùng đặt)
 */
exports.searchAvailable = async (req, res) => {
    try {
        const q = (req.query.q || "").toString().trim();
        const city = (req.query.city || "").toString().trim();
        const guests = Number(req.query.guests || 0);
        const checkin = (req.query.checkin || "").toString().slice(0, 10);
        const checkout = (req.query.checkout || "").toString().slice(0, 10);

        const builder = db("HOMESTAY as h")
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
                "i.Image_url as Cover",
                // ⭐️ thêm rating trung bình & số lượt
                db.raw(
                    `COALESCE(h.Rating_avg,
            (SELECT ROUND(AVG(r.Rating),2)
               FROM REVIEW r
               WHERE r.H_ID=h.H_ID
                 AND (r.Is_visible=1 OR r.Is_visible IS NULL)
                 AND (r.Is_verified=1 OR r.Is_verified IS NULL)
            )
          ) AS Rating_avg`
                ),
                db.raw(
                    `COALESCE(h.Rating_count,
            (SELECT COUNT(*)
               FROM REVIEW r
               WHERE r.H_ID=h.H_ID
                 AND (r.Is_visible=1 OR r.Is_visible IS NULL)
                 AND (r.Is_verified=1 OR r.Is_verified IS NULL)
            )
          ) AS Rating_count`
                )
            )
            .where(function () {
                // Cho phép hiển thị active/available hoặc status null
                this.whereNull("h.Status").orWhereRaw(
                    "LOWER(TRIM(h.Status)) IN (?, ?)",
                    ["active", "available"]
                );
            });

        if (q) {
            builder.andWhere(function () {
                this.whereILike("h.H_Name", `%${q}%`)
                    .orWhereILike("h.H_Address", `%${q}%`)
                    .orWhereILike("h.H_City", `%${q}%`);
            });
        }
        if (city) builder.andWhereILike("h.H_City", `%${city}%`);
        if (guests > 0) builder.andWhere("h.Max_guests", ">=", guests);

        // Loại trừ homestay có đặt chồng ngày
        if (checkin && checkout && checkin < checkout) {
            // Overlap nếu: detail.Checkin < checkout AND detail.Checkout > checkin
            builder.whereNotExists(function () {
                this.from("BOOKING_DETAIL as d")
                    .join("BOOKING as b", "b.Booking_ID", "d.Booking_ID")
                    .whereRaw("d.H_ID = h.H_ID")
                    .andWhere("d.Checkin_date", "<", checkout)
                    .andWhere("d.Checkout_date", ">", checkin)
                    .andWhereIn("b.Booking_status", ["pending", "confirmed", "completed"]);
            });
        }

        const rows = await builder.orderBy("h.H_ID", "desc");
        return res.json({ status: "success", data: rows });
    } catch (e) {
        console.error("[SEARCH AVAILABLE ERROR]", e?.sqlMessage || e?.message || e);
        return res.status(500).json({ message: "Lỗi tìm kiếm homestay có sẵn" });
    }
};

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
                "i.Image_url as Cover",
                // ⭐️ thêm rating trung bình & số lượt
                db.raw(
                    `COALESCE(h.Rating_avg,
            (SELECT ROUND(AVG(r.Rating),2)
               FROM REVIEW r
               WHERE r.H_ID=h.H_ID
                 AND (r.Is_visible=1 OR r.Is_visible IS NULL)
                 AND (r.Is_verified=1 OR r.Is_verified IS NULL)
            )
          ) AS Rating_avg`
                ),
                db.raw(
                    `COALESCE(h.Rating_count,
            (SELECT COUNT(*)
               FROM REVIEW r
               WHERE r.H_ID=h.H_ID
                 AND (r.Is_visible=1 OR r.Is_visible IS NULL)
                 AND (r.Is_verified=1 OR r.Is_verified IS NULL)
            )
          ) AS Rating_count`
                )
            )
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
                "i.Image_url as Cover",
                // ⭐️ trả kèm rating
                db.raw(
                    `COALESCE(h.Rating_avg,
            (SELECT ROUND(AVG(r.Rating),2)
               FROM REVIEW r
               WHERE r.H_ID=h.H_ID
                 AND (r.Is_visible=1 OR r.Is_visible IS NULL)
                 AND (r.Is_verified=1 OR r.Is_verified IS NULL)
            )
          ) AS Rating_avg`
                ),
                db.raw(
                    `COALESCE(h.Rating_count,
            (SELECT COUNT(*)
               FROM REVIEW r
               WHERE r.H_ID=h.H_ID
                 AND (r.Is_visible=1 OR r.Is_visible IS NULL)
                 AND (r.Is_verified=1 OR r.Is_verified IS NULL)
            )
          ) AS Rating_count`
                )
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
                { column: "Image_ID", order: "desc" }
            ])
            .select("Image_ID", "H_ID", "Image_url", "IsMain", "Sort_order");

        return res.json({ status: "success", images: imgs });
    } catch (e) {
        console.error("[LIST IMG PUBLIC ERROR]", e);
        return res.status(500).json({ message: "Lỗi lấy ảnh homestay" });
    }
};

/** ========== Blocked dates ========== */
const OVERLAP_STATUSES = ["pending", "confirmed", "completed"];
const HOLD_MINUTES = 15;

function normDate(s) {
    return (s || "").toString().slice(0, 10);
}
function mergeRanges(ranges) {
    if (!ranges?.length) return [];
    const arr = ranges
        .map((r) => ({ start: new Date(r.start), end: new Date(r.end) }))
        .sort((a, b) => a.start - b.start);
    const out = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
        const prev = out[out.length - 1];
        const cur = arr[i];
        if (cur.start < prev.end) {
            if (cur.end > prev.end) prev.end = cur.end;
        } else {
            out.push(cur);
        }
    }
    return out.map((r) => ({
        start: r.start.toISOString().slice(0, 10),
        end: r.end.toISOString().slice(0, 10)
    }));
}

exports.getBlockedDates = async (req, res) => {
    try {
        const H_ID = Number(req.params.id);
        if (!H_ID) return res.status(400).json({ message: "H_ID không hợp lệ" });

        const now = new Date();
        const from =
            normDate(req.query.from) ||
            new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        const to =
            normDate(req.query.to) ||
            new Date(now.getFullYear(), now.getMonth() + 6, 0)
                .toISOString()
                .slice(0, 10);

        let rows = await db("BOOKING_DETAIL as d")
            .join("BOOKING as b", "b.Booking_ID", "d.Booking_ID")
            .where("d.H_ID", H_ID)
            .andWhere("d.Checkin_date", "<", to)
            .andWhere("d.Checkout_date", ">", from)
            .select(
                db.raw("DATE(d.Checkin_date) as start"),
                db.raw("DATE(d.Checkout_date) as end"),
                "b.Booking_status",
                "b.Created_at"
            );

        if (HOLD_MINUTES > 0) {
            rows = rows.filter((r) => {
                if (r.Booking_status === "pending") {
                    const created = new Date(r.Created_at);
                    const alive = (now - created) / 60000 <= HOLD_MINUTES;
                    return alive;
                }
                return OVERLAP_STATUSES.includes(r.Booking_status);
            });
        } else {
            rows = rows.filter((r) => OVERLAP_STATUSES.includes(r.Booking_status));
        }

        const merged = mergeRanges(rows.map((r) => ({ start: r.start, end: r.end })));
        return res.json({ status: "success", data: merged, meta: { from, to } });
    } catch (e) {
        console.error("[GET BLOCKED DATES ERROR]", e);
        return res.status(500).json({ message: "Lỗi lấy lịch bận" });
    }
};

exports.getOwnerCalendar = async (req, res) => {
    try {
        const H_ID = Number(req.params.id);
        if (!H_ID) return res.status(400).json({ message: "H_ID không hợp lệ" });

        const now = new Date();
        const from =
            normDate(req.query.from) ||
            new Date(now.getFullYear(), now.getMonth() - 1, 1)
                .toISOString()
                .slice(0, 10);
        const to =
            normDate(req.query.to) ||
            new Date(now.getFullYear(), now.getMonth() + 6, 0)
                .toISOString()
                .slice(0, 10);

        const rows = await db("BOOKING_DETAIL as d")
            .join("BOOKING as b", "b.Booking_ID", "d.Booking_ID")
            .join("USER as u", "u.U_ID", "b.U_ID")
            .where("d.H_ID", H_ID)
            .andWhere("d.Checkin_date", "<", to)
            .andWhere("d.Checkout_date", ">", from)
            .select(
                "b.Booking_ID",
                "b.Booking_status",
                "u.U_Fullname as guest_name",
                "u.U_Email as guest_email",
                db.raw("DATE(d.Checkin_date) as start"),
                db.raw("DATE(d.Checkout_date) as end"),
                "d.Guests",
                "d.Unit_price",
                "d.Line_total"
            )
            .orderBy("d.Checkin_date", "asc");

        return res.json({ status: "success", data: rows, meta: { from, to } });
    } catch (e) {
        console.error("[GET OWNER CALENDAR ERROR]", e);
        return res.status(500).json({ message: "Lỗi lấy calendar homestay" });
    }
};

/* ===================== OWNER ===================== */
exports.uploadImages = async (req, res) => {
    try {
        const H_ID = Number(req.params.id);
        const files = req.files || [];
        if (!H_ID) return res.status(400).json({ message: "Missing H_ID" });
        if (!files.length) return res.status(400).json({ message: "No files" });

        const [{ maxSort = 0 } = {}] = await db("IMAGE")
            .where({ H_ID })
            .max({ maxSort: "Sort_order" });
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
                Sort_order: nextSort
            });
            inserted.push({
                Image_ID,
                H_ID,
                Image_url: url,
                IsMain: 0,
                Sort_order: nextSort
            });
        }

        return res.status(201).json({ status: "success", images: inserted });
    } catch (e) {
        console.error("[UPLOAD IMG ERROR]", e.sqlMessage || e.message || e);
        return res
            .status(500)
            .json({ message: "Upload failed", detail: e.sqlMessage || e.message });
    }
};

exports.create = async (req, res) => {
    try {
        const ownerId = getOwnerId(req);
        if (!ownerId)
            return res.status(401).json({ message: "Unauthorized (missing owner id)" });

        const body = req.body || {};
        const safe = {
            H_Name: (body.H_Name ?? body.h_name ?? "").toString().trim(),
            H_Address: (body.H_Address ?? body.h_address ?? "").toString().trim(),
            H_City: (body.H_City ?? body.h_city ?? "").toString().trim(),
            H_Description: (body.H_Description ?? body.h_description ?? "")
                .toString()
                .trim(),
            Price_per_day: Number(body.Price_per_day ?? body.price_per_day ?? 0),
            Max_guests: Math.max(1, Number(body.Max_guests ?? body.max_guests ?? 2)),
            Bedrooms: Number(body.Bedrooms ?? body.bedrooms ?? 1),
            Bathrooms: Number(body.Bathrooms ?? body.bathrooms ?? 1),
            Living_rooms: Number(body.Living_rooms ?? body.living_rooms ?? 1),
            Kitchens: Number(body.Kitchens ?? body.kitchens ?? 1),
            Status: "pending",
            U_ID: ownerId
        };

        const created = await service.createHomestay(safe);
        return res.status(201).json({ status: "success", data: { homestay: created } });
    } catch (err) {
        console.error(
            "[CREATE HOMESTAY ERROR]",
            err?.sqlMessage || err?.message || err
        );
        return res.status(500).json({
            message: "Lỗi tạo homestay",
            detail: err?.sqlMessage || err?.message || "Unknown error"
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
        if (existed.U_ID !== ownerId)
            return res
                .status(403)
                .json({ message: "Bạn không có quyền cập nhật homestay này" });

        const b = req.body || {};
        const safe = {
            H_Name: b.H_Name ?? b.h_name ?? b.name,
            H_Address: b.H_Address ?? b.h_address ?? b.address,
            H_City: b.H_City ?? b.h_city ?? b.city,
            H_Description: b.H_Description ?? b.h_description ?? b.description,
            Price_per_day: b.Price_per_day ?? b.price_per_day,
            Max_guests: b.Max_guests ?? b.max_guests,
            Bedrooms: b.Bedrooms ?? b.bedrooms,
            Bathrooms: b.Bathrooms ?? b.bathrooms,
            Living_rooms: b.Living_rooms ?? b.living_rooms,
            Kitchens: b.Kitchens ?? b.kitchens,

            Status: b.Status ?? b.status
        };

        const updated = await service.updateHomestay(H_ID, safe);
        return res.json({ status: "success", data: { homestay: updated } });
    } catch (err) {
        console.error("[UPDATE HOMESTAY ERROR]", err?.sqlMessage || err?.message || err);
        const code = Number(err?.status || err?.code) || 500;
        return res.status(code).json({
            message: "Cập nhật homestay thất bại",
            detail: err?.sqlMessage || err?.message || "Unknown error"
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
        if (!affected)
            return res
                .status(404)
                .json({ message: "Homestay không tồn tại hoặc bạn không có quyền xoá" });

        return res.json({ status: "success" });
    } catch (err) {
        console.error("[DELETE HOMESTAY ERROR]", err?.sqlMessage || err?.message || err);
        return res
            .status(500)
            .json({ message: "Xoá homestay thất bại", detail: err?.sqlMessage || err?.message });
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
                { column: "Image_ID", order: "desc" }
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

/* ===================== 🔑 PROMOTIONS BINDING ===================== */
exports.getPromotionsOfHomestay = async (req, res) => {
    try {
        const H_ID = Number(req.params.id);
        if (!H_ID) return res.status(400).json({ message: "H_ID không hợp lệ" });

        const rows = await db("PROMOTION_HOMESTAY as ph")
            .join("PROMOTION as p", "p.Promotion_ID", "ph.Promotion_ID")
            .where("ph.H_ID", H_ID)
            .select(
                "p.Promotion_ID",
                "p.P_Code",
                "p.P_Name",
                "p.P_Type",
                "p.Discount",
                "p.Start_date",
                "p.End_date",
                "p.P_Status"
            )
            .orderBy("p.Promotion_ID", "desc");

        return res.json({ status: "success", data: rows });
    } catch (e) {
        console.error("[GET HS PROMOTIONS ERROR]", e?.sqlMessage || e?.message || e);
        return res.status(500).json({ message: "Lỗi lấy mã khuyến mãi của homestay" });
    }
};

exports.setPromotionsBulk = async (req, res) => {
    const trx = await db.transaction();
    try {
        const H_ID = Number(req.params.id);
        if (!H_ID) {
            await trx.rollback();
            return res.status(400).json({ message: "H_ID không hợp lệ" });
        }

        // Quyền: homestay phải thuộc owner hiện tại
        const ownerId = getOwnerId(req);
        const hs = await trx("HOMESTAY").select("U_ID").where({ H_ID }).first();
        if (!hs) {
            await trx.rollback();
            return res.status(404).json({ message: "Homestay không tồn tại" });
        }
        if (ownerId && hs.U_ID !== ownerId) {
            await trx.rollback();
            return res
                .status(403)
                .json({ message: "Bạn không có quyền gán mã cho homestay này" });
        }

        let ids = req.body?.promotion_ids;
        if (!Array.isArray(ids)) ids = [];
        ids = ids.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0);

        // Xoá hết rồi chèn lại
        await trx("PROMOTION_HOMESTAY").where({ H_ID }).del();
        if (ids.length) {
            const values = ids.map((pid) => ({ Promotion_ID: pid, H_ID }));
            await trx("PROMOTION_HOMESTAY").insert(values);
        }

        await trx.commit();

        // Trả về danh sách mới
        const rows = await db("PROMOTION_HOMESTAY as ph")
            .join("PROMOTION as p", "p.Promotion_ID", "ph.Promotion_ID")
            .where("ph.H_ID", H_ID)
            .select(
                "p.Promotion_ID",
                "p.P_Code",
                "p.P_Name",
                "p.P_Type",
                "p.Discount",
                "p.Start_date",
                "p.End_date",
                "p.P_Status"
            )
            .orderBy("p.Promotion_ID", "desc");

        return res.json({ status: "success", data: rows });
    } catch (e) {
        await trx.rollback();
        console.error("[SET HS PROMOTIONS ERROR]", e?.sqlMessage || e?.message || e);
        return res
            .status(500)
            .json({ message: "Gán mã khuyến mãi thất bại", detail: e?.sqlMessage || e?.message });
    }
};

/* ===================== ADMIN ===================== */
exports.adminList = async (req, res) => {
    try {
        const status = (req.query.status ?? "").toString().trim().toLowerCase();
        const q = (req.query.q ?? "").toString().trim();

        const builder = db("HOMESTAY as h")
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

exports.searchByPrice = async (req, res) => {
    try {
        let min = Number(req.query.min) || 0;
        let max = Number(req.query.max) || 999999999;

        console.log("[PRICE FILTER] min =", min, "max =", max);

        const rows = await db("HOMESTAY")
            .select(
                "H_ID",
                "H_Name",
                "H_Address",
                "H_City",
                "Price_per_day",
                "Status"
            )
            .whereBetween("Price_per_day", [min, max])
            .andWhere("Status", "active")
            .orderBy("Price_per_day", "asc");

        console.log("[PRICE FILTER RESULT]", rows);

        return res.json({
            status: "success",
            data: rows
        });

    } catch (err) {
        console.error("[SEARCH BY PRICE ERROR]", err);
        return res.status(500).json({
            status: "error",
            message: "search-by-price failed"
        });
    }
};

exports.adminBlock = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await db("HOMESTAY").where({ H_ID: id }).update({ Status: "blocked" });
        return res.json({ status: "success" });
    } catch (e) {
        console.error("[ADMIN BLOCK ERROR]", e);
        return res.status(500).json({ message: "Chặn homestay thất bại" });
    }
};

exports.adminUnblock = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await db("HOMESTAY").where({ H_ID: id }).update({ Status: "active" });
        return res.json({ status: "success" });
    } catch (e) {
        console.error("[ADMIN UNBLOCK ERROR]", e);
        return res.status(500).json({ message: "Bỏ chặn homestay thất bại" });
    }
};
