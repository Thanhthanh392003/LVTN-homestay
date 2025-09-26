import React from "react";
import { Layout, Row, Col, Card, Statistic, Tabs, Table, Tag, Button, Space, message } from "antd";
import { TeamOutlined, HomeOutlined, DollarOutlined, AuditOutlined, StopOutlined, CheckOutlined } from "@ant-design/icons";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";

export default function HomeAdmin() {
    const { user, logout } = useAuth();

    // Mock KPI
    const [kpi] = React.useState({
        users: 128,
        owners: 12,
        homestays: 56,
        revenue: 245_000_000,
    });

    // Mock users — TODO: GET /api/users
    const [usersData, setUsersData] = React.useState([
        { id: 1, fullname: "Admin", email: "admin@example.com", role: "admin", status: "active" },
        { id: 2, fullname: "Owner One", email: "owner1@example.com", role: "owner", status: "active" },
        { id: 3, fullname: "Customer One", email: "customer1@example.com", role: "customer", status: "active" },
    ]);

    // Mock homestays — TODO: GET /api/homestays (pending/active)
    const [hsData, setHsData] = React.useState([
        { id: 101, name: "Cozy Pine", city: "Đà Lạt", owner: "owner1@example.com", status: "pending" },
        { id: 102, name: "Lake View", city: "Đà Nẵng", owner: "owner1@example.com", status: "active" },
    ]);

    const toggleUserStatus = (r) => {
        // TODO: PATCH /api/users/:id/status
        setUsersData((s) =>
            s.map((x) => (x.id === r.id ? { ...x, status: x.status === "active" ? "suspended" : "active" } : x))
        );
        message.success("Đã cập nhật trạng thái người dùng");
    };

    const approveHomestay = (r) => {
        // TODO: PATCH /api/homestays/:id/approve
        setHsData((s) => s.map((x) => (x.id === r.id ? { ...x, status: "active" } : x)));
        message.success("Đã phê duyệt homestay");
    };

    const rejectHomestay = (r) => {
        // TODO: PATCH /api/homestays/:id/reject
        setHsData((s) => s.map((x) => (x.id === r.id ? { ...x, status: "rejected" } : x)));
        message.success("Đã từ chối homestay");
    };

    return (
        <Layout style={{ minHeight: "100vh", background: "#f7fafc" }}>
            <TopBar user={user} role="Admin" onLogout={logout} />
            <Layout.Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
                {/* KPIs */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={6}>
                        <Card bordered style={{ borderRadius: 16 }}>
                            <Statistic title="Người dùng" value={kpi.users} prefix={<TeamOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card bordered style={{ borderRadius: 16 }}>
                            <Statistic title="Chủ nhà" value={kpi.owners} prefix={<AuditOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card bordered style={{ borderRadius: 16 }}>
                            <Statistic title="Homestay" value={kpi.homestays} prefix={<HomeOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card bordered style={{ borderRadius: 16 }}>
                            <Statistic title="Doanh thu (ước tính)" value={kpi.revenue} precision={0} suffix="₫" prefix={<DollarOutlined />} />
                        </Card>
                    </Col>
                </Row>

                <Card style={{ borderRadius: 16, marginTop: 16 }}>
                    <Tabs
                        defaultActiveKey="users"
                        items={[
                            {
                                key: "users",
                                label: "Người dùng",
                                children: (
                                    <Table
                                        rowKey="id"
                                        dataSource={usersData}
                                        pagination={{ pageSize: 8 }}
                                        columns={[
                                            { title: "Họ tên", dataIndex: "fullname" },
                                            { title: "Email", dataIndex: "email" },
                                            { title: "Vai trò", dataIndex: "role", render: (r) => <Tag color={r === "admin" ? "purple" : r === "owner" ? "blue" : "green"}>{r}</Tag> },
                                            {
                                                title: "Trạng thái",
                                                dataIndex: "status",
                                                render: (s) => <Tag color={s === "active" ? "green" : "volcano"}>{s}</Tag>,
                                            },
                                            {
                                                title: "Thao tác",
                                                render: (_, r) => (
                                                    <Button onClick={() => toggleUserStatus(r)} danger={r.status === "active"}>
                                                        {r.status === "active" ? "Khoá" : "Mở khoá"}
                                                    </Button>
                                                ),
                                            },
                                        ]}
                                    />
                                ),
                            },
                            {
                                key: "homestays",
                                label: "Homestay",
                                children: (
                                    <Table
                                        rowKey="id"
                                        dataSource={hsData}
                                        pagination={{ pageSize: 8 }}
                                        columns={[
                                            { title: "Tên", dataIndex: "name" },
                                            { title: "Thành phố", dataIndex: "city" },
                                            { title: "Chủ nhà", dataIndex: "owner" },
                                            {
                                                title: "Trạng thái",
                                                dataIndex: "status",
                                                render: (s) => (
                                                    <Tag color={s === "active" ? "green" : s === "pending" ? "gold" : "volcano"}>{s}</Tag>
                                                ),
                                            },
                                            {
                                                title: "Duyệt",
                                                render: (_, r) => (
                                                    <Space>
                                                        <Button type="primary" icon={<CheckOutlined />} onClick={() => approveHomestay(r)} disabled={r.status === "active"}>
                                                            Duyệt
                                                        </Button>
                                                        <Button danger icon={<StopOutlined />} onClick={() => rejectHomestay(r)} disabled={r.status === "rejected"}>
                                                            Từ chối
                                                        </Button>
                                                    </Space>
                                                ),
                                            },
                                        ]}
                                    />
                                ),
                            },
                        ]}
                    />
                </Card>
            </Layout.Content>
        </Layout>
    );
}
