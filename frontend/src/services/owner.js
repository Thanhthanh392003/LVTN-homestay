// src/services/owner.js
import { api } from "../lib/axios";

export const ownerApi = {
    dashboard: async () => {
        const { data } = await api.get("/owner/dashboard", { withCredentials: true });
        return data?.data;
    },
    listHomestays: async () => {
        const { data } = await api.get("/owner/homestays", { withCredentials: true });
        return data?.data ?? [];
    },
    createHomestay: async (payload) => {
        const { data } = await api.post("/owner/homestays", payload, { withCredentials: true });
        return data?.data;
    },
    getHomestay: async (id) => {
        const { data } = await api.get(`/owner/homestays/${id}`, { withCredentials: true });
        return data?.data;
    },
    updateHomestay: async (id, payload) => {
        const { data } = await api.put(`/owner/homestays/${id}`, payload, { withCredentials: true });
        return data?.data;
    },
    removeHomestay: async (id) => {
        const { data } = await api.delete(`/owner/homestays/${id}`, { withCredentials: true });
        return data?.data;
    },
    uploadImages: async (id, files) => {
        const form = new FormData();
        [...files].forEach((f) => form.append("images", f));
        const { data } = await api.post(`/owner/homestays/${id}/images`, form, {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
        });
        return data?.data;
    },
    listBookings: async () => {
        const { data } = await api.get("/owner/bookings", { withCredentials: true });
        return data?.data ?? [];
    },
    updateBookingStatus: async (id, status) => {
        const { data } = await api.patch(`/owner/bookings/${id}/status`, { status }, { withCredentials: true });
        return data?.data;
    },
};
