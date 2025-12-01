// src/services/favorites.js
// Quản lý danh sách homestay yêu thích theo từng user.
// - Nếu chưa đăng nhập: lưu vào key "guest"
// - Khi user đổi / logout: AuthContext đã làm sạch localStorage

export const favoritesApi = {
    _keyPrefix: "greenstay:favorites:",

    _key(userId) {
        return `${this._keyPrefix}${userId || "guest"}`;
    },

    _bcast() {
        localStorage.setItem("greenstay:favorites:updated", Date.now().toString());
    },

    getLocal(userId) {
        try {
            const raw = localStorage.getItem(this._key(userId)) || "[]";
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.map(Number) : [];
        } catch {
            return [];
        }
    },

    setLocal(userId, arr) {
        localStorage.setItem(this._key(userId), JSON.stringify(arr));
        this._bcast();
    },

    addLocal(userId, H_ID) {
        const set = new Set(this.getLocal(userId));
        set.add(Number(H_ID));
        this.setLocal(userId, [...set]);
    },

    removeLocal(userId, H_ID) {
        const arr = this.getLocal(userId).filter((id) => Number(id) !== Number(H_ID));
        this.setLocal(userId, arr);
    },

    // API stub (tạm dùng localStorage)
    async mine(userId) {
        return this.getLocal(userId);
    },
    async add(userId, H_ID) {
        this.addLocal(userId, H_ID);
        return true;
    },
    async removeByHomestay(userId, H_ID) {
        this.removeLocal(userId, H_ID);
        return true;
    },
};
