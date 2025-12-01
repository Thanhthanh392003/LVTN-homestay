// src/lib/axios.js
import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3000/api",
    withCredentials: true,
    timeout: 15000,
});

api.interceptors.request.use((config) => {
    const base = (config.baseURL || "").replace(/\/+$/, "");
    let url = config.url || "";

    if (base.endsWith("/api") && url.startsWith("/api/")) {
        url = url.replace(/^\/api\//, "/");
    }
    if (base.endsWith("/api") && url === "/api") {
        url = "/";
    }

    url = url.replace(/\/{2,}/g, "/");
    config.url = url;
    return config;
});

api.interceptors.response.use(
    (res) => res.data,
    (err) => Promise.reject(err)
);

export default api;
