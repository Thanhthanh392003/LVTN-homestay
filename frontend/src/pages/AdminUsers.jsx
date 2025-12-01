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

// ============================
// HÀM LỌC TÌM KIẾM CHÍNH XÁC
// ============================
function filterUsers(list, q) {
    if (!q || !q.trim()) return list;
    const keyword = q.trim().toLowerCase();

    return list.filter((u) => {
        const name = (u.fullname || "").toLowerCase();
        const email = (u.email || "").toLowerCase();

        const nameParts = name.split(" ");

        return (
            name.startsWith(keyword) ||
            email.startsWith(keyword) ||
            name.includes(keyword) ||
            email.includes(keyword) ||
            nameParts.some((p) => p.startsWith(keyword))
        );
    });
}

export default function AdminUsers() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [roleTab, setRoleTab] = React.useState("customer");
    const [q, setQ] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [rows, setRows] = React.useState([]);
    const [allUsers, setAllUsers] = React.useState([]); // lưu raw list

    // ============================
    // FETCH USER THEO ROLE
    // ============================
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const list = await usersApi.adminList({ role: roleTab });
            setAllUsers(Array.isArray(list) ? list : []);
            setRows(filterUsers(list, q)); // áp dụng filter ngay
        } finally {
            setLoading(false);
        }
    };

    // khi đổi vai trò → load lại API
    React.useEffect(() => {
        fetchUsers();
    }, [roleTab]);

    // khi thay đổi từ khóa tìm kiếm → lọc FE
    React.useEffect(() => {
        setRows(filterUsers(allUsers, q));
    }, [q, allUsers]);

    // ============================
    // ĐỔI TRẠNG THÁI
    // ============================
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

    // ============================
    // HÀM HỖ TRỢ UI
    // ============================
    const roleColor = (v) =>
        v === "admin" ? "gold" : v === "owner" ? "geekblue" : "green";

    const toVietnameseRole = (r) =>
        r === "admin" ? "quản trị viên" :
            r === "owner" ? "chủ nhà" : "khách hàng";

    const toVietnameseStatus = (s) =>
        s === "active" ? "đang hoạt động" :
            s === "pending" ? "đang chờ" : "bị khóa";

    const statusDot = (s) =>
        s === "active" ? "green" : s === "pending" ? "gold" : "red";

    const segmentedOptions = [
        { label: <Space><UsergroupAddOutlined /> Khách hàng</Space>, value: "customer" },
        { label: <Space><UserSwitchOutlined /> Chủ nhà</Space>, value: "owner" },
    ];

    const initials = (name = "") => {
        const t = name.trim();
        if (!t) return "U";
        const parts = t.split(/\s+/);
        return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
    };

    const bg = {
        minHeight: "100vh",
        background:
            "radial-gradient(900px 240px at 10% 0%, rgba(59,130,246,.10), transparent 60%), radial-gradient(900px 240px at 85% 0%, rgba(16,185,129,.10), transparent 60%), #f6fbff",
    };

    return (
        <Layout style={bg}>
            <TopBar user={user} role="Quản trị viên" onLogout={logout} />

            <Layout.Content style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>

                <Affix offsetTop={12}>
                    <div>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate("/admin")}
                            style={{ borderRadius: 10, padding: "6px 12px" }}
                        >
                            Về bảng điều khiển
                        </Button>
                    </div>
                </Affix>

                <Card
                    bordered={false}
                    style={{
                        borderRadius: 20,
                        marginTop: 12,
                        marginBottom: 12,
                        background: "linear-gradient(135deg,#ffffff,#f7fffb)",
                    }}
                    bodyStyle={{ padding: 16 }}
                >
                    <Row justify="space-between" align="middle">
                        <Col flex="auto">
                            <Space size={12} align="center">
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

                <Card style={{ borderRadius: 18 }}>
                    <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                        <Col>
                            <Input
                                allowClear
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Tìm theo tên / email..."
                                prefix={<SearchOutlined />}
                                style={{ width: 360, borderRadius: 12 }}
                            />
                        </Col>

                        <Col>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={fetchUsers}
                                style={{ borderRadius: 10 }}
                            >
                                Làm mới
                            </Button>
                        </Col>
                    </Row>

                    <Table
                        rowKey={(r) => r.id}
                        dataSource={rows}
                        loading={loading}
                        pagination={{ pageSize: 12 }}
                        locale={{ emptyText: <Empty description="Chưa có dữ liệu" /> }}
                        columns={[
                            {
                                title: "Người dùng",
                                dataIndex: "fullname",
                                render: (v, r) => (
                                    <Space>
                                        <Avatar
                                            style={{
                                                background:
                                                    r.role === "owner" ? "#2563eb" :
                                                        r.role === "admin" ? "#f59e0b" : "#10b981",
                                            }}
                                            icon={!v ? <UserOutlined /> : null}
                                        >
                                            {v ? initials(v) : null}
                                        </Avatar>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{v || "—"}</div>
                                            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                                                {r.username || ""}
                                            </div>
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
                                    ) : "—",
                            },
                            {
                                title: "Vai trò",
                                dataIndex: "role",
                                render: (v) => (
                                    <Tag color={roleColor(v)} style={{ borderRadius: 999, fontWeight: 600 }}>
                                        {toVietnameseRole(v)}
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
                                                color={
                                                    s === "active"
                                                        ? "green"
                                                        : s === "pending"
                                                            ? "gold"
                                                            : "volcano"
                                                }
                                                style={{ margin: 0, borderRadius: 999, fontWeight: 600 }}
                                            >
                                                {toVietnameseStatus(s)}
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
                                            <Tooltip title={isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                                                <Button
                                                    type={isActive ? "primary" : "default"}
                                                    danger={isActive}
                                                    icon={isActive ? <LockOutlined /> : <UnlockOutlined />}
                                                    onClick={() => toggleStatus(r)}
                                                    style={{ borderRadius: 10 }}
                                                >
                                                    {isActive ? "Khóa" : "Mở khóa"}
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
        </Layout>
    );
}
