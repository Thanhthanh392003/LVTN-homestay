const db = require("../database/knex");
const nodemailerSafe = (() => {
    try { return require("nodemailer"); } catch { return null; }
})();

const OVERLAP_STATUSES = ["pending", "confirmed", "paid", "completed"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(s) { return DATE_RE.test(String(s || "")); }
function toDate(s) { return new Date(s); }

/* ------------ Helpers ------------ */
async function recomputeTotal(trx, bookingId) {
    const sum = await trx("BOOKING_DETAIL")
        .where("Booking_ID", bookingId)
        .sum({ total: "Line_total" })
        .first();

    await trx("BOOKING")
        .where("Booking_ID", bookingId)
        .update({ Total_price: Number(sum?.total || 0) });
}

async function getBookingDateRange(trx, bookingId) {
    const rows = await trx("BOOKING_DETAIL")
        .where("Booking_ID", bookingId)
        .select("Checkin_date", "Checkout_date");

    if (!rows.length) return { minIn: null, maxOut: null };

    const minIn = rows.reduce(
        (m, r) => (!m || r.Checkin_date < m ? r.Checkin_date : m),
        null
    );
    const maxOut = rows.reduce(
        (m, r) => (!m || r.Checkout_date > m ? r.Checkout_date : m),
        null
    );

    return { minIn, maxOut };
}

/* ------------ mail helpers ------------ */
function buildTransport() {
    if (!nodemailerSafe) { console.warn("[MAIL] nodemailer chưa được cài"); return null; }
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST) { console.warn("[MAIL] Thiếu SMTP_HOST trong .env"); return null; }

    return nodemailerSafe.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: false,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
}

/* ============= Xử lý lý do huỷ ============= */
function resolveCancelReason({ isOwnerReject, userReason }) {
    if (isOwnerReject === true) return "Đơn đã bị hủy do chủ nhà từ chối";
    if (userReason && String(userReason).trim() !== "")
        return String(userReason).trim();
    return "Đơn đã bị hủy theo yêu cầu của khách hàng";
}

/* ================== FIX computeDiscount ================== */
async function computeDiscount(trx, code, hid, subtotal, uid) {
    if (!code) return 0;

    const promo = await trx("PROMOTION")
        .where("P_Code", code)
        .andWhere("P_Status", "active")
        .first();

    if (!promo) return 0;

    const today = new Date();
    if (promo.Start_date && today < new Date(promo.Start_date)) return 0;
    if (promo.End_date && today > new Date(promo.End_date)) return 0;

    const applied = await trx("PROMOTION_HOMESTAY")
        .where("Promotion_ID", promo.Promotion_ID)
        .andWhere("H_ID", hid)
        .first();

    if (!applied) return 0;
    if (promo.Min_order_amount && subtotal < promo.Min_order_amount) return 0;

    let discount = 0;
    if (promo.P_Type === "percent") {
        discount = Math.round(subtotal * Number(promo.Discount) / 100);
        if (promo.Max_discount) discount = Math.min(discount, Number(promo.Max_discount));
    } else {
        discount = Number(promo.Discount || 0);
    }

    if (discount < 0) discount = 0;
    if (discount > subtotal) discount = subtotal;

    return discount;
}

async function resolveCustomer(trx, bookingId) {
    const row = await trx("BOOKING as b")
        .join("USER as u", "u.U_ID", "b.U_ID")
        .where("b.Booking_ID", bookingId)
        .select("u.U_Email as email", "u.U_Fullname as name")
        .first();

    return row || { email: null, name: null };
}

