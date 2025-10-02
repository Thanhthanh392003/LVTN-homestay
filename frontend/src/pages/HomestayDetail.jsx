import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Layout, Row, Col, Card, Typography, Space, Tag, Button, message,
    Image, Skeleton, Descriptions, Divider, InputNumber, DatePicker, Affix, Tooltip, Badge
} from "antd";
import {
    ArrowLeftOutlined, EnvironmentOutlined, CalendarOutlined, DollarOutlined,
    ShareAltOutlined, HeartOutlined, HeartFilled
} from "@ant-design/icons";
import dayjs from "dayjs";
import { homestaysApi } from "../services/homestays";
import { amenityApi } from "../services/amenities";
import { ruleApi } from "../services/rules";

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

export default function HomestayDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    // base ảnh giống HomeCustomer (GIỮ NGUYÊN)
    const rawBase =
        import.meta.env.VITE_ASSET_BASE ||
        import.meta.env.VITE_API_BASE ||
        "http://localhost:3000";
    const assetBase = rawBase.replace(/\/api\/?$/, "");
    const toSrc = (u) => (u?.startsWith("http") ? u : `${assetBase}${u || ""}`);

    const [loading, setLoading] = useState(true);
    const [h, setH] = useState(null);
    const [images, setImages] = useState([]);
    const [fav, setFav] = useState(false);

    // Amenities & Rules (động)
    const [amenities, setAmenities] = useState([]);
    const [rules, setRules] = useState([]);

    // Booking state (GIỮ NGUYÊN)
    const [guests, setGuests] = useState(2);
    const [dateRange, setDateRange] = useState([null, null]);

    const nights = useMemo(() => {
        const [from, to] = dateRange || [];
        if (!from || !to) return 0;
        const d = to.startOf("day").diff(from.startOf("day"), "day");
        return Math.max(0, d);
    }, [dateRange]);

    const total = useMemo(() => {
        const price = Number(h?.Price_per_day) || 0;
        return nights * price;
    }, [nights, h]);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const [detail, imgs] = await Promise.all([
                    homestaysApi.getById(id),
                    homestaysApi.getImagesPublic(id)
                ]);
                setH(detail);
                // dựng gallery: cover + ảnh khác (loại trùng)
                const list = [];
                if (detail?.Cover) list.push({ url: detail.Cover, main: true });
                imgs.forEach((it) => {
                    if (!detail?.Cover || it.Image_url !== detail.Cover) {
                        list.push({ url: it.Image_url, main: !!it.IsMain });
                    }
                });
                setImages(list);

                // lấy tiện nghi/nội quy
                const [am, rl] = await Promise.all([
                    amenityApi.getForHomestay(id).catch(() => []),
                    ruleApi.getForHomestay(id).catch(() => []),
                ]);
                setAmenities(am || []);
                setRules(rl || []);
            } catch (e) {
                console.error(e);
                message.error("Không tải được chi tiết homestay");
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const share = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            message.success("Đã sao chép liên kết!");
        } catch {
            message.warning("Không sao chép được, hãy copy URL trên trình duyệt.");
        }
    };

    const toggleFav = () => setFav((v) => !v);

    const onBook = () => {
        if (!nights) return message.warning("Chọn ngày nhận/trả phòng trước nhé!");
        // TODO: gọi API tạo booking
        message.success(`Đã tạo yêu cầu đặt ${nights} đêm, tổng ${total.toLocaleString("vi-VN")}₫ (mock).`);
    };

    // ======= CHỈ STYLE/UI =======
    const pageBg = {
        minHeight: "100vh",
        background:
            "radial-gradient(900px 200px at 10% -5%, rgba(16,185,129,.10), transparent 60%), radial-gradient(900px 220px at 85% -8%, rgba(59,130,246,.12), transparent 60%), #f6faf7",
    };
    const container = { maxWidth: 1200, margin: "0 auto" };
    const radius = 18;

    return (
        <Layout style={pageBg}>
            {/* Header mảnh + nút quay lại */}
            <Header
                style={{
                    background: "rgba(255,255,255,.85)",
                    backdropFilter: "blur(6px)",
                    borderBottom: "1px solid #e5e7eb"
                }}
            >
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                        Quay lại
                    </Button>
                    <Title level={4} style={{ margin: 0 }}>Chi tiết homestay</Title>
                </Space>
            </Header>

            <Content style={{ padding: 16 }}>
                <div style={container}>
                    {loading || !h ? (
                        <Card style={{ borderRadius: radius }}><Skeleton active avatar paragraph={{ rows: 8 }} /></Card>
                    ) : (
                        <>
                            {/* HERO: Tên + địa chỉ + action + badge trạng thái */}
                            <Card
                                style={{
                                    borderRadius: radius,
                                    marginBottom: 12,
                                    background: "linear-gradient(135deg,#ffffff,#f8fffb)",
                                    boxShadow: "0 18px 38px rgba(15,23,42,.08)"
                                }}
                                bodyStyle={{ padding: 16 }}
                            >
                                <Row justify="space-between" align="middle" gutter={[16, 12]}>
                                    <Col flex="auto">
                                        <Space direction="vertical" size={2}>
                                            <Space align="center" wrap>
                                                <Title level={3} style={{ margin: 0 }}>{h.H_Name}</Title>
                                                <Badge
                                                    color={(h.Status || "available").toLowerCase() === "active" ? "green" : "gold"}
                                                    text={<Text type="secondary" style={{ fontWeight: 500 }}>{h.Status || "available"}</Text>}
                                                />
                                            </Space>
                                            <Text type="secondary">
                                                <EnvironmentOutlined /> {h.H_City} • {h.H_Address}
                                            </Text>
                                        </Space>
                                    </Col>
                                    <Col>
                                        <Space>
                                            <Tooltip title="Chia sẻ liên kết">
                                                <Button onClick={share} icon={<ShareAltOutlined />} />
                                            </Tooltip>
                                            <Button
                                                type={fav ? "primary" : "default"}
                                                onClick={toggleFav}
                                                icon={fav ? <HeartFilled /> : <HeartOutlined />}
                                            >
                                                {fav ? "Đã thích" : "Yêu thích"}
                                            </Button>
                                        </Space>
                                    </Col>
                                </Row>
                            </Card>

                            {/* GALLERY */}
                            <Card
                                style={{ borderRadius: radius, overflow: "hidden", marginBottom: 16, boxShadow: "0 14px 34px rgba(15,23,42,.08)" }}
                                bodyStyle={{ padding: 12 }}
                            >
                                <Image.PreviewGroup>
                                    <Row gutter={[8, 8]}>
                                        <Col xs={24} md={14}>
                                            <Image
                                                src={toSrc(images[0]?.url || h.Cover)}
                                                alt="main"
                                                style={{ height: 420, objectFit: "cover", width: "100%", borderRadius: 14 }}
                                            />
                                        </Col>
                                        <Col xs={24} md={10}>
                                            <Row gutter={[8, 8]}>
                                                {images.slice(1, 5).map((img, idx) => (
                                                    <Col span={12} key={idx}>
                                                        <Image
                                                            src={toSrc(img.url)}
                                                            alt={"img" + idx}
                                                            style={{ height: idx < 2 ? 204 : 196, objectFit: "cover", width: "100%", borderRadius: 12 }}
                                                        />
                                                    </Col>
                                                ))}
                                            </Row>
                                        </Col>
                                    </Row>
                                </Image.PreviewGroup>
                            </Card>

                            <Row gutter={[16, 16]}>
                                {/* Thông tin chi tiết */}
                                <Col xs={24} lg={16}>
                                    <Card style={{ borderRadius: radius, boxShadow: "0 12px 30px rgba(15,23,42,.06)" }} bodyStyle={{ padding: 18 }}>
                                        <Space direction="vertical" size={14} style={{ width: "100%" }}>
                                            {/* Chips thông tin nhanh */}
                                            <Space wrap>
                                                <Tag color="blue" style={{ borderRadius: 999 }}>
                                                    <DollarOutlined />{" "}
                                                    {(Number(h.Price_per_day) || 0).toLocaleString("vi-VN")} ₫ / đêm
                                                </Tag>
                                                {h.Max_guests ? <Tag color="purple" style={{ borderRadius: 999 }}>👥 Tối đa {h.Max_guests} khách</Tag> : null}
                                                {h.H_City ? <Tag color="geekblue" style={{ borderRadius: 999 }}>🏙️ {h.H_City}</Tag> : null}
                                            </Space>

                                            <Descriptions title="Thông tin" bordered size="middle" column={1} items={[
                                                { key: "addr", label: "Địa chỉ", children: `${h.H_Address}, ${h.H_City}` },
                                                { key: "price", label: "Giá/đêm", children: <Text strong>{(Number(h.Price_per_day) || 0).toLocaleString("vi-VN")} ₫</Text> },
                                            ]} />

                                            <Divider style={{ margin: "10px 0" }} />

                                            <Title level={5} style={{ margin: 0 }}>Mô tả</Title>
                                            <Paragraph style={{ marginBottom: 0 }}>
                                                {h.H_Description || "Chủ nhà chưa cập nhật mô tả chi tiết."}
                                            </Paragraph>

                                            <Divider style={{ margin: "14px 0" }} />

                                            <Title level={5} style={{ margin: 0 }}>Tiện nghi</Title>
                                            {amenities?.length ? (
                                                <Space wrap>{amenities.map((a) => <Tag key={a.Code}>{a.Name}</Tag>)}</Space>
                                            ) : <Text type="secondary">Chủ nhà chưa cập nhật.</Text>}

                                            <Divider style={{ margin: "14px 0" }} />

                                            <Title level={5} style={{ margin: 0 }}>Nội quy</Title>
                                            {rules?.length ? (
                                                <ul style={{ marginBottom: 0 }}>
                                                    {rules.map((r) => <li key={r.RuleItem_ID || r.name}>{r.name}</li>)}
                                                </ul>
                                            ) : <Text type="secondary">Chủ nhà chưa cập nhật.</Text>}
                                        </Space>
                                    </Card>
                                </Col>

                                {/* Khung đặt phòng cố định bên phải */}
                                <Col xs={24} lg={8}>
                                    <Affix offsetTop={80}>
                                        <Card
                                            style={{ borderRadius: radius, boxShadow: "0 14px 34px rgba(15,23,42,.10)", background: "linear-gradient(180deg,#ffffff, #f7fffb)" }}
                                            bodyStyle={{ padding: 18 }}
                                        >
                                            <Space direction="vertical" size={12} style={{ width: "100%" }}>
                                                <Space align="center" wrap>
                                                    <DollarOutlined />
                                                    <Text strong style={{ fontSize: 20 }}>
                                                        {(Number(h.Price_per_day) || 0).toLocaleString("vi-VN")} ₫
                                                    </Text>
                                                    <Text type="secondary">/ đêm</Text>
                                                </Space>

                                                <Space direction="vertical" style={{ width: "100%" }}>
                                                    <Text type="secondary"><CalendarOutlined /> Chọn ngày</Text>
                                                    <RangePicker
                                                        style={{ width: "100%" }}
                                                        format="DD/MM/YYYY"
                                                        value={dateRange}
                                                        onChange={(v) => setDateRange(v)}
                                                        disabledDate={(d) => d && d < dayjs().startOf("day")}
                                                    />
                                                </Space>

                                                <Space align="center" style={{ justifyContent: "space-between" }}>
                                                    <Text type="secondary">Số khách:</Text>
                                                    <InputNumber min={1} max={10} value={guests} onChange={setGuests} />
                                                </Space>

                                                <Divider style={{ margin: "8px 0" }} />

                                                <Space style={{ justifyContent: "space-between", width: "100%" }}>
                                                    <Text>Thời gian lưu trú</Text>
                                                    <Text strong>{nights} đêm</Text>
                                                </Space>
                                                <Space style={{ justifyContent: "space-between", width: "100%" }}>
                                                    <Text>Tạm tính</Text>
                                                    <Text strong>{total.toLocaleString("vi-VN")} ₫</Text>
                                                </Space>

                                                <Button type="primary" block onClick={onBook} disabled={!nights}>
                                                    Đặt homestay
                                                </Button>
                                            </Space>
                                        </Card>
                                    </Affix>
                                </Col>
                            </Row>
                        </>
                    )}
                </div>
            </Content>
        </Layout>
    );
}
