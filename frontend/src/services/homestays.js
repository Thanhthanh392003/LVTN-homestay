// frontend/src/services/homestays.js
import axios from "axios";

const buildBase = () => {
    const envBase = import.meta.env.VITE_API_BASE;
    if (envBase) return envBase.replace(/\/+$/, "");

    const { protocol, hostname, port } = window.location;
    const isVite5173 = hostname === "localhost" && port === "5173";
    if (isVite5173) return `${protocol}//${hostname}:3000/api`;
    return "/api";
};

// NEW: base cho tài nguyên tĩnh (ảnh)
const publicBase = () => {
    // Ưu tiên VITE_PUBLIC_BASE (ví dụ: http://localhost:3000)
    const env = import.meta.env.VITE_PUBLIC_BASE;
    if (env) return env.replace(/\/+$/, "");
    // Suy ra từ Vite dev
    const { protocol, hostname, port } = window.location;
    const isVite5173 = hostname === "localhost" && port === "5173";
    if (isVite5173) return `${protocol}//${hostname}:3000`;
    // Prod có reverse-proxy: cùng origin
    return "";
};

// NEW: ghép base + path bắt đầu bằng "/"
export const toPublicUrl = (p) => {
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p; // đã tuyệt đối
    return `${publicBase()}${p.startsWith("/") ? p : `/${p}`}`;
};

const take = (res) => res?.data?.data ?? res?.data ?? res;

export const homestaysApi = {
    async listPublic() {
        const base = buildBase();
        const res = await axios.get(`${base}/homestays`);
        return take(res);
    },

    async getById(id) {
        const base = buildBase();
        const res = await axios.get(`${base}/homestays/${id}`);
        return res?.data?.data?.homestay ?? take(res);
    },

    async getImagesPublic(id) {
        const base = buildBase();
        const res = await axios.get(`${base}/homestays/${id}/images-public`);
        const images = res?.data?.images ?? [];
        // map sang URL tuyệt đối
        return images.map((it) => ({ ...it, Image_url: toPublicUrl(it.Image_url) }));
    },

    async searchPublic(params = {}) {
        const base = buildBase();
        const res = await axios.get(`${base}/homestays`, { params });
        return take(res);
    },

    async myList() {
        const base = buildBase();
        const res = await axios.get(`${base}/homestays/owner/mine`, { withCredentials: true });
        return take(res);
    },

    async create(payload) {
        const base = buildBase();
        const res = await axios.post(`${base}/homestays`, payload, { withCredentials: true });
        return take(res);
    },

    async update(id, payload) {
        const base = buildBase();
        const res = await axios.put(`${base}/homestays/${id}`, payload, { withCredentials: true });
        return take(res);
    },

    async remove(id) {
        const base = buildBase();
        const res = await axios.delete(`${base}/homestays/${id}`, { withCredentials: true });
        return take(res);
    },

    async listImages(hId) {
        const base = buildBase();
        const res = await axios.get(`${base}/homestays/${hId}/images`, { withCredentials: true });
        const images = res?.data?.images ?? res ?? [];
        return images.map((it) => ({ ...it, Image_url: toPublicUrl(it.Image_url) }));
    },

    async uploadImages(hId, files) {
        const base = buildBase();
        const form = new FormData();
        files.forEach((f) => form.append("images", f));
        const res = await axios.post(`${base}/homestays/${hId}/images`, form, {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
        });
        const images = res?.data?.images ?? res ?? [];
        return images.map((it) => ({ ...it, Image_url: toPublicUrl(it.Image_url) }));
    },

    async setMainImage(hId, imageId) {
        const base = buildBase();
        const res = await axios.patch(`${base}/homestays/${hId}/images/${imageId}/main`, null, {
            withCredentials: true,
        });
        return take(res);
    },

    async deleteImage(hId, imageId) {
        const base = buildBase();
        const res = await axios.delete(`${base}/homestays/${hId}/images/${imageId}`, {
            withCredentials: true,
        });
        return take(res);
    },
};
