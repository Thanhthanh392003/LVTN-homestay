// src/components/AboutGreenStay.jsx
import React from "react";
import {
    Card, Typography, Space, Row, Col, Divider, Button, Tooltip,
} from "antd";
import {
    InfoCircleOutlined, SafetyCertificateOutlined, AimOutlined, ThunderboltFilled,
    SearchOutlined, CalendarOutlined, SmileOutlined, TeamOutlined,
    CheckCircleTwoTone,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

function ValueItem({ icon, title, children }) {
    return (
        <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "#fff", border: "1px solid #e5f9ef", borderRadius: 12, padding: 12
        }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center",
                background: "#ecfdf5", color: "#047857", border: "1px solid #bbf7d0"
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontWeight: 700, color: "#065f46" }}>{title}</div>
                <div style={{ color: "#0f172a", opacity: .8 }}>{children}</div>
            </div>
        </div>
    );
}

function AboutStep({ icon, title, text }) {
    return (
        <div style={{
            background: "#ffffff",
            border: "1px solid #e5f9ef",
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 12px 22px rgba(2,6,23,.05)"
        }}>
            <Space align="center" size={10}>
                <div style={{
                    width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center",
                    background: "#ecfdf5", color: "#047857", border: "1px solid #bbf7d0"
                }}>
                    {icon}
                </div>
                <Text strong style={{ color: "#065f46" }}>{title}</Text>
            </Space>
            <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>{text}</Paragraph>
        </div>
    );
}

function CheckItem({ children }) {
    return (
        <Space>
            <CheckCircleTwoTone twoToneColor="#22c55e" />
            <span>{children}</span>
        </Space>
    );
}

export default function AboutGreenStay({ stats = [], onStart }) {
    return (
        <Card
            style={{
                borderRadius: 18, marginBottom: 16,
                background: "linear-gradient(135deg, rgba(255,255,255,.92), #f0fdf4)",
                border: "1px solid #bbf7d0",
                boxShadow: "0 18px 40px rgba(16,185,129,.12)",
            }}
            bodyStyle={{ padding: 22 }}
            title={
                <Space>
                    <InfoCircleOutlined style={{ color: "#10b981" }} />
                    <Text strong style={{ color: "#065f46" }}>Về GreenStay</Text>
                </Space>
            }
        >
            <Row gutter={[20, 20]}>
                <Col xs={24} md={14}>
                    <Title level={4} style={{ marginTop: 0, color: "#064e3b" }}>Sứ mệnh</Title>
                    <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
                        GreenStay là nền tảng đặt homestay thân thiện môi trường, kết nối du khách với những không gian
                        lưu trú bản địa chất lượng, khuyến khích lối sống xanh và du lịch có trách nhiệm.
                        Chúng tôi giúp bạn <strong>tìm – đặt – trải nghiệm</strong> một cách nhanh chóng, minh bạch và bền vững.
                    </Paragraph>

                    <Title level={5} style={{ color: "#065f46" }}>Giá trị cốt lõi</Title>
                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                        <ValueItem icon={<SafetyCertificateOutlined />} title="An tâm & minh bạch">
                            Bảng giá rõ ràng, thông tin xác thực, hỗ trợ nhanh.
                        </ValueItem>
                        <ValueItem icon={<AimOutlined />} title="Bản địa & trải nghiệm">
                            Tôn trọng văn hóa, ủng hộ cộng đồng địa phương.
                        </ValueItem>
                        <ValueItem icon={<ThunderboltFilled style={{ color: "#10b981" }} />} title="Nhanh & tiện lợi">
                            Tìm kiếm thông minh, đặt chỗ mượt mà, thông báo tức thì.
                        </ValueItem>
                    </Space>
                </Col>

                <Col xs={24} md={10}>
                    <Card
                        style={{ borderRadius: 16, border: "1px solid #d1fae5", background: "#ffffff" }}
                        bodyStyle={{ padding: 16 }}
                        title={<Text strong>Chỉ số nổi bật</Text>}
                    >
                        <Row gutter={[12, 12]}>
                            {stats.map((s, i) => (
                                <Col xs={12} key={i}>
                                    <div style={{
                                        border: "1px solid #e5f9ef", borderRadius: 12, padding: 12,
                                        display: "flex", alignItems: "center", gap: 10
                                    }}>
                                        <div style={{
                                            width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center",
                                            background: "#ecfdf5", color: "#047857", border: "1px solid #bbf7d0"
                                        }}>
                                            {s.icon}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 800, color: "#064e3b" }}>{s.value}</div>
                                            <div style={{ fontSize: 12, color: "#065f46", opacity: .75 }}>{s.label}</div>
                                        </div>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </Col>
            </Row>

            <Divider style={{ borderColor: "#bbf7d0" }} />

            <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                    <AboutStep
                        icon={<SearchOutlined />}
                        title="1. Khám phá"
                        text="Duyệt theo thành phố, bộ lọc ngày – khách, hoặc gợi ý điểm đến nổi bật."
                    />
                </Col>
                <Col xs={24} md={8}>
                    <AboutStep
                        icon={<CalendarOutlined />}
                        title="2. Đặt nhanh"
                        text="Chọn ngày, số khách và đặt chỗ trong vài bước. Xác nhận tức thì."
                    />
                </Col>
                <Col xs={24} md={8}>
                    <AboutStep
                        icon={<SmileOutlined />}
                        title="3. Trải nghiệm"
                        text="Nhận hướng dẫn check-in rõ ràng, tận hưởng không gian bản địa ấm áp."
                    />
                </Col>
            </Row>

            <Divider style={{ borderColor: "#bbf7d0" }} />

            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Title level={5} style={{ color: "#065f46" }}>Cam kết bền vững</Title>
                    <Space direction="vertical" size={8}>
                        <CheckItem>Ưu tiên homestay có chính sách <strong>giảm rác thải</strong> & tái chế.</CheckItem>
                        <CheckItem>Khuyến khích sử dụng <strong>năng lượng tiết kiệm</strong> & thân thiện môi trường.</CheckItem>
                        <CheckItem>Đề xuất trải nghiệm <strong>văn hóa địa phương</strong> không xâm hại sinh thái.</CheckItem>
                    </Space>
                </Col>
                <Col xs={24} md={12}>
                    <Title level={5} style={{ color: "#065f46" }}>Đội ngũ & hỗ trợ</Title>
                    <Paragraph style={{ marginBottom: 8 }}>
                        <TeamOutlined />  Đội ngũ trẻ, nhiệt huyết, sẵn sàng đồng hành cùng bạn trong mọi hành trình.
                    </Paragraph>
                    <Paragraph>
                        Hỗ trợ qua email <a href="mailto:support@greenstay.vn">support@greenstay.vn</a> hoặc hotline <strong>0123 456 789</strong>.
                    </Paragraph>
                    <Tooltip title="Quay lại tab Khám phá">
                        <Button type="primary" size="large" onClick={onStart} style={{ borderRadius: 12 }}>
                            Bắt đầu khám phá
                        </Button>
                    </Tooltip>
                </Col>
            </Row>
        </Card>
    );
}
