// src/controllers/review.controller.js
const knex = require("../database/knex");

/* ───────── helpers ───────── */
async function q(sql, params = []) {
    const r = await knex.raw(sql, params);
    return Array.isArray(r) ? r[0] : r;
}

// Lấy id user/owner từ session (nhiều biến thể)
function pickActor(req) {
    const u = req.user || {};
    const s = (req.session && req.session.user) || {};
    return (
        u.Owner_ID || s.Owner_ID ||
        u.U_ID || s.U_ID ||
        u.user_id || s.user_id ||
        u.id || s.id || null
    );
}

// Map U_ID -> Owner_ID khi cần
async function resolveOwnerId(req) {
    const u = req.user || {};
    const s = (req.session && req.session.user) || {};

    // Nếu session đã có Owner_ID thì dùng luôn
    if (u.Owner_ID || s.Owner_ID) return u.Owner_ID || s.Owner_ID;

    // Lấy U_ID từ nhiều biến thể
    const uId = u.U_ID || s.U_ID || u.user_id || s.user_id || u.id || s.id;
    if (!uId) return null;

    // Thử tra bảng OWNER (nếu có). Nếu không có hoặc không map được -> dùng U_ID làm ownerId.
    try {
        const row = await q("SELECT Owner_ID FROM `OWNER` WHERE U_ID=? LIMIT 1", [uId]);
        if (row && row[0] && row[0].Owner_ID) return row[0].Owner_ID;
    } catch (e) {
        console.warn("[resolveOwnerId] OWNER table missing, fallback to U_ID as ownerId");
    }
    // Fallback: nhiều schema dùng U_ID lưu vào HOMESTAY.Owner_ID
    return uId;
}


async function assertOwnerOfHomestay(ownerId, hid) {
    const rs = await q(`SELECT 1 FROM HOMESTAY WHERE H_ID=? AND U_ID=? LIMIT 1`, [hid, ownerId]);
    if (!rs.length) {
        const err = new Error("Bạn không có quyền trả lời homestay này.");
        err.status = 403;
        throw err;
    }
}

async function canReview(bookingId, userId) {
    const row = await q(
        `SELECT b.Booking_ID, b.Booking_status,
            (SELECT MAX(d.Checkout_date) FROM \`BOOKING_DETAIL\` d WHERE d.Booking_ID=b.Booking_ID) AS lastOut,
            (SELECT d2.H_ID FROM \`BOOKING_DETAIL\` d2 WHERE d2.Booking_ID=b.Booking_ID LIMIT 1) AS H_ID
     FROM \`BOOKING\` b
     WHERE b.Booking_ID=? AND b.U_ID=? LIMIT 1`,
        [bookingId, userId]
    );
    if (!row.length) return { ok: false, message: "Không tìm thấy đơn hoặc không thuộc bạn." };

    const b = row[0];
    if (!b.lastOut || new Date(b.lastOut) >= new Date())
        return { ok: false, message: "Chỉ được đánh giá sau khi kết thúc lưu trú." };

    const st = String(b.Booking_status || "").toLowerCase();
    if (!["confirmed", "paid", "completed"].includes(st))
        return { ok: false, message: "Trạng thái đơn chưa cho phép đánh giá." };

    const existed = await q(`SELECT 1 FROM \`REVIEW\` WHERE Booking_ID=? LIMIT 1`, [bookingId]);
    if (existed.length) return { ok: false, message: "Đơn này đã đánh giá rồi." };

    return { ok: true, hid: b.H_ID };
}

async function recalcHomestayRating(hid) {
    const s = await q(
        `SELECT COUNT(*) AS cnt, AVG(Rating) AS avgR
     FROM \`REVIEW\`
     WHERE H_ID=? AND Is_visible=1 AND Is_verified=1`,
        [hid]
    );
    const cnt = Number(s?.[0]?.cnt || 0);
    const avg = s?.[0]?.avgR ? Number(s[0].avgR).toFixed(2) : 0;
    await q(`UPDATE \`HOMESTAY\` SET Rating_avg=?, Rating_count=? WHERE H_ID=?`, [avg, cnt, hid]);
}