/* ================== CREATE BOOKING ================== */
exports.create = async (req, res) => {
    const u = req.session?.user;

    // ⭐ CHO PHÉP CHATBOT BỎ LOGIN
    if (!u && req.headers["x-bot-secret"] === "greenstay-ai") {
        const bookingId = Number(req.body?.booking_id || req.params?.id);
        if (!bookingId) return res.status(400).json({ message: "Thiếu booking_id" });

        const header = await db("BOOKING").where({ Booking_ID: bookingId }).first();
        const details = await db("BOOKING_DETAIL as d")
            .join("HOMESTAY as h", "h.H_ID", "d.H_ID")
            .where("d.Booking_ID", bookingId)
            .select("d.*", "h.H_Name");

        return res.json({
            status: "success",
            data: { header, details }
        });
    }

    const body =
        (req.body && typeof req.body === "object" && req.body.data && typeof req.body.data === "object")
            ? req.body.data
            : req.body;

    console.log("=== [CREATE BOOKING] BODY ===");
    console.log(JSON.stringify(body, null, 2));

    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) return res.status(400).json({ message: "Thiếu danh sách homestay" });

    const finalNote = String(
        body?.note ??
        body?.Booking_note ??
        body?.customerNote ??
        body?.customer_note ??
        body?.Note ??
        ""
    ).trim();

    const paymentMethod = String(
        body?.paymentMethod ??
        body?.payment_method ??
        body?.Payment_method ??
        body?.Gateway ??
        ""
    ).toLowerCase();

    const initStatus = paymentMethod !== "cod" ? "pending_payment" : "pending";

    const subtotalFE = Number(body?.Subtotal || 0);
    const promoCode = body?.Promotion_code || null;

    try {
        const result = await db.transaction(async (trx) => {

            let promo = null;
            if (promoCode) {
                promo = await trx("PROMOTION")
                    .where("P_Code", promoCode)
                    .andWhere("P_Status", "active")
                    .first();
            }

            let discount = 0;
            if (promoCode) {
                discount = await computeDiscount(
                    trx,
                    promoCode,
                    items[0]?.H_ID,
                    subtotalFE,
                    u?.U_ID
                );
            }

            let total = subtotalFE - discount;
            if (total < 0) total = 0;

            const [Booking_ID] = await trx("BOOKING").insert({
                U_ID: u.U_ID,
                Booking_status: initStatus,
                Booking_note: finalNote,
                Payment_method: paymentMethod || null,
                Promotion_code: promoCode,
                Subtotal: subtotalFE,
                Discount_amount: discount,
                Total_price: total,
            });

            for (const it of items) {
                const H_ID = Number(it?.H_ID);
                const checkin = String(it?.checkin || "");
                const checkout = String(it?.checkout || "");
                const guests = Math.max(1, Number(it?.guests || 1));

                const hs = await trx("HOMESTAY").where({ H_ID }).first();

                await trx("BOOKING_DETAIL").insert({
                    Booking_ID,
                    H_ID,
                    Checkin_date: checkin,
                    Checkout_date: checkout,
                    Guests: guests,
                    Unit_price: Number(hs.Price_per_day || 0),
                    Promotion_code: promoCode,
                });
            }

            if (promoCode && discount > 0 && promo) {
                await trx("PROMOTION_USAGE").insert({
                    Promotion_ID: promo.Promotion_ID,
                    Booking_ID,
                    U_ID: u.U_ID,
                    Discount_amount: discount,
                    Used_at: new Date()
                });
            }

            const header = await trx("BOOKING").where({ Booking_ID }).first();
            const details = await trx("BOOKING_DETAIL").where({ Booking_ID });

            return { header, details };
        });

        return res.json({ status: "success", data: result });

    } catch (e) {
        console.error("❌ [CREATE BOOKING ERROR]", e);
        return res.status(500).json({ message: e.message || "Tạo booking thất bại" });
    }
};
/* ================== LIST MINE ================== */
exports.mine = async (req, res) => {
    const u = req.session?.user;
    if (!u)
        return res.status(401).json({ message: "Bạn chưa đăng nhập" });

    try {
        const headers = await db("BOOKING")
            .where("U_ID", u.U_ID)
            .select(
                "Booking_ID",
                "U_ID",
                "Booking_status",
                "Total_price",
                "Created_at",
                "Booking_note",
                "Payment_method",
                "Subtotal",
                "Discount_amount",
                "Promotion_code"
            )
            .orderBy("Created_at", "desc");

        const ids = headers.map(h => h.Booking_ID);

        const details = ids.length
            ? await db("BOOKING_DETAIL as d")
                .join("HOMESTAY as h", "h.H_ID", "d.H_ID")
                .whereIn("d.Booking_ID", ids)
                .select(
                    "d.*",
                    "h.H_Name",
                    "h.H_City"
                )
            : [];

        const grouped = headers.map(h => ({
            ...h,
            details: details.filter(d => d.Booking_ID === h.Booking_ID)
        }));

        res.json({ status: "success", data: grouped });

    } catch (e) {
        console.error("[BOOKING MINE ERROR]", e);
        res.status(500).json({ message: "Lỗi lấy danh sách của tôi" });
    }
};


