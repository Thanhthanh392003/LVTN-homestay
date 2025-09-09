import api from "../lib/axios";

export const usersApi = {
    me() {
        return api.get("/api/users/me");
    },
    register(payload) {
        // payload gồm: role_id, fullname, email, password(<=10), phone, address, gender, birthday, status
        return api.post("/api/users/register", payload);
    },
};
