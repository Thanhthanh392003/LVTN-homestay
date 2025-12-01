// src/services/users.js
import api from "../lib/axios";

const take = (res) => res?.data?.data ?? res?.data ?? res;

export const usersApi = {
    // -------- AUTH (public) --------
    // Đăng ký
    register(payload) {
        // payload gồm: role_id, fullname, email, password, phone, address, gender, birthday, status
        // BE route: POST /api/users/register
        return api.post("/api/users/register", payload).then(take);
    },

    // (tuỳ chọn) Đăng nhập – nếu bạn cần tự đăng nhập sau khi đăng ký
    login(payload) {
        // payload: { email, password }
        return api.post("/api/auth/login", payload, { withCredentials: true }).then(take);
    },

    // -------- SELF PROFILE --------
    me() {
        return api.get("/api/users/me", { withCredentials: true }).then(take);
    },
    updateMe(payload) {
        return api.put("/api/users/me/profile", payload, { withCredentials: true }).then(take);
    },
    changePassword(payload) {
        return api.put("/api/users/me/password", payload, { withCredentials: true }).then(take);
    },

    // -------- ADMIN --------
    adminList(params = {}) {
        return api.get("/api/users", { params, withCredentials: true }).then(take);
    },
    setStatus(id, status) {
        return api.patch(`/api/users/${id}/status`, { status }, { withCredentials: true }).then(take);
    },
};
