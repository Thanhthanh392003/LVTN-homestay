// src/pages/OwnerDashboard.jsx
import React from "react";
import {
    Layout, Row, Col, Card, Button, Space, Typography,
    Drawer, Form, Input, DatePicker, Select, message, Divider, Tag
} from "antd";
import {
    HomeOutlined, BookOutlined, DollarOutlined,
    StarOutlined, BarChartOutlined,
    UserOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined,
    CalendarOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import { usersApi } from "../services/users";
import { homestaysApi } from "../services/homestays";
import { bookingApi } from "../services/bookings";

const { Title, Paragraph, Text } = Typography;

// Logger
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

    // KPI
    const [kpi, setKpi] = React.useState({
        homestays: 0,
        bookingsThisMonth: 0,
        revenueThisMonth: 0,
        ratingAvg: 0,
    });

    // Đếm homestay
    React.useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                if (!user) return;
                const res = await homestaysApi.myList();
                const list = Array.isArray(res) ? res : res?.homestays || [];
                if (alive) setKpi((k) => ({ ...k, homestays: list.length }));
            } catch (e) {
                console.warn("[OwnerDashboard] load homestays count failed:", e?.response?.data || e?.message || e);
            }
        };
        load();
        return () => { alive = false; };
    }, [user]);

    // Đơn + doanh thu tháng
    const loadMonthlyStats = React.useCallback(async () => {
        try {
            if (!user) return;

            const data = await bookingApi.ownerList();
            // eslint-disable-next-line no-console
            console.log("[OwnerDashboard] bookings raw:", data);

            const list =
                (Array.isArray(data) && data) ||
                data?.items || data?.rows || data?.list || data?.result ||
                (Array.isArray(data?.data) && data?.data) ||
                data?.data?.items || data?.data?.rows || data?.data?.list || data?.data?.result ||
                [];

            const start = dayjs().startOf("month");
            const end = dayjs().endOf("month");

            const inMonth = (Array.isArray(list) ? list : []).filter((b) => {
                const created = dayjs(b?.Created_at || b?.created_at || b?.createdAt);
                return created.isValid() && (created.isAfter(start.subtract(1, "ms")) && created.isBefore(end.add(1, "ms")));
            });

            const orders = inMonth.length;

            const revenue = inMonth.reduce((sum, b) => {
                const total = b?.Total_price ?? b?.total_price ?? b?.Amount ?? b?.amount ?? null;
                if (typeof total === "number") return sum + total;

                const details = Array.isArray(b?.details) ? b.details : [];
                const lineSum = details.reduce((s, d) => s + (d?.Line_total ?? d?.line_total ?? 0), 0);
                return sum + lineSum;
            }, 0);

            setKpi((prev) => ({ ...prev, bookingsThisMonth: orders, revenueThisMonth: revenue }));

            const total =
                data?.total ?? data?.count ?? data?.data?.total ?? data?.data?.count ?? orders;

            if (orders === 0 && Number(total) > 0) {
                // eslint-disable-next-line no-console
                console.warn("[OwnerDashboard] total>0 nhưng list rỗng -> cần kiểm tra key items/rows/list/result trên payload.");
            }
        } catch (e) {
            const code = e?.response?.status;
            const msg = e?.response?.data?.message || e?.message;
            if (code === 401) {
                console.log("[OwnerDashboard] monthly stats 401");
            } else if (code === 403) {
                message.error("Tài khoản hiện không có quyền Owner.");
            } else {
                message.error(msg || "Không tải được số liệu tháng này.");
            }
            // eslint-disable-next-line no-console
            console.log("[OwnerDashboard] loadMonthlyStats error:", code, msg, e?.response?.data);
        }
    }, [user]);

    React.useEffect(() => {
        loadMonthlyStats();
    }, [loadMonthlyStats]);

    // Drawer hồ sơ
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

    // Styles
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
                {/* KPI */}
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
                                        {Number(kpi.revenueThisMonth || 0).toLocaleString("vi-VN")} đ
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
                            style={{
                                borderRadius: 22,
                                background: `linear-gradient(180deg, rgba(16,163,74,.10) 0%, #ffffff 90%)`,
                                boxShadow: "0 24px 60px rgba(15,23,42,.08)",
                                height: "100%",
                            }}
                        >
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
                                    <div style={tileIcon("#2563eb")}><BookOutlined /></div>
                                    <span>Quản lý Đơn đặt phòng</span>
                                </Space>
                            }
                            style={{
                                borderRadius: 22,
                                background: `linear-gradient(180deg, rgba(37,99,235,.10) 0%, #ffffff 90%)`,
                                boxShadow: "0 24px 60px rgba(15,23,42,.08)",
                                height: "100%",
                            }}
                        >
                            <Paragraph>Duyệt/huỷ booking, xem chi tiết, lịch nhận trả phòng…</Paragraph>
                            <Button
                                type="primary"
                                block
                                icon={<BookOutlined />}
                                style={{ height: 40, fontWeight: 600 }}
                                onClick={() => nav("/owner/bookings")}
                            >
                                Xem đơn đặt phòng
                            </Button>
                        </Card>
                    </Col>

                    <Col xs={24} md={8}>
                        <Card
                            title={
                                <Space align="center" size={12}>
                                    <div style={tileIcon("#f59e0b")}><BarChartOutlined /></div>
                                    <span>Doanh thu</span>
                                </Space>
                            }
                            style={{
                                borderRadius: 22,
                                background: `linear-gradient(180deg, rgba(245,158,11,.12) 0%, #ffffff 90%)`,
                                boxShadow: "0 24px 60px rgba(15,23,42,.08)",
                                height: "100%",
                            }}
                        >
                            <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                <Paragraph style={{ marginTop: 4 }}>
                                    Xem thống kê doanh thu, lọc theo ngày / tháng / năm và phân tích hiệu quả kinh doanh.
                                </Paragraph>
                                <Button
                                    type="primary"
                                    block
                                    icon={<BarChartOutlined />}
                                    style={{
                                        height: 40,
                                        fontWeight: 600,
                                        background: "#16a34a",
                                        borderColor: "#16a34a",
                                    }}
                                    onClick={() => nav("/owner/analytics")}
                                >
                                    Xem thống kê doanh thu
                                </Button>
                            </Space>
                        </Card>
                    </Col>
                </Row>

                {/* Hàng 3 */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col xs={24} md={12}>
                        <Card
                            title={
                                <Space align="center" size={12}>
                                    <div style={tileIcon("#8b5cf6")}><StarOutlined /></div>
                                    <span>Phản hồi & Đánh giá</span>
                                </Space>
                            }
                            style={{
                                borderRadius: 22,
                                background: `linear-gradient(180deg, rgba(139,92,246,.12) 0%, #ffffff 90%)`,
                                boxShadow: "0 24px 60px rgba(15,23,42,.08)",
                                height: "100%",
                            }}
                        >
                            <Paragraph style={{ marginTop: 4 }}>
                                Xem phản hồi khách, trả lời đánh giá.
                            </Paragraph>
                            <Button
                                block
                                icon={<StarOutlined />}
                                style={{
                                    height: 40,
                                    fontWeight: 600,
                                    background: "#16a34a",
                                    borderColor: "#16a34a",
                                    color: "#fff"
                                }}
                                onClick={() => nav("/owner/reviews")}
                            >
                                Quản lý phản hồi
                            </Button>

                        </Card>
                    </Col>

                    <Col xs={24} md={12}>
                        <Card
                            title={
                                <Space align="center" size={12}>
                                    <div style={tileIcon("#ef4444")}><DollarOutlined /></div>
                                    <span>Khiếu nại</span>
                                </Space>
                            }
                            style={{
                                borderRadius: 22,
                                background: `linear-gradient(180deg, rgba(239,68,68,.12) 0%, #ffffff 90%)`,
                                boxShadow: "0 24px 60px rgba(15,23,42,.08)",
                                height: "100%",
                            }}
                        >
                            <Paragraph style={{ marginTop: 4 }}>
                                Tiếp nhận & xử lý khiếu nại của khách.
                            </Paragraph>
                            <Button
                                block
                                icon={<DollarOutlined />}
                                style={{
                                    height: 40,
                                    fontWeight: 600,
                                    background: "#16a34a",
                                    borderColor: "#16a34a",
                                    color: "#fff",
                                    boxShadow: "0 4px 14px rgba(22,163,74,0.25)",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#15803d";
                                    e.currentTarget.style.borderColor = "#15803d";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#16a34a";
                                    e.currentTarget.style.borderColor = "#16a34a";
                                }}
                                onClick={() => nav("/owner/complaints")}
                            >
                                Xử lý khiếu nại
                            </Button>

                        </Card>
                    </Col>
                </Row>
            </Layout.Content>

            {/* Drawer hồ sơ */}
            <Drawer
                open={pOpen}
                onClose={() => setPOpen(false)}
                width={640}
                bodyStyle={{ padding: 0 }}
                title={null}
                extra={null}
            >
                {/* Header */}
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
                                    <Input size="large" placeholder="Nguyễn Văn A" prefix={<UserOutlined className="text-gray-400" />} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="U_Email" label="Email">
                                    <Input size="large" disabled placeholder="email@domain.com" prefix={<MailOutlined className="text-gray-400" />} />
                                </Form.Item>
                            </Col>
                        </Row>

                        {/* Hàng 2: SĐT + Địa chỉ */}
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item name="U_Phone" label="Số điện thoại">
                                    <Input size="large" placeholder="0901234567" prefix={<PhoneOutlined className="text-gray-400" />} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="U_Address" label="Địa chỉ">
                                    <Input size="large" placeholder="Số nhà, đường, phường/xã..." prefix={<EnvironmentOutlined className="text-gray-400" />} />
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
