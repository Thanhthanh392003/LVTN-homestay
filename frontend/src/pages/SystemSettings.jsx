// src/pages/SystemSettings.jsx
import React from "react";
import { Layout, Card, Typography, Space, Input, Switch, Button, message } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";

const { Title, Text } = Typography;

export default function SystemSettings() {
    const { user, logout } = useAuth();

    return (
        <Layout
            style={{
                minHeight: "100vh",
                background:
                    "radial-gradient(1000px 500px at 70% -10%, #e0f2fe 0%, transparent 60%), linear-gradient(#f8fbff,#ffffff)",
            }}
        >
            <TopBar user={user} role="Admin" onLogout={logout} />

            <Layout.Content style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
                <Card
                    bordered={false}
                    style={{
                        borderRadius: 20,
                        padding: 22,
                        boxShadow: "0 12px 28px rgba(2,132,199,0.10)",
                    }}
                >
                    <Space direction="vertical" style={{ width: "100%" }} size={20}>
                        <Space align="center">
                            <div
                                style={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: "50%",
                                    background: "#e0f2fe",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <SettingOutlined style={{ fontSize: 24 }} />
                            </div>
                            <Title level={3} style={{ margin: 0 }}>
                                Cấu hình hệ thống
                            </Title>
                        </Space>

                        <Card style={{ borderRadius: 16 }} title="Tên hệ thống">
                            <Input placeholder="Nhập tên hệ thống…" />
                        </Card>

                        <Card style={{ borderRadius: 16 }} title="Bật / Tắt chế độ bảo trì">
                            <Switch /> <Text type="secondary">Khi bật, khách không thể đặt phòng.</Text>
                        </Card>

                        <Card style={{ borderRadius: 16 }} title="Cấu hình email">
                            <Space direction="vertical" style={{ width: "100%" }}>
                                <Input placeholder="SMTP Host" />
                                <Input placeholder="SMTP User" />
                                <Input.Password placeholder="SMTP Password" />
                                <Button type="primary">Lưu cấu hình Email</Button>
                            </Space>
                        </Card>

                        <Button
                            type="primary"
                            size="large"
                            style={{ borderRadius: 8 }}
                            onClick={() => message.success("Đã lưu tất cả cấu hình!")}
                        >
                            Lưu tất cả cấu hình
                        </Button>
                    </Space>
                </Card>
            </Layout.Content>
        </Layout>
    );
}