/* ───────── Reviews CRUD ───────── */
exports.create = async (req, res) => {
    try {
        const userId =
            req.user?.U_ID || req.user?.user_id || req.user?.id ||
            req.session?.user?.U_ID || req.session?.user?.user_id;
        const { Booking_ID, H_ID, Rating, Content, Images = [] } = req.body || {};
        if (!userId) return res.status(401).json({ message: "Bạn cần đăng nhập." });

        const check = await canReview(Booking_ID, userId);
        if (!check.ok) return res.status(400).json({ message: check.message });
        if (Number(check.hid) !== Number(H_ID))
            return res.status(400).json({ message: "H_ID không khớp với booking." });
        if (!(Number(Rating) >= 1 && Number(Rating) <= 5))
            return res.status(400).json({ message: "Điểm phải từ 1 đến 5." });

        const ins = await q(
            `INSERT INTO \`REVIEW\` (Booking_ID, H_ID, U_ID, Rating, Content, Images_count, Is_verified, Is_visible)
       VALUES (?,?,?,?,?,?,1,1)`,
            [Booking_ID, H_ID, userId, Rating, Content || "", Math.min(Images.length, 6)]
        );

        const reviewId =
            ins?.insertId ||
            ins?.[0]?.insertId ||
            (
                await q(
                    `SELECT Review_ID FROM \`REVIEW\` WHERE Booking_ID=? AND U_ID=? ORDER BY Review_ID DESC LIMIT 1`,
                    [Booking_ID, userId]
                )
            )?.[0]?.Review_ID;

        for (let i = 0; i < Math.min(Images.length, 6); i++) {
            await q(
                `INSERT INTO \`REVIEW_IMAGE\` (Review_ID, Url, Sort_order) VALUES (?,?,?)`,
                [reviewId, Images[i], i]
            );
        }

        await recalcHomestayRating(H_ID);
        res.json({ ok: true, Review_ID: reviewId });
    } catch (e) {
        console.error("[review.create] error:", e?.sqlMessage || e?.message || e);
        res.status(500).json({ message: "Tạo đánh giá thất bại", detail: e?.sqlMessage || e?.message });
    }
};

exports.listByHomestay = async (req, res) => {
    try {
        const H_ID = Number(req.params.hid ?? req.params.id);
        if (!H_ID) return res.status(400).json({ message: "Thiếu H_ID" });

        const page = Math.max(1, parseInt(req.query.page || "1", 10));
        const size = Math.min(20, Math.max(5, parseInt(req.query.size || "5", 10)));
        const offset = (page - 1) * size;

        const rows = await q(
            `
  SELECT
    r.Review_ID, r.Booking_ID, r.U_ID, r.H_ID, r.Rating, r.Content, r.Created_at,
    r.Is_visible,                               -- lấy trạng thái hiển thị
    u.U_Fullname,
    COALESCE(NULLIF(TRIM(u.U_Fullname), ''), CONCAT('User #', u.U_ID)) AS author,
    COALESCE(rrg.replies, JSON_ARRAY()) AS replies
  FROM \`REVIEW\` r
  JOIN \`USER\` u ON u.U_ID = r.U_ID
  LEFT JOIN (
    SELECT
      rr.Review_ID,
      JSON_ARRAYAGG(
        JSON_OBJECT(
            'Reply_ID',   rr.Reply_ID,
            'Review_ID',  rr.Review_ID,   
            'Owner_ID',   rr.Owner_ID,
            'Content',    rr.Content,
            'Created_at', rr.Created_at,
            'Updated_at', rr.Updated_at
        )
      ) AS replies
    FROM \`REVIEW_REPLY\` rr
    GROUP BY rr.Review_ID
  ) rrg ON rrg.Review_ID = r.Review_ID
  WHERE r.H_ID = ?
  ORDER BY r.Review_ID DESC
  LIMIT ? OFFSET ?
  `,
            [H_ID, size, offset]
        );

        // Phòng khi driver trả chuỗi JSON:
        for (const r of rows) {
            if (typeof r.replies === "string") {
                try { r.replies = JSON.parse(r.replies); } catch { r.replies = []; }
            }
        }

        res.json({ ok: true, data: rows });
    } catch (e) {
        console.error("[review.listByHomestay] error:", e?.sqlMessage || e?.message || e);
        res.status(500).json({ message: "Không tải được đánh giá", detail: e?.sqlMessage || e?.message });
    }
};

