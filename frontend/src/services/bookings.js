// frontend/src/services/bookings.js
import axios from "axios";

// luôn gửi kèm cookie phiên
const http = axios.create({ withCredentials: true });

// ⭐ Base URL chuẩn (luôn có /api)
const base = () => {
    const env = (import.meta?.env?.VITE_API_BASE || "").trim().replace(/\/+$/, "");
    if (env) return `${env}/api`;
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3000/api`;
};

// Normalize dữ liệu trả về
const take = (r) => r?.data?.data ?? r?.data ?? r;

export const bookingApi = {
    // ============================================================
    // ⭐ TẠO BOOKING — đã fix hoàn toàn lỗi không gửi Subtotal/COD
    // ============================================================
    create: (payload) => {
        // dùng payload trực tiếp
        const body = payload ?? {};

        // note
        const note =
            body?.note ??
            body?.Booking_note ??
            body?.customerNote ??
            body?.customer_note ??
            body?.customer?.note ??
            body?.Note ??
            "";

        // items
        const items = body?.items ?? body?.details ?? [];

        // phương thức thanh toán
        const method =
            body?.paymentMethod ??
            body?.payment_method ??
            body?.Payment_method ??
            body?.Gateway ??
            null;

        // ⭐ LẤY ĐỦ DỮ LIỆU KHUYẾN MÃI
        const Subtotal = Number(body?.Subtotal ?? 0);
        const Discount_amount = Number(body?.Discount_amount ?? 0);
        const Promotion_code =
            body?.Promotion_code ??
            body?.promotionCode ??
            body?.promoCode ??
            null;
        const Total_price = Number(body?.Total_price ?? 0);

        console.log("📤 [bookingApi.create] sending to BE =", {
            note,
            items,
            method,
            Subtotal,
            Discount_amount,
            Promotion_code,
            Total_price,
        });

        // ⭐ Gửi trực tiếp toàn bộ FIELD cần thiết
        return http
            .post(`${base()}/bookings`, {
                note: String(note ?? "").trim(),
                Booking_note: String(note ?? "").trim(),

                items,

                paymentMethod: method,
                Payment_method: method,

                // ⭐ các field quan trọng cho COD và VNPay
                Subtotal,
                Discount_amount,
                Promotion_code,
                Total_price,
            })
            .then(take);
    },

    // ============================================================
    // Danh sách booking của tôi
    // ============================================================
    mine: () => http.get(`${base()}/bookings/mine`).then(take),

    // Chi tiết booking theo ID
    get: (id) => http.get(`${base()}/bookings/${id}`).then(take),
    getById: (id) => http.get(`${base()}/bookings/${id}`).then(take),

    // ============================================================
    // Cập nhật ghi chú
    // ============================================================
    updateNote: (id, { note }) =>
        http
            .patch(`${base()}/bookings/${id}/note`, {
                note: String(note ?? "").trim(),
            })
            .then(take),

    // ============================================================
    // Cập nhật trạng thái booking
    // ============================================================
    updateStatus: (id, statusOrBody) => {
        const body =
            typeof statusOrBody === "string"
                ? { status: statusOrBody }
                : { ...(statusOrBody || {}) };
        return http.patch(`${base()}/bookings/${id}/status`, body).then(take);
    },

    // ============================================================
    // Huỷ đơn
    // ============================================================
    cancel: (id, { reason } = {}) =>
        http
            .patch(`${base()}/bookings/${id}/status`, {
                status: "cancelled",
                reason,
            })
            .then(take),

    // ============================================================
    // Các ngày đã bị đặt theo homestay
    // ============================================================
    unavailable: (H_ID) =>
        http.get(`${base()}/bookings/unavailable/${H_ID}`).then(take),

    // ============================================================
    // Gửi email xác nhận booking
    // ============================================================
    sendConfirmation: (id, { toEmail, toName }) =>
        http
            .post(`${base()}/bookings/${id}/send-confirmation`, {
                toEmail,
                toName,
            })
            .then(take),

    // ============================================================
    // Danh sách cho Owner
    // ============================================================
    ownerList: () => http.get(`${base()}/bookings/owner`).then(take),

    // Danh sách cho Admin
    adminList: () => http.get(`${base()}/bookings/admin`).then(take),

    // ============================================================
    // Xoá booking
    // ============================================================
    remove: (id) => http.delete(`${base()}/bookings/${id}`).then(take),
    delete: (id) => http.delete(`${base()}/bookings/${id}`).then(take),
    destroy: (id) => http.delete(`${base()}/bookings/${id}`).then(take),
};

export default bookingApi;
