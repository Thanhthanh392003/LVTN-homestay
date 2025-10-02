// src/services/homestays.js
import axios from "axios";

const buildBase = () => {
    const envBase = import.meta.env.VITE_API_BASE;
    if (envBase) return envBase.replace(/\/+$/, "");
    const { protocol, hostname, port } = window.location;
    const isVite = hostname === "localhost" && port === "5173";
    return isVite ? `${protocol}//${hostname}:3000/api` : "/api";
};

const publicBase = () => {
    const env = import.meta.env.VITE_PUBLIC_BASE || import.meta.env.VITE_ASSET_BASE;
    if (env) return env.replace(/\/+$/, "");
    const { protocol, hostname, port } = window.location;
    const isVite = hostname === "localhost" && port === "5173";
    return isVite ? `${protocol}//${hostname}:3000` : "";
};

export const toPublicUrl = (p) => {
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;
    return `${publicBase()}${p.startsWith("/") ? p : `/${p}`}`;
};

const take = (res) => res?.data?.data ?? res?.data ?? res;
const http = axios.create({ withCredentials: true });

export const homestaysApi = {
    // ========= PUBLIC =========
    async listPublic() {
        const base = buildBase();
        const res = await http.get(`${base}/homestays`);
        return take(res);
    },
    async search(params = {}) {
        const base = buildBase();
        try {
            const res = await http.get(`${base}/homestays/search`, { params });
            return take(res);
        } catch {
            const res = await http.get(`${base}/homestays`, { params });
            return take(res);
        }
    },
    async getById(id) {
        const base = buildBase();
        const res = await http.get(`${base}/homestays/${id}`);
        return res?.data?.data?.homestay ?? take(res);
    },
    async getImagesPublic(id) {
        const base = buildBase();
        const res = await http.get(`${base}/homestays/${id}/images-public`);
        const images = res?.data?.images ?? [];
        return images.map((it) => ({ ...it, Image_url: toPublicUrl(it.Image_url) }));
    },

    // ========= OWNER =========
    async myList() {
        const base = buildBase();
        const res = await http.get(`${base}/homestays/owner/mine`);
        return take(res);
    },
    async create(payload) {
        const base = buildBase();
        const res = await http.post(`${base}/homestays`, payload);
        return take(res);
    },
    async update(id, payload) {
        const base = buildBase();
        const snake = {
            h_name: payload.H_Name ?? payload.h_name ?? payload.name,
            h_address: payload.H_Address ?? payload.h_address ?? payload.address,
            h_city: payload.H_City ?? payload.h_city ?? payload.city,
            h_description: payload.H_Description ?? payload.h_description ?? payload.description,
            price_per_day: payload.Price_per_day ?? payload.price_per_day,
            max_guests: payload.Max_guests ?? payload.max_guests,
            status: payload.Status ?? payload.status,
            u_id: payload.U_ID ?? payload.u_id,
        };
        const attempts = [
            { m: "put", url: `${base}/homestays/${id}`, body: payload },
            { m: "put", url: `${base}/homestays/update/${id}`, body: payload },
            { m: "post", url: `${base}/homestays/update/${id}`, body: payload },
            { m: "post", url: `${base}/homestays/update`, body: { H_ID: id, ...payload } },
            { m: "put", url: `${base}/homestay/${id}`, body: payload },
            { m: "put", url: `${base}/homestays/${id}`, body: snake },
            { m: "put", url: `${base}/homestays/update/${id}`, body: snake },
            { m: "post", url: `${base}/homestays/update/${id}`, body: snake },
            { m: "post", url: `${base}/homestays/update`, body: { h_id: id, ...snake } },
            { m: "put", url: `${base}/homestay/${id}`, body: snake },
        ];
        let lastErr;
        for (const a of attempts) {
            try {
                const res = await http.request({ method: a.m, url: a.url, data: a.body });
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
        const base = buildBase();
        const res = await http.delete(`${base}/homestays/${id}`);
        return take(res);
    },

    // ====== ẢNH ======
    async listImages(hId) {
        const base = buildBase();
        const res = await http.get(`${base}/homestays/${hId}/images`);
        const images = res?.data?.images ?? res ?? [];
        return images.map((it) => ({ ...it, Image_url: toPublicUrl(it.Image_url) }));
    },
    async uploadImages(hId, files) {
        const base = buildBase();
        const form = new FormData();
        files.forEach((f) => form.append("images", f));
        const res = await http.post(`${base}/homestays/${hId}/images`, form, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        const images = res?.data?.images ?? res ?? [];
        return images.map((it) => ({ ...it, Image_url: toPublicUrl(it.Image_url) }));
    },
    async setMainImage(hId, imageId) {
        const base = buildBase();
        const res = await http.patch(`${base}/homestays/${hId}/images/${imageId}/main`);
        return take(res);
    },
    async deleteImage(hId, imageId) {
        const base = buildBase();
        const res = await http.delete(`${base}/homestays/${hId}/images/${imageId}`);
        return take(res);
    },

    // ========= ADMIN =========
    async adminList(params = {}) {
        const base = buildBase();
        const res = await http.get(`${base}/homestays/admin/homestays`, { params })
            .catch(async () => await http.get(`${base}/admin/homestays`, { params }));
        return res?.data?.data ?? res?.data ?? [];
    },
    async adminApprove(id) {
        const base = buildBase();
        const res = await http.post(`${base}/homestays/admin/homestays/${id}/approve`)
            .catch(async () => await http.post(`${base}/admin/homestays/${id}/approve`));
        return take(res);
    },
    async adminReject(id) {
        const base = buildBase();
        const res = await http.post(`${base}/homestays/admin/homestays/${id}/reject`)
            .catch(async () => await http.post(`${base}/admin/homestays/${id}/reject`));
        return take(res);
    },
    async adminRemove(id) {
        const base = buildBase();
        const res = await http.delete(`${base}/homestays/admin/homestays/${id}`)
            .catch(async () => await http.delete(`${base}/admin/homestays/${id}`));
        return take(res);
    },
};