exports.getMineByBooking = async (req, res) => {
    try {
        const userId =
            req.user?.U_ID || req.user?.user_id || req.user?.id ||
            req.session?.user?.U_ID || req.session?.user?.user_id;
        if (!userId) return res.status(401).json({ message: "Bạn cần đăng nhập." });

        const bookingId = Number(req.params.id || req.query.booking);
        if (!bookingId) return res.status(400).json({ message: "Thiếu booking id" });

        const rows = await q(
            `SELECT Review_ID, Booking_ID, H_ID, U_ID, Rating, Content, Created_at
       FROM \`REVIEW\`
       WHERE Booking_ID=? AND U_ID=?
       ORDER BY Review_ID DESC
       LIMIT 1`,
            [bookingId, userId]
        );
        res.json({ ok: true, data: rows[0] || null });
    } catch (e) {
        console.error("[review.getMineByBooking] error:", e?.sqlMessage || e?.message || e);
        res.status(500).json({ message: "Không lấy được đánh giá của bạn", detail: e?.sqlMessage || e?.message });
    }
};

exports.update = async (req, res) => {
    try {
        const userId =
            req.user?.U_ID || req.user?.user_id || req.user?.id ||
            req.session?.user?.U_ID || req.session?.user?.user_id;
        const id = Number(req.params.id);
        const { Rating, Content } = req.body || {};
        if (!userId) return res.status(401).json({ message: "Bạn cần đăng nhập." });

        const r = await q(`SELECT Review_ID, U_ID, H_ID, Created_at FROM \`REVIEW\` WHERE Review_ID=?`, [id]);
        if (!r.length) return res.status(404).json({ message: "Không tìm thấy đánh giá." });
        if (Number(r[0].U_ID) !== Number(userId))
            return res.status(403).json({ message: "Không có quyền sửa." });

        const created = new Date(r[0].Created_at);
        if (Date.now() - created.getTime() > 48 * 3600 * 1000)
            return res.status(400).json({ message: "Hết thời gian chỉnh sửa." });

        await q(`UPDATE \`REVIEW\` SET Rating=?, Content=? WHERE Review_ID=?`, [Rating, Content || "", id]);
        await recalcHomestayRating(r[0].H_ID);
        res.json({ ok: true });
    } catch (e) {
        console.error("[review.update] error:", e?.sqlMessage || e?.message || e);
        res.status(500).json({ message: "Sửa đánh giá thất bại", detail: e?.sqlMessage || e?.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const userId =
            req.user?.U_ID || req.user?.user_id || req.user?.id ||
            req.session?.user?.U_ID || req.session?.user?.user_id;
        const id = Number(req.params.id);
        if (!userId) return res.status(401).json({ message: "Bạn cần đăng nhập." });

        const r = await q(`SELECT Review_ID, U_ID, H_ID FROM \`REVIEW\` WHERE Review_ID=?`, [id]);
        if (!r.length) return res.status(404).json({ message: "Không tìm thấy đánh giá." });
        if (Number(r[0].U_ID) !== Number(userId))
            return res.status(403).json({ message: "Không có quyền xoá." });

        await q(`DELETE FROM \`REVIEW_IMAGE\` WHERE Review_ID=?`, [id]);
        await q(`DELETE FROM \`REVIEW\` WHERE Review_ID=?`, [id]);
        await recalcHomestayRating(r[0].H_ID);
        res.json({ ok: true });
    } catch (e) {
        console.error("[review.remove] error:", e?.sqlMessage || e?.message || e);
        res.status(500).json({ message: "Xoá đánh giá thất bại", detail: e?.sqlMessage || e?.message });
    }
};

/* ───────── REPLIES (Owner) ───────── */
exports.replyCreate = async (req, res) => {
    try {
        const ownerId = await resolveOwnerId(req);     // ⬅️ dùng hàm mới
        const reviewId = Number(req.params.id);
        const { Content = "" } = req.body || {};
        if (!ownerId) return res.status(401).json({ message: "Bạn cần đăng nhập (owner)." });
        if (!reviewId || !Content.trim()) return res.status(400).json({ message: "Nội dung không hợp lệ." });

        const rv = await q(`SELECT Review_ID, H_ID FROM \`REVIEW\` WHERE Review_ID=?`, [reviewId]);
        if (!rv.length) return res.status(404).json({ message: "Không tìm thấy đánh giá." });
        const hid = rv[0].H_ID;

        console.log("[replyCreate]", { ownerId, reviewId, hid }); // log để kiểm tra

        await assertOwnerOfHomestay(ownerId, hid);
        const ins = await q(
            `INSERT INTO \`REVIEW_REPLY\` (Review_ID, Owner_ID, H_ID, Content) VALUES (?,?,?,?)`,
            [reviewId, ownerId, hid, Content.trim()]
        );
        res.json({ ok: true, Reply_ID: ins?.insertId || ins?.[0]?.insertId });
    } catch (e) {
        console.error("[review.replyCreate] error:", e?.sqlMessage || e?.message || e);
        res.status(e.status || 500).json({ message: e.message || "Tạo trả lời thất bại" });
    }
};

exports.replyRemove = async (req, res) => {
    try {
        const ownerId = await resolveOwnerId(req);
        if (!ownerId) return res.status(401).json({ message: "Bạn cần đăng nhập (owner)." });

        const rid = Number(req.params.rid);
        const r = await q(`SELECT Reply_ID, H_ID, Owner_ID FROM \`REVIEW_REPLY\` WHERE Reply_ID=?`, [rid]);
        if (!r.length) return res.status(404).json({ message: "Không tìm thấy reply." });

        await assertOwnerOfHomestay(ownerId, r[0].H_ID);
        await q(`DELETE FROM \`REVIEW_REPLY\` WHERE Reply_ID=?`, [rid]);
        res.json({ ok: true });
    } catch (e) {
        console.error("[review.replyRemove] error:", e?.sqlMessage || e?.message || e);
        res.status(e.status || 500).json({ message: e.message || "Xoá trả lời thất bại", detail: e?.sqlMessage || e?.message });
    }
};


exports.replyUpdate = async (req, res) => {
    try {
        const ownerId = await resolveOwnerId(req);
        if (!ownerId) return res.status(401).json({ message: "Bạn cần đăng nhập (owner)." });
        const rid = Number(req.params.rid);
        const { Content = "" } = req.body || {};
        const r = await q(`SELECT Reply_ID, H_ID, Owner_ID FROM \`REVIEW_REPLY\` WHERE Reply_ID=?`, [rid]);
        if (!r.length) return res.status(404).json({ message: "Không tìm thấy reply." });
        await assertOwnerOfHomestay(ownerId, r[0].H_ID);
        await q(`UPDATE \`REVIEW_REPLY\` SET Content=? WHERE Reply_ID=?`, [Content.trim(), rid]);
        res.json({ ok: true });
    } catch (e) {
        console.error("[review.replyUpdate] error:", e?.sqlMessage || e?.message || e);
        res.status(e.status || 500).json({ message: e.message || "Cập nhật trả lời thất bại" });
    }
};

// Admin: Ẩn/hiện review (soft)
exports.adminToggleVisible = async (req, res) => {
    try {
        const isAdmin = (req.user?.ROLE_ID === 1) || (req.user?.role === 'admin') ||
            (req.session?.user?.ROLE_ID === 1) || (req.session?.user?.role === 'admin');
        if (!isAdmin) return res.status(403).json({ message: "Chỉ Admin được phép." });

        const id = Number(req.params.id);
        const { visible } = req.body || {}; // true/false
        if (!id || typeof visible !== "boolean") {
            return res.status(400).json({ message: "Thiếu tham số id/visible." });
        }

        const row = await q(`SELECT Review_ID, H_ID FROM \`REVIEW\` WHERE Review_ID=?`, [id]);
        if (!row.length) return res.status(404).json({ message: "Không tìm thấy review." });

        await q(`UPDATE \`REVIEW\` SET Is_visible=? WHERE Review_ID=?`, [visible ? 1 : 0, id]);

        // Cập nhật cache rating (điểm TB chỉ tính review đang hiển thị)
        await recalcHomestayRating(row[0].H_ID);

        return res.json({ ok: true });
    } catch (e) {
        console.error("[review.adminToggleVisible] error:", e?.sqlMessage || e?.message || e);
        res.status(500).json({ message: "Không cập nhật được trạng thái hiển thị", detail: e?.sqlMessage || e?.message });
    }
};

// Admin: Xóa hẳn review (hard delete)
exports.adminRemove = async (req, res) => {
    try {
        const isAdmin = (req.user?.ROLE_ID === 1) || (req.user?.role === 'admin') ||
            (req.session?.user?.ROLE_ID === 1) || (req.session?.user?.role === 'admin');
        if (!isAdmin) return res.status(403).json({ message: "Chỉ Admin được phép." });

        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ message: "Thiếu id." });

        const row = await q(`SELECT Review_ID, H_ID FROM \`REVIEW\` WHERE Review_ID=?`, [id]);
        if (!row.length) return res.status(404).json({ message: "Không tìm thấy review." });

        // Xóa ảnh kèm (nếu có) rồi xóa review
        await q(`DELETE FROM \`REVIEW_IMAGE\` WHERE Review_ID=?`, [id]);
        await q(`DELETE FROM \`REVIEW\` WHERE Review_ID=?`, [id]);

        // Cập nhật cache rating
        await recalcHomestayRating(row[0].H_ID);

        return res.json({ ok: true });
    } catch (e) {
        console.error("[review.adminRemove] error:", e?.sqlMessage || e?.message || e);
        res.status(500).json({ message: "Xóa review thất bại", detail: e?.sqlMessage || e?.message });
    }
};

exports.adminHomestaysHavingReviews = async (req, res) => {
    try {
        const isAdmin = (req.user?.ROLE_ID === 1) || (req.user?.role === 'admin') ||
            (req.session?.user?.ROLE_ID === 1) || (req.session?.user?.role === 'admin');
        if (!isAdmin) return res.status(403).json({ message: "Chỉ Admin được phép." });

        // Lấy các H_ID có review + tên homestay (nếu có)
        const rows = await q(`
      SELECT r.H_ID, COALESCE(h.H_Name, CONCAT('Homestay #', r.H_ID)) AS H_Name
      FROM \`REVIEW\` r
      LEFT JOIN \`HOMESTAY\` h ON h.H_ID = r.H_ID
      GROUP BY r.H_ID, h.H_Name
      ORDER BY r.H_ID ASC
    `);

        res.json({ ok: true, data: rows });
    } catch (e) {
        console.error("[review.adminHomestaysHavingReviews] error:", e?.sqlMessage || e?.message || e);
        res.status(500).json({ message: "Không lấy được danh sách homestay có review", detail: e?.sqlMessage || e?.message });
    }
};
