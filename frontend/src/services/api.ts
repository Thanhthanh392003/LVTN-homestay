import axios from 'axios'

export const api = axios.create({
    baseURL: '/api',             // đi qua proxy Vite
    withCredentials: true,       // gửi/nhận cookie phiên
    headers: { 'Content-Type': 'application/json' },
})
