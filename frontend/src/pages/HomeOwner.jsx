// src/pages/HomeOwner.jsx
import React from "react";
import {
    Layout, Row, Col, Card, Table, Button, Space,
    Modal, Form, Input, InputNumber, Tag, message, Popconfirm,
    Upload, Drawer, List, Badge, Empty, Typography, Select, Tooltip
} from "antd";
import {
    HomeOutlined,
    PlusOutlined, EditOutlined, DeleteOutlined,
    PictureOutlined, UploadOutlined,
    EnvironmentOutlined, InfoCircleOutlined,
    GiftOutlined, PercentageOutlined, DollarOutlined
} from "@ant-design/icons";
import TopBar from "../components/TopBar";
import OwnerAmenityRuleDrawer from "../components/OwnerAmenityRuleDrawer";
import { useAuth } from "../context/AuthContext";
import { homestaysApi, toPublicUrl } from "../services/homestays";
import { promotionsApi } from "../services/promotions";

const { Title, Text } = Typography;

/* ───────── SmartImg & helpers ───────── */

const NO_IMAGE_DATA_URL =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
  <rect width="100%" height="100%" fill="#f5f5f5"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
    font-family="sans-serif" font-size="16" fill="#9ca3af">No image</text>
</svg>`);

function buildImgSrc(item) {
    let url =
        item?.url ?? item?.thumbUrl ?? item?.src ?? item?.path ?? item?.Image_url ??
        (typeof item === "string" ? item : "");
    if (!url) return "";
    url = String(url).trim().replace(/\\/g, "/");
    if (/^(https?:)?\/\//.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url;
    url = url.replace(/^.*\/(uploads\/[^?#]+)$/i, "/$1");
    url = url.replace(/^.*\/(public\/images\/[^?#]+)$/i, "/$1");
    url = url.replace(/^.*\/(images\/[^?#]+)$/i, "/$1");
    if (url.startsWith("/uploads/") || url.startsWith("/images/") || url.startsWith("/public/")) return url;
    return `/uploads/${url}`;
}

function SmartImg({ src, alt = "", style = {}, ...rest }) {
    const tried = React.useRef(0);
    const [finalSrc, setFinalSrc] = React.useState(src || NO_IMAGE_DATA_URL);
    React.useEffect(() => { tried.current = 0; setFinalSrc(src || NO_IMAGE_DATA_URL); }, [src]);
    const onError = () => {
        if (tried.current === 0 && src) {
            tried.current = 1;
            const file = (src.split("/").pop() || "").trim();
            if (file) return setFinalSrc(`/images/${file}`);
        }
        setFinalSrc(NO_IMAGE_DATA_URL);
    };
    return (
        <img
            src={finalSrc}
            alt={alt}
            loading="lazy"
            onError={onError}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12, ...style }}
            {...rest}
        />
    );
}

/* ───────── Utils ───────── */

const safeErr = (e) => ({
    message: e?.response?.data?.message || e?.message,
    status: e?.response?.status,
    data: e?.response?.data,
});

export default function HomeOwner() {
    const { user, logout } = useAuth();

    const [loading, setLoading] = React.useState(false);
    const [rows, setRows] = React.useState([]);
    const [open, setOpen] = React.useState(false);
    const [editing, setEditing] = React.useState(null);
    const [form] = Form.useForm();

    const [imgOpen, setImgOpen] = React.useState(false);
    const [imgHomestay, setImgHomestay] = React.useState(null);
    const [images, setImages] = React.useState([]);
    const [imgBusy, setImgBusy] = React.useState({ mainId: null, delId: null });

    const [arOpen, setArOpen] = React.useState(false);
    const [arHomestay, setArHomestay] = React.useState(null);

    // Promotions
    const [promoLoading, setPromoLoading] = React.useState(false);
    const [promoOptions, setPromoOptions] = React.useState([]);

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

    const fetchMine = async () => {
        try {
            setLoading(true);
            const data = await homestaysApi.myList();
            const list = Array.isArray(data) ? data : data?.homestays || [];
            const hydrated = await hydrateCovers(list);
            setRows(hydrated);
            console.log("[owner] my homestays =", hydrated);
        } catch (e) {
            console.error("[owner] load my homestays error:", e);
            message.error("Không tải được danh sách homestay");
        } finally {
            setLoading(false);
        }
    };
    React.useEffect(() => { fetchMine(); }, [user]);

    /* ───────── Promotions ───────── */
    const loadActivePromotions = async () => {
        console.groupCollapsed("[promotion] loadActivePromotions");
        try {
            setPromoLoading(true);
            const res = await promotionsApi.list?.({ active: "1" });
            const arr = (Array.isArray(res?.data?.data?.promotions) ? res.data.data.promotions :
                Array.isArray(res?.data?.promotions) ? res.data.promotions :
                    Array.isArray(res) ? res : [])
                .map((p) => ({
                    id: Number(p.Promotion_ID ?? p.P_ID ?? p.id),
                    code: String(p.P_Code).trim(),
                    name: p.P_Name,
                    type: p.P_Type,
                    discount: Number(p.Discount),
                    start: p.Start_date || p.start_date || p.from_date,
                    end: p.End_date || p.end_date || p.to_date,
                    status: p.P_Status || p.status,
                }))
                .filter(x => Number.isFinite(x.id) && x.code);

            const seen = new Set(); const options = [];
            for (const it of arr) { if (seen.has(it.code)) continue; seen.add(it.code); options.push(it); }
            setPromoOptions(options);
            console.table(options);

            const allow = new Set(options.map(o => o.code));
            const curCodes = form.getFieldValue("Promotion_codes") || [];
            const filtered = (curCodes || []).filter(c => allow.has(c));
            if (filtered.length !== curCodes.length) {
                form.setFieldsValue({ Promotion_codes: filtered });
            }
        } catch (e) {
            console.error("loadActivePromotions ERROR:", e?.response?.data || e);
            setPromoOptions([]);
        } finally {
            setPromoLoading(false);
            console.groupEnd();
        }
    };

    const loadHomestayPromotionsForEdit = async (row) => {
        console.groupCollapsed("[promotion] loadHomestayPromotionsForEdit", { H_ID: row?.H_ID });
        try {
            let list = await promotionsApi.forHomestay(row.H_ID);
            console.log("[promotion] forHomestay list =", list);

            let ids = []; let codes = [];
            if (Array.isArray(list) && list.length) {
                ids = list.map((x) => Number(x.Promotion_ID ?? x.P_ID ?? x.id)).filter(Number.isFinite);
                codes = list.map((x) => x.P_Code).filter(Boolean);
            }
            if (!ids.length && row?.Promotion_ids) ids = row.Promotion_ids;
            if (!codes.length && row?.Promotion_codes) codes = row.Promotion_codes;

            const allow = new Set((promoOptions || []).map(p => p.code));
            codes = Array.from(new Set(codes.filter(c => allow.has(c))));
            const idByCode = new Map(promoOptions.map(p => [p.code, p.id]));
            if (!ids.length && codes.length) ids = codes.map(c => idByCode.get(c)).filter(Number.isFinite);

            form.setFieldsValue({ Promotion_ids: ids, Promotion_codes: codes });
            console.log("[promotion] set form =>", { ids, codes });
        } catch (e) {
            console.error("loadHomestayPromotionsForEdit error:", e?.response?.data || e);
        } finally {
            console.groupEnd();
        }
    };

    const replaceAssignedPromotions = async (H_ID, selectedIds) => {
        const ids = Array.from(new Set((selectedIds || []).map(Number).filter(n => Number.isInteger(n) && n > 0)));
        console.groupCollapsed("[promotion] replaceAssigned", { H_ID, ids });
        try {
            const after = await promotionsApi.replaceAssigned(H_ID, ids);
            const idsAfter = Array.from(new Set((after || []).map(
                x => Number(x.Promotion_ID ?? x.P_ID ?? x.id)).filter(Number.isFinite)));
            const codesAfter = Array.from(new Set((after || []).map(x => x.P_Code).filter(Boolean)));
            form.setFieldsValue({ Promotion_ids: idsAfter, Promotion_codes: codesAfter });
            console.log("[promotion] replaced, assigned AFTER =", after);
            return { ok: true, idsAfter, codesAfter };
        } catch (e) {
            console.error("[promotion] replaceAssigned ERROR:", e?.response?.data || e);
            throw e;
        } finally {
            console.groupEnd();
        }
    };

    const onCreate = async () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            Status: "pending", Max_guests: 2,
            Bedrooms: 1, Bathrooms: 1, Living_rooms: 1, Kitchens: 1,
            Promotion_ids: [], Promotion_codes: []
        });
        setOpen(true);
        await loadActivePromotions();
        form.setFieldsValue({ Promotion_ids: [], Promotion_codes: [] });
    };

    const onEdit = async (r) => {
        setEditing(r);
        form.resetFields();
        form.setFieldsValue({
            H_Name: r.H_Name, H_Address: r.H_Address, H_City: r.H_City,
            H_Description: r.H_Description, Price_per_day: Number(r.Price_per_day),
            Max_guests: r.Max_guests ?? 2, Bedrooms: r.Bedrooms ?? 1, Bathrooms: r.Bathrooms ?? 1,
            Living_rooms: r.Living_rooms ?? 1, Kitchens: r.Kitchens ?? 1,
            Status: r.Status || "pending",
            Promotion_ids: [], Promotion_codes: []
        });
        setOpen(true);
        await loadActivePromotions();
        await loadHomestayPromotionsForEdit(r);
    };

    const onFinish = async (v) => {
        console.groupCollapsed("[promotion] onFinish submit");
        const idByCode = new Map(promoOptions.map((p) => [p.code, p.id]));
        console.table(promoOptions);

        let selCodes = Array.isArray(v.Promotion_codes) ? v.Promotion_codes : [];
        let selIds = Array.isArray(v.Promotion_ids) ? v.Promotion_ids : [];
        selCodes = Array.from(new Set(selCodes));

        console.log("[promotion] raw form selections =", { selCodes, selIds });

        const unknownCodes = selCodes.filter(c => !idByCode.has(c));
        if (unknownCodes.length) {
            message.error(`Mã không hợp lệ hoặc không còn hiệu lực: ${unknownCodes.join(", ")}`);
            console.error("[promotion] unknown codes in submit:", unknownCodes);
            console.groupEnd();
            return;
        }

        if (!selIds.length && selCodes.length)
            selIds = selCodes.map((c) => idByCode.get(c)).filter((x) => Number.isFinite(x));
        selIds = Array.from(new Set(selIds));
        console.log("[promotion] normalized submit ids =", selIds);

        const base = {
            H_Name: v.H_Name?.trim(), H_Address: v.H_Address?.trim(), H_City: v.H_City?.trim(),
            H_Description: v.H_Description?.trim(), Price_per_day: Number(v.Price_per_day || 0),
            Max_guests: Number(v.Max_guests || 2), Bedrooms: Number(v.Bedrooms || 1),
            Bathrooms: Number(v.Bathrooms || 1), Living_rooms: Number(v.Living_rooms || 1),
            Kitchens: Number(v.Kitchens || 1), U_ID: user?.U_ID || user?.id,
            Promotion_ids: selIds, Promotion_codes: selCodes,
        };

        try {
            console.log("[promotion] SUBMIT base payload =", base);

            if (editing?.H_ID) {
                console.log("[promotion] update H_ID =", editing.H_ID);
                await homestaysApi.update(editing.H_ID, base);
                await replaceAssignedPromotions(editing.H_ID, selIds);
                message.success("Đã cập nhật homestay & lưu mã khuyến mãi");
            } else {
                const created = await homestaysApi.create(base);
                const newId =
                    created?.H_ID || created?.id || created?.data?.H_ID || created?.data?.id ||
                    created?.homestay?.H_ID || created?.homestay?.id ||
                    created?.data?.homestay?.H_ID || created?.data?.homestay?.id;
                if (!newId) throw new Error("Không xác định được ID homestay vừa tạo");

                console.log("[promotion] created H_ID =", newId);
                await replaceAssignedPromotions(newId, selIds);
                message.success("Đã tạo homestay mới & gán mã khuyến mãi");
            }

            setOpen(false);
            fetchMine();
        } catch (e) {
            const se = safeErr(e);
            console.error("[promotion] onFinish error:", se);
            message.error(se?.message || "Lưu thất bại");
        } finally {
            console.groupEnd();
        }
    };

    const onRemove = async (r) => {
        try {
            await homestaysApi.remove(r.H_ID);
            message.success("Đã xoá");
            fetchMine();
        } catch (e) {
            console.error("[owner] remove homestay error:", safeErr(e));
            message.error("Không thể xoá homestay");
        }
    };

    const openImages = async (r) => {
        setImgHomestay(r);
        setImgOpen(true);
        try {
            const res = await homestaysApi.listImages(r.H_ID);
            setImages(res?.images || res || []);
        } catch (e) {
            console.error("[owner] load images error:", safeErr(e));
            message.error("Không tải được ảnh");
        }
    };

    // Drawer tiện nghi
    const openAmenityRule = (row) => { setArHomestay(row); setArOpen(true); };

    const statusTag = (s = "") => {
        const labelMap = {
            active: "Đang hoạt động",
            pending: "Chờ duyệt",
            blocked: "Đã khóa",
            rejected: "Từ chối"
        };

        const colorMap = {
            active: "green",
            pending: "gold",
            blocked: "purple",
            rejected: "volcano"
        };

        const key = s?.toLowerCase?.() || "pending";
        return <Tag color={colorMap[key] || "default"}>{labelMap[key] || s}</Tag>;
    };

    const formatDate = (v) => v ? new Date(v).toLocaleDateString("vi-VN") : "";

    // ====== Ảnh: helpers đặt ảnh chính / gỡ ảnh / reload ======
    const doReloadImages = async (hid) => {
        try {
            const list = await homestaysApi.listImages(hid);
            setImages(list?.images || list || []);
        } catch (e) {
            console.error("[owner] reload images error:", e?.response?.data || e);
        }
    };

    const setMainImage = async (img) => {
        const hid = imgHomestay?.H_ID;
        const iid = img?.Image_ID || img?.id;
        if (!hid || !iid) return;
        setImgBusy((s) => ({ ...s, mainId: iid }));
        try {
            await homestaysApi.setMainImage(hid, iid);
            message.success("Đã đặt ảnh chính");
            await doReloadImages(hid);
        } catch (e) {
            console.error("[owner] setMainImage error:", e?.response?.data || e);
            message.error("Đặt ảnh chính thất bại");
        } finally {
            setImgBusy((s) => ({ ...s, mainId: null }));
        }
    };

    // Fallback xoá ảnh (đa tên hàm + gọi thẳng endpoint)
    const apiDeleteImage = async (hid, iid) => {
        const api = homestaysApi || {};
        if (typeof api.removeImage === "function") return api.removeImage(hid, iid);
        if (typeof api.deleteImage === "function") return api.deleteImage(hid, iid);
        if (api.images?.remove) return api.images.remove(hid, iid);
        if (api.images?.delete) return api.images.delete(hid, iid);
        const tryDelete = async (url) => {
            const res = await fetch(url, { method: "DELETE", credentials: "include" });
            if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`);
            try { return await res.json(); } catch { return {}; }
        };
        try {
            return await tryDelete(`/homestays/${hid}/images/${iid}`);
        } catch {
            return await tryDelete(`/api/homestays/${hid}/images/${iid}`);
        }
    };

    const removeImage = async (img) => {
        const hid = imgHomestay?.H_ID;
        const iid = img?.Image_ID || img?.id;
        if (!hid || !iid) return;
        setImgBusy((s) => ({ ...s, delId: iid }));
        try {
            await apiDeleteImage(hid, iid);
            message.success("Đã gỡ ảnh");
            await doReloadImages(hid);
        } catch (e) {
            console.error("[owner] removeImage error:", e?.response?.data || e);
            message.error("Gỡ ảnh thất bại");
        } finally {
            setImgBusy((s) => ({ ...s, delId: null }));
        }
    };

    const columns = [
        { title: "Tên homestay", dataIndex: "H_Name", render: (v) => <Text strong style={{ fontSize: 16, whiteSpace: "nowrap" }}>{v}</Text> },
        { title: "Thành phố", dataIndex: "H_City" },
        {
            title: "Giá/ngày",
            dataIndex: "Price_per_day",
            align: "right",
            render: (v) => <Text style={{ whiteSpace: "nowrap" }}>{Number(v).toLocaleString("vi-VN")} ₫</Text>,
        },
        { title: "Khách", dataIndex: "Max_guests", render: (v) => <Tag color="blue">{v}</Tag> },
        { title: "Ngủ", dataIndex: "Bedrooms", render: (v) => <Tag color="purple">{v}</Tag> },
        { title: "WC", dataIndex: "Bathrooms", render: (v) => <Tag color="volcano">{v}</Tag> },
        { title: "Phòng khách", dataIndex: "Living_rooms", render: (v) => <Tag color="gold">{v}</Tag> },
        { title: "Bếp", dataIndex: "Kitchens", render: (v) => <Tag color="green">{v}</Tag> },
        { title: "Ngày tạo", dataIndex: "Created_at", render: (_, r) => formatDate(r.Created_at || r.created_at) },
        { title: "Trạng thái", dataIndex: "Status", render: (s) => statusTag(s) },
        {
            title: "Thao tác",
            fixed: "right",
            render: (_, r) => (
                <Space>
                    <Button icon={<PictureOutlined />} onClick={() => openImages(r)}>Ảnh</Button>
                    <Button onClick={() => setArHomestay(r) || setArOpen(true)}>Tiện nghi</Button>
                    <Button icon={<EditOutlined />} onClick={() => onEdit(r)}>Sửa</Button>
                    <Popconfirm title="Xoá homestay?" onConfirm={() => onRemove(r)}>
                        <Button danger icon={<DeleteOutlined />}>Xoá</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Layout style={{ minHeight: "100vh", background: "linear-gradient(180deg,#ecfdf5,#f8fafc)" }}>
            <TopBar user={user} role="Owner" onLogout={logout} />

            <Layout.Content style={{ padding: 24, maxWidth: 1560, margin: "0 auto" }}>
                <Card
                    bordered={false}
                    style={{
                        borderRadius: 18, marginBottom: 12,
                        background: "linear-gradient(135deg,#e6f4ff 0%, #ecfdf5 60%, #ffffff 100%)",
                        border: "1px solid #eef2ff", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
                    }}
                    bodyStyle={{ padding: 16 }}
                >
                    <Space align="center" style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                        <Space align="center" size={12}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "grid", placeItems: "center", color: "#fff" }}>
                                <HomeOutlined />
                            </div>
                            <div>
                                <Title level={3} style={{ margin: 0 }}>Quản lý Homestay</Title>
                                <Text type="secondary">Tổng số: <b>{rows.length}</b> homestay</Text>
                            </div>
                        </Space>

                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={onCreate}
                            style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", border: 0, borderRadius: 10, paddingInline: 16, height: 44, fontWeight: 600 }}
                        >
                            Thêm homestay
                        </Button>
                    </Space>
                </Card>

                <Card style={{ borderRadius: 18 }} bodyStyle={{ padding: 16 }}>
                    <Table
                        loading={loading}
                        rowKey="H_ID"
                        dataSource={rows}
                        columns={columns}
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        size="large"
                        style={{ fontSize: 15 }}
                        tableLayout="auto"
                        onRow={() => ({ style: { height: 60 } })}
                        locale={{ emptyText: <Empty description="Chưa có homestay nào" /> }}
                    />
                </Card>

                {/* Modal thêm/sửa */}
                <Modal
                    open={open}
                    onOk={() => form.submit()}
                    onCancel={() => setOpen(false)}
                    okText={editing ? "Cập nhật" : "Tạo mới"}
                    centered
                    destroyOnClose
                    styles={{ content: { borderRadius: 18 } }}
                >
                    <Title level={4} style={{ marginTop: 6 }}>
                        {editing ? "Sửa homestay" : "Thêm homestay mới"}
                    </Title>

                    <Form form={form} layout="vertical" onFinish={onFinish}>
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item name="H_Name" label="Tên homestay" rules={[{ required: true }]}>
                                    <Input prefix={<HomeOutlined />} placeholder="VD: Mộc Homestay" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="H_City" label="Thành phố" rules={[{ required: true }]}>
                                    <Input prefix={<EnvironmentOutlined />} placeholder="VD: Đà Lạt" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item name="H_Address" label="Địa chỉ" rules={[{ required: true }]}>
                            <Input placeholder="Số nhà, đường, phường/xã..." />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item name="Price_per_day" label="Giá mỗi ngày" rules={[{ required: true }]}>
                                    <InputNumber style={{ width: "100%" }} addonAfter="₫/đêm" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="Max_guests" label="Số khách tối đa" initialValue={2}>
                                    <InputNumber min={1} style={{ width: "100%" }} addonAfter="khách" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item name="Bedrooms" label="Số phòng ngủ" initialValue={1}>
                                    <InputNumber min={0} style={{ width: "100%" }} addonAfter="phòng" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="Bathrooms" label="Số phòng tắm/WC" initialValue={1}>
                                    <InputNumber min={0} style={{ width: "100%" }} addonAfter="phòng" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item name="Living_rooms" label="Số phòng khách" initialValue={1}>
                                    <InputNumber min={0} style={{ width: "100%" }} addonAfter="phòng" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="Kitchens" label="Số phòng bếp" initialValue={1}>
                                    <InputNumber min={0} style={{ width: "100%" }} addonAfter="phòng" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item name="H_Description" label="Mô tả">
                            <Input.TextArea rows={4} placeholder="Mô tả không gian, tiện nghi, lưu ý..." />
                        </Form.Item>

                        {/* Chọn mã khuyến mãi */}
                        <Form.Item
                            label={(
                                <Space>
                                    <GiftOutlined />
                                    <span>Mã khuyến mãi áp dụng</span>
                                    <Tooltip title="Chỉ hiện mã đang active. Khách sẽ được áp dụng khi thoả điều kiện.">
                                        <InfoCircleOutlined />
                                    </Tooltip>
                                </Space>
                            )}
                        >
                            <Form.Item name="Promotion_ids" noStyle>
                                <Input hidden />
                            </Form.Item>

                            <Form.Item name="Promotion_codes" noStyle>
                                <Select
                                    mode="multiple"
                                    allowClear
                                    loading={promoLoading}
                                    placeholder="Chọn một hoặc nhiều mã"
                                    optionLabelProp="label"
                                    options={promoOptions.map((p) => ({
                                        key: String(p.id),
                                        value: p.code,
                                        label: p.code,
                                        title: p.name,
                                        p,
                                    }))}
                                    tagRender={(tagProps) => {
                                        const p = promoOptions.find((x) => x.code === tagProps.label);
                                        const color = p?.type === "percent" ? "geekblue" : "gold";
                                        const icon = p?.type === "percent" ? <PercentageOutlined /> : <DollarOutlined />;
                                        return (
                                            <Tag color={color} closable={tagProps.closable} onClose={tagProps.onClose} style={{ borderRadius: 999, marginRight: 4 }}>
                                                {icon} {tagProps.label}
                                            </Tag>
                                        );
                                    }}
                                    optionRender={(opt) => {
                                        const p = opt.data.p;
                                        const color = p?.type === "percent" ? "geekblue" : "gold";
                                        const icon = p?.type === "percent" ? <PercentageOutlined /> : <DollarOutlined />;
                                        const valText = p?.type === "percent" ? `${p?.discount}%` : `${Number(p?.discount || 0).toLocaleString("vi-VN")} ₫`;
                                        return (
                                            <Space>
                                                <Tag color={color} style={{ borderRadius: 999 }}>{icon} {p?.code}</Tag>
                                                <Text strong>{p?.name}</Text>
                                                <Text type="secondary">• {valText}</Text>
                                            </Space>
                                        );
                                    }}
                                    onChange={(codes) => {
                                        const idByCode = new Map(promoOptions.map(x => [x.code, x.id]));
                                        const allow = new Set(promoOptions.map(x => x.code));

                                        const safeCodes = (codes || []).filter(c => allow.has(c));
                                        const removed = (codes || []).filter(c => !allow.has(c));

                                        if (removed.length) {
                                            message.warning(`Đã bỏ mã không hợp lệ: ${removed.join(", ")}`);
                                        }

                                        const ids = safeCodes.map(c => idByCode.get(c)).filter(Boolean);
                                        console.log("[promotion] onChange codes->ids =", { codes, safeCodes, ids });

                                        form.setFieldsValue({
                                            Promotion_codes: [...new Set(safeCodes)],
                                            Promotion_ids: [...new Set(ids)]
                                        });
                                    }}
                                />
                            </Form.Item>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* Drawer ảnh: upload + đặt ảnh chính + Xóa ảnh (nút cạnh nhau) */}
                <Drawer
                    title={`Ảnh: ${imgHomestay?.H_Name || ""}`}
                    open={imgOpen}
                    onClose={() => setImgOpen(false)}
                    width={560}
                >
                    <Upload
                        multiple
                        showUploadList={false}
                        customRequest={async ({ file, onSuccess, onError }) => {
                            try {
                                const res = await homestaysApi.uploadImages(imgHomestay.H_ID, [file]);
                                message.success("Tải ảnh lên thành công");
                                await doReloadImages(imgHomestay.H_ID);
                                onSuccess?.(res);
                            } catch (e) {
                                console.error("[owner] upload image error:", e?.response?.data || e);
                                message.error("Tải ảnh thất bại");
                                onError?.(e);
                            }
                        }}
                    >
                        <Button icon={<UploadOutlined />}>Thêm ảnh</Button>
                    </Upload>

                    <List
                        style={{ marginTop: 16 }}
                        grid={{ gutter: 12, column: 2 }}
                        dataSource={images}
                        renderItem={(img) => {
                            const iid = img.Image_ID || img.id;
                            const isMain = !!img.IsMain;
                            const removing = imgBusy.delId === iid;
                            const settingMain = imgBusy.mainId === iid;

                            return (
                                <List.Item key={iid}>
                                    <Badge.Ribbon text={isMain ? "Ảnh chính" : ""} color="gold">
                                        <Card
                                            size="small"
                                            hoverable
                                            cover={
                                                <SmartImg
                                                    src={buildImgSrc(img)}
                                                    alt={img.Image_name || img.name || "image"}
                                                    style={{ height: 170, objectFit: "cover" }}
                                                />
                                            }
                                            actions={[
                                                <Button
                                                    key="main"
                                                    type="text"
                                                    onClick={() => setMainImage(img)}
                                                    disabled={isMain || settingMain}
                                                    loading={settingMain}
                                                >
                                                    Đặt ảnh chính
                                                </Button>,
                                                <Popconfirm
                                                    key="del"
                                                    title="Xoá ảnh này?"
                                                    okText="Xoá"
                                                    cancelText="Hủy"
                                                    onConfirm={() => removeImage(img)}
                                                >
                                                    <Button
                                                        danger
                                                        type="text"
                                                        loading={removing}
                                                        disabled={removing}
                                                    >
                                                        Xoá ảnh
                                                    </Button>
                                                </Popconfirm>,
                                            ]}
                                        />
                                    </Badge.Ribbon>
                                </List.Item>
                            );
                        }}
                    />
                </Drawer>

                <OwnerAmenityRuleDrawer
                    open={arOpen}
                    onClose={() => setArOpen(false)}
                    homestay={arHomestay}
                    onSaved={() => { setArOpen(false); fetchMine(); }}
                />
            </Layout.Content>
        </Layout>
    );
}
