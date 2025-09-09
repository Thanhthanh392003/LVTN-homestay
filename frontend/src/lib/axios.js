import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || "http://localhost:3000",
    withCredentials: true, // để gửi/nhận cookie session
});

// đơn giản hoá response
api.interceptors.response.use(
    (res) => res.data,
    (err) => Promise.reject(err)
);

export default api;
