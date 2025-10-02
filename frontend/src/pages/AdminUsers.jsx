// src/pages/AdminUsers.jsx
import React from "react";
import {
    Layout, Card, Row, Col, Segmented, Input, Button, Table, Tag,
    Space, Empty, message, Typography, Avatar, Tooltip, Badge, Affix
} from "antd";
import {
    LockOutlined, UnlockOutlined, ArrowLeftOutlined, TeamOutlined, MailOutlined, UserOutlined,
    UserSwitchOutlined, UsergroupAddOutlined, ReloadOutlined, SearchOutlined
} from "@ant-design/icons";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { usersApi } from "../services/users";

const { Title } = Typography;

export default function AdminUsers() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [roleTab, setRoleTab] = React.useState("customer"); // customer | owner
    const [q, setQ] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [rows, setRows] = React.useState([]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const list = await usersApi.adminList({ role: roleTab, q });
            setRows(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error(e);
            message.error(e?.response?.data?.message || "Không tải được danh sách");
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (r) => {
        try {
            const next = r.status === "active" ? "suspended" : "active";
            await usersApi.setStatus(r.id, next);
            message.success("Đã cập nhật trạng thái");
            fetchUsers();
        } catch (e) {
            console.error(e);
            message.error(e?.response?.data?.message || "Cập nhật thất bại");
        }
    };

    React.useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roleTab]);

    // ---- ONLY UI (màu + icon + hiệu ứng) ----
    const bg = {
        minHeight: "100vh",
        background:
            "radial-gradient(900px 240px at 10% 0%, rgba(59,130,246,.10), transparent 60%), radial-gradient(900px 240px at 85% 0%, rgba(16,185,129,.10), transparent 60%), #f6fbff",
    };
    const roleColor = (v) =>
        v === "admin" ? "gold" : v === "owner" ? "geekblue" : "green";
    const statusDot = (s) =>
        s === "active" ? "green" : s === "pending" ? "gold" : "red";
    const initials = (name = "") => {
        const t = name.trim();
        if (!t) return "U";
        const parts = t.split(/\s+/);
        return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
    };

    // Segmented với icon + hiệu ứng
    const segmentedOptions = [
        { label: <Space><UsergroupAddOutlined /> Khách hàng</Space>, value: "customer" },
        { label: <Space><UserSwitchOutlined /> Chủ nhà</Space>, value: "owner" },
    ];

    // Button style gradient
    const primaryGrad = {
        background: "linear-gradient(135deg,#1677ff,#22c55e)",
        borderColor: "transparent",
        boxShadow: "0 10px 24px rgba(22,119,255,.25)",
    };

    return (
        <Layout style={bg}>
            <TopBar user={user} role="Admin" onLogout={logout} />

            <Layout.Content style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
                {/* Nút về bảng điều khiển — Affix dính trên cùng, có hiệu ứng hover */}
                <Affix offsetTop={12}>
                    <div>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate("/admin")}
                            style={{
                                borderRadius: 10,
                                padding: "6px 12px",
                                transition: "all .2s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                        >
                            Về bảng điều khiển
                        </Button>
                    </div>
                </Affix>

                {/* Header card với gradient & icon lớn */}
                <Card
                    bordered={false}
                    style={{
                        borderRadius: 20,
                        marginTop: 12,
                        marginBottom: 12,
                        background: "linear-gradient(135deg,#ffffff,#f7fffb)",
                        boxShadow: "0 18px 40px rgba(15,23,42,.08)",
                    }}
                    bodyStyle={{ padding: 16 }}
                >
                    <Row justify="space-between" align="middle" gutter={[16, 12]}>
                        <Col flex="auto">
                            <Space size={12} align="center" wrap>
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        display: "grid",
                                        placeItems: "center",
                                        color: "#fff",
                                        background:
                                            "linear-gradient(135deg,#1677ff,#22c55e)",
                                        boxShadow: "0 12px 26px rgba(22,119,255,.25)",
                                    }}
                                >
                                    <TeamOutlined />
                                </div>
                                <Title level={3} style={{ margin: 0 }}>
                                    Quản lý người dùng
                                </Title>
                            </Space>
                        </Col>
                        <Col>
                            <Segmented
                                options={segmentedOptions}
                                value={roleTab}
                                onChange={setRoleTab}
                                style={{
                                    background: "#f0f9ff",
                                    padding: 4,
                                    borderRadius: 999,
                                }}
                            />
                        </Col>
                    </Row>
                </Card>

                {/* Toolbar + Bảng */}
                <Card style={{ borderRadius: 18 }}>
                    <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                        <Col>
                            <Input
                                allowClear
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onPressEnter={fetchUsers}
                                placeholder="Tìm theo tên / email..."
                                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                                style={{
                                    width: 360,
                                    borderRadius: 12,
                                }}
                            />
                        </Col>
                        <Col>
                            <Space>
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={fetchUsers}
                                    style={{
                                        borderRadius: 10,
                                        transition: "all .2s ease",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                                >
                                    Làm mới
                                </Button>
                            </Space>
                        </Col>
                    </Row>

                    <Table
                        rowKey={(r) => r.id}
                        dataSource={rows}
                        loading={loading}
                        pagination={{ pageSize: 12 }}
                        locale={{ emptyText: <Empty description="Chưa có dữ liệu (kiểm tra API /api/users)" /> }}
                        rowClassName={() => "admin-users-row"}
                        columns={[
                            {
                                title: "Người dùng",
                                dataIndex: "fullname",
                                render: (v, r) => (
                                    <Space>
                                        <Avatar
                                            style={{
                                                background:
                                                    r.role === "owner" ? "#2563eb" : r.role === "admin" ? "#f59e0b" : "#10b981",
                                                boxShadow: "0 10px 22px rgba(0,0,0,.12)",
                                                transition: "transform .15s ease",
                                            }}
                                            icon={!v ? <UserOutlined /> : null}
                                            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                                            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                                        >
                                            {v ? initials(v) : null}
                                        </Avatar>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{v || "—"}</div>
                                            <div style={{ fontSize: 12, color: "#8c8c8c" }}>{r.username || ""}</div>
                                        </div>
                                    </Space>
                                ),
                            },
                            {
                                title: "Email",
                                dataIndex: "email",
                                render: (v) =>
                                    v ? (
                                        <a
                                            href={`mailto:${v}`}
                                            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                                        >
                                            <MailOutlined /> {v}
                                        </a>
                                    ) : (
                                        "—"
                                    ),
                            },
                            {
                                title: "Vai trò",
                                dataIndex: "role",
                                render: (v) => (
                                    <Tag color={roleColor(v)} style={{ borderRadius: 999, fontWeight: 600 }}>
                                        {v}
                                    </Tag>
                                ),
                            },
                            {
                                title: "Trạng thái",
                                dataIndex: "status",
                                render: (s) => (
                                    <Badge
                                        color={statusDot(s)}
                                        text={
                                            <Tag
                                                color={s === "active" ? "green" : s === "pending" ? "gold" : "volcano"}
                                                style={{ margin: 0, borderRadius: 999, fontWeight: 600 }}
                                            >
                                                {s}
                                            </Tag>
                                        }
                                    />
                                ),
                            },
                            {
                                title: "Thao tác",
                                width: 240,
                                render: (_, r) => {
                                    const isActive = r.status === "active";
                                    return (
                                        <Space>
                                            <Tooltip title={isActive ? "Khoá tài khoản" : "Mở khoá tài khoản"}>
                                                <Button
                                                    type={isActive ? "primary" : "default"}
                                                    danger={isActive}
                                                    icon={isActive ? <LockOutlined /> : <UnlockOutlined />}
                                                    onClick={() => toggleStatus(r)}
                                                    style={{
                                                        ...(isActive ? primaryGrad : {}),
                                                        borderRadius: 10,
                                                        transition: "all .2s ease",
                                                    }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                                                    onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                                                >
                                                    {isActive ? "Khoá" : "Mở khoá"}
                                                </Button>
                                            </Tooltip>
                                        </Space>
                                    );
                                },
                            },
                        ]}
                    />
                </Card>
            </Layout.Content>

            {/* Custom styles cho hover row (chỉ UI) */}
            <style>{`
        .admin-users-row:hover .ant-table-cell {
          background: #f0f9ff !important;
          transition: background .2s ease;
        }
      `}</style>
        </Layout>
    );
}
