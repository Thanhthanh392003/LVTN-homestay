// src/services/reviews.js
import api from "../lib/axios";

// LƯU Ý: ../lib/axios phải bật withCredentials:true để gửi cookie session

function ok(tag, url, data) { console.log(`[reviewsApi.${tag}] ✅ ${url}`, data); }
function ng(tag, url, e) {
    console.error(`[reviewsApi.${tag}] ❌ ${url}`, {
        status: e?.response?.status,
        response: e?.response?.data,
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
};
