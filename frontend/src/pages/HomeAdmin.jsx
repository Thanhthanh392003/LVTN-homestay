// src/pages/HomeAdmin.jsx
import React from "react";
import {
    Layout, Row, Col, Card, Statistic, Button, Space, Typography
} from "antd";
import {
    TeamOutlined, HomeOutlined, DollarOutlined, SettingOutlined,
    AuditOutlined, GiftOutlined, MessageOutlined, AlertOutlined, BarChartOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const { Title, Text } = Typography;

/* =========================
   Helpers & API for KPIs
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
    const d = x?.data?.data ?? x?.data ?? x ?? [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(d?.rows)) return d.rows;
    if (Array.isArray(d?.records)) return d.records;
    return [];
};

const api = {
    // Đếm users theo vai trò để lên KPI
    async users(role, q = "") {
        const base = buildBase();
        try {
            const res = await http.get(`${base}/users`, { params: { role, q } });
            return arr(res);
        } catch {
            const res = await http.get(`${base}/admin/users`, { params: { role, q } }).catch(() => ({}));
            return arr(res);
        }
    },
    // Lấy toàn bộ homestay (không lọc) để đếm KPI
    async homestays() {
        const base = buildBase();
        try {
            const res = await http.get(`${base}/admin/homestays`);
            return arr(res);
        } catch {
            const res = await http.get(`${base}/homestays`).catch(() => ({}));
            return arr(res);
        }
    },
};

export default function HomeAdmin() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // ===== KPI =====
    const [kpi, setKpi] = React.useState({ customers: 0, owners: 0, homestays: 0, revenue: 0 });

    const loadKpis = async () => {
        try {
            const [cus, own, hsAll] = await Promise.all([
                api.users("customer"),
                api.users("owner"),
                api.homestays(),
            ]);
            setKpi({
                customers: Array.isArray(cus) ? cus.length : 0,
                owners: Array.isArray(own) ? own.length : 0,
                homestays: Array.isArray(hsAll) ? hsAll.length : 0,
                revenue: 0, // tuỳ API của bạn, có thể tính sau
            });
        } catch (e) {
            console.warn("[loadKpis] error", e);
        }
    };

    React.useEffect(() => { loadKpis(); }, []);

    /* ========= UI helpers ========= */
    const kpiCard = (title, value, icon, bg) => (
        <Card bordered style={{ borderRadius: 18, background: bg }}>
            <Statistic title={title} value={value} prefix={icon} />
        </Card>
    );

    const moduleTile = ({ color = "#fff", icon, title, desc, actions }) => (
        <Card
            hoverable
            style={{ borderRadius: 20, background: color, boxShadow: "0 8px 28px rgba(0,0,0,0.06)" }}
            styles={{ body: { padding: 20 } }}
        >
            <Space align="start">
                <div
                    style={{
                        width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.6)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
                    }}
                >
                    {icon}
                </div>
                <div>
                    <Title level={5} style={{ margin: 0 }}>{title}</Title>
                    <Text type="secondary">{desc}</Text>
                    <div style={{ marginTop: 12 }}>
                        <Space wrap>{actions}</Space>
                    </div>
                </div>
            </Space>
        </Card>
    );

    return (
        <Layout style={{ minHeight: "100vh", background: "linear-gradient(180deg,#e8f7ff,#f7fbff 30%, #f8fffb)" }}>
            <TopBar user={user} role="Admin" onLogout={logout} />

            <Layout.Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
                {/* Header */}
                <Card
                    style={{ borderRadius: 24, background: "linear-gradient(135deg,#eff6ff,#ecfdf5)", marginBottom: 16, border: "1px solid #f0f0f0" }}
                    styles={{ body: { padding: 22 } }}
                >
                    <Space direction="vertical" size={6}>
                        <Text type="success" style={{ fontWeight: 600 }}>
                            Xin chào, {user?.U_Fullname || user?.fullname || "Admin"} 👋
                        </Text>
                        <Title level={3} style={{ margin: 0 }}>Bảng điều khiển quản trị</Title>
                        <Text type="secondary">Quản lý người dùng, phê duyệt homestay, xử lý góp ý & khiếu nại, và cấu hình hệ thống.</Text>
                    </Space>
                </Card>

                {/* KPI */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={6}>
                        {kpiCard("Khách hàng", kpi.customers, <TeamOutlined />, "#f0f5ff")}
                    </Col>
                    <Col xs={24} md={6}>
                        {kpiCard("Chủ nhà", kpi.owners, <AuditOutlined />, "#f5f0ff")}
                    </Col>
                    <Col xs={24} md={6}>
                        {kpiCard("Homestay", kpi.homestays, <HomeOutlined />, "#fff7e6")}
                    </Col>
                    <Col xs={24} md={6}>
                        {kpiCard("Doanh thu (ước tính)", kpi.revenue, <DollarOutlined />, "#f6ffed")}
                    </Col>
                </Row>

                {/* Module tiles (không còn phần bảng/tabs bên dưới) */}
                <Row gutter={[18, 18]} style={{ marginTop: 8 }}>
                    <Col xs={24} md={12}>
                        {moduleTile({
                            color: "linear-gradient(180deg,#e6fffb,#ffffff)",
                            icon: <TeamOutlined />,
                            title: "Quản lý Người dùng",
                            desc: "Xem & phân loại khách hàng/owner, khoá & mở khoá tài khoản.",
                            actions: [
                                <Button type="primary" onClick={() => navigate("/admin/users")}>Vào quản lý</Button>,
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
                                <Button type="primary" onClick={() => navigate("/admin/homestays")}>
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
                            desc: "Xem góp ý người dùng, quản lý đánh giá & nội dung.",
                            actions: [<Button disabled>Xem góp ý</Button>],
                        })}
                    </Col>

                    <Col xs={24} md={12}>
                        {moduleTile({
                            color: "linear-gradient(180deg,#fee2e2,#ffffff)",
                            icon: <AlertOutlined />,
                            title: "Khiếu nại",
                            desc: "Tiếp nhận & xử lý khiếu nại từ khách/owner.",
                            actions: [<Button danger disabled>Xử lý khiếu nại</Button>],
                        })}
                    </Col>

                    <Col xs={24} md={12}>
                        {moduleTile({
                            color: "linear-gradient(180deg,#e0f2fe,#ffffff)",
                            icon: <BarChartOutlined />,
                            title: "Khuyến mãi & Doanh thu",
                            desc: "Quản lý mã giảm giá, báo cáo doanh thu theo tháng/quý.",
                            actions: [
                                <Button disabled icon={<GiftOutlined />}>Khuyến mãi</Button>,
                                <Button disabled icon={<BarChartOutlined />}>Thống kê</Button>,
                            ],
                        })}
                    </Col>

                    <Col xs={24} md={12}>
                        {moduleTile({
                            color: "linear-gradient(180deg,#f5f5f5,#ffffff)",
                            icon: <SettingOutlined />,
                            title: "Cấu hình hệ thống",
                            desc: "Phân quyền, audit log, danh mục tiện nghi, banner/SEO.",
                            actions: [
                                <Button disabled>Phân quyền</Button>,
                                <Button disabled>Danh mục & Tiện nghi</Button>,
                            ],
                        })}
                    </Col>
                </Row>
            </Layout.Content>
        </Layout>
    );
}