/* ================== GET BY ID — FIX CHO CHATBOT ================== */
exports.getById = async (req, res) => {

    // ⭐ CHO PHÉP CHATBOT LẤY ĐƠN KHÔNG CẦN LOGIN
    if (req.headers["x-bot-secret"] === "greenstay-ai") {
        const bookingId = Number(req.params.id);
        if (!bookingId) return res.status(400).json({ message: "Booking_ID không hợp lệ" });

        const header = await db("BOOKING").where({ Booking_ID: bookingId }).first();
        if (!header)
            return res.status(404).json({ status: "error", message: "Không tìm thấy booking" });

        const details = await db("BOOKING_DETAIL as d")
            .join("HOMESTAY as h", "h.H_ID", "d.H_ID")
            .where("d.Booking_ID", bookingId)
            .select("d.*", "h.H_Name");

        return res.json({
            status: "success",
            data: { header, details }
        });
    }

    // ⭐ BÌNH THƯỜNG — NGƯỜI DÙNG WEBSITE
    const u = req.session?.user;
    if (!u)
        return res.status(401).json({ message: "Bạn chưa đăng nhập" });

    const Booking_ID = Number(req.params.id);
    if (!Number.isFinite(Booking_ID) || Booking_ID <= 0)
        return res.status(400).json({ message: "Booking_ID không hợp lệ" });

    try {
        const header = await db("BOOKING").where({ Booking_ID }).first();
        if (!header)
            return res.status(404).json({ message: "Không tìm thấy booking" });

        const details = await db("BOOKING_DETAIL as d")
            .join("HOMESTAY as h", "h.H_ID", "d.H_ID")
            .where("d.Booking_ID", Booking_ID)
            .select("d.*", "h.H_Name", "h.U_ID as Owner_ID");

        const ownerHasItem = details.some(
            d => Number(d.Owner_ID) === Number(u.U_ID)
        );

        const role = String(u?.role || "").toLowerCase();
        const canView =
            role === "admin" ||
            Number(header.U_ID) === Number(u.U_ID) ||
            ownerHasItem;

        if (!canView)
            return res.status(403).json({ message: "Bạn không có quyền xem" });

        return res.json({
            status: "success",
            data: { header, details }
        });

    } catch (e) {
        console.error("[BOOKING GET BY ID ERROR]", e);
        res.status(500).json({ message: "Lỗi lấy booking" });
    }
};
/* ================== OWNER LIST ================== */
exports.ownerList = async (req, res) => {
    const u = req.session?.user;
    if (!u)
        return res.status(401).json({ message: "Bạn chưa đăng nhập" });

    try {
        const rows = await db("BOOKING_DETAIL as d")
            .join("HOMESTAY as h", "h.H_ID", "d.H_ID")
            .join("BOOKING as b", "b.Booking_ID", "d.Booking_ID")
            .where("h.U_ID", Number(u.U_ID))
            .select(
                "b.Booking_ID",
                "b.U_ID",
                "b.Booking_status",
                "b.Total_price",
                "b.Created_at",
                "b.Subtotal",
                "b.Discount_amount",
                "b.Promotion_code",
                "d.Booking_Detail_ID",
                "d.H_ID",
                db.raw("DATE(d.Checkin_date) as Checkin_date"),
                db.raw("DATE(d.Checkout_date) as Checkout_date"),
                "d.Guests",
                "d.Unit_price",
                db.raw("COALESCE(d.Line_total, GREATEST(DATEDIFF(d.Checkout_date, d.Checkin_date), 1)*d.Unit_price) as Line_total"),
                "h.H_Name"
            )
            .orderBy("b.Created_at", "desc");

        const map = new Map();
        for (const r of rows) {
            if (!map.has(r.Booking_ID)) {
                map.set(r.Booking_ID, {
                    Booking_ID: r.Booking_ID,
                    U_ID: r.U_ID,
                    Booking_status: r.Booking_status,
                    Total_price: r.Total_price ?? 0,
                    Created_at: r.Created_at,
                    Subtotal: r.Subtotal ?? 0,
                    Discount_amount: r.Discount_amount ?? 0,
                    Promotion_code: r.Promotion_code ?? null,
                    details: []
                });
            }
            map.get(r.Booking_ID).details.push({
                Booking_Detail_ID: r.Booking_Detail_ID,
                H_ID: r.H_ID,
                H_Name: r.H_Name,
                Checkin_date: r.Checkin_date,
                Checkout_date: r.Checkout_date,
                Guests: r.Guests,
                Unit_price: Number(r.Unit_price) || 0,
                Line_total: Number(r.Line_total) || 0
            });
        }

        res.json({ status: "success", data: Array.from(map.values()) });

    } catch (e) {
        console.error("[BOOKING OWNER LIST ERROR]", e);
        res.status(500).json({ message: "Lỗi lấy booking chủ nhà" });
    }
};


