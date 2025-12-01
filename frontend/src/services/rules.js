// src/services/rules.js
import axios from "axios";
const http = axios.create({ withCredentials: true });

const base = () => {
    const env = import.meta.env.VITE_API_BASE; // ví dụ http://localhost:3000/api
    if (env) return env.replace(/\/+$/, "");
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3000/api`;
};

const take = (res) => res?.data?.data ?? res?.data ?? res;

export const ruleApi = {
    async master() {
        const r = await http.get(`${base()}/rules`);
        return take(r); // [{Rule_ID, Code, Name}]
    },
    async getForHomestay(hId) {
        const r = await http.get(`${base()}/rules/homestays/${hId}`);
        return take(r); // [{isMaster:true, code, name} | {isMaster:false, name}]
    },
    // body: { codes: string[], customs: string[] }
    async setForHomestay(hId, body) {
        const r = await http.put(`${base()}/rules/homestays/${hId}`, body);
        return take(r);
    },
};
