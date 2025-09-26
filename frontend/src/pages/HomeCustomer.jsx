// src/pages/HomeCustomer.jsx — phiên bản đã sửa để HIỂN THỊ dữ liệu thật từ API
import { useMemo, useState, useEffect } from "react";
import {
    Layout,
    Row,
    Col,
    Card,
    Typography,
    Space,
    Button,
    Input,
    Select,
    Tabs,
    Tag,
    List,
    Avatar,
    Badge,
    Table,
    Dropdown,
    Empty,
    message,
} from "antd";
import {
    HomeFilled,
    SearchOutlined,
    DownOutlined,
    UserOutlined,
    LogoutOutlined,
    EnvironmentOutlined,
    StarFilled,
    HeartOutlined,
    HeartFilled,
    CalendarOutlined,
    DollarOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homestaysApi } from "../services/homestays"; // ✅ dùng API thật

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// Màu xanh lá
const GREEN = {
    dark: "#065f46",
    main: "#10b981",
    light: "#34d399",
    border: "#e2e8f0",
    tint: "#ecfdf5",
};

const CITIES = [
    "Hà Nội",
    "Đà Nẵng",
    "TP. Hồ Chí Minh",
    "Đà Lạt",
    "Nha Trang",
];

// Chiều cao header để Tabs không đè lên
const HEADER_H = 80;

