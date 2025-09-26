import React from "react";
import {
    Layout, Row, Col, Card, Statistic, Table, Button, Space,
    Modal, Form, Input, InputNumber, Tag, message, Popconfirm,
    Upload, Drawer, List, Image, Badge
} from "antd";
import {
    HomeOutlined, DollarOutlined, BookOutlined,
    PlusOutlined, EditOutlined, DeleteOutlined,
    PictureOutlined, UploadOutlined, StarFilled
} from "@ant-design/icons";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import { homestaysApi } from "../services/homestays";
import { toPublicUrl } from "../services/homestays";
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

    // ===== load danh sách của owner =====
    const fetchMine = async () => {
        try {
            setLoading(true);
            const data = await homestaysApi.myList();
            console.log("[fetchMine] raw =", data);
            const list = Array.isArray(data) ? data : data?.homestays || [];
            setRows(list);
            setKpi((k) => ({ ...k, homestays: list.length }));
        } catch (e) {
            console.error("[fetchMine error]", e);
            message.error(e?.response?.data?.message || "Không tải được danh sách");
        } finally {
            setLoading(false);
        }
    };
    React.useEffect(() => {
        console.log("[Auth user]", user);
        fetchMine();
    }, [user]);

    // ===== CRUD =====
    const onCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ Status: "active" });
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
            Status: r.Status || "active",
        });
        setOpen(true);
    };

    const onRemove = async (r) => {
        try {
            console.log("[onRemove] H_ID =", r.H_ID);
            await homestaysApi.remove(r.H_ID);
            message.success("Đã xoá");
            fetchMine();
        } catch (e) {
            console.error("[onRemove error]", e);
            message.error(e?.response?.data?.message || "Xoá thất bại");
        }
    };

    // ===== tạo/cập nhật (AntD sẽ gọi khi form hợp lệ) =====
    const onFinish = async (values) => {
        try {
            const safePrice = Math.max(0, Math.min(Number(values.Price_per_day || 0), 999999999));
            const safeDesc = (values.H_Description ?? "").toString().trim();

            const payload = {
                H_Name: (values.H_Name || "").trim(),
                H_Address: (values.H_Address || "").trim(),
                H_City: (values.H_City || "").trim(),
                H_Description: safeDesc,
                Price_per_day: safePrice,
                Status: (values.Status || "active").trim(),
                U_ID: Number(user?.U_ID ?? user?.id) || undefined,
            };
            const payloadSnake = {
                h_name: payload.H_Name,
                h_address: payload.H_Address,
                h_city: payload.H_City,
                h_description: payload.H_Description,
                price_per_day: payload.Price_per_day,
                status: payload.Status,
                u_id: payload.U_ID,
            };

            console.log("[onSubmit user]", user);
            console.log("[onSubmit payload]", payload, "ownerId=", payload.U_ID);
            if (!payload.U_ID) {
                message.error("Không xác định được U_ID/ID Owner. Hãy đăng nhập lại.");
                return;
            }

            let result;
            try {
                result = await homestaysApi.create(payload);
            } catch (e1) {
                console.warn("[create fallback to snake_case]", e1?.response?.data || e1?.message);
                result = await homestaysApi.create(payloadSnake);
            }

            console.log("[onSubmit result]", result);
            message.success(editing ? "Cập nhật thành công" : "Tạo thành công");
            setOpen(false);
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
            console.log("[openImages] result =", res);
            setImages(res?.images || res || []);
        } catch (e) {
            console.error("[openImages error]", e);
            message.error(e?.response?.data?.message || "Không tải được ảnh");
        }
    };

    const uploadMore = async ({ file, onSuccess, onError }) => {
        try {
            console.log("[uploadMore] file =", file);
            await homestaysApi.uploadImages(imgHomestay.H_ID, [file]);
            const res = await homestaysApi.listImages(imgHomestay.H_ID);
            setImages(res?.images || res || []);
            onSuccess();
            message.success("Đã thêm ảnh");
        } catch (e) {
            console.error("[uploadMore error]", e);
            onError(e);
            message.error(e?.response?.data?.message || "Thêm ảnh thất bại");
        }
    };

    const setMain = async (img) => {
        try {
            console.log("[setMain] img =", img);
            await homestaysApi.setMainImage(imgHomestay.H_ID, img.Image_ID);
            const res = await homestaysApi.listImages(imgHomestay.H_ID);
            setImages(res?.images || res || []);
            message.success("Đã đặt ảnh chính");
        } catch (e) {
            console.error("[setMain error]", e);
            message.error(e?.response?.data?.message || "Không đặt được ảnh chính");
        }
    };

    const deleteImg = async (img) => {
        try {
            console.log("[deleteImg] img =", img);
            await homestaysApi.deleteImage(imgHomestay.H_ID, img.Image_ID);
            setImages((s) => s.filter((x) => x.Image_ID !== img.Image_ID));
            message.success("Đã xoá ảnh");
        } catch (e) {
            console.error("[deleteImg error]", e);
            message.error(e?.response?.data?.message || "Xoá ảnh thất bại");
        }
    };

    return (
        <Layout style={{ minHeight: "100vh", background: "#f7fafc" }}>
            <TopBar user={user} role="Owner" onLogout={logout} />
            <Layout.Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                        <Card bordered style={{ borderRadius: 16 }}>
                            <Statistic title="Homestay của tôi" value={kpi.homestays} prefix={<HomeOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card bordered style={{ borderRadius: 16 }}>
                            <Statistic title="Lượt đặt tháng này" value={kpi.bookings} prefix={<BookOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card bordered style={{ borderRadius: 16 }}>
                            <Statistic title="Doanh thu tháng (ước tính)" value={kpi.revenue} suffix="₫" prefix={<DollarOutlined />} />
                        </Card>
                    </Col>
                </Row>

                <Card
                    title="Quản lý Homestay"
                    style={{ borderRadius: 16, marginTop: 16 }}
                    extra={<Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>Thêm homestay</Button>}
                >
                    <Table
                        loading={loading}
                        rowKey="H_ID"
                        dataSource={rows}
                        pagination={{ pageSize: 8 }}
                        columns={[
                            { title: "Tên", dataIndex: "H_Name" },
                            { title: "Địa chỉ", dataIndex: "H_Address" },
                            { title: "Thành phố", dataIndex: "H_City", width: 130 },
                            {
                                title: "Giá/ngày",
                                dataIndex: "Price_per_day",
                                width: 130,
                                render: (v) => (Number(v) || 0).toLocaleString("vi-VN") + " ₫",
                            },
                            {
                                title: "Trạng thái",
                                dataIndex: "Status",
                                width: 120,
                                render: (s) => <Tag color={s === "active" ? "green" : "volcano"}>{s}</Tag>,
                            },
                            {
                                title: "Thao tác",
                                width: 260,
                                render: (_, r) => (
                                    <Space wrap>
                                        <Button icon={<PictureOutlined />} onClick={() => openImages(r)}>Ảnh</Button>
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

                <Modal
                    title={editing ? "Sửa homestay" : "Thêm homestay"}
                    open={open}
                    onOk={() => form.submit()}
                    onCancel={() => setOpen(false)}
                    okText={editing ? "Cập nhật" : "Tạo mới"}
                    okButtonProps={{ loading: imgUploading }}
                    destroyOnClose
                >
                    <Form form={form} layout="vertical" onFinish={onFinish}>
                        <Form.Item name="H_Name" label="Tên homestay" rules={[{ required: true, message: "Nhập tên" }]}>
                            <Input placeholder="Cozy House" />
                        </Form.Item>
                        <Form.Item name="H_Address" label="Địa chỉ" rules={[{ required: true, message: "Nhập địa chỉ" }]}>
                            <Input placeholder="Số nhà, đường, phường/xã..." />
                        </Form.Item>
                        <Form.Item name="H_City" label="Thành phố" rules={[{ required: true, message: "Nhập thành phố" }]}>
                            <Input placeholder="Hà Nội / Đà Lạt / Đà Nẵng..." />
                        </Form.Item>
                        <Form.Item name="H_Description" label="Mô tả">
                            <Input.TextArea rows={3} placeholder="Mô tả ngắn gọn..." />
                        </Form.Item>
                        <Form.Item
                            name="Price_per_day"
                            label="Giá mỗi ngày"
                            rules={[{ required: true, message: "Nhập giá" }]}
                        >
                            <InputNumber min={0} max={999999999} style={{ width: "100%" }} placeholder="850000" />
                        </Form.Item>
                        <Form.Item name="Status" label="Trạng thái" initialValue="active">
                            <Input placeholder="active / inactive" />
                        </Form.Item>
                    </Form>
                </Modal>

                <Drawer
                    title={`Ảnh: ${imgHomestay?.H_Name || ""}`}
                    open={imgOpen}
                    onClose={() => setImgOpen(false)}
                    width={520}
                >
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
                                        cover={<Image src={img.Image_url} style={{ height: 160, objectFit: "cover" }} />}
                                        actions={[
                                            <Button type="link" onClick={() => setMain(img)} disabled={!!img.IsMain} icon={<StarFilled />} key="main">Đặt chính</Button>,
                                            <Button type="link" danger onClick={() => deleteImg(img)} icon={<DeleteOutlined />} key="del">Xoá</Button>,
                                        ]}
                                    />
                                </Badge.Ribbon>
                            </List.Item>
                        )}
                    />
                </Drawer>
            </Layout.Content>
        </Layout>
    );
}
