// src/services/reviews.js
import api from "../lib/axios";

// LƯU Ý: ../lib/axios nên bật withCredentials:true để gửi cookie session nếu bạn dùng session login.

function ok(tag, url, data) {
    console.log(`[reviewsApi.${tag}] ✅ ${url}`, data);
}
function ng(tag, url, e) {
    console.error(`[reviewsApi.${tag}] ❌ ${url}`, {
        status: e?.response?.status,
        response: e?.response?.data,
        msg: e?.message,
    });
}

export const reviewsApi = {
    // POST /api/reviews
    async create(payload) {
        const url = "/api/reviews/";
        console.log("[reviewsApi.create] payload:", payload, "→", url);
        try {
            const r = await api.post("/", payload, { baseURL: "/api/reviews" });
            ok("create", url, r?.data);
            return r.data;
        } catch (e) { ng("create", url, e); throw e; }
    },

    // GET /api/reviews/homestays/:id
    async listByHomestay(hid, params = {}) {
        const url = `/api/reviews/homestays/${hid}`;
        console.log("[reviewsApi.listByHomestay] →", url, params);
        try {
            const r = await api.get(`/homestays/${hid}`, { baseURL: "/api/reviews", params });
            ok("listByHomestay", url, r?.data);
            return r.data;
        } catch (e) { ng("listByHomestay", url, e); throw e; }
    },

    // GET /api/reviews/bookings/:id/mine  (fallback /api/reviews/mine?booking=:id)
    async getMineByBooking(bookingId) {
        const url = `/api/reviews/bookings/${bookingId}/mine`;
        console.log("[reviewsApi.getMineByBooking] →", url);
        try {
            const r = await api.get(`/bookings/${bookingId}/mine`, { baseURL: "/api/reviews" });
            ok("getMineByBooking", url, r?.data);
            return r.data;
        } catch (e) {
            // fallback
            try {
                const r = await api.get(`/mine`, { baseURL: "/api/reviews", params: { booking: bookingId } });
                ok("getMineByBooking(fallback)", "/api/reviews/mine", r?.data);
                return r.data;
            } catch (e2) { ng("getMineByBooking", url, e2); throw e2; }
        }
    },

    // PATCH /api/reviews/:id
    async update(id, payload) {
        const url = `/api/reviews/${id}`;
        console.log("[reviewsApi.update] →", url);
        try {
            const r = await api.patch(`/${id}`, payload, { baseURL: "/api/reviews" });
            ok("update", url, r?.data);
            return r.data;
        } catch (e) { ng("update", url, e); throw e; }
    },

    // DELETE /api/reviews/:id
    async remove(id) {
        const url = `/api/reviews/${id}`;
        console.log("[reviewsApi.remove] →", url);
        try {
            const r = await api.delete(`/${id}`, { baseURL: "/api/reviews" });
            ok("remove", url, r?.data);
            return r.data;
        } catch (e) { ng("remove", url, e); throw e; }
    },

    // ===== Replies (Owner) =====
    // POST /api/reviews/:id/replies
    async reply(reviewId, content) {
        const url = `/api/reviews/${reviewId}/replies`;
        console.log("[reviewsApi.reply] →", url);
        try {
            const r = await api.post(`/${reviewId}/replies`, { Content: content }, { baseURL: "/api/reviews" });
            ok("reply", url, r?.data);
            return r.data;
        } catch (e) { ng("reply", url, e); throw e; }
    },

    // PUT /api/reviews/replies/:replyId
    async updateReply(replyId, content) {
        const url = `/api/reviews/replies/${replyId}`;
        console.log("[reviewsApi.updateReply] →", url);
        try {
            const r = await api.put(`/replies/${replyId}`, { Content: content }, { baseURL: "/api/reviews" });
            return r.data;
        } catch (e) {
            console.error("[reviewsApi.updateReply] ❌", url, {
                status: e?.response?.status,
                data: e?.response?.data,
            });
            throw e;
        }
    },

    // DELETE /api/reviews/replies/:replyId
    async removeReply(replyId) {
        const url = `/api/reviews/replies/${replyId}`;
        console.log("[reviewsApi.removeReply] →", url);
        try {
            const r = await api.delete(`/replies/${replyId}`, { baseURL: "/api/reviews" });
            ok("removeReply", url, r?.data);
            return r.data;
        } catch (e) { ng("removeReply", url, e); throw e; }
    },

    // ===== ADMIN =====
    // PUT /api/reviews/admin/:id/visible
    async adminToggleVisible(reviewId, visible) {
        const url = `/api/reviews/admin/${reviewId}/visible`;
        console.log("[reviewsApi.adminToggleVisible] →", url, { visible });
        try {
            const r = await api.put(url, { visible });
            ok("adminToggleVisible", url, r?.data);
            return r.data;
        } catch (e) { ng("adminToggleVisible", url, e); throw e; }
    },

    // DELETE /api/reviews/admin/:id
    async adminRemove(reviewId) {
        const url = `/api/reviews/admin/${reviewId}`;
        console.log("[reviewsApi.adminRemove] →", url);
        try {
            const r = await api.delete(url);
            ok("adminRemove", url, r?.data);
            return r.data;
        } catch (e) { ng("adminRemove", url, e); throw e; }
    },
};

export default reviewsApi;
