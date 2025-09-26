import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Layout, Row, Col, Card, Typography, Space, Tag, Button, message,
    Image, Skeleton, Descriptions, Divider, InputNumber, DatePicker, Affix
} from "antd";
import { ArrowLeftOutlined, EnvironmentOutlined, CalendarOutlined, DollarOutlined, ShareAltOutlined, HeartOutlined, HeartFilled } from "@ant-design/icons";
import dayjs from "dayjs";
import { homestaysApi } from "../services/homestays";

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

export default function HomestayDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    // base ảnh giống HomeCustomer
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

    // Booking state
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

    return (
        <Layout style={{ minHeight: "100vh", background: "#f6faf7" }}>
            <Header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Quay lại</Button>
                    <Title level={4} style={{ margin: 0 }}>Chi tiết homestay</Title>
                </Space>
            </Header>

            <Content style={{ padding: 16 }}>
                <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                    {loading || !h ? (
                        <Card><Skeleton active avatar paragraph={{ rows: 8 }} /></Card>
                    ) : (
                        <>
                            {/* Tên + địa chỉ + action */}
                            <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                                <Col>
                                    <Space direction="vertical" size={2}>
                                        <Title level={3} style={{ margin: 0 }}>{h.H_Name}</Title>
                                        <Text type="secondary">
                                            <EnvironmentOutlined /> {h.H_City} • {h.H_Address}
                                        </Text>
                                    </Space>
                                </Col>
                                <Col>
                                    <Space>
                                        <Button onClick={share} icon={<ShareAltOutlined />}>Chia sẻ</Button>
                                        <Button type={fav ? "primary" : "default"} onClick={toggleFav}
                                            icon={fav ? <HeartFilled /> : <HeartOutlined />}>
                                            {fav ? "Đã thích" : "Yêu thích"}
                                        </Button>
                                    </Space>
                                </Col>
                            </Row>

                            {/* Gallery ảnh */}
                            <Card style={{ borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
                                <Image.PreviewGroup>
                                    <Row gutter={[8, 8]}>
                                        <Col xs={24} md={14}>
                                            <Image
                                                src={toSrc(images[0]?.url || h.Cover)}
                                                alt="main"
                                                style={{ height: 360, objectFit: "cover", width: "100%" }}
                                            />
                                        </Col>
                                        <Col xs={24} md={10}>
                                            <Row gutter={[8, 8]}>
                                                {images.slice(1, 5).map((img, idx) => (
                                                    <Col span={12} key={idx}>
                                                        <Image
                                                            src={toSrc(img.url)}
                                                            alt={"img" + idx}
                                                            style={{ height: 176, objectFit: "cover", width: "100%" }}
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
                                    <Card style={{ borderRadius: 16 }}>
                                        <Space direction="vertical" size={12} style={{ width: "100%" }}>
                                            <Tag color="green" style={{ borderRadius: 12 }}>{h.Status || "available"}</Tag>
                                            <Descriptions
                                                title="Thông tin"
                                                bordered
                                                size="middle"
                                                column={1}
                                                items={[
                                                    { key: "addr", label: "Địa chỉ", children: `${h.H_Address}, ${h.H_City}` },
                                                    { key: "price", label: "Giá/đêm", children: <Text strong>{(Number(h.Price_per_day) || 0).toLocaleString("vi-VN")} ₫</Text> },
                                                ]}
                                            />
                                            <Divider />
                                            <Title level={5} style={{ margin: 0 }}>Mô tả</Title>
                                            <Paragraph>
                                                {h.H_Description || "Chủ nhà chưa cập nhật mô tả chi tiết."}
                                            </Paragraph>

                                            {/* Gợi ý thêm: Tiện nghi / Nội quy / Chính sách hủy (hiện placeholder) */}
                                            <Divider />
                                            <Title level={5} style={{ margin: 0 }}>Tiện nghi</Title>
                                            <Space wrap>
                                                <Tag>Wifi</Tag><Tag>Máy lạnh</Tag><Tag>TV</Tag><Tag>Máy nước nóng</Tag><Tag>Chỗ đậu xe</Tag>
                                            </Space>

                                            <Divider />
                                            <Title level={5} style={{ margin: 0 }}>Nội quy</Title>
                                            <ul style={{ marginBottom: 0 }}>
                                                <li>Không hút thuốc trong phòng</li>
                                                <li>Giữ yên lặng sau 22:00</li>
                                                <li>Không mang thú cưng (trừ khi chủ nhà đồng ý)</li>
                                            </ul>
                                        </Space>
                                    </Card>
                                </Col>

                                {/* Khung đặt phòng cố định bên phải */}
                                <Col xs={24} lg={8}>
                                    <Affix offsetTop={80}>
                                        <Card style={{ borderRadius: 16 }}>
                                            <Space direction="vertical" size={12} style={{ width: "100%" }}>
                                                <Space align="center">
                                                    <DollarOutlined />
                                                    <Text strong style={{ fontSize: 18 }}>
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

                                                <Space align="center">
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
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    * Đây là bản demo đặt phòng. Bạn có thể nối API /bookings để tạo đơn thật.
                                                </Text>
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
