// src/pages/HomeCustomer.jsx — đẹp hơn, bỏ ô Địa điểm ở HERO (giữ ô trên header)
import { useMemo, useState, useEffect } from "react";
import {
    Layout, Row, Col, Card, Typography, Space, Button, Input, Select, Tabs, Tag,
    List, Avatar, Badge, Empty, message, DatePicker, InputNumber, Skeleton,
} from "antd";
import {
    HomeFilled, SearchOutlined, LogoutOutlined, EnvironmentOutlined, StarFilled,
    HeartOutlined, HeartFilled, DollarOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** Tone xanh lá */
const GREEN = { dark: "#065f46", main: "#10b981", light: "#34d399", border: "#e2e8f0", tint: "#ecfdf5" };
const CITIES = ["Hà Nội", "Đà Nẵng", "TP. Hồ Chí Minh", "Đà Lạt", "Nha Trang"];
const HOT_CITIES = [
    { name: "Đà Lạt", img: "https://images.unsplash.com/photo-1517824806704-9040b037703b" },
    { name: "Hà Nội", img: "https://images.unsplash.com/photo-1544989164-31dc3c645987" },
    { name: "Hội An", img: "https://images.unsplash.com/photo-1528181304800-259b08848526" },
    { name: "Nha Trang", img: "https://images.unsplash.com/photo-1505761671935-60b3a7427bad" },
    { name: "TP. HCM", img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80" },
];

const HEADER_H = 80;

export default function HomeCustomer() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Base asset: dùng cho ảnh cover trả về dạng /uploads/...
    const rawBase = import.meta.env.VITE_ASSET_BASE || import.meta.env.VITE_API_BASE || "http://localhost:3000";
    const assetBase = rawBase.replace(/\/api\/?$/, "");
    const toPublicUrl = (url) => (url?.startsWith("http") ? url : `${assetBase}${url || ""}`);

    // Dữ liệu homestay hiển thị
    const [recs, setRecs] = useState([]);
    const [loading, setLoading] = useState(false);

    // ===== Helper: chuẩn hoá dữ liệu trả về từ API (tránh rỗng) =====
    const normalizeList = (json) => {
        const candidate =
            (json && json.data && json.data.homestays) ??
            json?.homestays ??
            (Array.isArray(json?.data) ? json.data : null) ??
            json?.items ??
            (Array.isArray(json) ? json : []);
        return Array.isArray(candidate) ? candidate : [];
    };

    // Lần đầu: nạp danh sách public (không lọc ngày)
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`${assetBase}/api/homestays`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                const list = normalizeList(json);
                const mapped = list.map((h) => ({
                    id: h.H_ID ?? h.id,
                    name: h.H_Name ?? h.name,
                    address: h.H_Address ?? h.address ?? "",
                    city: h.H_City ?? h.city ?? "",
                    pricePerDay: Number(h.Price_per_day ?? h.pricePerDay ?? h.price_per_day ?? 0) || 0,
                    cover: h.Cover ? toPublicUrl(h.Cover) : (h.cover ? toPublicUrl(h.cover) : "/hero.jpg"),
                    status: h.Status || h.status || "available",
                    rating: 4.6,
                    maxGuests: h.Max_guests ?? h.max_guests ?? 2,
                }));
                setRecs(mapped);
            } catch (e) {
                console.error("[listPublic error]", e);
                message.error("Không tải được homestay");
            } finally {
                setLoading(false);
            }
        })();
    }, [assetBase]);

    // Tìm kiếm cơ bản (keyword/city) + tabs/favorites
    const [keyword, setKeyword] = useState("");
    const [city, setCity] = useState();
    const [tab, setTab] = useState("explore");
    const [favorites, setFavorites] = useState(new Set());

    const filteredRecs = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        return recs.filter((r) => {
            const matchCity = city ? r.city === city : true;
            const matchKw =
                !kw || r.name?.toLowerCase().includes(kw) || r.city?.toLowerCase().includes(kw) || r.address?.toLowerCase().includes(kw);
            return matchCity && matchKw;
        });
    }, [recs, city, keyword]);

    const favList = useMemo(() => filteredRecs.filter((r) => favorites.has(r.id)), [filteredRecs, favorites]);

    // Hero Search (theo ngày & số khách) — đã bỏ ô Địa điểm
    const [locationText] = useState(""); // giữ state để không ảnh hưởng logic cũ
    const [dateRange, setDateRange] = useState([]); // [dayjs, dayjs]
    const [guests, setGuests] = useState(2);

    const onHeroSearch = async () => {
        const [from, to] = dateRange || [];
        if (!from || !to) {
            message.warning("Chọn ngày nhận/trả phòng");
            return;
        }
        const start = from.format("YYYY-MM-DD");
        const end = to.format("YYYY-MM-DD");

        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append("start", start);
            params.append("end", end);
            params.append("guests", String(guests));
            const chosenCity =
                city ||
                CITIES.find((c) => c.toLowerCase() === locationText.trim().toLowerCase()) ||
                HOT_CITIES.find((c) => c.name.toLowerCase() === locationText.trim().toLowerCase())?.name ||
                "";
            if (chosenCity) params.append("city", chosenCity);

            const res = await fetch(`${assetBase}/api/homestays/search?${params.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const list = normalizeList(json);
            const mapped = list.map((h) => ({
                id: h.H_ID ?? h.id,
                name: h.H_Name ?? h.name,
                address: h.H_Address ?? h.address ?? "",
                city: h.H_City ?? h.city ?? "",
                pricePerDay: Number(h.Price_per_day ?? h.pricePerDay ?? h.price_per_day ?? 0) || 0,
                cover: h.Cover ? toPublicUrl(h.Cover) : (h.cover ? toPublicUrl(h.cover) : "/hero.jpg"),
                status: h.Status || h.status || "available",
                rating: 4.6,
                maxGuests: h.Max_guests ?? h.max_guests ?? 2,
            }));
            setRecs(mapped);
            if (chosenCity) setCity(chosenCity);
            message.success(`Tìm thấy ${mapped.length} homestay phù hợp`);
        } catch (e) {
            console.error("[searchAvailable error]", e);
            message.error("Không tìm được phòng trống");
        } finally {
            setLoading(false);
        }
    };

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
        <Layout
            style={{
                minHeight: "100vh",
                background:
                    "radial-gradient(65% 80% at -10% -10%, #ecfdf5 0%, #ffffff 55%) , radial-gradient(55% 70% at 110% -10%, #e6fff6 0%, #ffffff 55%)",
            }}
        >
            {/* HEADER */}
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
                    {/* Brand */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto" }}>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 14,
                                background: "rgba(255,255,255,.22)",
                                display: "grid",
                                placeItems: "center",
                                boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)",
                            }}
                        >
                            <HomeFilled style={{ color: "#fff", fontSize: 20 }} />
                        </div>
                        <div>
                            <div style={{ color: "white", fontSize: 20, fontWeight: 800, lineHeight: 1 }}>GreenStay</div>
                            <div style={{ color: "rgba(255,255,255,.9)", fontSize: 12 }}>Homestay cho kỳ nghỉ xanh</div>
                        </div>
                    </div>

                    {/* Search cluster nhanh (giữ logic cũ) */}
                    <div style={{ flex: "1 1 600px", minWidth: 420, display: "flex", alignItems: "center", gap: 10 }}>
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
                                boxShadow: "0 8px 20px rgba(0,0,0,.06)",
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
                                boxShadow: "0 8px 20px rgba(0,0,0,.06)",
                            }}
                            options={CITIES.map((c) => ({ value: c, label: c }))}
                        />
                    </div>

                    {/* Logout */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                        <Button
                            ghost
                            size="large"
                            onClick={logout}
                            style={{ color: "white", borderColor: "rgba(255,255,255,.6)", borderRadius: 999, height: 44 }}
                        >
                            Đăng xuất
                        </Button>
                    </div>
                </div>
            </Header>

            {/* TABS */}
            <div style={{ position: "sticky", top: HEADER_H, zIndex: 900, background: "#ffffff", borderBottom: `1px solid ${GREEN.border}` }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", paddingInline: 24 }}>
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

            <Content style={{ padding: 24 }}>
                <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                    {/* HERO SEARCH (đã bỏ ô Địa điểm) */}
                    <div
                        style={{
                            padding: 18,
                            borderRadius: 22,
                            background: "linear-gradient(135deg, rgba(255,255,255,.65), rgba(255,255,255,.85))",
                            backdropFilter: "blur(6px)",
                            border: "1px solid rgba(16,185,129,.15)",
                            boxShadow: "0 14px 28px rgba(16,185,129,.10)",
                            marginBottom: 18,
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                inset: -1,
                                borderRadius: 22,
                                padding: 1,
                                background:
                                    "linear-gradient(130deg, rgba(16,185,129,.25), rgba(52,211,153,.12), rgba(255,255,255,0))",
                                WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                                WebkitMaskComposite: "xor",
                                maskComposite: "exclude",
                                pointerEvents: "none",
                            }}
                        />
                        <Row gutter={[12, 12]} align="middle">
                            {/* Ngày nhận / trả phòng */}
                            <Col xs={24} md={16}>
                                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Ngày nhận / trả phòng</div>
                                <DatePicker.RangePicker
                                    size="large"
                                    value={dateRange}
                                    onChange={setDateRange}
                                    style={{ width: "100%", height: 44, borderRadius: 12 }}
                                    allowClear
                                />
                            </Col>
                            {/* Khách */}
                            <Col xs={12} md={4}>
                                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Khách</div>
                                <InputNumber size="large" min={1} max={20} value={guests} onChange={setGuests} style={{ width: "100%", height: 44 }} />
                            </Col>
                            {/* Nút tìm */}
                            <Col xs={12} md={4} style={{ display: "flex", alignItems: "end" }}>
                                <Button
                                    size="large"
                                    type="primary"
                                    onClick={onHeroSearch}
                                    style={{
                                        height: 44,
                                        borderRadius: 12,
                                        width: "100%",
                                        background: `linear-gradient(135deg, ${GREEN.main}, ${GREEN.light})`,
                                        border: "none",
                                        fontWeight: 800,
                                        letterSpacing: .2,
                                    }}
                                    loading={loading}
                                >
                                    Tìm kiếm
                                </Button>
                            </Col>
                        </Row>
                    </div>

                    {/* Hot chips */}
                    <div
                        style={{
                            marginBottom: 20,
                            padding: "12px 14px",
                            background: "white",
                            borderRadius: 16,
                            boxShadow: "0 10px 22px rgba(0,0,0,.05)",
                            border: "1px solid #f0f0f0",
                        }}
                    >
                        <Row gutter={[10, 10]} wrap>
                            {HOT_CITIES.map((c) => (
                                <Col key={c.name}>
                                    <Button
                                        onClick={() => {
                                            setCity(c.name);
                                            setKeyword("");
                                        }}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            padding: "6px 12px",
                                            height: 44,
                                            borderRadius: 999,
                                            background: "#ffffff",
                                            border: "1px solid #e2e8f0",
                                            boxShadow: "0 6px 16px rgba(16,185,129,.10)",
                                            transition: "all .2s",
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 10px 22px rgba(16,185,129,.18)")}
                                        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 6px 16px rgba(16,185,129,.10)")}
                                    >
                                        <Avatar src={c.img} size={28} />
                                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{c.name}</span>
                                        <Tag color="green" style={{ marginLeft: 6, borderRadius: 999, lineHeight: "22px" }}>
                                            Hot
                                        </Tag>
                                    </Button>
                                </Col>
                            ))}
                        </Row>
                    </div>

                    {/* EXPLORE / FAVORITES */}
                    {tab === "explore" && (
                        <>
                            <Space align="center" style={{ marginBottom: 12 }}>
                                <Title level={4} style={{ margin: 0 }}>
                                    Khám phá homestay
                                </Title>
                                {loading ? (
                                    <Badge color="green" text="Đang tải..." />
                                ) : (
                                    <Badge color="green" text={`${filteredRecs.length} kết quả`} />
                                )}
                            </Space>

                            {loading ? (
                                <Row gutter={[16, 16]}>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <Col xs={24} sm={12} md={8} key={i}>
                                            <Card style={{ borderRadius: 14 }}>
                                                <Skeleton active paragraph={{ rows: 4 }} />
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            ) : filteredRecs.length === 0 ? (
                                <Empty description="Không có homestay phù hợp" />
                            ) : (
                                <Row gutter={[16, 16]}>
                                    {filteredRecs.map((item) => (
                                        <Col xs={24} sm={12} md={8} key={item.id}>
                                            <Card
                                                hoverable
                                                style={{
                                                    borderRadius: 14,
                                                    overflow: "hidden",
                                                    transition: "transform .18s ease, box-shadow .18s ease",
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                                                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                                                cover={
                                                    <div
                                                        onClick={() => viewHomestay(item.id)}
                                                        style={{
                                                            height: 200,
                                                            position: "relative",
                                                            cursor: "pointer",
                                                            background: `url('${toPublicUrl(item.cover)}') center/cover no-repeat`,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                position: "absolute",
                                                                left: 12,
                                                                top: 12,
                                                                padding: "6px 10px",
                                                                borderRadius: 999,
                                                                background: "rgba(0,0,0,.55)",
                                                                color: "white",
                                                                fontWeight: 700,
                                                                backdropFilter: "blur(4px)",
                                                            }}
                                                        >
                                                            <DollarOutlined /> {item.pricePerDay.toLocaleString("vi-VN")} ₫/đêm
                                                        </div>
                                                        <div
                                                            style={{
                                                                position: "absolute",
                                                                left: 0,
                                                                right: 0,
                                                                bottom: 0,
                                                                height: 84,
                                                                background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.50) 90%)",
                                                            }}
                                                        />
                                                    </div>
                                                }
                                                actions={[
                                                    <Space key="price">
                                                        <DollarOutlined />
                                                        {item.pricePerDay.toLocaleString("vi-VN")} ₫/đêm
                                                    </Space>,
                                                    favorites.has(item.id) ? (
                                                        <span key="heart" onClick={() => toggleFavorite(item.id)} style={{ color: "#ef4444" }}>
                                                            <HeartFilled /> Đã thích
                                                        </span>
                                                    ) : (
                                                        <span key="heart" onClick={() => toggleFavorite(item.id)}>
                                                            <HeartOutlined /> Yêu thích
                                                        </span>
                                                    ),
                                                    <span key="book" onClick={() => bookHomestay(item)} style={{ fontWeight: 600 }}>
                                                        Đặt ngay
                                                    </span>,
                                                ]}
                                            >
                                                <Space direction="vertical" style={{ width: "100%" }}>
                                                    <Space align="center">
                                                        <Badge color="green" />
                                                        <Text strong style={{ fontSize: 16 }}>
                                                            {item.name}
                                                        </Text>
                                                        <Space style={{ marginLeft: "auto" }}>
                                                            <StarFilled style={{ color: "#f59e0b" }} />
                                                            <Text>{item.rating}</Text>
                                                        </Space>
                                                    </Space>
                                                    <Space size={6}>
                                                        <EnvironmentOutlined />
                                                        <Text type="secondary">
                                                            {item.address}, {item.city}
                                                        </Text>
                                                    </Space>
                                                </Space>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            )}
                        </>
                    )}

                    {tab === "favorites" && (
                        <>
                            <Title level={4} style={{ marginBottom: 12 }}>
                                Yêu thích của bạn
                            </Title>
                            {favList.length === 0 ? (
                                <Empty description="Chưa có mục yêu thích" />
                            ) : (
                                <List
                                    itemLayout="horizontal"
                                    dataSource={favList}
                                    renderItem={(item) => (
                                        <List.Item
                                            actions={[
                                                <Button type="link" onClick={() => viewHomestay(item.id)} key="xem">
                                                    Xem
                                                </Button>,
                                                <Button type="link" onClick={() => bookHomestay(item)} key="dat">
                                                    Đặt
                                                </Button>,
                                                <Button type="link" danger onClick={() => toggleFavorite(item.id)} key="bo">
                                                    Bỏ thích
                                                </Button>,
                                            ]}
                                        >
                                            <List.Item.Meta
                                                avatar={<Avatar shape="square" size={64} src={toPublicUrl(item.cover)} />}
                                                title={item.name}
                                                description={
                                                    <span>
                                                        <EnvironmentOutlined /> {item.address}, {item.city}
                                                    </span>
                                                }
                                            />
                                            <div style={{ fontWeight: 700 }}>{item.pricePerDay.toLocaleString("vi-VN")} ₫/đêm</div>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </>
                    )}

                    {tab === "bookings" && <Empty description="Chức năng đặt phòng sẽ được bổ sung sau" />}
                </div>
            </Content>
        </Layout>
    );
}
