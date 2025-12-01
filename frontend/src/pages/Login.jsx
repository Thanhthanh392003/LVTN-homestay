// src/pages/Login.jsx
import {
    Card, Form, Input, Button, Typography, Row, Col, message, Tag, Space, Divider,
} from "antd";
import {
    MailOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone,
    SafetyCertificateOutlined, StarFilled, UserOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const { Title, Text } = Typography;
const GREEN = { primary: "#16a34a", primaryDark: "#166534", primaryLight: "#22c55e" };

// Chuẩn hoá roleName từ nhiều kiểu dữ liệu có thể trả về
function getRoleName(u) {
    if (!u) return "";
    const idFromAny =
        u.role_id ??
        u.ROLE_ID ??
        (typeof u.role === "number" ? u.role : undefined) ??
        (typeof u.role?.id === "number" ? u.role.id : undefined);

    const nameFromAnyRaw =
        (typeof u.role === "string" ? u.role : undefined) ??
        (typeof u.role?.name === "string" ? u.role.name : undefined);

    const nameFromId =
        idFromAny === 1 ? "admin" :
            idFromAny === 2 ? "owner" :
                idFromAny === 3 ? "customer" : undefined;

    return (nameFromAnyRaw || nameFromId || "").toLowerCase();
}

export default function Login() {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const location = useLocation();
    const { login, user: ctxUser } = useAuth();  // dùng context login :contentReference[oaicite:0]{index=0}

    // Dùng Promise .then/.catch để chắc chắn bắt lỗi
    const onFinish = (values) => {
        // Clear lỗi cũ trước mỗi lần submit
        form.setFields([
            { name: "email", errors: [] },
            { name: "password", errors: [] },
        ]);

        login(values.email, values.password)
            .then((res) => {
                const authedUser = res?.user || ctxUser;
                const roleName = getRoleName(authedUser);

                if (roleName === "admin") {
                    message.success("Đăng nhập Admin thành công!");
                    navigate("/admin", { replace: true });
                    return;
                }
                if (roleName === "owner") {
                    message.success("Đăng nhập Owner thành công!");
                    navigate("/owner", { replace: true });
                    return;
                }

                const redirectTo = location.state?.redirectTo || "/";
                message.success("Đăng nhập thành công!");
                navigate(redirectTo, { replace: true });
            })
            .catch((e) => {
                console.log("[LOGIN] error raw:", e);

                const status = e?.response?.status;
                const data = e?.response?.data;
                let backendMsg;

                if (data) {
                    if (typeof data === "string") {
                        backendMsg = data;
                    } else if (typeof data.message === "string") {
                        backendMsg = data.message;
                    } else if (typeof data.data === "string") {
                        backendMsg = data.data;
                    } else if (data.data && typeof data.data.message === "string") {
                        backendMsg = data.data.message;
                    }
                }

                // ====== TRƯỜNG HỢP TÀI KHOẢN BỊ KHÓA (403) ======
                if (status === 403) {
                    const lockedMsg =
                        backendMsg ||
                        "Tài khoản của bạn đã bị khoá bởi quản trị viên. Vui lòng liên hệ bộ phận hỗ trợ để được mở khoá.";

                    // Hiển thị lỗi NGAY DƯỚI Ô EMAIL
                    form.setFields([
                        {
                            name: "email",
                            errors: [lockedMsg],
                        },
                    ]);

                    // Thêm popup (nếu message hoạt động)
                    message.error(lockedMsg);

                    return;
                }

                // ====== CÁC LỖI KHÁC (401 sai mật khẩu, 500, ...) ======
                const finalMsg =
                    backendMsg ||
                    e?.message ||
                    "Đăng nhập thất bại";

                // Gán lỗi generic dưới ô mật khẩu
                form.setFields([
                    {
                        name: "password",
                        errors: [finalMsg],
                    },
                ]);

                message.error(finalMsg);
            });
    };

    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            background:
                `radial-gradient(1000px 800px at 15% -15%, #dcfce780 0%, transparent 65%),
         radial-gradient(1200px 900px at 85% 15%, #bbf7d080 0%, transparent 70%),
         radial-gradient(800px 600px at 50% 100%, #86efac40 0%, transparent 50%),
         linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)`,
        }}>
            <div style={{ width: "100%", maxWidth: 1200 }}>
                <Row gutter={[32, 32]} align="middle" justify="center">
                    <Col xs={24} lg={12} xl={11}>
                        <Card
                            style={{
                                borderRadius: 24,
                                boxShadow: "0 32px 64px rgba(16,185,129,.12), 0 8px 32px rgba(0,0,0,.06)",
                                border: "1px solid rgba(255,255,255,.8)",
                                background: "rgba(255,255,255,.95)",
                                backdropFilter: "blur(20px)",
                                overflow: "hidden",
                            }}
                            bodyStyle={{ padding: 0 }}
                        >
                            <div style={{ height: 6, background: `linear-gradient(90deg, ${GREEN.primary}, ${GREEN.primaryLight})` }} />
                            <div style={{ padding: 40 }}>
                                <div style={{ textAlign: "center", marginBottom: 28 }}>
                                    <div style={{
                                        width: 80, height: 80, borderRadius: "50%", margin: "0 auto 18px",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: `linear-gradient(135deg, ${GREEN.primary}, ${GREEN.primaryLight})`,
                                        boxShadow: `0 12px 32px ${GREEN.primary}25`,
                                    }}>
                                        <UserOutlined style={{ fontSize: 32, color: "white" }} />
                                    </div>
                                    <Title level={2} style={{
                                        marginBottom: 8, fontWeight: 700,
                                        background: `linear-gradient(135deg, ${GREEN.primaryDark}, ${GREEN.primary})`,
                                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 28,
                                    }}>
                                        Chào mừng trở lại! 👋
                                    </Title>
                                    <Text type="secondary" style={{ color: "#64748b" }}>
                                        Đăng nhập để trải nghiệm kỳ nghỉ tuyệt vời
                                    </Text>
                                </div>

                                <Form
                                    layout="vertical"
                                    form={form}
                                    onFinish={onFinish}
                                    size="large"
                                    requiredMark={false}
                                >
                                    <Form.Item
                                        name="email"
                                        label={<Text strong style={{ color: "#374151" }}>Địa chỉ email</Text>}
                                        rules={[
                                            { required: true, message: "Vui lòng nhập email!" },
                                            { type: "email", message: "Email không hợp lệ!" },
                                        ]}
                                    >
                                        <Input
                                            prefix={<MailOutlined style={{ color: GREEN.primary, fontSize: 18 }} />}
                                            placeholder="admin@example.com"
                                            style={{
                                                height: 52,
                                                borderRadius: 12,
                                                border: "2px solid #f1f5f9",
                                                backgroundColor: "#fafbfc",
                                            }}
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        name="password"
                                        label={<Text strong style={{ color: "#374151" }}>Mật khẩu</Text>}
                                        rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
                                    >
                                        <Input.Password
                                            prefix={<LockOutlined style={{ color: GREEN.primary, fontSize: 18 }} />}
                                            placeholder="••••••••••"
                                            style={{
                                                height: 52,
                                                borderRadius: 12,
                                                border: "2px solid #f1f5f9",
                                                backgroundColor: "#fafbfc",
                                            }}
                                            iconRender={(visible) =>
                                                visible ? (
                                                    <EyeTwoTone twoToneColor={[GREEN.primary, GREEN.primaryLight]} />
                                                ) : (
                                                    <EyeInvisibleOutlined style={{ color: GREEN.primary }} />
                                                )
                                            }
                                        />
                                    </Form.Item>

                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        block
                                        size="large"
                                        style={{
                                            background: `linear-gradient(135deg, ${GREEN.primary} 0%, ${GREEN.primaryLight} 100%)`,
                                            border: "none",
                                            borderRadius: 12,
                                            height: 52,
                                            fontWeight: 600,
                                            boxShadow: `0 12px 28px ${GREEN.primary}25`,
                                        }}
                                    >
                                        Đăng nhập
                                    </Button>

                                    <Divider style={{ margin: "20px 0", borderColor: "#e2e8f0" }}>
                                        <Text type="secondary" style={{ color: "#94a3b8", fontSize: 13 }}>
                                            HOẶC
                                        </Text>
                                    </Divider>

                                    <div style={{ textAlign: "center" }}>
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: 15, color: "#64748b" }}
                                        >
                                            Chưa có tài khoản?
                                        </Text>{" "}
                                        <Link to="/register" className="link">
                                            Đăng ký ngay
                                        </Link>
                                    </div>
                                </Form>
                            </div>
                        </Card>
                    </Col>

                    {/* HERO bên phải giữ nguyên */}
                    <Col xs={24} lg={12} xl={13}>
                        <div style={{ position: "relative", height: 520 }}>
                            <div
                                style={{
                                    position: "absolute",
                                    top: -10,
                                    right: -10,
                                    width: "calc(100% + 20px)",
                                    height: "calc(100% + 20px)",
                                    borderRadius: 32,
                                    background: `linear-gradient(135deg, ${GREEN.primary}15, ${GREEN.primaryLight}15)`,
                                    transform: "rotate(2deg)",
                                    zIndex: 1,
                                }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    top: -20,
                                    right: -20,
                                    width: "calc(100% + 40px)",
                                    height: "calc(100% + 40px)",
                                    borderRadius: 32,
                                    background: `linear-gradient(135deg, ${GREEN.primary}08, ${GREEN.primaryLight}08)`,
                                    transform: "rotate(4deg)",
                                    zIndex: 0,
                                }}
                            />
                            <div
                                style={{
                                    position: "relative",
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: 24,
                                    overflow: "hidden",
                                    boxShadow: "0 32px 64px rgba(0,0,0,.15)",
                                    zIndex: 2,
                                }}
                            >
                                <div
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        backgroundImage:
                                            "url(/hero-login-2.jpg), url(/hero-2.jpg), url(/hero.jpg)",
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                        position: "relative",
                                    }}
                                >
                                    <div
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            background: `linear-gradient(25deg, ${GREEN.primaryDark}85 0%, ${GREEN.primary}65 30%, ${GREEN.primaryLight}35 70%, rgba(220,252,231,.2) 100%)`,
                                        }}
                                    />
                                    <div
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            padding: 24,
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <Tag
                                                style={{
                                                    background: "rgba(255,255,255,.95)",
                                                    border: "none",
                                                    borderRadius: 20,
                                                    padding: "8px 16px",
                                                    fontWeight: 600,
                                                    color: GREEN.primaryDark,
                                                    boxShadow: "0 8px 24px rgba(0,0,0,.1)",
                                                }}
                                            >
                                                <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                                                Bảo mật tuyệt đối
                                            </Tag>
                                            <Tag
                                                style={{
                                                    background: "rgba(255,255,255,.95)",
                                                    border: "none",
                                                    borderRadius: 20,
                                                    padding: "8px 16px",
                                                    fontWeight: 600,
                                                    color: "#f59e0b",
                                                    boxShadow: "0 8px 24px rgba(0,0,0,.1)",
                                                }}
                                            >
                                                <StarFilled
                                                    style={{ marginRight: 6, color: "#fbbf24" }}
                                                />
                                                4.9★ đánh giá
                                            </Tag>
                                        </div>
                                        <div>
                                            <Title
                                                level={3}
                                                style={{
                                                    color: "white",
                                                    marginBottom: 12,
                                                    textShadow: "0 2px 12px rgba(0,0,0,.3)",
                                                }}
                                            >
                                                Khám phá những homestay tuyệt vời
                                            </Title>
                                            <Space size="middle">
                                                <Tag
                                                    style={{
                                                        background: `linear-gradient(135deg, ${GREEN.primary}, ${GREEN.primaryLight})`,
                                                        border: "none",
                                                        borderRadius: 20,
                                                        padding: "8px 16px",
                                                        color: "white",
                                                        boxShadow: `0 8px 24px ${GREEN.primary}35`,
                                                    }}
                                                >
                                                    Ưu đãi tuần này
                                                </Tag>
                                                <Tag
                                                    style={{
                                                        background: "rgba(255,255,255,.2)",
                                                        border: "1px solid rgba(255,255,255,.3)",
                                                        borderRadius: 20,
                                                        padding: "8px 16px",
                                                        color: "white",
                                                        backdropFilter: "blur(10px)",
                                                    }}
                                                >
                                                    Miễn phí hủy phòng
                                                </Tag>
                                            </Space>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
        </div>
    );
}
