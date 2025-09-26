// frontend/src/services/users.js
import api from "../lib/axios";

const take = (res) => res?.data?.data ?? res?.data ?? res;

export const usersApi = {
    // lấy hồ sơ hiện tại
    me() {
        return api.get("/api/users/me").then(take);
    },
    // cập nhật hồ sơ (khớp BE: /me/profile)
    updateMe(payload) {
        return api.put("/api/users/me/profile", payload).then(take);
    },
    // (tuỳ chọn) đổi mật khẩu nếu bạn dùng
    changePassword(payload) {
        return api.put("/api/users/me/password", payload).then(take);
    },
};
