// src/pages/OwnerDashboard.jsx
import React from "react";
import {
    Layout, Row, Col, Card, Button, Statistic, Space, Typography,
    Drawer, Form, Input, DatePicker, Select, message, Divider, Tag
} from "antd";
import {
    HomeOutlined, BookOutlined, DollarOutlined,
    StarOutlined, GiftOutlined, BarChartOutlined,
    UserOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined,
    CalendarOutlined
} from "@ant-design/icons";
import { useNavigate, Link } from "react-router-dom";
import dayjs from "dayjs";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import { usersApi } from "../services/users";
import { homestaysApi } from "../services/homestays"; // <-- thêm import này

const { Title, Paragraph, Text } = Typography;

// Logger (giữ nguyên)
function logAxiosError(tag, err) {
    if (err?.response) {
        console.group(`[${tag}] AxiosError response`);
        console.log("status:", err.response.status, err.response.statusText);
        console.log("data:", err.response.data);
        console.log("url:", err.config?.url);
        console.groupEnd();
    } else if (err?.request) {
        console.group(`[${tag}] AxiosError request (no response)`);
        console.log("url:", err.config?.url);
        console.groupEnd();
    } else {
        console.group(`[${tag}] Error`);
        console.log(err);
        console.groupEnd();
    }
}

