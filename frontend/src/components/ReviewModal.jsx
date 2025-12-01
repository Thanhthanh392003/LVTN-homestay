import React, { useState } from "react";
import { Modal, Form, Rate, Input, Upload, Button, Space, message } from "antd";
import { reviewsApi } from "../services/reviews";

export default function ReviewModal({ open, onClose, booking, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [imgs, setImgs] = useState([]);

    const submit = async (v) => {
        try {
            setLoading(true);
            const payload = {
                Booking_ID: booking.Booking_ID,
                H_ID: booking.H_ID,
                Rating: v.Rating,
                Content: v.Content || "",
                Images: imgs.map(f => f.url || f.response?.url).filter(Boolean),
            };
            await reviewsApi.create(payload);
            onSuccess?.();
            onClose?.();
        } catch (e) {
            message.error(e?.response?.data?.message || "Gửi đánh giá thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onCancel={onClose} footer={null} title="Đánh giá trải nghiệm">
            <Form layout="vertical" onFinish={submit}>
                <Form.Item name="Rating" label="Chấm điểm" rules={[{ required: true, message: "Chọn số sao" }]}>
                    <Rate />
                </Form.Item>
                <Form.Item name="Content" label="Nhận xét">
                    <Input.TextArea rows={4} placeholder="Bạn thấy homestay thế nào?" />
                </Form.Item>
                {/* Tùy backend upload: bạn có thể nối với endpoint /upload để lấy url */}
                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                    <Button onClick={onClose}>Hủy</Button>
                    <Button type="primary" htmlType="submit" loading={loading}>Gửi</Button>
                </Space>
            </Form>
        </Modal>
    );
}
