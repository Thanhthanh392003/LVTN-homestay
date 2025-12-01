// src/services/payments.js
import api from "../lib/axios";
const BASE = "/api/payments";

// Bóc dữ liệu an toàn dù backend trả {data:{...}} hay trả thẳng {...}
const unwrap = (res) => {
    const d = res?.data ?? res;
    const blob = d?.data ?? d;
    return {
        bookingId: blob?.bookingId ?? blob?.Booking_ID ?? blob?.id,
        payUrl: blob?.payUrl ?? blob?.url ?? blob?.paymentUrl,
        status: blob?.status,
    };
};

const paymentsApi = {
    async createCheckout(payload) {
        const res = await api.post(`${BASE}/checkout`, payload);
        console.log("[FE] /payments/checkout →", res?.data);
        return unwrap(res); // -> { bookingId, payUrl }
    },
    async checkStatus(bookingId) {
        const res = await api.get(`${BASE}/status/${bookingId}`);
        return unwrap(res); // -> { bookingId, status }
    },
};

export default paymentsApi;
export { paymentsApi };