export default function HomeCustomer() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // ====== BASE cho ảnh (khớp HomeOwner) ======
    const rawBase =
        import.meta.env.VITE_ASSET_BASE ||
        import.meta.env.VITE_API_BASE ||
        "http://localhost:3000";
    const assetBase = rawBase.replace(/\/api\/?$/, "");
    const renderSrc = (url) => (url?.startsWith("http") ? url : `${assetBase}${url || ""}`);

    // ====== DỮ LIỆU THẬT từ API (bỏ mock) ======
    const [recs, setRecs] = useState([]); // danh sách homestay
    const [loading, setLoading] = useState(false);

    // Thay toàn bộ useEffect hiện tại bằng đoạn này
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);

                // Gọi thẳng endpoint tuyệt đối để loại trừ lỗi baseURL/double "/api"
                const res = await fetch("http://localhost:3000/api/homestays"); // <- chỉnh port nếu BE khác
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json(); // { status, data: { homestays: [...] } }

                console.log("[homestays raw]", json); // <- kiểm tra trên console
                const list = json?.data?.homestays ?? [];
                const mapped = list.map((h) => ({
                    id: h.H_ID,
                    name: h.H_Name,
                    address: h.H_Address,
                    city: h.H_City,
                    pricePerDay: Number(h.Price_per_day) || 0,
                    cover: h.Cover ? (h.Cover.startsWith("http") ? h.Cover : `http://localhost:3000${h.Cover}`) : "/hero.jpg",
                    status: h.Status || "available",
                    rating: 4.6,
                }));
                setRecs(mapped);
            } catch (e) {
                console.error("[listPublic error]", e);
                message.error("Không tải được homestay");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Tìm kiếm / Lọc / Tabs / Yêu thích
    const [keyword, setKeyword] = useState("");
    const [city, setCity] = useState();
    const [tab, setTab] = useState("explore");
    const [favorites, setFavorites] = useState(new Set()); // id đã thích

    const filteredRecs = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        return recs.filter((r) => {
            const matchCity = city ? r.city === city : true;
            const matchKw =
                !kw ||
                r.name.toLowerCase().includes(kw) ||
                r.city.toLowerCase().includes(kw) ||
                r.address.toLowerCase().includes(kw);
            return matchCity && matchKw;
        });
    }, [recs, city, keyword]);

    const favList = useMemo(
        () => filteredRecs.filter((r) => favorites.has(r.id)),
        [filteredRecs, favorites]
    );

    // ---- Handlers ----
    const viewHomestay = (id) => navigate(`/homestays/${id}`);
    const bookHomestay = (item) => {
        message.success(`Mở đặt phòng: ${item.name}`);
        navigate(`/homestays/${item.id}?action=book`);
    };
    const toggleFavorite = (id) =>
        setFavorites((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    return (
        <Layout style={{ minHeight: "100vh", background: "#f6faf7" }}>
            {/* ================= HEADER (sticky) ================= */}
            <Header
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1000,
                    height: HEADER_H,
                    lineHeight: 1,
                    padding: "12px 24px",
                    background: `linear-gradient(100deg, ${GREEN.dark} 0%, ${GREEN.main} 45%, ${GREEN.light} 100%)`,
                    boxShadow: "0 10px 24px rgba(0,0,0,.10)",
                }}
            >
                <div
                    style={{
                        maxWidth: 1200,
                        margin: "0 auto",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "nowrap",
                    }}
                >
                    {/* Logo + brand */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto" }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                background: "rgba(255,255,255,.2)",
                                display: "grid",
                                placeItems: "center",
                            }}
                        >
                            <HomeFilled style={{ color: "#fff", fontSize: 20 }} />
                        </div>
                        <div>
                            <div style={{ color: "white", fontSize: 20, fontWeight: 800, lineHeight: 1 }}>GreenStay</div>
                            <div style={{ color: "rgba(255,255,255,.9)", fontSize: 12 }}>Homestay cho kỳ nghỉ xanh</div>
                        </div>
                    </div>

                    {/* Search cluster */}
                    <div
                        style={{
                            flex: "1 1 600px",
                            minWidth: 420,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <Input
                            size="large"
                            allowClear
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Tìm tên, thành phố, địa chỉ…"
                            prefix={<SearchOutlined style={{ color: GREEN.main }} />}
                            style={{
                                flex: 1,
                                height: 44,
                                borderRadius: 999,
                                background: "white",
                                border: "none",
                                boxShadow: "0 6px 18px rgba(0,0,0,.06)",
                                paddingInline: 16,
                                minWidth: 280,
                            }}
                        />
                        <Select
                            size="large"
                            allowClear
                            value={city}
                            onChange={setCity}
                            placeholder="Thành phố"
                            style={{
                                width: 200,
                                height: 44,
                                borderRadius: 999,
                                background: "white",
                                boxShadow: "0 6px 18px rgba(0,0,0,.06)",
                            }}
                            options={CITIES.map((c) => ({ value: c, label: c }))}
                        />
                    </div>

                    {/* User & logout */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                        <Dropdown
                            trigger={["click"]}
                            menu={{
                                items: [
                                    { key: "profile", label: "Hồ sơ của tôi", onClick: () => navigate("/profile") },
                                    { key: "my-bookings", label: "Đặt phòng của tôi", onClick: () => setTab("bookings") },
                                    { type: "divider" },
                                    { key: "logout", danger: true, label: "Đăng xuất", onClick: logout },
                                ],
                            }}
                        >
                            <Button type="text" style={{ color: "white", height: 44 }}>
                                <Space>
                                    <Avatar
                                        size={32}
                                        style={{ backgroundColor: "rgba(255,255,255,.25)", color: "#fff" }}
                                        icon={<UserOutlined />}
                                    />
                                    <div style={{ textAlign: "left" }}>
                                        <div style={{ fontWeight: 600, lineHeight: 1 }}>
                                            {user?.fullname || user?.email || "Tài khoản"}
                                        </div>
                                        <div style={{ fontSize: 12, opacity: 0.9 }}>Khách hàng</div>
                                    </div>
                                    <DownOutlined />
                                </Space>
                            </Button>
                        </Dropdown>

                        <Button
                            ghost
                            size="large"
                            icon={<LogoutOutlined />}
                            onClick={logout}
                            style={{
                                color: "white",
                                borderColor: "rgba(255,255,255,.6)",
                                borderRadius: 999,
                                height: 44,
                            }}
                        >
                            Đăng xuất
                        </Button>
                    </div>
                </div>
            </Header>

            {/* ================= TABS BAR (sticky dưới header) ================= */}
            <div
                style={{
                    position: "sticky",
                    top: HEADER_H, // QUAN TRỌNG: nằm ngay dưới header
                    zIndex: 900,
                    background: "transparent",
                }}
            >
                <div style={{ maxWidth: 1200, margin: "10px auto 0", padding: "0 24px" }}>
                    <div
                        style={{
                            background: "white",
                            borderRadius: 16,
                            boxShadow: "0 10px 24px rgba(0,0,0,.08)",
                            border: `1px solid ${GREEN.border}`,
                            padding: "6px 10px",
                        }}
                    >
                        <Tabs
                            activeKey={tab}
                            onChange={setTab}
                            items={[
                                { key: "explore", label: "Khám phá" },
                                { key: "favorites", label: "Yêu thích" },
                                { key: "bookings", label: "Đặt phòng" },
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* ================= CONTENT ================= */}
            <Content style={{ padding: "16px 24px 32px" }}>
                <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                    {/* Khám phá */}
                    {tab === "explore" && (
                        <Card
                            style={{ marginTop: 12, borderRadius: 16, border: `1px solid ${GREEN.border}` }}
                            title={
                                <Space>
                                    <EnvironmentOutlined style={{ color: GREEN.main }} />
                                    <Text strong>Gợi ý dành cho bạn</Text>
                                </Space>
                            }
                            extra={<Tag color="green" style={{ borderRadius: 16 }}>{filteredRecs.length} chỗ ở</Tag>}
                        >
                            {loading ? (
                                <Row gutter={[16, 16]}>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <Col key={i} xs={24} sm={12} md={8}>
                                            <Card loading style={{ borderRadius: 16 }} />
                                        </Col>
                                    ))}
                                </Row>
                            ) : filteredRecs.length === 0 ? (
                                <Empty description="Không tìm thấy homestay phù hợp" />
                            ) : (
                                <List
                                    grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
                                    dataSource={filteredRecs}
                                    renderItem={(item) => {
                                        const liked = favorites.has(item.id);
                                        return (
                                            <List.Item>
                                                <Card
                                                    hoverable
                                                    bodyStyle={{ padding: 16 }}
                                                    style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${GREEN.border}` }}
                                                    cover={
                                                        <div
                                                            style={{
                                                                height: 160,
                                                                backgroundImage: `url(${item.cover})`,
                                                                backgroundSize: "cover",
                                                                backgroundPosition: "center",
                                                            }}
                                                        />
                                                    }
                                                    actions={[
                                                        <Button type="link" onClick={() => viewHomestay(item.id)}>
                                                            Xem chi tiết
                                                        </Button>,
                                                        <Button type="primary" onClick={() => bookHomestay(item)}>
                                                            Đặt ngay
                                                        </Button>,
                                                        <Button
                                                            type="text"
                                                            onClick={() => toggleFavorite(item.id)}
                                                            icon={liked ? <HeartFilled style={{ color: "#f5222d" }} /> : <HeartOutlined />}
                                                        />,
                                                    ]}
                                                >
                                                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                                                        <Space align="start" style={{ justifyContent: "space-between", width: "100%" }}>
                                                            <Title level={5} style={{ margin: 0 }}>
                                                                {item.name}
                                                            </Title>
                                                            <Tag color="success" style={{ borderRadius: 12 }}>
                                                                {item.status}
                                                            </Tag>
                                                        </Space>
                                                        <Space size="small" wrap>
                                                            <EnvironmentOutlined />
                                                            <Text type="secondary">{item.city}</Text>
                                                            <Text type="secondary">•</Text>
                                                            <Text type="secondary">{item.address}</Text>
                                                        </Space>
                                                        <Space align="center">
                                                            <Avatar size={22} style={{ backgroundColor: GREEN.main, color: "white" }} icon={<StarFilled />} />
                                                            <Text strong>{item.rating}</Text>
                                                            <Text type="secondary">/ 5</Text>
                                                        </Space>
                                                        <Space>
                                                            <DollarOutlined style={{ color: GREEN.main }} />
                                                            <Text strong style={{ fontSize: 16 }}>
                                                                {item.pricePerDay.toLocaleString("vi-VN")} ₫ / đêm
                                                            </Text>
                                                        </Space>
                                                    </Space>
                                                </Card>
                                            </List.Item>
                                        );
                                    }}
                                />
                            )}
                        </Card>
                    )}

                    {/* Yêu thích */}
                    {tab === "favorites" && (
                        <Card
                            style={{ marginTop: 12, borderRadius: 16, border: `1px solid ${GREEN.border}` }}
                            title={
                                <Space>
                                    <HeartFilled style={{ color: "#f5222d" }} />
                                    <Text strong>Danh sách yêu thích</Text>
                                </Space>
                            }
                        >
                            {favList.length === 0 ? (
                                <Empty description="Chưa có homestay yêu thích" />
                            ) : (
                                <List
                                    grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
                                    dataSource={favList}
                                    renderItem={(item) => (
                                        <List.Item>
                                            <Card
                                                hoverable
                                                bodyStyle={{ padding: 16 }}
                                                style={{ borderRadius: 16, border: `1px solid ${GREEN.border}` }}
                                                cover={
                                                    <div
                                                        style={{
                                                            height: 160,
                                                            backgroundImage: `url(${item.cover})`,
                                                            backgroundSize: "cover",
                                                            backgroundPosition: "center",
                                                        }}
                                                    />
                                                }
                                                actions={[
                                                    <Button type="link" onClick={() => viewHomestay(item.id)}>
                                                        Xem chi tiết
                                                    </Button>,
                                                    <Button type="primary" onClick={() => bookHomestay(item)}>
                                                        Đặt ngay
                                                    </Button>,
                                                    <Button type="text" onClick={() => toggleFavorite(item.id)} icon={<HeartFilled style={{ color: "#f5222d" }} />} />,
                                                ]}
                                            >
                                                <Title level={5} style={{ margin: 0 }}>
                                                    {item.name}
                                                </Title>
                                                <Text type="secondary">{item.city}</Text>
                                            </Card>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Card>
                    )}

                    {/* Đặt phòng */}
                    {tab === "bookings" && (
                        <Card
                            style={{ marginTop: 12, borderRadius: 16, border: `1px solid ${GREEN.border}` }}
                            title={
                                <Space>
                                    <CalendarOutlined style={{ color: GREEN.main }} />
                                    <Text strong>Đặt phòng của tôi</Text>
                                </Space>
                            }
                        >
                            <Table
                                rowKey="id"
                                dataSource={bookings}
                                pagination={{ pageSize: 8 }}
                                columns={[
                                    { title: "Mã", dataIndex: "code", width: 110 },
                                    { title: "Homestay", dataIndex: "homestay" },
                                    { title: "Ngày ở", dataIndex: "date" },
                                    {
                                        title: "Tổng tiền",
                                        dataIndex: "total",
                                        align: "right",
                                        render: (v) => v.toLocaleString("vi-VN") + " ₫",
                                        width: 150,
                                    },
                                    {
                                        title: "Trạng thái",
                                        dataIndex: "status",
                                        width: 140,
                                        render: (s) => (
                                            <Badge
                                                status={s === "paid" ? "success" : s === "pending" ? "warning" : "default"}
                                                text={s}
                                            />
                                        ),
                                    },
                                    {
                                        title: "Thao tác",
                                        width: 140,
                                        render: (_, r) => (
                                            <Space>
                                                <Button size="small" onClick={() => navigate(`/bookings/${r.id}`)}>
                                                    Chi tiết
                                                </Button>
                                            </Space>
                                        ),
                                    },
                                ]}
                            />
                        </Card>
                    )}
                </div>
            </Content>
        </Layout>
    );
}
