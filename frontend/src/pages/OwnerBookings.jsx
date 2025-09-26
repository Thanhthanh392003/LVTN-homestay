// src/pages/OwnerBookings.jsx
import React from "react";
import { Layout, Card, Table, Tag, message } from "antd";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
// TODO: tạo bookingsApi khi backend sẵn sàng

export default function OwnerBookings() {
    const { user, logout } = useAuth();
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);

    // TODO: gọi API thật
    React.useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setRows([
                { id: 1, code: "BK2024-0001", guest: "Nguyễn A", checkin: "2025-09-25", checkout: "2025-09-27", status: "pending" },
                { id: 2, code: "BK2024-0002", guest: "Trần B", checkin: "2025-09-28", checkout: "2025-09-30", status: "confirmed" },
            ]);
            setLoading(false);
        }, 300);
    }, []);

    return (
        <Layout style={{ minHeight: "100vh", background: "#f7fafc" }}>
            <TopBar user={user} role="Owner" onLogout={logout} />
            <Layout.Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
                <Card title="Quản lý đơn đặt phòng" style={{ borderRadius: 16 }}>
                    <Table
                        loading={loading}
                        rowKey="id"
                        dataSource={rows}
                        columns={[
                            { title: "Mã đơn", dataIndex: "code" },
                            { title: "Khách", dataIndex: "guest" },
                            { title: "Check-in", dataIndex: "checkin" },
                            { title: "Check-out", dataIndex: "checkout" },
                            {
                                title: "Trạng thái",
                                dataIndex: "status",
                                render: (s) => <Tag color={s === "confirmed" ? "green" : s === "cancelled" ? "volcano" : "gold"}>{s}</Tag>,
                            },
                        ]}
                    />
                </Card>
            </Layout.Content>
        </Layout>
    );
}
