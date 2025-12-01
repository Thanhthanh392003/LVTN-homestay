// src/services/complaints.js
import api from "../lib/axios";

export const complaintsApi = {
    // Customer gửi khiếu nại / góp ý
    create(payload) {
        // payload: { bookingId, subject, content, type, userId? }
        return api
            .post("/complaints", {
                booking_id: payload.bookingId || null,
                subject: payload.subject,
                content: payload.content,
                type: payload.type || "booking",
                user_id: payload.userId || null,
            })
            .then((res) => res.data);
    },

    // Customer xem khiếu nại của riêng mình
    mine() {
        return api.get("/complaints/mine").then((res) => res.data);
    },

    // Owner xem khiếu nại liên quan homestay của mình
    getForOwner() {
        return api.get("/complaints/owner").then((res) => res.data);
    },

    // Admin / Owner xem tất cả khiếu nại
    getAll() {
        return api.get("/complaints").then((res) => res.data);
    },

    // Cập nhật trạng thái (open / pending / resolved)
    updateStatus(id, status) {
        return api
            .patch(`/complaints/${id}/status`, { status })
            .then((res) => res.data);
    },

    // Admin gửi phản hồi (email + lưu C_Reply)
    reply(id, payload) {
        return api
            .post(`/complaints/${id}/reply`, {
                message: payload.message,
            })
            .then((res) => res.data);
    },
};
