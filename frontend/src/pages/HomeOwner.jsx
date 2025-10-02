import React from "react";
import {
    Layout, Row, Col, Card, Statistic, Table, Button, Space,
    Modal, Form, Input, InputNumber, Tag, message, Popconfirm,
    Upload, Drawer, List, Image, Badge, Empty, Typography, Divider, Tooltip
} from "antd";
import {
    HomeOutlined, DollarOutlined, BookOutlined,
    PlusOutlined, EditOutlined, DeleteOutlined,
    PictureOutlined, UploadOutlined, StarFilled,
    EnvironmentOutlined, NumberOutlined, FileTextOutlined, TagOutlined,
    InfoCircleOutlined
} from "@ant-design/icons";
import TopBar from "../components/TopBar";
import OwnerAmenityRuleDrawer from "../components/OwnerAmenityRuleDrawer";
import { useAuth } from "../context/AuthContext";
import { homestaysApi, toPublicUrl } from "../services/homestays";

const { Title, Text } = Typography;

export default function HomeOwner() {
    const { user, logout } = useAuth();

    const [kpi, setKpi] = React.useState({ homestays: 0, bookings: 0, revenue: 0 });
    const [loading, setLoading] = React.useState(false);
    const [rows, setRows] = React.useState([]);

    const [open, setOpen] = React.useState(false);
    const [editing, setEditing] = React.useState(null);
    const [form] = Form.useForm();

    const [imgOpen, setImgOpen] = React.useState(false);
    const [imgHomestay, setImgHomestay] = React.useState(null);
    const [images, setImages] = React.useState([]);
    const [imgUploading, setImgUploading] = React.useState(false);

    // Drawer Tiện nghi & Nội quy
    const [arOpen, setArOpen] = React.useState(false);
    const [arHomestay, setArHomestay] = React.useState(null);
    const openAmenityRule = (row) => { setArHomestay(row); setArOpen(true); };

    // ==== helper: load ảnh bìa (ảnh chính hoặc ảnh đầu tiên) ====
    const hydrateCovers = async (list) => {
        const withCovers = await Promise.all(
            list.map(async (h) => {
                try {
                    const imgs = await homestaysApi.getImagesPublic(h.H_ID);
                    const main = imgs.find((x) => x.IsMain) || imgs[0];
                    return { ...h, _cover: main ? toPublicUrl(main.Image_url) : "" };
                } catch {
                    return { ...h, _cover: "" };
                }
            })
        );
        return withCovers;
    };

    // ===== load danh sách của owner =====
    const fetchMine = async () => {
        try {
            setLoading(true);
            const data = await homestaysApi.myList();
            const list = Array.isArray(data) ? data : data?.homestays || [];
            setKpi((k) => ({ ...k, homestays: list.length }));
            const hydrated = await hydrateCovers(list);
            setRows(hydrated);
        } catch (e) {
            console.error("[fetchMine error]", e);
            message.error(e?.response?.data?.message || "Không tải được danh sách");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { fetchMine(); /* eslint-disable-next-line */ }, [user]);

    // ===== CRUD =====
    const onCreate = () => {
        setEditing(null);
        form.resetFields();
        // ✅ mặc định pending (đợi admin duyệt)
        form.setFieldsValue({ Status: "pending", Max_guests: 2 });
        setOpen(true);
    };

    const onEdit = (r) => {
        setEditing(r);
        form.setFieldsValue({
            H_Name: r.H_Name,
            H_Address: r.H_Address,
            H_City: r.H_City,
            H_Description: r.H_Description,
            Price_per_day: Number(r.Price_per_day),
            Max_guests: Number(r.Max_guests ?? 2),
            // ✅ hiển thị đúng trạng thái hiện tại, không cho owner đổi
            Status: r.Status || "pending",
        });
        setOpen(true);
    };

    const onRemove = async (r) => {
        try {
            await homestaysApi.remove(r.H_ID);
            message.success("Đã xoá");
            fetchMine();
        } catch (e) {
            console.error("[onRemove error]", e);
            message.error(e?.response?.data?.message || "Xoá thất bại");
        }
    };

    // ===== Lưu (create / update) =====
    const onFinish = async (values) => {
        try {
            const safePrice = Math.max(0, Math.min(Number(values.Price_per_day || 0), 999999999));
            const base = {
                H_Name: (values.H_Name || "").trim(),
                H_Address: (values.H_Address || "").trim(),
                H_City: (values.H_City || "").trim(),
                H_Description: (values.H_Description ?? "").toString().trim(),
                Price_per_day: safePrice,
                Max_guests: Math.max(1, Number(values.Max_guests ?? 2)),
                U_ID: Number(user?.U_ID ?? user?.id) || undefined,
            };

            let result;
            if (editing?.H_ID) {
                // ✅ Khi sửa: chủ nhà không thay được status → không gửi Status lên
                result = await homestaysApi.update(editing.H_ID, base);
            } else {
                if (!base.U_ID) {
                    message.error("Không xác định được U_ID/ID Owner. Hãy đăng nhập lại.");
                    return;
                }
                // ✅ Khi tạo: ép Status='pending'
                const payloadCreate = { ...base, Status: "pending" };
                try { result = await homestaysApi.create(payloadCreate); }
                catch {
                    // fallback snake_case
                    const payloadSnake = {
                        h_name: base.H_Name,
                        h_address: base.H_Address,
                        h_city: base.H_City,
                        h_description: base.H_Description,
                        price_per_day: base.Price_per_day,
                        max_guests: base.Max_guests,
                        status: "pending",
                        u_id: base.U_ID,
                    };
                    result = await homestaysApi.create(payloadSnake);
                }
            }

            message.success(editing ? "Cập nhật thành công" : "Tạo thành công (đang chờ duyệt)");
            setOpen(false);
            setEditing(null);
            fetchMine();
        } catch (e) {
            console.error("[onFinish error]", e);
            message.error(e?.response?.data?.message || e?.message || "Lưu thất bại");
        }
    };

    // ===== Quản lý ảnh =====
    const openImages = async (r) => {
        setImgHomestay(r);
        setImgOpen(true);
        try {
            const res = await homestaysApi.listImages(r.H_ID);
            setImages(res?.images || res || []);
        } catch (e) {
            console.error("[openImages error]", e);
            message.error(e?.response?.data?.message || "Không tải được ảnh");
        }
    };

    const uploadMore = async ({ file, onSuccess, onError }) => {
        try {
            setImgUploading(true);
            await homestaysApi.uploadImages(imgHomestay.H_ID, [file]);
            const res = await homestaysApi.listImages(imgHomestay.H_ID);
            setImages(res?.images || res || []);
            onSuccess();
            message.success("Đã thêm ảnh");
            fetchMine();
        } catch (e) {
            console.error("[uploadMore error]", e);
            onError(e);
            message.error(e?.response?.data?.message || "Thêm ảnh thất bại");
        } finally {
            setImgUploading(false);
        }
    };

    const setMain = async (img) => {
        try {
            await homestaysApi.setMainImage(imgHomestay.H_ID, img.Image_ID);
            const res = await homestaysApi.listImages(imgHomestay.H_ID);
            setImages(res?.images || res || []);
            message.success("Đã đặt ảnh chính");
            fetchMine();
        } catch (e) {
            console.error("[setMain error]", e);
            message.error(e?.response?.data?.message || "Không đặt được ảnh chính");
        }
    };

    const deleteImg = async (img) => {
        try {
            await homestaysApi.deleteImage(imgHomestay.H_ID, img.Image_ID);
            setImages((s) => s.filter((x) => x.Image_ID !== img.Image_ID));
            message.success("Đã xoá ảnh");
            fetchMine();
        } catch (e) {
            console.error("[deleteImg error]", e);
            message.error(e?.response?.data?.message || "Xoá ảnh thất bại");
        }
    };

    // mapping màu trạng thái
    const statusTag = (s = "") => {
        const v = String(s).toLowerCase();
        const color =
            v === "active" ? "green" :
                v === "pending" ? "gold" :
                    v === "blocked" ? "purple" :
                        v === "rejected" ? "volcano" : "default";
        return <Tag color={color}>{s || "pending"}</Tag>;
    };

    return (
        <Layout style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f0fff4,#f7fafc)" }}>
            <TopBar user={user} role="Owner" onLogout={logout} />

            <Layout.Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
                {/* KPI Cards */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                        <Card bordered style={{ borderRadius: 16, background: "#e6fffb" }}>
                            <Statistic title="Homestay của tôi" value={kpi.homestays} prefix={<HomeOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card bordered style={{ borderRadius: 16, background: "#fff7e6" }}>
                            <Statistic title="Lượt đặt tháng này" value={kpi.bookings} prefix={<BookOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card bordered style={{ borderRadius: 16, background: "#f6ffed" }}>
                            <Statistic title="Doanh thu tháng (ước tính)" value={kpi.revenue} suffix="₫" prefix={<DollarOutlined />} />
                        </Card>
                    </Col>
                </Row>

                <Card
                    title={<Title level={4} style={{ margin: 0 }}>Quản lý Homestay</Title>}
                    style={{ borderRadius: 16, marginTop: 16 }}
                    extra={<Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>Thêm homestay</Button>}
                >
                    <Table
                        loading={loading}
                        rowKey="H_ID"
                        dataSource={rows}
                        pagination={{ pageSize: 8 }}
                        columns={[
                            {
                                title: "Ảnh bìa",
                                width: 130,
                                render: (_, r) =>
                                    r._cover ? (
                                        <Image
                                            src={r._cover}
                                            width={110}
                                            height={74}
                                            style={{ objectFit: "cover", borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}
                                            preview={false}
                                        />
                                    ) : (
                                        <div style={{
                                            width: 110, height: 74, borderRadius: 8, background: "#fafafa",
                                            display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #ddd"
                                        }}>
                                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
                                        </div>
                                    )
                            },
                            { title: "Tên", dataIndex: "H_Name" },
                            { title: "Địa chỉ", dataIndex: "H_Address" },
                            { title: "Thành phố", dataIndex: "H_City", width: 130 },
                            {
                                title: "Giá/ngày",
                                dataIndex: "Price_per_day",
                                width: 130,
                                render: (v) => (Number(v) || 0).toLocaleString("vi-VN") + " ₫",
                            },
                            { title: "Số khách tối đa", dataIndex: "Max_guests", width: 130 },
                            {
                                title: "Trạng thái",
                                dataIndex: "Status",
                                width: 130,
                                render: (s) => statusTag(s),
                            },
                            {
                                title: "Thao tác",
                                width: 360,
                                render: (_, r) => (
                                    <Space wrap>
                                        <Button icon={<PictureOutlined />} onClick={() => openImages(r)}>Ảnh</Button>
                                        <Button onClick={() => openAmenityRule(r)}>Tiện nghi & Nội quy</Button>
                                        <Button icon={<EditOutlined />} onClick={() => onEdit(r)}>Sửa</Button>
                                        <Popconfirm title="Xoá homestay?" onConfirm={() => onRemove(r)}>
                                            <Button danger icon={<DeleteOutlined />}>Xoá</Button>
                                        </Popconfirm>
                                    </Space>
                                ),
                            },
                        ]}
                    />
                </Card>

                {/* Modal tạo/sửa — giữ cấu trúc, chỉ chỉnh UI & Status */}
                <Modal
                    title={null}
                    open={open}
                    onOk={() => form.submit()}
                    onCancel={() => setOpen(false)}
                    okText={editing ? "Cập nhật" : "Tạo mới"}
                    okButtonProps={{ loading: imgUploading }}
                    centered
                    destroyOnClose
                    styles={{
                        content: { borderRadius: 18, overflow: "hidden" },
                        header: { display: "none" }
                    }}
                >
                    <div
                        style={{
                            background: "linear-gradient(135deg,#f6ffed,#e6fffb)",
                            padding: "16px 20px",
                            borderBottom: "1px solid #f0f0f0"
                        }}
                    >
                        <Title level={4} style={{ margin: 0 }}>
                            {editing ? "Sửa homestay" : "Thêm homestay mới"}
                        </Title>
                        <Text type="secondary">
                            {editing
                                ? "Bạn không thể thay đổi trạng thái khi chỉnh sửa. Trạng thái sẽ do quản trị viên phê duyệt."
                                : "Sau khi tạo, homestay sẽ ở trạng thái pending (đang chờ phê duyệt)."}
                        </Text>
                    </div>

                    <div style={{ padding: 16 }}>
                        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
                            {/* Hàng 1: Tên + Thành phố */}
                            <Row gutter={16}>
                                <Col xs={24} md={14}>
                                    <Form.Item
                                        name="H_Name"
                                        label="Tên homestay"
                                        rules={[{ required: true, message: "Nhập tên homestay" }]}
                                        tooltip="Ví dụ: Cozy House, Fresh Stay..."
                                    >
                                        <Input size="large" placeholder="Cozy House" prefix={<HomeOutlined className="text-gray-400" />} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={10}>
                                    <Form.Item name="H_City" label="Thành phố" rules={[{ required: true, message: "Nhập thành phố" }]}>
                                        <Input size="large" placeholder="Hà Nội / Đà Lạt / Đà Nẵng..." prefix={<EnvironmentOutlined className="text-gray-400" />} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            {/* Hàng 2: Địa chỉ */}
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item name="H_Address" label="Địa chỉ" rules={[{ required: true, message: "Nhập địa chỉ" }]}>
                                        <Input size="large" placeholder="Số nhà, đường, phường/xã..." prefix={<NumberOutlined className="text-gray-400" />} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            {/* Hàng 3: Giá + Số khách + Trạng thái (readonly) */}
                            <Row gutter={16}>
                                <Col xs={24} md={10}>
                                    <Form.Item
                                        name="Price_per_day"
                                        label={<Space>Giá mỗi ngày<Tooltip title="Giá niêm yết cho 1 đêm lưu trú"><TagOutlined /></Tooltip></Space>}
                                        rules={[{ required: true, message: "Nhập giá" }]}
                                    >
                                        <InputNumber size="large" min={0} max={999999999} style={{ width: "100%" }} placeholder="850000" addonAfter="₫ / đêm" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item
                                        name="Max_guests"
                                        label="Số khách tối đa"
                                        rules={[{ required: true, message: "Nhập số khách tối đa" }]}
                                        initialValue={2}
                                    >
                                        <InputNumber size="large" min={1} max={50} style={{ width: "100%" }} addonAfter="khách" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={6}>
                                    {/* ✅ Status chỉ hiển thị/readonly */}
                                    <Form.Item name="Status" label="Trạng thái" initialValue="pending">
                                        <Input size="large" disabled prefix={<InfoCircleOutlined style={{ color: "#999" }} />} value="pending" placeholder="pending (đang chờ duyệt)" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            {/* Hàng 4: Mô tả */}
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item name="H_Description" label="Mô tả">
                                        <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} showCount maxLength={500} placeholder="Mô tả ngắn gọn về không gian, tiện ích, điểm nổi bật..." prefix={<FileTextOutlined />} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider style={{ margin: "6px 0 0" }} />
                            <div style={{ color: "#999", fontSize: 12, marginTop: 8 }}>
                                Mẹo: Sau khi tạo, hãy vào mục <b>Ảnh</b> để thêm ảnh bìa đẹp và đặt <b>Ảnh chính</b>.
                            </div>
                        </Form>
                    </div>
                </Modal>

                {/* Drawer quản lý ảnh */}
                <Drawer title={`Ảnh: ${imgHomestay?.H_Name || ""}`} open={imgOpen} onClose={() => setImgOpen(false)} width={560} styles={{ body: { paddingBottom: 12 } }}>
                    <Upload customRequest={uploadMore} showUploadList={false} accept=".jpg,.jpeg,.png,.gif,.webp">
                        <Button icon={<UploadOutlined />}>Thêm ảnh</Button>
                    </Upload>

                    <List
                        style={{ marginTop: 16 }}
                        grid={{ gutter: 12, column: 2 }}
                        dataSource={images}
                        locale={{ emptyText: "Chưa có ảnh" }}
                        renderItem={(img) => (
                            <List.Item key={img.Image_ID}>
                                <Badge.Ribbon text={img.IsMain ? "Ảnh chính" : ""} color="gold">
                                    <Card
                                        size="small"
                                        hoverable
                                        cover={<Image src={toPublicUrl(img.Image_url)} style={{ height: 170, objectFit: "cover" }} preview />}
                                        actions={[
                                            <Button type="link" onClick={() => setMain(img)} disabled={!!img.IsMain} icon={<StarFilled />} key="main">Đặt chính</Button>,
                                            <Button type="link" danger onClick={() => deleteImg(img)} icon={<DeleteOutlined />} key="del">Xoá</Button>,
                                        ]}
                                        style={{ borderRadius: 12 }}
                                    />
                                </Badge.Ribbon>
                            </List.Item>
                        )}
                    />
                </Drawer>

                {/* Drawer Tiện nghi & Nội quy */}
                <OwnerAmenityRuleDrawer open={arOpen} onClose={() => setArOpen(false)} homestay={arHomestay} />
            </Layout.Content>
        </Layout>
    );
}
