import React from "react";
import { Table, Button, Input, Space, message } from "antd";
import { bookingApi } from "../services/bookings";
import dayjs from "dayjs";

export default function BookingCart() {
    const [items, setItems] = React.useState([]);
    const [note, setNote] = React.useState("");

    React.useEffect(() => {
        console.log("=== BookingCart ĐANG CHẠY TỪ components ===");

        // ⭐ ĐẢM BẢO LUÔN CÓ ĐẦY ĐỦ TRƯỜNG CẦN THIẾT
        const raw = JSON.parse(localStorage.getItem("booking_cart") || "[]");

        const fixed = raw.map(it => ({
            H_ID: it.H_ID,
            checkin: it.checkin,
            checkout: it.checkout,
            guests: Number(it.guests || 1),
            Price_per_day: Number(it.Price_per_day || it.price || it.Unit_price || 0),

            // ⭐ 2 trường quan trọng backend cần
            Promotion_code: it.Promotion_code || it.promoCode || "",
            Discount_amount: Number(it.Discount_amount || 0)
        }));

        setItems(fixed);
    }, []);

    const remove = (idx) => {
        const next = items.slice();
        next.splice(idx, 1);
        setItems(next);
        localStorage.setItem("booking_cart", JSON.stringify(next));
    };

    const placeOrder = async () => {
        if (!items.length) return message.warning("Giỏ trống");

        // ⭐ Tính Subtotal chuẩn
        const subtotal = items.reduce((s, it) => {
            const nights = dayjs(it.checkout).diff(dayjs(it.checkin), "day") || 1;
            return s + nights * Number(it.Price_per_day || 0);
        }, 0);

        const discount = Number(items[0]?.Discount_amount || 0);
        const promoCode = items[0]?.Promotion_code || null;

        const totalAfter = subtotal - discount;

        console.log("=== FE gửi booking COD ===", {
            note,
            items,
            Subtotal: subtotal,
            Discount_amount: discount,
            Promotion_code: promoCode,
            Total_price: totalAfter,
        });

        try {
            await bookingApi.create({
                data: {
                    note,
                    Booking_note: note,
                    items,
                    paymentMethod: "cod",
                    Payment_method: "cod",
                    Subtotal: subtotal,
                    Discount_amount: discount,
                    Promotion_code: promoCode,
                    Total_price: totalAfter,
                },
            });

            message.success("Đã tạo booking!");
            localStorage.removeItem("booking_cart");
            setItems([]);

        } catch (e) {
            message.error(
                e?.response?.data?.message || "Tạo booking thất bại"
            );
        }
    };

    return (
        <div>
            <Table
                rowKey={(r, i) => i}
                dataSource={items}
                pagination={false}
                columns={[
                    { title: "H_ID", dataIndex: "H_ID" },
                    { title: "Check-in", dataIndex: "checkin" },
                    { title: "Check-out", dataIndex: "checkout" },
                    { title: "Khách", dataIndex: "guests" },
                    {
                        title: " ",
                        render: (_, __, i) => (
                            <Button danger onClick={() => remove(i)}>
                                Xoá
                            </Button>
                        ),
                    },
                ]}
            />

            <Space style={{ marginTop: 12 }}>
                <Input.TextArea
                    placeholder="Ghi chú cho đơn"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ width: 360 }}
                />
                <Button type="primary" onClick={placeOrder}>
                    Đặt ngay
                </Button>
            </Space>
        </div>
    );
}
