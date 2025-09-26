// src/pages/Register.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Row, Col, Card, Form, Input, Button, Segmented,
    Select, DatePicker, Typography, Progress, message,
} from "antd";
import {
    UserOutlined, MailOutlined, PhoneOutlined, HomeOutlined,
    LockOutlined, SolutionOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { usersApi } from "../services/users";

const { Title, Text } = Typography;

const GREEN = {
    primary: "#16a34a",
    primaryDark: "#166534",
    primaryLight: "#22c55e",
};

export default function Register() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [pwd, setPwd] = useState("");
    const [form] = Form.useForm();

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // thanh đo strength
    const strength = useMemo(() => {
        let s = 0;
        if (pwd.length >= 6) s++;
        if (/[A-Z]/.test(pwd)) s++;
        if (/\d/.test(pwd)) s++;
        if (/[^A-Za-z0-9]/.test(pwd)) s++;
        return Math.min(100, Math.max(10, s * 20 + (pwd.length >= 8 ? 20 : 0)));
    }, [pwd]);

    const onFinish = async (values) => {
        try {
            setLoading(true);
            const payload = {
                role_id: Number(values.role_id),        // 2 owner | 3 customer
                fullname: values.fullname?.trim(),
                email: values.email?.trim(),
                password: values.password,              // BE sẽ hash (bcrypt)
                phone: values.phone?.trim() || null,
                address: values.address?.trim() || null,
                gender: values.gender || null,
                birthday: values.birthday ? dayjs(values.birthday).format("YYYY-MM-DD") : null,
                status: "active",
            };

            // gửi
            await usersApi.register(payload);

            message.success("Tạo tài khoản thành công! Mời đăng nhập.");
            navigate("/login");
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e?.response?.data?.payload ||
                (e?.response?.status === 409 ? "Email đã được đăng ký" : null) ||
                e?.message ||
                "Đăng ký thất bại!";
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                background:
                    `radial-gradient(1000px 800px at 15% -15%, #dcfce780 0%, transparent 65%),
           radial-gradient(1200px 900px at 85% 15%, #bbf7d080 0%, transparent 70%),
           radial-gradient(800px 600px at 50% 100%, #86efac40 0%, transparent 50%),
           linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)`,
            }}
        >
            <div style={{ width: "100%", maxWidth: 1100 }}>
                <Row gutter={[24, 24]} align="middle" justify="center">
                    <Col xs={24} lg={10}>
                        <div
                            className={`${mounted ? "reveal" : ""}`}
                            style={{
                                backgroundImage: `url(/hero-register.jpg), url(/hero.jpg)`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                borderRadius: 16,
                                height: 420,
                                position: "relative",
                                overflow: "hidden",
                                boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
                            }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: `linear-gradient(45deg, ${GREEN.primary}90 0%, ${GREEN.primaryDark}90 100%)`,
                                }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    textAlign: "center",
                                }}
                            >
                                <div>
                                    <Title level={2} style={{ color: "white", marginBottom: 8 }}>
                                        Bắt đầu cùng Homestay
                                    </Title>
                                    <Text style={{ color: "#e2e8f0" }}>
                                        Đăng ký nhanh, trải nghiệm ngay 🌿
                                    </Text>
                                </div>
                            </div>
                        </div>
                    </Col>

                    <Col xs={24} lg={14}>
                        <Card
                            className={`${mounted ? "reveal" : ""}`}
                            style={{
                                borderRadius: 16,
                                border: "none",
                                background: "rgba(255,255,255,0.95)",
                                backdropFilter: "blur(10px)",
                            }}
                        >
                            <div style={{ textAlign: "center", marginBottom: 18 }}>
                                <div
                                    style={{
                                        width: 60,
                                        height: 6,
                                        borderRadius: 3,
                                        margin: "0 auto 12px",
                                        background: `linear-gradient(90deg, ${GREEN.primary}, ${GREEN.primaryLight})`,
                                    }}
                                />
                                <Title level={3} style={{ marginBottom: 6, color: "#0f172a" }}>
                                    Tạo tài khoản
                                </Title>
                                <Text type="secondary">
                                    Chỉ vài bước để đặt/cho thuê homestay.
                                </Text>
                            </div>

                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={onFinish}
                                requiredMark="optional"
                                initialValues={{ role_id: 3, gender: "female" }}
                            >
                                <Form.Item
                                    label="Loại tài khoản"
                                    name="role_id"
                                    tooltip="Owner để đăng bài; Customer để đặt phòng"
                                    style={{ marginBottom: 16 }}
                                    rules={[{ required: true, message: "Chọn loại tài khoản" }]}
                                >
                                    <Segmented
                                        size="large"
                                        style={{
                                            width: "100%",
                                            background: "#f8fafc",
                                            borderRadius: 12,
                                            padding: 4,
                                        }}
                                        options={[
                                            { label: "Chủ nhà (Owner)", value: 2 },
                                            { label: "Khách (Customer)", value: 3 },
                                        ]}
                                    />
                                </Form.Item>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item
                                            label="Họ tên"
                                            name="fullname"
                                            rules={[{ required: true, message: "Nhập họ tên" }]}
                                        >
                                            <Input
                                                size="large"
                                                prefix={<UserOutlined style={{ color: GREEN.primary }} />}
                                                placeholder="Nguyễn Văn A"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item
                                            label="Email"
                                            name="email"
                                            rules={[
                                                { required: true, message: "Nhập email" },
                                                { type: "email", message: "Email không hợp lệ" },
                                            ]}
                                        >
                                            <Input
                                                size="large"
                                                prefix={<MailOutlined style={{ color: GREEN.primary }} />}
                                                placeholder="you@example.com"
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item
                                            label="Mật khẩu"
                                            name="password"
                                            rules={[
                                                { required: true, message: "Nhập mật khẩu" },
                                                { min: 6, message: "Tối thiểu 6 ký tự!" },
                                                { max: 50, message: "Tối đa 50 ký tự!" },
                                            ]}
                                        >
                                            <Input.Password
                                                size="large"
                                                prefix={<LockOutlined style={{ color: GREEN.primary }} />}
                                                placeholder="********"
                                                onChange={(e) => setPwd(e.target.value)}
                                            />
                                        </Form.Item>
                                        <div style={{ marginTop: -10, marginBottom: 10 }}>
                                            <Progress
                                                percent={strength}
                                                showInfo={false}
                                                strokeColor={{ from: GREEN.primary, to: GREEN.primaryLight }}
                                            />
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item
                                            label="Nhập lại mật khẩu"
                                            name="confirm"
                                            dependencies={["password"]}
                                            rules={[
                                                { required: true, message: "Nhập lại mật khẩu" },
                                                ({ getFieldValue }) => ({
                                                    validator(_, value) {
                                                        return !value || getFieldValue("password") === value
                                                            ? Promise.resolve()
                                                            : Promise.reject(new Error("Mật khẩu không khớp!"));
                                                    },
                                                }),
                                            ]}
                                        >
                                            <Input.Password
                                                size="large"
                                                prefix={<LockOutlined style={{ color: GREEN.primary }} />}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item
                                            label="Số điện thoại"
                                            name="phone"
                                            rules={[{ required: true, message: "Nhập số điện thoại" }]}
                                        >
                                            <Input
                                                size="large"
                                                prefix={<PhoneOutlined style={{ color: GREEN.primary }} />}
                                                placeholder="0912345678"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Ngày sinh" name="birthday">
                                            <DatePicker
                                                size="large"
                                                style={{ width: "100%" }}
                                                format="YYYY-MM-DD"
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item label="Giới tính" name="gender">
                                            <Select
                                                size="large"
                                                allowClear
                                                suffixIcon={<SolutionOutlined style={{ color: GREEN.primary }} />}
                                                options={[
                                                    { value: "female", label: "Nữ" },
                                                    { value: "male", label: "Nam" },
                                                    { value: "other", label: "Khác" },
                                                ]}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item
                                            label="Địa chỉ"
                                            name="address"
                                            rules={[{ required: true, message: "Nhập địa chỉ" }]}
                                        >
                                            <Input
                                                size="large"
                                                prefix={<HomeOutlined style={{ color: GREEN.primary }} />}
                                                placeholder="Hà Nội"
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    loading={loading}
                                    block
                                    style={{
                                        background: `linear-gradient(135deg, ${GREEN.primary} 0%, ${GREEN.primaryLight} 100%)`,
                                        border: "none",
                                    }}
                                >
                                    Tạo tài khoản
                                </Button>

                                <div style={{ textAlign: "center", marginTop: 18 }}>
                                    <Text type="secondary">Đã có tài khoản?</Text>{" "}
                                    <Link to="/login" className="link">
                                        Đăng nhập
                                    </Link>
                                </div>
                            </Form>
                        </Card>
                    </Col>
                </Row>
            </div>
        </div>
    );
}