/* ================== UPDATE STATUS ================== */
exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const newStatus = String(req.body?.status || "");
    const ALLOW = ["confirmed", "cancelled", "completed", "paid", "pending_payment"];

    if (!ALLOW.includes(newStatus))
        return res.status(422).json({ message: "Trạng thái không hợp lệ" });

    try {
        const u = req.session?.user;
        if (!u)
            return res.status(401).json({ message: "Bạn chưa đăng nhập" });

        let headerForMail = null;
        let detailsForMail = [];
        let customerInfo = null;
        let finalReason = "";

        await db.transaction(async (trx) => {

            const header = await trx("BOOKING").where("Booking_ID", id).first();
            if (!header) throw Object.assign(new Error("Không tìm thấy booking"), { http: 404 });

            headerForMail = header;

            const details = await trx("BOOKING_DETAIL as d")
                .join("HOMESTAY as h", "h.H_ID", "d.H_ID")
                .where("d.Booking_ID", id)
                .select("h.U_ID as Owner_ID", "d.Checkin_date", "d.Checkout_date", "d.Unit_price", "h.H_Name");

            detailsForMail = details.map(d => ({
                H_Name: d.H_Name,
                Checkin_date: d.Checkin_date,
                Checkout_date: d.Checkout_date,
                Unit_price: d.Unit_price
            }));

            const isOwner = details.some(d => Number(d.Owner_ID) === Number(u.U_ID));
            const isCustomer = Number(header.U_ID) === Number(u.U_ID);
            const isAdmin = String(u.role || "").toLowerCase() === "admin";

            const { minIn, maxOut } = await getBookingDateRange(trx, id);
            const now = new Date();

            // ================== COMPLETED ==================
            if (newStatus === "completed") {
                if (!(isOwner || isAdmin))
                    throw Object.assign(new Error("Chỉ Owner/Admin được phép hoàn thành"), { http: 403 });
                if (!(maxOut && now >= new Date(maxOut)))
                    throw Object.assign(new Error("Chưa qua ngày trả phòng"), { http: 409 });
            }

            // ================== CANCEL ==================
            if (newStatus === "cancelled") {

                if (isOwner) {
                    // Chủ nhà từ chối
                    finalReason = resolveCancelReason({ isOwnerReject: true });

                } else if (isCustomer) {
                    // Khách tự hủy
                    finalReason = resolveCancelReason({
                        isOwnerReject: false,
                        userReason: req.body?.reason
                    });

                } else if (isAdmin) {
                    // Admin hủy
                    finalReason = resolveCancelReason({
                        isOwnerReject: req.body?.isOwnerReject === true,
                        userReason: req.body?.reason
                    });
                }
            }
            await trx("BOOKING").where("Booking_ID", id).update({
                Booking_status: newStatus
            });

            customerInfo = await resolveCustomer(trx, id);
        });

        //  ================== EMAIL SAU KHI UPDATE ==================
        if (customerInfo?.email) {
            await sendStatusEmail({
                bookingId: id,
                status: newStatus,
                toEmail: customerInfo.email,
                toName: customerInfo.name,
                total: headerForMail.Total_price,
                details: detailsForMail,
                reason: newStatus === "cancelled" ? finalReason : ""
            });
        }

        return res.json({
            status: "success",
            data: { Booking_ID: Number(id), Booking_status: newStatus }
        });

    } catch (e) {
        const http = e?.http || 500;
        return res.status(http).json({ message: e.message || "Update status fail" });
    }
};
/* ================== DELETE BOOKING ================== */
exports.remove = async (req, res) => {
    const u = req.session?.user;
    if (!u)
        return res.status(401).json({ message: "Bạn chưa đăng nhập" });

    const Booking_ID = Number(req.params.id);
    if (!Number.isFinite(Booking_ID) || Booking_ID <= 0)
        return res.status(400).json({ message: "Booking_ID không hợp lệ" });

    try {
        const header = await db("BOOKING").where({ Booking_ID }).first();
        if (!header)
            return res.status(404).json({ message: "Không tìm thấy booking" });

        const role = String(u?.role || "").toLowerCase();
        const isAdmin = role === "admin";
        const isOwnerOfBooking = Number(header.U_ID) === Number(u.U_ID);

        if (!isOwnerOfBooking && !isAdmin) {
            return res.status(403).json({ message: "Không có quyền xóa đơn" });
        }

        const st = String(header.Booking_status || "").toLowerCase();
        if (!isAdmin && !["pending", "cancelled"].includes(st)) {
            return res.status(400).json({ message: "Chỉ được xoá đơn ở Chờ duyệt hoặc Đã huỷ" });
        }

        await db("BOOKING").where({ Booking_ID }).del();

        return res.json({ status: "success", data: { Booking_ID } });

    } catch (e) {
        console.error("[BOOKING DELETE ERROR]", e);
        return res.status(500).json({ message: "Xoá booking thất bại" });
    }
};