export default function OwnerDashboard() {
    const { user, logout, setUser } = useAuth();
    const nav = useNavigate();

    // KPI: đổi để có setter (đồng bộ số Homestay)
    const [kpi, setKpi] = React.useState({
        homestays: 0,
        bookingsThisMonth: 0,
        revenueThisMonth: 0,
        ratingAvg: 0,
    });

    // Đồng bộ số Homestay theo danh sách của owner
    React.useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                const res = await homestaysApi.myList();
                const list = Array.isArray(res) ? res : res?.homestays || [];
                if (alive) setKpi((k) => ({ ...k, homestays: list.length }));
            } catch (e) {
                // Chỉ log nhẹ để không làm phiền người dùng
                console.warn("[OwnerDashboard] load homestays count failed:", e?.response?.data || e?.message || e);
            }
        };
        if (user) load();
        return () => { alive = false; };
    }, [user]);

    // ====== Drawer Sửa hồ sơ (giữ nguyên chức năng) ======
    const [pOpen, setPOpen] = React.useState(false);
    const [pSaving, setPSaving] = React.useState(false);
    const [pForm] = Form.useForm();

    const onUserClick = async () => {
        try {
            const res = await usersApi.me();
            const me = res?.user || res;
            pForm.setFieldsValue({
                U_Fullname: me?.U_Fullname ?? me?.full_name ?? "",
                U_Email: me?.U_Email ?? me?.email ?? "",
                U_Phone: me?.U_Phone ?? me?.phone ?? "",
                U_Address: me?.U_Address ?? me?.address ?? "",
                U_Gender: me?.U_Gender ?? me?.gender ?? undefined,
                U_Birthday: me?.U_Birthday ? dayjs(me.U_Birthday) : undefined,
            });
            setPOpen(true);
        } catch (e) {
            logAxiosError("profile load", e);
            message.error(e?.response?.data?.message || "Không tải được thông tin người dùng");
        }
    };

    const onProfileSave = async (vals) => {
        setPSaving(true);
        const payload = {
            U_Fullname: (vals.U_Fullname || "").trim(),
            U_Email: (vals.U_Email || "").trim(),
            U_Phone: (vals.U_Phone || "").trim(),
            U_Address: (vals.U_Address || "").trim(),
            U_Gender: vals.U_Gender || null,
            U_Birthday: vals.U_Birthday ? vals.U_Birthday.format("YYYY-MM-DD") : null,
        };
        try {
            await usersApi.updateMe(payload);
            if (setUser) setUser((prev) => ({ ...prev, ...payload }));
            message.success("Cập nhật thông tin thành công");
            setPOpen(false);
        } catch (e) {
            logAxiosError("profile save", e);
            message.error(e?.response?.data?.message || "Cập nhật thất bại");
        } finally {
            setPSaving(false);
        }
    };

    // =============== ONLY UI STYLES (không đổi cấu trúc) ===============
    const pageBg = {
        minHeight: "100vh",
        background:
            "radial-gradient(1000px 280px at 50% 0%, rgba(59,130,246,.12), transparent 60%), radial-gradient(900px 260px at 20% 8%, rgba(16,185,129,.12), transparent 60%), radial-gradient(900px 260px at 80% 6%, rgba(168,85,247,.10), transparent 60%), #f5fbff",
    };
    const wrap = { padding: 24, maxWidth: 1200, margin: "0 auto" };
    const heroCard = {
        borderRadius: 20,
        background: "linear-gradient(135deg, rgba(255,255,255,.96) 0%, rgba(255,255,255,.9) 100%)",
        boxShadow: "0 24px 60px rgba(15,23,42,.10)",
    };
    const whiteCard = {
        borderRadius: 18,
        background: "#fff",
        boxShadow: "0 18px 40px rgba(15,23,42,.08)",
    };
    const tileIcon = (bg) => ({
        width: 44,
        height: 44,
        borderRadius: 14,
        display: "grid",
        placeItems: "center",
        color: "#fff",
        background: bg,
        boxShadow: "0 12px 26px rgba(0,0,0,.12)",
    });
    const actionCard = (tint) => ({
        borderRadius: 22,
        background: `linear-gradient(180deg, ${tint} 0%, #ffffff 90%)`,
        boxShadow: "0 24px 60px rgba(15,23,42,.08)",
        height: "100%",
    });
    // ===================================================================

    return (
        <Layout style={pageBg}>
            <TopBar user={user} role="Owner" onLogout={logout} onUserClick={onUserClick} />

            {/* Hero */}
            <div style={{ ...wrap, paddingTop: 24, paddingBottom: 8 }}>
                <Card bordered={false} style={heroCard} bodyStyle={{ padding: 20 }}>
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                        <Space align="center" size={10}>
                            <div
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 999,
                                    background: "#16a34a",
                                    boxShadow: "0 0 0 6px rgba(22,163,74,.15)",
                                }}
                            />
                            <Text type="secondary">Xin chào,</Text>
                            <Text strong>
                                {user?.U_Fullname || user?.full_name || user?.username || "Owner"}
                            </Text>
                        </Space>
                        <Title level={4} style={{ margin: 0 }}>
                            Bảng điều khiển
                        </Title>
                        <Text type="secondary">
                            Quản lý homestay, đặt phòng, doanh thu và nhiều hơn nữa.
                        </Text>
                    </Space>
                </Card>
            </div>

            <Layout.Content style={wrap}>
                {/* KPI tiles */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={6}>
                        <Card bordered={false} style={whiteCard} bodyStyle={{ padding: 18 }}>
                            <Space align="center" size={14}>
                                <div style={tileIcon("#22c55e")}>
                                    <HomeOutlined />
                                </div>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Homestay
                                    </Text>
                                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
                                        {kpi.homestays}
                                    </div>
                                </div>
                            </Space>
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card bordered={false} style={whiteCard} bodyStyle={{ padding: 18 }}>
                            <Space align="center" size={14}>
                                <div style={tileIcon("#0ea5e9")}>
                                    <BookOutlined />
                                </div>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Đơn đặt tháng này
                                    </Text>
                                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
                                        {kpi.bookingsThisMonth}
                                    </div>
                                </div>
                            </Space>
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card bordered={false} style={whiteCard} bodyStyle={{ padding: 18 }}>
                            <Space align="center" size={14}>
                                <div style={tileIcon("#f59e0b")}>
                                    <DollarOutlined />
                                </div>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Doanh thu tháng
                                    </Text>
                                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
                                        {kpi.revenueThisMonth} đ
                                    </div>
                                </div>
                            </Space>
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card bordered={false} style={whiteCard} bodyStyle={{ padding: 18 }}>
                            <Space align="center" size={14}>
                                <div style={tileIcon("#8b5cf6")}>
                                    <StarOutlined />
                                </div>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Điểm đánh giá TB
                                    </Text>
                                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
                                        {kpi.ratingAvg}
                                    </div>
                                </div>
                            </Space>
                        </Card>
                    </Col>
                </Row>

                {/* Hàng 2 */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col xs={24} md={8}>
                        <Card
                            title={
                                <Space align="center" size={12}>
                                    <div style={tileIcon("#16a34a")}>
                                        <HomeOutlined />
                                    </div>
                                    <span>Quản lý Homestay</span>
                                </Space>
                            }
                            style={actionCard("rgba(16,163,74,.10)")}>
                            <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                <Paragraph style={{ marginTop: 4 }}>
                                    Thêm/sửa/xoá homestay, quản lý ảnh, giá, trạng thái…
                                </Paragraph>
                                <Button
                                    type="primary"
                                    block
                                    icon={<HomeOutlined />}
                                    style={{ background: "#16a34a", borderColor: "#16a34a", height: 40, fontWeight: 600 }}
                                    onClick={() => nav("/owner/homestays")}
                                >
                                    Vào trang quản lý
                                </Button>
                            </Space>
                        </Card>
                    </Col>

                    <Col xs={24} md={8}>
                        <Card
                            title={
                                <Space align="center" size={12}>
                                    <div style={tileIcon("#2563eb")}>
                                        <BookOutlined />
                                    </div>
                                    <span>Quản lý Đơn đặt phòng</span>
                                </Space>
                            }
                            style={actionCard("rgba(37,99,235,.10)")}>
                            <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                <Paragraph style={{ marginTop: 4 }}>
                                    Duyệt/huỷ booking, xem chi tiết, lịch nhận trả phòng…
                                </Paragraph>
                                <Button block icon={<BookOutlined />} style={{ height: 40, fontWeight: 600 }}>
                                    <Link to="/owner/bookings">Xem đơn đặt phòng</Link>
                                </Button>
                            </Space>
                        </Card>
                    </Col>

                    <Col xs={24} md={8}>
                        <Card
                            title={
                                <Space align="center" size={12}>
                                    <div style={tileIcon("#f59e0b")}>
                                        <BarChartOutlined />
                                    </div>
                                    <span>Khuyến mãi & Doanh thu</span>
                                </Space>
                            }
                            style={actionCard("rgba(245,158,11,.12)")}>
                            <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                <Paragraph style={{ marginTop: 4 }}>
                                    Tạo mã giảm giá, xem thống kê doanh thu, biểu đồ theo tháng.
                                </Paragraph>
                                <Space.Compact block>
                                    <Button icon={<GiftOutlined />}>
                                        <Link to="/owner/promotions">Khuyến mãi</Link>
                                    </Button>
                                    <Button icon={<BarChartOutlined />}>
                                        <Link to="/owner/analytics">Thống kê</Link>
                                    </Button>
                                </Space.Compact>
                            </Space>
                        </Card>
                    </Col>
                </Row>

                {/* Hàng 3 */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col xs={24} md={8}>
                        <Card
                            title={
                                <Space align="center" size={12}>
                                    <div style={tileIcon("#8b5cf6")}>
                                        <StarOutlined />
                                    </div>
                                    <span>Phản hồi & Đánh giá</span>
                                </Space>
                            }
                            style={actionCard("rgba(139,92,246,.12)")}>
                            <Paragraph style={{ marginTop: 4 }}>
                                Xem phản hồi khách, trả lời đánh giá.
                            </Paragraph>
                            <Button block icon={<StarOutlined />} style={{ height: 40, fontWeight: 600 }}>
                                <Link to="/owner/feedbacks">Quản lý phản hồi</Link>
                            </Button>
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card
                            title={
                                <Space align="center" size={12}>
                                    <div style={tileIcon("#06b6d4")}>
                                        <DollarOutlined />
                                    </div>
                                    <span>Tiện ích & Dịch vụ</span>
                                </Space>
                            }
                            style={actionCard("rgba(6,182,212,.12)")}>
                            <Paragraph style={{ marginTop: 4 }}>
                                Thiết lập tiện ích (wifi, bữa sáng, đưa đón…).
                            </Paragraph>
                            <Button block style={{ height: 40, fontWeight: 600 }}>
                                <Link to="/owner/amenities">Quản lý tiện ích</Link>
                            </Button>
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card
                            title={
                                <Space align="center" size={12}>
                                    <div style={tileIcon("#ef4444")}>
                                        <DollarOutlined />
                                    </div>
                                    <span>Khiếu nại</span>
                                </Space>
                            }
                            style={actionCard("rgba(239,68,68,.12)")}>
                            <Paragraph style={{ marginTop: 4 }}>
                                Tiếp nhận & xử lý khiếu nại của khách.
                            </Paragraph>
                            <Button block style={{ height: 40, fontWeight: 600 }}>
                                <Link to="/owner/complaints">Xử lý khiếu nại</Link>
                            </Button>
                        </Card>
                    </Col>
                </Row>
            </Layout.Content>

            {/* Drawer hồ sơ — CHỈ CHỈNH UI */}
            <Drawer
                open={pOpen}
                onClose={() => setPOpen(false)}
                width={640}
                bodyStyle={{ padding: 0 }}
                title={null}
                extra={null}
            >
                {/* Header đẹp hơn */}
                <div
                    style={{
                        padding: "18px 24px",
                        background: "linear-gradient(135deg,#e0f7ff,#f0fff4)",
                        borderBottom: "1px solid #f0f0f0",
                    }}
                >
                    <Space align="center" size={14} style={{ width: "100%", justifyContent: "space-between" }}>
                        <Space align="center" size={12}>
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: "#1677ff",
                                    color: "#fff",
                                    display: "grid",
                                    placeItems: "center",
                                    fontWeight: 700,
                                    boxShadow: "0 10px 22px rgba(22,119,255,.25)",
                                }}
                            >
                                {(user?.U_Fullname || user?.username || "U").toString().charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <Title level={4} style={{ margin: 0 }}>Sửa thông tin cá nhân</Title>
                                <Text type="secondary">Cập nhật hồ sơ để trải nghiệm tốt hơn</Text>
                            </div>
                        </Space>

                        <Space>
                            <Tag color="blue" style={{ borderRadius: 999 }}>
                                Owner
                            </Tag>
                            <Button onClick={() => setPOpen(false)}>Huỷ</Button>
                            <Button type="primary" loading={pSaving} onClick={() => pForm.submit()}>
                                Lưu
                            </Button>
                        </Space>
                    </Space>
                </div>

                {/* Nội dung form */}
                <div style={{ padding: 20 }}>
                    <Form layout="vertical" form={pForm} onFinish={onProfileSave}>
                        {/* Hàng 1: Họ tên + Email */}
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="U_Fullname"
                                    label="Họ tên"
                                    rules={[{ required: true, message: "Nhập họ tên" }]}
                                >
                                    <Input
                                        size="large"
                                        placeholder="Nguyễn Văn A"
                                        prefix={<UserOutlined className="text-gray-400" />}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="U_Email" label="Email">
                                    <Input
                                        size="large"
                                        disabled
                                        placeholder="email@domain.com"
                                        prefix={<MailOutlined className="text-gray-400" />}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        {/* Hàng 2: SĐT + Địa chỉ */}
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item name="U_Phone" label="Số điện thoại">
                                    <Input
                                        size="large"
                                        placeholder="0901234567"
                                        prefix={<PhoneOutlined className="text-gray-400" />}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="U_Address" label="Địa chỉ">
                                    <Input
                                        size="large"
                                        placeholder="Số nhà, đường, phường/xã..."
                                        prefix={<EnvironmentOutlined className="text-gray-400" />}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        {/* Hàng 3: Giới tính + Ngày sinh */}
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item name="U_Gender" label="Giới tính">
                                    <Select
                                        size="large"
                                        allowClear
                                        options={[
                                            { value: "male", label: "Nam" },
                                            { value: "female", label: "Nữ" },
                                            { value: "other", label: "Khác" },
                                        ]}
                                        placeholder="Chọn giới tính"
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="U_Birthday" label="Ngày sinh">
                                    <DatePicker
                                        size="large"
                                        style={{ width: "100%" }}
                                        format="YYYY-MM-DD"
                                        placeholder="YYYY-MM-DD"
                                        suffixIcon={<CalendarOutlined />}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider style={{ margin: "4px 0 10px" }} />

                        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                            <Button onClick={() => setPOpen(false)}>Đóng</Button>
                            <Button type="primary" loading={pSaving} onClick={() => pForm.submit()}>
                                Lưu thay đổi
                            </Button>
                        </Space>
                    </Form>
                </div>
            </Drawer>
        </Layout>
    );
}
