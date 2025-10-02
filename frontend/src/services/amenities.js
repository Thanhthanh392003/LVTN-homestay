// src/services/amenities.js
import axios from "axios";

const http = axios.create({ withCredentials: true });

// Tự tính base API
const buildBase = () => {
    const envBase = import.meta.env.VITE_API_BASE; // ví dụ: http://localhost:3000/api
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
    async setForHomestay(hId, body) {
        console.log("[FE] PUT amenities payload =", { hId, body });
        const res = await http.put(`${buildBase()}/amenities/homestays/${hId}`, body);
        console.log("[FE] PUT amenities response =", res?.status, res?.data);
        return take(res);
    },
};