/* ================== ADMIN LIST ================== */
exports.adminList = async (req, res) => {
    const u = req.session?.user;
    if (!u)
        return res.status(401).json({ message: "Bạn chưa đăng nhập" });

    const role = String(u.role || "").toLowerCase();
    if (role !== "admin")
        return res.status(403).json({ message: "Chỉ admin được xem" });

    try {
        const rows = await db("BOOKING_DETAIL as d")
            .join("HOMESTAY as h", "h.H_ID", "d.H_ID")
            .join("BOOKING as b", "b.Booking_ID", "d.Booking_ID")
            .select(
                "b.Booking_ID",
                "b.U_ID",
                "b.Booking_status",
                "b.Total_price",
                "b.Created_at",
                "b.Subtotal",
                "b.Discount_amount",
                "b.Promotion_code",
                "d.Booking_Detail_ID",
                "d.H_ID",
                db.raw("DATE(d.Checkin_date) as Checkin_date"),
                db.raw("DATE(d.Checkout_date) as Checkout_date"),
                "d.Guests",
                "d.Unit_price",
                db.raw("COALESCE(d.Line_total, GREATEST(DATEDIFF(d.Checkout_date, d.Checkin_date), 1)*d.Unit_price) as Line_total"),
                "h.H_Name"
            )
            .orderBy("b.Created_at", "desc");

        const map = new Map();
        for (const r of rows) {
            if (!map.has(r.Booking_ID)) {
                map.set(r.Booking_ID, {
                    Booking_ID: r.Booking_ID,
                    U_ID: r.U_ID,
                    Booking_status: r.Booking_status,
                    Total_price: r.Total_price ?? 0,
                    Created_at: r.Created_at,
                    Subtotal: r.Subtotal ?? 0,
                    Discount_amount: r.Discount_amount ?? 0,
                    Promotion_code: r.Promotion_code ?? null,
                    details: []
                });
            }
            map.get(r.Booking_ID).details.push({
                Booking_Detail_ID: r.Booking_Detail_ID,
                H_ID: r.H_ID,
                H_Name: r.H_Name,
                Checkin_date: r.Checkin_date,
                Checkout_date: r.Checkout_date,
                Guests: r.Guests,
                Unit_price: Number(r.Unit_price) || 0,
                Line_total: Number(r.Line_total) || 0
            });
        }

        return res.json({
            status: "success",
            data: Array.from(map.values())
        });

    } catch (e) {
        console.error("[BOOKING ADMIN LIST ERROR]", e);
        res.status(500).json({ message: "Lỗi admin list" });
    }
};


