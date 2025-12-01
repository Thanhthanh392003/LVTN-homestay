// src/services/homestays.js
import api from "../lib/axios";

const BASE = (api?.defaults?.baseURL || import.meta.env.VITE_API_BASE || "http://localhost:3000")
    .replace(/\/+$/, "");
const withCreds = { withCredentials: true };
const take = (res) => res?.data ?? res;

export const toPublicUrl = (p) => {
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;
    return `${BASE}${p.startsWith("/") ? "" : "/"}${p}`;
};

export const homestaysApi = {
    async listPublic() {
        const res = await api.get("/api/homestays", withCreds);
        return take(res);
    },
    async search(params = {}) {
        try {
            const res = await api.get("/api/homestays/search", { ...withCreds, params });
            return take(res);
        } catch {
            const res = await api.get("/api/homestays", { ...withCreds, params });
            return take(res);
        }
    },
    async getById(id) {
        const res = await api.get(`/api/homestays/${id}`, withCreds);
        return res?.data?.homestay ?? res?.data ?? res;
    },
    async getImagesPublic(id) {
        const res = await api.get(`/api/homestays/${id}/images-public`, withCreds);
        const images = res?.images ?? res?.data?.images ?? [];
        return images.map((it) => ({ ...it, Image_url: toPublicUrl(it.Image_url) }));
    },
    async getBlockedDates(id, params = {}) {
        const res = await api.get(`/api/homestays/${id}/blocked-dates`, { ...withCreds, params });
        return res?.data ?? res ?? [];
    },
    async getOwnerCalendar(id, params = {}) {
        const res = await api.get(`/api/homestays/${id}/calendar`, { ...withCreds, params });
        return res?.data ?? res ?? [];
    },

    // Owner


    async myList() {
        const res = await api
            .get("/api/homestays/owner/mine", withCreds)
            .catch(async () => await api.get("/api/homestays/mine", withCreds));
        return take(res);
    },
    async create(payload) {
        const res = await api.post("/api/homestays", payload, withCreds);
        return take(res);
    },
    async update(id, payload) {
        // Giữ lại “attempts” cũ để tương thích nhiều BE
        const snake = {
            h_name: payload.H_Name ?? payload.h_name ?? payload.name,
            h_address: payload.H_Address ?? payload.h_address ?? payload.address,
            h_city: payload.H_City ?? payload.h_city ?? payload.city,
            h_description: payload.H_Description ?? payload.h_description ?? payload.description,
            price_per_day: payload.Price_per_day ?? payload.price_per_day,
            max_guests: payload.Max_guests ?? payload.max_guests,
            living_rooms: payload.Living_rooms ?? payload.living_rooms,
            kitchens: payload.Kitchens ?? payload.kitchens,
            bedrooms: payload.Bedrooms ?? payload.bedrooms,
            bathrooms: payload.Bathrooms ?? payload.bathrooms,
            status: payload.Status ?? payload.status,
            u_id: payload.U_ID ?? payload.u_id,
            promotion_ids: payload.Promotion_ids ?? payload.promotion_ids,
            promotion_codes: payload.Promotion_codes ?? payload.promotion_codes,
        };
        const attempts = [
            { m: "put", url: `/api/homestays/${id}`, body: payload },
            { m: "put", url: `/api/homestays/update/${id}`, body: payload },
            { m: "post", url: `/api/homestays/update/${id}`, body: payload },
            { m: "post", url: `/api/homestays/update`, body: { H_ID: id, ...payload } },
            { m: "put", url: `/api/homestay/${id}`, body: payload },
            { m: "put", url: `/api/homestays/${id}`, body: snake },
            { m: "put", url: `/api/homestays/update/${id}`, body: snake },
            { m: "post", url: `/api/homestays/update/${id}`, body: snake },
            { m: "post", url: `/api/homestays/update`, body: { h_id: id, ...snake } },
            { m: "put", url: `/api/homestay/${id}`, body: snake },
        ];
        let lastErr;
        for (const a of attempts) {
            try {
                const res = await api.request({ method: a.m, url: a.url, data: a.body, ...withCreds });
                return take(res);
            } catch (e) {
                lastErr = e;
                const code = e?.response?.status;
                if (![400, 404].includes(code)) break;
            }
        }
        throw lastErr;
    },
    async remove(id) {
        const res = await api.delete(`/api/homestays/${id}`, withCreds);
        return take(res);
    },

    // Images (owner)
    async listImages(hId) {
        const res = await api.get(`/api/homestays/${hId}/images`, withCreds);
        const images = res?.images ?? res ?? [];
        return images.map((it) => ({ ...it, Image_url: toPublicUrl(it.Image_url) }));
    },
    async uploadImages(hId, files = []) {
        const form = new FormData();
        files.forEach((f) => form.append("images", f));
        const res = await api.post(`/api/homestays/${hId}/images`, form, {
            ...withCreds,
            headers: { "Content-Type": "multipart/form-data" },
        });
        const images = res?.images ?? res ?? [];
        return images.map((it) => ({ ...it, Image_url: toPublicUrl(it.Image_url) }));
    },
    async setMainImage(hId, imageId) {
        const res = await api.patch(`/api/homestays/${hId}/images/${imageId}/main`, null, withCreds);
        return take(res);
    },
    async deleteImage(hId, imageId) {
        const res = await api.delete(`/api/homestays/${hId}/images/${imageId}`, withCreds);
        return take(res);
    },

    // ==== 🔑 BULK set promotions for a homestay ====
    async setPromotions(hId, promotion_ids = []) {
        const res = await api.patch(`/api/homestays/${hId}/promotions`, { promotion_ids }, withCreds);
        return take(res);
    },

    // Admin
    async adminList(params = {}) {
        const res = await api
            .get("/api/homestays/admin/homestays", { ...withCreds, params })
            .catch(async () => await api.get("/api/admin/homestays", { ...withCreds, params }));
        return res?.data ?? res ?? [];
    },
    async adminApprove(id) {
        const res = await api
            .post(`/api/homestays/admin/homestays/${id}/approve`, null, withCreds)
            .catch(async () => await api.post(`/api/admin/homestays/${id}/approve`, null, withCreds));
        return take(res);
    },
    async adminReject(id) {
        const res = await api
            .post(`/api/homestays/admin/homestays/${id}/reject`, null, withCreds)
            .catch(async () => await api.post(`/api/admin/homestays/${id}/reject`, null, withCreds));
        return take(res);
    },
    async adminRemove(id) {
        const res = await api
            .delete(`/api/homestays/admin/homestays/${id}`, withCreds)
            .catch(async () => await api.delete(`/api/admin/homestays/${id}`, withCreds));
        return take(res);
    },

    async adminBlock(id) {
        const res = await api
            .post(`/api/homestays/admin/homestays/${id}/block`, null, withCreds)
            .catch(async () => await api.post(`/api/admin/homestays/${id}/block`, null, withCreds));
        return take(res);
    },

    async adminUnblock(id) {
        const res = await api
            .post(`/api/homestays/admin/homestays/${id}/unblock`, null, withCreds)
            .catch(async () => await api.post(`/api/admin/homestays/${id}/unblock`, null, withCreds));
        return take(res);
    },

};
