// src/components/HomestayBookingWidget.jsx
import React from "react";
import { DatePicker, InputNumber, Button, Space, message } from "antd";
import dayjs from "dayjs";
import { bookingApi } from "../services/bookings";

export default function HomestayBookingWidget({ homestay }) {
    const [checkin, setCheckin] = React.useState();
    const [checkout, setCheckout] = React.useState();
    const [guests, setGuests] = React.useState(2);

    const addToCart = () => {
        const ci = dayjs(checkin).format("YYYY-MM-DD");
        const co = dayjs(checkout).format("YYYY-MM-DD");
        if (!ci || !co) return message.warning("Chọn ngày đến/đi");
        const saved = JSON.parse(localStorage.getItem("booking_cart") || "[]");
        saved.push({ H_ID: homestay.H_ID, checkin: ci, checkout: co, guests });
        localStorage.setItem("booking_cart", JSON.stringify(saved));
        message.success("Đã thêm vào giỏ đặt phòng");
    };

    return (
        <Space direction="vertical" size={8} style={{ width: 280 }}>
            <DatePicker placeholder="Check-in" onChange={setCheckin} style={{ width: "100%" }} />
            <DatePicker placeholder="Check-out" onChange={setCheckout} style={{ width: "100%" }} />
            <InputNumber min={1} value={guests} onChange={setGuests} style={{ width: "100%" }} addonAfter="khách" />
            <Button type="primary" onClick={addToCart}>Thêm vào đơn</Button>
        </Space>
    );
}

// Ở trang "Giỏ đặt phòng" (Cart) bạn sẽ load localStorage.booking_cart,
// hiển thị danh sách items, và bấm "Đặt ngay" => bookingApi.create({items})