/* ================== ADMIN – TOTAL REVENUE ================== */
exports.adminRevenue = async (req, res) => {
    const u = req.session?.user;
    if (!u) return res.status(401).json({ message: "Bạn chưa đăng nhập" });

    const role = String(u.role || "").toLowerCase();
    if (role !== "admin") {
        return res.status(403).json({ message: "Không có quyền" });
    }

    try {
        const rows = await db("BOOKING")
            .whereIn("Booking_status", ["paid", "completed"])
            .sum({ revenue: "Total_price" })
            .first();

        const revenue = Number(rows?.revenue || 0);

        return res.json({
            status: "success",
            revenue
        });

    } catch (e) {
        console.error("[ADMIN REVENUE ERROR]", e);
        return res.status(500).json({ message: "Lỗi lấy doanh thu" });
    }
};

exports.getUnavailableByHomestay = async (req, res) => {
    const hid = Number(req.params.hid);
    if (!Number.isFinite(hid) || hid <= 0)
        return res.status(400).json({ message: "H_ID không hợp lệ" });

    try {
        const rows = await db("BOOKING_DETAIL as d")
            .join("BOOKING as b", "b.Booking_ID", "d.Booking_ID")
            .where("d.H_ID", hid)
            .whereIn("b.Booking_status", ["pending", "pending_payment", "paid", "confirmed"])
            .select(
                db.raw("DATE(d.Checkin_date) as start"),
                db.raw("DATE(d.Checkout_date) as end")
            );

        return res.json({ status: "success", data: rows });

    } catch (e) {
        console.error("[GET UNAVAILABLE ERROR]", e);
        return res.status(500).json({ message: "Lỗi lấy ngày đã đặt" });
    }
};

exports.getAllForAdmin = async (req, res) => {
    try {
        const rows = await db("BOOKING as b")
            .leftJoin("HOMESTAY as h", "b.H_ID", "h.H_ID")
            .leftJoin("USERS as u", "b.U_ID", "u.U_ID")
            .select(
                "b.*",
                "h.H_Name as Homestay_Name",
                "h.H_ID",
                "u.Fullname as Customer_Name"
            )
            .orderBy("b.Booking_ID", "desc");

        return res.json({ status: "success", data: rows });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
};
