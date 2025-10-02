// src/services/rules.js
import axios from "axios";

const http = axios.create({ withCredentials: true });

const buildBase = () => {
    const envBase = import.meta.env.VITE_API_BASE;
    if (envBase) return envBase.replace(/\/+$/, "");
    const { protocol, hostname, port } = window.location;
    const isVite = hostname === "localhost" && port === "5173";
    return isVite ? `${protocol}//${hostname}:3000/api` : "/api";
};

const take = (res) => res?.data?.data ?? res?.data ?? res;

export const ruleApi = {
    async master() {
        const base = buildBase();
        const res = await http.get(`${base}/rules`);
        return take(res); // [{Rule_ID, Code, Name}]
    },
    async getForHomestay(hId) {
        const base = buildBase();
        const res = await http.get(`${base}/rules/homestays/${hId}`);
        return take(res); // [{RuleItem_ID,H_ID,isMaster,code,name}]
    },
    /** body: { codes?: string[], customs?: string[] } */
    async setForHomestay(hId, body) {
        const base = buildBase();
        const res = await http.put(`${base}/rules/homestays/${hId}`, body);
        return take(res);
    },
};
