// src/services/promotions.js
import api from "../lib/axios";
const withCreds = { withCredentials: true };

const toArray = (res) => {
    const cands = [
        res?.data?.data?.promotions,
        res?.data?.promotions,
        res?.promotions,
        res?.data,
        res,
    ];
    for (const x of cands) if (Array.isArray(x)) return x;
    return [];
};

async function safeGet(url) {
    try {
        const r = await api.get(url, withCreds);
        return { ok: true, data: toArray(r) };
    } catch (e) {
        const status = e?.response?.status;
        return { ok: false, status, error: e };
    }
}

export const promotionsApi = {
    async list(params = {}) {
        return api.get("/promotions", { ...withCreds, params });
    },

    async create(payload) {
        const r = await api.post("/promotions", payload, withCreds);
        return r?.data ?? r;
    },

    async update(id, payload) {
        const r = await api.put(`/promotions/${id}`, payload, withCreds);
        return r?.data ?? r;
    },

    async remove(id) {
        const r = await api.delete(`/promotions/${id}`, withCreds);
        return r?.data ?? r;
    },

    // Mã đang active (để owner chọn)
    async listActiveByHomestay(h_id) {
        console.log("[api] GET /promotions/homestay/:h_id/active", h_id);
        const r = await api.get(`/promotions/homestay/${h_id}/active`, withCreds);
        return toArray(r);
    },
    async replaceAssigned(h_id, ids) {
        const payload = { promotion_ids: Array.from(new Set((ids || []).map(Number))) };
        return api.put(`/promotions/homestay/${h_id}/assigned`, payload, { withCredentials: true })
            .then(r => r?.data?.data?.promotions ?? []);
    },
    // Mã ĐÃ GÁN cho homestay (fallback nhiều endpoint, không throw 404)
    async forHomestay(h_id) {
        console.log("[api] GET assigned promotions for H_ID =", h_id);

        // 1) /for-homestay/:hId
        let r = await safeGet(`/promotions/for-homestay/${h_id}`);
        if (r.ok) return r.data;

        // 2) /homestay/:h_id/assigned
        r = await safeGet(`/promotions/homestay/${h_id}/assigned`);
        if (r.ok) return r.data;

        // 3) Fallback cuối: active (để vẫn có dữ liệu hiển thị, dù không phải assigned)
        r = await safeGet(`/promotions/homestay/${h_id}/active`);
        if (r.ok) return r.data;

        // Nếu cả 3 fail, trả mảng rỗng – KHÔNG ném lỗi để tránh chặn luồng lưu
        console.warn("[api] forHomestay: all endpoints failed", { h_id, lastStatus: r.status });
        return [];
    },

    async applyToHomestay({ promotion_id, h_id }) {
        const payload = { promotion_id: Number(promotion_id), h_id: Number(h_id) };
        console.log("[api] POST /promotions/apply payload =", payload);
        const r = await api.post("/promotions/apply", payload, withCreds);
        return r?.data ?? r;
    },

    async removeFromHomestay({ promotion_id, h_id }) {
        const payload = { promotion_id: Number(promotion_id), h_id: Number(h_id) };
        console.log("[api] DELETE /promotions/apply payload =", payload);
        const r = await api.delete("/promotions/apply", { ...withCreds, data: payload });
        return r?.data ?? r;
    },

    validate({ code, userId, homestayId, subtotal }) {
        return api.post("/promotions/validate", { code, userId, homestayId, subtotal }, withCreds);
    },

    applyUsage({ code, userId, bookingId, discountAmount }) {
        return api.post("/promotions/apply-usage", { code, userId, bookingId, discountAmount }, withCreds);
    },
};

export default promotionsApi;
