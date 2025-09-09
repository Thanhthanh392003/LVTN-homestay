import api from "../lib/axios";

export const authApi = {
    login(email, password) {
        return api.post("/api/auth/login", { email, password });
    },
    logout() {
        return api.post("/api/auth/logout");
    },
};
