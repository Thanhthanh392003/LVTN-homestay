// backend/src/services/complaint.service.js

const knex = require("../database/knex");
const ApiError = require("../api-error");

/* ==========================================
 * CREATE COMPLAINT (booking & general)
 * ========================================== */
async function createComplaint(req, body) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, "Unauthorized");

    const { booking_id, subject, content, type } = body;

    if (!subject || !content) {
        throw new ApiError(400, "Missing subject or content");
    }

    if ((type || "booking") === "booking" && !booking_id) {
        throw new ApiError(400, "Booking ID required for booking complaint");
    }

    const insertData = {
        U_ID: uId,
        Booking_ID: booking_id || null,
        C_Subject: subject,
        C_Content: content,
        C_Type: type || "booking", // 'booking' | 'general'
        C_Status: "open",
        Created_at: knex.fn.now(),
    };

    const [id] = await knex("COMPLAINT").insert(insertData);
    return knex("COMPLAINT").where("Complaint_ID", id).first();
}

/* ==========================================
 * LIST COMPLAINTS OF CURRENT USER
 * ========================================== */
async function listMyComplaints(req) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, "Unauthorized");

    return knex("COMPLAINT")
        .where("U_ID", uId)
        .orderBy("Created_at", "desc");
}

/* ==========================================
 * LIST ALL COMPLAINTS (Admin / Owner)
 * ========================================== */
async function listComplaintsForOwner() {
    // Hiện tại trả tất cả; nếu sau này muốn filter theo Owner thì thêm điều kiện ở đây
    return knex("COMPLAINT").orderBy("Created_at", "desc");
}

/* ==========================================
 * GET ONE COMPLAINT + CUSTOMER EMAIL
 * ========================================== */
async function getComplaintWithUserEmail(id) {
    // 🔧 FIX: bảng đúng là USER, không phải USERS
    return knex("COMPLAINT as c")
        .join("USER as u", "u.U_ID", "c.U_ID")
        .select(
            "c.*",
            "u.U_Email as Customer_Email",
            "u.U_Fullname as Customer_Name"
        )
        .where("c.Complaint_ID", id)
        .first();
}

/* ==========================================
 * SAVE REPLY & MARK RESOLVED
 * ========================================== */
async function saveReply({ id, reply, adminId }) {
    await knex("COMPLAINT")
        .where("Complaint_ID", id)
        .update({
            C_Reply: reply,
            C_Status: "resolved",
            Replied_By: adminId || null,
            Replied_At: knex.fn.now(),
            Updated_at: knex.fn.now(),
        });
}

/* ==========================================
 * UPDATE STATUS ONLY
 * ========================================== */
async function updateComplaintStatus(id, status) {
    if (!status) throw new ApiError(400, "Missing status");

    const normalized = String(status).toLowerCase();
    // FE đang dùng 'open' | 'pending' | 'resolved'
    // DB: ENUM('open','in_progress','resolved','closed')
    let dbStatus = normalized === "pending" ? "in_progress" : normalized;

    const allowedDb = ["open", "in_progress", "resolved", "closed"];
    if (!allowedDb.includes(dbStatus)) {
        throw new ApiError(400, "Invalid status");
    }

    await knex("COMPLAINT")
        .where("Complaint_ID", id)
        .update({
            C_Status: dbStatus,
            Updated_at: knex.fn.now(),
        });
}

async function listComplaintsByOwner(ownerId) {
    if (!ownerId) throw new ApiError(401, "Unauthorized");

    const rows = await knex("COMPLAINT as c")
        .leftJoin("BOOKING as b", "b.Booking_ID", "c.Booking_ID")
        .leftJoin("BOOKING_DETAIL as bd", "bd.Booking_ID", "b.Booking_ID")
        .leftJoin("HOMESTAY as h", "h.H_ID", "bd.H_ID")
        .where("h.U_ID", ownerId)
        .orderBy("c.Created_at", "desc")
        .distinct(
            "c.Complaint_ID",
            "c.Booking_ID",
            "c.U_ID",
            "c.C_Type",
            "c.C_Subject",
            "c.C_Content",
            "c.C_Status",
            "c.Created_at",
            "c.Updated_at"
        );

    return rows;
}
/* ==========================================
 * EXPORTS
 * ========================================== */
module.exports = {
    createComplaint,
    listMyComplaints,
    listComplaintsForOwner,
    getComplaintWithUserEmail,
    saveReply,
    updateComplaintStatus,
    listComplaintsByOwner,
};
