// src/services/amenities.js
import axios from "axios";

const http = axios.create({ withCredentials: true });

// Tự tính base API
const buildBase = () => {
    const envBase = import.meta.env.VITE_API_BASE;
    if (envBase) return envBase.replace(/\/+$/, "");
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3000/api`;
};

const take = (res) => res?.data?.data ?? res?.data ?? res;

export const amenityApi = {
    async master() {
        const res = await http.get(`${buildBase()}/amenities`);
        return take(res);
    },

    async getForHomestay(hId) {
        const res = await http.get(`${buildBase()}/amenities/homestays/${hId}`);
        return take(res);
    },

    // ⭐⭐ API MỚI: hỗ trợ tiện nghi tùy chỉnh
    async setForHomestay(hId, amenities) {
        const payload = { amenities }; // mảng tên

        console.log("[FE] PUT /full amenities payload =", payload);

        const res = await http.put(
            `${buildBase()}/amenities/homestays/${hId}/full`,
            payload
        );

        console.log("[FE] PUT /full response =", res?.status, res?.data);
        return take(res);
    },
};
