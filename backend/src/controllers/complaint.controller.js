// backend/src/controllers/complaint.controller.js

const complaintService = require("../services/complaint.service");
const ApiError = require("../api-error");
const mailer = require("../lib/mailer");

/* ==========================================
 * CREATE NEW COMPLAINT
 * ========================================== */
exports.createComplaint = async (req, res, next) => {
    try {
        console.log("[COMPLAINT][create] body:", req.body);

        const data = await complaintService.createComplaint(req, req.body);

        console.log("[COMPLAINT][created]", data);

        return res.status(201).json({
            status: "success",
            data,
        });
    } catch (err) {
        console.error("[COMPLAINT][create] ERROR:", err);
        next(new ApiError(500, err.message || "Error creating complaint"));
    }
};

/* ==========================================
 * LIST USER COMPLAINTS
 * ========================================== */
exports.listMyComplaints = async (req, res, next) => {
    try {
        const list = await complaintService.listMyComplaints(req);

        return res.json({
            status: "success",
            data: list,
        });
    } catch (err) {
        console.error("[COMPLAINT][list-my] ERROR:", err);
        next(new ApiError(500, "Error listing complaints"));
    }
};

/* ==========================================
 * LIST ALL COMPLAINTS (OWNER / ADMIN)
 * ========================================== */
exports.listComplaintsForOwner = async (req, res, next) => {
    try {
        const list = await complaintService.listComplaintsForOwner();

        return res.json({
            status: "success",
            data: list,
        });
    } catch (err) {
        console.error("[COMPLAINT][list-owner] ERROR:", err);
        next(new ApiError(500, "Error listing complaints"));
    }
};

/* ==========================================
 * UPDATE STATUS
 * ========================================== */
exports.updateComplaintStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return next(new ApiError(400, "Missing status"));
        }

        await complaintService.updateComplaintStatus(id, status);

        return res.json({
            status: "success",
            message: "Status updated",
        });
    } catch (err) {
        console.error("[COMPLAINT][update-status] ERROR:", err);
        next(new ApiError(500, "Error updating status"));
    }
};

/* ==========================================
 * REPLY TO COMPLAINT (ADMIN)
 * ========================================== */
exports.replyToComplaint = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { message } = req.body;
        const admin = req.user; // nếu bạn có auth lấy ra Admin hiện tại

        if (!message || !message.trim()) {
            return res
                .status(400)
                .json({
                    status: "error",
                    message: "Nội dung phản hồi không được để trống",
                });
        }

        const complaint = await complaintService.getComplaintWithUserEmail(id);
        if (!complaint) {
            return res
                .status(404)
                .json({ status: "error", message: "Không tìm thấy khiếu nại" });
        }

        if (!complaint.Customer_Email) {
            return res.status(400).json({
                status: "error",
                message: "Không có email khách hàng để gửi phản hồi",
            });
        }

        // Gửi email cho khách
        await mailer.sendMail({
            to: complaint.Customer_Email,
            subject: `[GreenStay] Phản hồi khiếu nại #${complaint.Complaint_ID}`,
            html: `
                <p>Xin chào ${complaint.Customer_Name || "quý khách"},</p>
                <p>Chúng tôi đã tiếp nhận khiếu nại của bạn về đơn <strong>#${complaint.Booking_ID || "N/A"
                }</strong> với tiêu đề:</p>
                <p><strong>${complaint.C_Subject || "(không có tiêu đề)"
                }</strong></p>
                <p>Dưới đây là phản hồi từ bộ phận hỗ trợ:</p>
                <p style="white-space:pre-line">${message}</p>
                <p>Trân trọng,<br/>Đội ngũ hỗ trợ GreenStay</p>
            `,
        });

        // Lưu lại reply + đánh dấu đã xử lý
        await complaintService.saveReply({
            id,
            reply: message,
            adminId: admin?.U_ID,
        });

        return res.json({
            status: "success",
            message: "Đã gửi phản hồi và cập nhật khiếu nại",
        });
    } catch (err) {
        console.error("[complaint] replyToComplaint error:", err);
        next(err);
    }
};

exports.listComplaintsForOwnerView = async (req, res, next) => {
    try {
        const ownerId = req.session?.user_id;
        if (!ownerId) {
            return next(new ApiError(401, "Unauthorized"));
        }

        const list = await complaintService.listComplaintsByOwner(ownerId);

        return res.json({
            status: "success",
            data: list,
        });
    } catch (err) {
        console.error("[COMPLAINT][list-owner-view] ERROR:", err);
        next(new ApiError(500, "Error listing complaints for owner"));
    }
};