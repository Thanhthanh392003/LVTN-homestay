// src/services/users.js
import api from "../lib/axios";

const take = (res) => res?.data?.data ?? res?.data ?? res;

export const usersApi = {
    // hồ sơ hiện tại (TopBar thường gọi)
    me() {
        return api.get("/api/users/me").then(take);
    },
    updateMe(payload) {
        return api.put("/api/users/me/profile", payload).then(take);
    },
    changePassword(payload) {
        return api.put("/api/users/me/password", payload).then(take);
    },

    // ===== ADMIN =====
    // Lấy danh sách người dùng theo vai trò: customer | owner. Hỗ trợ q=keyword
    adminList(params = {}) {
        return api.get("/api/users", { params }).then(take);
    },
    // Khoá/Mở khoá
    setStatus(id, status) {
        return api.patch(`/api/users/${id}/status`, { status }).then(take);
    },
};
