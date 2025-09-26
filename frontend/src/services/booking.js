import api from "../lib/axios";

export const bookingsApi = {
    myBookings() {
        return api.get("/api/owner/bookings"); // implement ở BE nếu chưa có
    },
    setStatus(id, status) {
        return api.patch(`/api/bookings/${id}/status`, { status });
    },
};
