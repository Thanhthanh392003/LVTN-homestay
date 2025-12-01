// API path: chỉnh lại cho khớp BE của bạn nếu cần
const rawBase = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";
const base = rawBase.replace(/\/$/, "");

export const favoritesApi = {
    async mine() {
        const res = await fetch(`${base}/favorites/mine`, { credentials: "include" });
        if (!res.ok) throw new Error("GET favorites failed");
        const json = await res.json();
        // Chuẩn hoá về mảng H_ID
        const items = Array.isArray(json?.data) ? json.data : (json?.favorites || json || []);
        return items.map((x) => x.H_ID ?? x.homestay_id ?? x.id).filter(Boolean);
    },
    async add(H_ID) {
        const res = await fetch(`${base}/favorites`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ H_ID }),
        });
        if (!res.ok) throw new Error("ADD favorite failed");
        return res.json();
    },
    async removeByHomestay(H_ID) {
        // Nếu BE yêu cầu /favorites/:id (id = record), bạn cần endpoint riêng để xoá theo H_ID
        const res = await fetch(`${base}/favorites/by-homestay/${H_ID}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (!res.ok) throw new Error("REMOVE favorite failed");
        return true;
    },

    // --- Fallback localStorage (nếu chưa có BE) ---
    _key: "greenstay:favorites",
    getLocal() {
        try { return JSON.parse(localStorage.getItem(this._key) || "[]"); } catch { return []; }
    },
    setLocal(arr) {
        localStorage.setItem(this._key, JSON.stringify(arr));
        // kích hoạt storage event cho các tab/route khác
        localStorage.setItem("greenstay:favorites:updated", Date.now().toString());
    },
    addLocal(H_ID) {
        const set = new Set(this.getLocal()); set.add(Number(H_ID)); this.setLocal([...set]);
    },
    removeLocal(H_ID) {
        const arr = this.getLocal().filter((x) => Number(x) !== Number(H_ID)); this.setLocal(arr);
    }
};
