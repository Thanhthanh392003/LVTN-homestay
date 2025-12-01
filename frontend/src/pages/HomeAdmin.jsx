// src/pages/HomeAdmin.jsx
import React from "react";
import {
    Layout,
    Row,
    Col,
    Card,
    Statistic,
    Button,
    Space,
    Typography,
    message,
    Tooltip,
} from "antd";
import {
    TeamOutlined,
    HomeOutlined,
    DollarOutlined,
    SettingOutlined,
    AuditOutlined,
    GiftOutlined,
    MessageOutlined,
    AlertOutlined,
    BarChartOutlined,
    ArrowRightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const { Title, Text } = Typography;

/* =========================
   Helpers & API 
========================= */
const http = axios.create({ withCredentials: true });

const buildBase = () => {
    const b = import.meta.env.VITE_API_BASE;
    if (b) return b.replace(/\/+$/, "");
    const { protocol, hostname, port } = window.location;
    const isVite = hostname === "localhost" && port === "5173";
    return isVite ? `${protocol}//${hostname}:3000/api` : "/api";
};

const arr = (x) => {
    const dataData = x?.data?.data;
    const data = x?.data;
    const r = dataData ?? data ?? x ?? [];
    if (Array.isArray(r)) return r;
    const pickArray = (o) => {
        if (!o || typeof o !== "object") return null;
        if (Array.isArray(o.homestays)) return o.homestays;
        if (Array.isArray(o.items)) return o.items;
        if (Array.isArray(o.rows)) return o.rows;
        if (Array.isArray(o.records)) return o.records;
        if (Array.isArray(o.list)) return o.list;
        return null;
    };
    return (
        pickArray(r) ??
        pickArray(data) ??
        pickArray(dataData) ??
        pickArray(x) ??
        []
    );
};

/* =========================
   API calls
========================= */
const api = {
    async users(role, q = "") {
        const base = buildBase();
        try {
            const res = await http.get(`${base}/users`, { params: { role, q } });
            return arr(res);
        } catch {
            const res = await http
                .get(`${base}/admin/users`, { params: { role, q } })
                .catch(() => ({}));
            return arr(res);
        }
    },

    async homestays() {
        const base = buildBase();
        try {
            const res = await http.get(`${base}/homestays`);
            return arr(res);
        } catch (e) {
            console.error("[homestays] ERROR:", e);
            try {
                const res = await http.get(`${base}/admin/homestays`);
                return arr(res);
            } catch {
                return [];
            }
        }
    },

    /* === Doanh thu ADMIN === */
    async revenue() {
        const base = buildBase();
        try {
            const res = await http.get(`${base}/bookings/admin/revenue`);
            return res?.data?.revenue ?? 0;
        } catch (e) {
            console.error("[api.revenue] ERROR:", e);
            return 0;
        }
    },
};

export default function HomeAdmin() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    /* ============ KPI state ============ */
    const [kpi, setKpi] = React.useState({
        customers: 0,
        owners: 0,
        homestays: 0,
        revenue: 0,
    });

    /* ============ Load KPI ============ */
    const loadKpis = async () => {
        try {
            const [cus, own, hsAll, revenue] = await Promise.all([
                api.users("customer"),
                api.users("owner"),
                api.homestays(),
                api.revenue(), // <-- lấy doanh thu thật
            ]);

            setKpi({
                customers: Array.isArray(cus) ? cus.length : 0,
                owners: Array.isArray(own) ? own.length : 0,
                homestays: Array.isArray(hsAll) ? hsAll.length : 0,
                revenue: revenue || 0,
            });
        } catch (e) {
            console.error("[loadKpis] ERROR:", e);
            message.error("Không thể tải dữ liệu KPI");
        }
    };

    React.useEffect(() => {
        loadKpis();
    }, []);

    /* ========= UI helpers ========= */
    const kpiCard = (title, value, icon, gradient, accent) => (
        <Card
            bordered={false}
            style={{
                borderRadius: 18,
                background: gradient,
                boxShadow: "0 8px 28px rgba(22,119,255,0.08)",
            }}
            bodyStyle={{ padding: 18 }}
            hoverable
        >
            <Space align="center">
                <div
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: 14,
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        color: accent,
                        boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
                    }}
                >
                    {icon}
                </div>
                <div>
                    <Text type="secondary" style={{ fontWeight: 500 }}>
                        {title}
                    </Text>
                    <Statistic
                        value={value}
                        valueStyle={{ fontWeight: 800, color: "#0f172a" }}
                    />
                </div>
            </Space>
        </Card>
    );

    const moduleTile = ({ color, icon, title, desc, actions }) => (
        <Card
            hoverable
            bordered={false}
            style={{
                borderRadius: 20,
                background: color,
                boxShadow: "0 12px 32px rgba(2,132,199,0.08)",
                transition: "0.25s",
            }}
            bodyStyle={{ padding: 22 }}
        >
            <Space align="start">
                <div
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.72)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                        color: "#0369a1",
                    }}
                >
                    {icon}
                </div>
                <div>
                    <Title level={5} style={{ margin: 0 }}>
                        {title}
                    </Title>
                    <Text type="secondary">{desc}</Text>
                    <div style={{ marginTop: 14 }}>
                        <Space wrap>{actions}</Space>
                    </div>
                </div>
            </Space>
        </Card>
    );

    /* =============== RENDER =============== */
    return (
        <Layout
            style={{
                minHeight: "100vh",
                background:
                    "radial-gradient(1200px 600px at 60% -10%, #d1fae5 0%, rgba(209,250,229,0) 60%), radial-gradient(1200px 600px at -10% 10%, #dbeafe 0%, rgba(219,234,254,0) 60%), linear-gradient(180deg,#f8fbff,#fbfffd)",
            }}
        >
            <TopBar user={user} role="Admin" onLogout={logout} />

            <Layout.Content
                style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}
            >
                {/* HERO */}
                <Card
                    bordered={false}
                    style={{
                        borderRadius: 24,
                        background:
                            "linear-gradient(140deg, rgba(240,249,255,.85), rgba(236,253,245,.85))",
                        boxShadow: "0 10px 30px rgba(2,132,199,.08)",
                        marginBottom: 18,
                    }}
                    bodyStyle={{ padding: 22 }}
                >
                    <Space direction="vertical" size={6}>
                        <Text
                            style={{
                                color: "#059669",
                                fontWeight: 700,
                                letterSpacing: 0.3,
                            }}
                        >
                            Xin chào, {user?.U_Fullname || "Admin"} 👋
                        </Text>
                        <Title level={3} style={{ margin: 0, color: "#0f172a" }}>
                            Bảng điều khiển quản trị
                        </Title>
                        <Text type="secondary">
                            Quản lý người dùng, khiếu nại, homestay, cấu hình &
                            doanh thu tổng quan.
                        </Text>
                    </Space>
                </Card>

                {/* KPI */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={6}>
                        {kpiCard(
                            "Khách hàng",
                            kpi.customers,
                            <TeamOutlined />,
                            "linear-gradient(180deg,#eef2ff,#ffffff)",
                            "#3b82f6"
                        )}
                    </Col>

                    <Col xs={24} md={6}>
                        {kpiCard(
                            "Chủ nhà",
                            kpi.owners,
                            <AuditOutlined />,
                            "linear-gradient(180deg,#f5f0ff,#ffffff)",
                            "#8b5cf6"
                        )}
                    </Col>

                    <Col xs={24} md={6}>
                        {kpiCard(
                            "Homestay",
                            kpi.homestays,
                            <HomeOutlined />,
                            "linear-gradient(180deg,#fff7ed,#ffffff)",
                            "#f59e0b"
                        )}
                    </Col>

                    <Col xs={24} md={6}>
                        {kpiCard(
                            "Doanh thu (ước tính)",
                            kpi.revenue,
                            <DollarOutlined />,
                            "linear-gradient(180deg,#ecfdf5,#ffffff)",
                            "#10b981"
                        )}
                    </Col>
                </Row>

                {/* MODULES */}
                <Row gutter={[18, 18]} style={{ marginTop: 8 }}>
                    <Col xs={24} md={12}>
                        {moduleTile({
                            color: "linear-gradient(180deg,#e6fffb,#ffffff)",
                            icon: <TeamOutlined />,
                            title: "Quản lý Người dùng",
                            desc: "Xem & phân loại khách hàng/owner, khoá & mở khoá tài khoản.",
                            actions: [
                                <Button
                                    type="primary"
                                    icon={<ArrowRightOutlined />}
                                    onClick={() => navigate("/admin/users")}
                                    key="u-btn"
                                >
                                    Vào quản lý
                                </Button>,
                            ],
                        })}
                    </Col>

                    <Col xs={24} md={12}>
                        {moduleTile({
                            color: "linear-gradient(180deg,#fef3c7,#ffffff)",
                            icon: <HomeOutlined />,
                            title: "Quản lý Homestay",
                            desc: "Duyệt, chặn & xoá homestay vi phạm.",
                            actions: [
                                <Button
                                    type="primary"
                                    icon={<ArrowRightOutlined />}
                                    onClick={() => navigate("/admin/homestays")}
                                    key="h-btn"
                                >
                                    Vào quản lý
                                </Button>,
                            ],
                        })}
                    </Col>

                    <Col xs={24} md={12}>
                        {moduleTile({
                            color: "linear-gradient(180deg,#eef2ff,#ffffff)",
                            icon: <MessageOutlined />,
                            title: "Góp ý & Đánh giá",
                            desc: "Xem đánh giá khách hàng và xử lý nội dung không phù hợp.",
                            actions: [
                                <Button
                                    type="primary"
                                    icon={<ArrowRightOutlined />}
                                    onClick={() => navigate("/admin/reviews")}
                                    key="go-reviews"
                                >
                                    Xem đánh giá
                                </Button>,
                            ],
                        })}
                    </Col>

                    <Col xs={24} md={12}>
                        {moduleTile({
                            color: "linear-gradient(180deg,#fee2e2,#ffffff)",
                            icon: <AlertOutlined />,
                            title: "Khiếu nại",
                            desc: "Tiếp nhận & xử lý khiếu nại từ khách/owner.",
                            actions: [
                                <Button
                                    type="primary"
                                    icon={<ArrowRightOutlined />}
                                    onClick={() => navigate("/admin/complaints")}
                                    key="complaints-go"
                                >
                                    Xử lý khiếu nại
                                </Button>,
                            ],
                        })}
                    </Col>

                    <Col xs={24} md={12}>
                        {moduleTile({
                            color: "linear-gradient(180deg,#e0f2fe,#ffffff)",
                            icon: <GiftOutlined />,
                            title: "Khuyến mãi",
                            desc: "Quản lý mã giảm giá, tạo mới & theo dõi hiệu lực.",
                            actions: [
                                <Button
                                    type="primary"
                                    icon={<GiftOutlined />}
                                    onClick={() => navigate("/admin/promotions")}
                                    key="promo"
                                >
                                    Quản lý
                                </Button>,
                            ],
                        })}
                    </Col>

                    {/* MỚI – Quản lý doanh thu */}
                    <Col xs={24} md={12}>
                        {moduleTile({
                            color: "linear-gradient(180deg,#dcfce7,#ffffff)",
                            icon: <BarChartOutlined />,
                            title: "Quản lý doanh thu",
                            desc: "Xem báo cáo doanh thu tổng hợp & lọc theo thời gian.",
                            actions: [
                                <Button
                                    type="primary"
                                    icon={<ArrowRightOutlined />}
                                    onClick={() => navigate("/admin/revenue")}
                                    key="rev-btn"
                                >
                                    Vào quản lý doanh thu
                                </Button>,
                            ],
                        })}
                    </Col>
                </Row>
            </Layout.Content>
        </Layout>
    );
}
