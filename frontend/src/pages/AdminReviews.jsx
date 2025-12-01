// src/pages/AdminReviews.jsx
import React from "react";
import {
    Layout, Card, Space, Typography, Input, Select, Button, Tag,
    Table, Rate, Empty, message, Popconfirm, Tooltip, Avatar, Divider
} from "antd";
import {
    SearchOutlined, FilterOutlined, ReloadOutlined, EyeInvisibleOutlined,
    EyeOutlined, DeleteOutlined, HomeOutlined, StarOutlined, UserOutlined,
    FireOutlined, EyeTwoTone
} from "@ant-design/icons";
import dayjs from "dayjs";
import axios from "axios";

import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import { reviewsApi } from "../services/reviews";

const { Text, Title } = Typography;

// small helper badge
const Pill = ({ color = "blue", children }) => (
    <span
        style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 10px",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 999,
            background: `var(--pill-${color}-bg, rgba(59,130,246,.12))`,
            color: `var(--pill-${color}-fg, #1e3a8a)`,
            border: `1px solid var(--pill-${color}-bd, rgba(59,130,246,.35))`,
            transition: "all .2s ease",
        }}
    >
        {children}
    </span>
);

const buildApiBase = () => {
    const b = import.meta.env.VITE_API_BASE;
    if (b) return b.replace(/\/+$/, "");
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3000/api`;
};
const http = axios.create({ withCredentials: true });

export default function AdminReviews() {
    const { user, logout } = useAuth();
    const [loading, setLoading] = React.useState(false);

    const [homes, setHomes] = React.useState([]);    // luôn là ALL homestays
    const [rows, setRows] = React.useState([]);

    const [hid, setHid] = React.useState("__ALL__");
    const [q, setQ] = React.useState("");
    const [minStar, setMinStar] = React.useState(null);
    const [visibleOnly, setVisibleOnly] = React.useState(null);

    const [page, setPage] = React.useState(1);
    const [size, setSize] = React.useState(10);

    const mapHomeName = React.useMemo(() => {
        const m = new Map();
        for (const h of homes) m.set(h.H_ID ?? h.id, h.H_Name ?? h.name ?? `Homestay #${h.H_ID ?? h.id}`);
        return m;
    }, [homes]);

    // Lấy ALL homestays (kể cả chưa có review). Fallback cuối cùng mới dùng /reviews/admin/h-ids.
    const loadAllHomes = React.useCallback(async () => {
        const base = buildApiBase();
        // 1) BE riêng cho admin
        try {
            const r = await http.get(`${base}/admin/homestays`);
            const list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : []);
            if (list?.length) return list;
        } catch (e) { /* ignore */ }
        // 2) Public homestays
        try {
            const r = await http.get(`${base}/homestays`);
            const list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : []);
            if (list?.length) return list;
        } catch (e) { /* ignore */ }
        // 3) Fallback: chỉ có các homestay đã có review (KHÔNG ưu tiên, chỉ khi 1 & 2 hỏng)
        try {
            const r = await http.get(`${base}/reviews/admin/h-ids`);
            const list = Array.isArray(r?.data?.data)
                ? r.data.data.map(x => (x.H_ID ? x : { H_ID: x, H_Name: `Homestay #${x}` }))
                : [];
            return list;
        } catch (e) { return []; }
    }, []);

    // luôn truyền H_ID kiểu số cho API
    const fetchOneHomestayReviews = React.useCallback(async (hidRaw) => {
        const id = (hidRaw && typeof hidRaw === "object") ? (hidRaw.H_ID ?? hidRaw.id) : hidRaw;
        if (!id) return [];
        const data = await reviewsApi.listByHomestay(id, { page: 1, size: 50 });
        const arr = (Array.isArray(data) && data) || data?.data || [];
        return (arr || []).map(r => ({ ...r, __HName: mapHomeName.get(id) || `Homestay #${id}` }));
    }, [mapHomeName]);

    const reload = React.useCallback(async () => {
        setLoading(true);
        try {
            const hs = homes.length ? homes : await loadAllHomes();
            if (!homes.length) setHomes(hs);

            if (!hs.length) {
                setRows([]);
                setLoading(false);
                return;
            }

            // ép selectedId thành số nếu cần
            const selectedId = (hid && typeof hid === "object") ? (hid.H_ID ?? hid.id) : hid;
            const list = selectedId === "__ALL__" ? hs : hs.filter(h => (h.H_ID ?? h.id) === Number(selectedId));

            let items = [];
            for (const h of list) {
                const id = h.H_ID ?? h.id;
                try {
                    const chunk = await fetchOneHomestayReviews(id);
                    items = items.concat(chunk);
                } catch (e) {
                    console.log("[AdminReviews] fetch reviews fail:", { H_ID: id, H_Name: h.H_Name }, e?.response?.status);
                }
            }
            items.sort((a, b) => Number(b.Review_ID) - Number(a.Review_ID));
            setRows(items);

            // 🔔 Nếu chọn 1 homestay và không có review ⇒ báo thông tin
            if (selectedId !== "__ALL__" && items.length === 0) {
                const name = mapHomeName.get(Number(selectedId)) || `Homestay #${selectedId}`;
                message.info(`Homestay "${name}" hiện chưa có đánh giá.`);
            }
        } catch (e) {
            console.error("[AdminReviews] reload error:", e);
            message.error("Không tải được danh sách đánh giá");
        } finally {
            setLoading(false);
        }
    }, [homes, hid, loadAllHomes, fetchOneHomestayReviews, mapHomeName]);

    React.useEffect(() => { reload(); }, [reload]);

    const filtered = React.useMemo(() => {
        const qq = q.trim().toLowerCase();
        return rows.filter(r => {
            if (visibleOnly !== null) {
                const vis = Number(r.Is_visible ?? 1) === 1;
                if (visibleOnly !== vis) return false;
            }
            if (minStar && Number(r.Rating || 0) < Number(minStar)) return false;
            if (hid !== "__ALL__" && Number(r.H_ID) !== Number(((typeof hid === "object") ? (hid.H_ID ?? hid.id) : hid))) return false;

            if (!qq) return true;
            const author = (r.author || r.U_Fullname || "").toLowerCase();
            const content = (r.Content || "").toLowerCase();
            const hname = (r.__HName || "").toLowerCase();
            return author.includes(qq) || content.includes(qq) || hname.includes(qq);
        });
    }, [rows, q, minStar, visibleOnly, hid]);

    const onToggleVisible = async (r) => {
        try {
            const target = !(Number(r.Is_visible ?? 1) === 1);
            await reviewsApi.adminToggleVisible(r.Review_ID, target);
            message.success(target ? "Đã hiện đánh giá" : "Đã ẩn đánh giá");
            await reload();
        } catch (e) {
            message.error(e?.response?.data?.message || "Không cập nhật được trạng thái");
        }
    };

    const onDelete = async (r) => {
        try {
            await reviewsApi.adminRemove(r.Review_ID);
            message.success("Đã xoá đánh giá");
            await reload();
        } catch (e) {
            message.error(e?.response?.data?.message || "Xoá đánh giá thất bại");
        }
    };

    // ==== UI Columns (decor) ====
    const columns = [
        {
            title: "Sao",
            dataIndex: "Rating",
            width: 170,
            render: (v) => (
                <Space>
                    <Rate disabled allowHalf value={Number(v) || 0} />
                    <Pill color="yellow">{Number(v) || 0}★</Pill>
                </Space>
            ),
        },
        {
            title: "Khách",
            dataIndex: "author",
            render: (t, r) => (
                <Space>
                    <Avatar size={24} icon={<UserOutlined />} />
                    <Text strong>{t || r.U_Fullname || `User #${r.U_ID}`}</Text>
                </Space>
            ),
            ellipsis: true
        },
        { title: "Nội dung", dataIndex: "Content", render: (t) => t || <Text type="secondary">—</Text>, ellipsis: true },
        {
            title: "Ngày",
            dataIndex: "Created_at",
            width: 160,
            render: (v) => dayjs(v).isValid() ? dayjs(v).format("DD/MM/YYYY HH:mm") : "-",
        },
        {
            title: "Đơn",
            dataIndex: "Booking_ID",
            width: 90,
            align: "center",
            render: (id) => <Pill color="blue">#{id}</Pill>
        },
        {
            title: "Homestay",
            dataIndex: "__HName",
            width: 220,
            ellipsis: true,
            render: (t) => t || <Text type="secondary">—</Text>
        },
        {
            title: "Trạng thái",
            dataIndex: "Is_visible",
            width: 120,
            render: (v) =>
                Number(v ?? 1) === 1
                    ? <Tag color="green" style={{ borderRadius: 999 }}>Hiển thị</Tag>
                    : <Tag style={{ borderRadius: 999 }}>Đang ẩn</Tag>
        },
        {
            title: "Hành động",
            key: "act",
            fixed: "right",
            width: 210,
            render: (_, r) => (
                <Space>
                    <Tooltip title={Number(r.Is_visible ?? 1) === 1 ? "Ẩn đánh giá" : "Hiện đánh giá"}>
                        <Button
                            icon={Number(r.Is_visible ?? 1) === 1 ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                            onClick={() => onToggleVisible(r)}
                        >
                            {Number(r.Is_visible ?? 1) === 1 ? "Ẩn" : "Hiện"}
                        </Button>
                    </Tooltip>
                    <Popconfirm
                        title="Xoá đánh giá này?"
                        okText="Xoá"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => onDelete(r)}
                    >
                        <Tooltip title="Xoá vĩnh viễn">
                            <Button danger icon={<DeleteOutlined />}>Xoá</Button>
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const selectHomes = React.useMemo(() => {
        // Dropdown luôn có ALL homestay (kể cả chưa có review)
        return [{ value: "__ALL__", label: "Tất cả homestay" }].concat(
            (homes || []).map(h => ({
                value: Number(h.H_ID ?? h.id),
                label: h.H_Name ?? h.name ?? `Homestay #${h.H_ID ?? h.id}`
            }))
        );
    }, [homes]);

    // CSS variables cho badge màu
    const shell = {
        "--pill-yellow-bg": "rgba(250, 204, 21, .12)",
        "--pill-yellow-bd": "rgba(250, 204, 21, .35)",
        "--pill-yellow-fg": "#92400e",
        "--pill-blue-bg": "rgba(59,130,246,.12)",
        "--pill-blue-bd": "rgba(59,130,246,.35)",
        "--pill-blue-fg": "#1e3a8a",
    };

    return (
        <Layout style={{ minHeight: "100vh", background: "#f6f9ff", ...shell }}>
            <TopBar user={user} role="Admin" onLogout={logout} />
            <Layout.Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
                {/* Header */}
                <Card
                    bordered={false}
                    bodyStyle={{ padding: 18 }}
                    style={{
                        borderRadius: 20,
                        background: "linear-gradient(135deg, rgba(99,102,241,.14) 0%, rgba(59,130,246,.12) 100%)",
                        boxShadow: "0 24px 60px rgba(15,23,42,.10)",
                        marginBottom: 12,
                        border: "1px solid rgba(99,102,241,.25)"
                    }}
                    title={
                        <Space align="center" size={14}>
                            <div
                                style={{
                                    width: 48, height: 48, borderRadius: 16, display: "grid", placeItems: "center",
                                    background: "linear-gradient(135deg,#6366f1,#22d3ee)",
                                    color: "#fff", boxShadow: "0 14px 28px rgba(79,70,229,.35)"
                                }}
                            >
                                <StarOutlined />
                            </div>
                            <Title level={4} style={{ margin: 0 }}>Quản lý đánh giá</Title>
                            <Pill color="blue"><FireOutlined style={{ marginRight: 6 }} />Monitor</Pill>
                        </Space>
                    }
                    extra={
                        <Space>
                            <Select
                                style={{ minWidth: 340 }}
                                value={hid}
                                onChange={(v) => { setHid(v); setPage(1); }}
                                options={selectHomes}
                                suffixIcon={<HomeOutlined />}
                            />
                            <Tooltip title="Tải lại">
                                <Button icon={<ReloadOutlined />} onClick={reload}>Làm mới</Button>
                            </Tooltip>
                        </Space>
                    }
                />

                {/* Filters */}
                <Card
                    bordered={false}
                    style={{
                        borderRadius: 18, marginTop: 8,
                        boxShadow: "0 18px 40px rgba(15,23,42,.08)",
                        border: "1px solid rgba(226,232,240,.8)"
                    }}
                    bodyStyle={{ padding: 14 }}
                >
                    <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
                        <Space>
                            <Input
                                allowClear
                                style={{ minWidth: 320 }}
                                prefix={<SearchOutlined />}
                                placeholder="Tìm theo khách, nội dung hoặc tên homestay…"
                                value={q}
                                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                            />
                            <Select
                                allowClear
                                style={{ width: 200 }}
                                placeholder={<><FilterOutlined />&nbsp;Lọc theo số sao</>}
                                value={minStar}
                                onChange={(v) => { setMinStar(v || null); setPage(1); }}
                                options={[5, 4, 3, 2, 1].map(n => ({ value: n, label: `Từ ${n}★` }))}
                            />
                            <Select
                                allowClear
                                style={{ width: 200 }}
                                placeholder="Trạng thái hiển thị"
                                value={visibleOnly}
                                onChange={(v) => { setVisibleOnly(v ?? null); setPage(1); }}
                                options={[{ value: true, label: "Chỉ đang hiển thị" }, { value: false, label: "Chỉ đang ẩn" }]}
                            />
                        </Space>
                        <Space>
                            <Select value={size} onChange={(v) => { setSize(v); setPage(1); }} options={[10, 15, 20, 50].map(n => ({ value: n, label: `Hiển thị ${n}/trang` }))} />
                        </Space>
                    </Space>
                </Card>

                {/* Table */}
                <Card
                    bordered={false}
                    style={{
                        borderRadius: 18, marginTop: 12,
                        boxShadow: "0 18px 40px rgba(15,23,42,.08)",
                        border: "1px solid rgba(226,232,240,.8)"
                    }}
                    bodyStyle={{ padding: 0 }}
                >
                    <Table
                        rowKey={(r) => r.Review_ID}
                        columns={columns}
                        dataSource={filtered}
                        loading={loading}
                        pagination={{
                            current: page,
                            pageSize: size,
                            total: filtered.length,
                            onChange: (p, ps) => { setPage(p); setSize(ps); },
                            showSizeChanger: false
                        }}
                        locale={{
                            emptyText: (
                                <div style={{ padding: 32 }}>
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description={
                                            <Space direction="vertical" size={0}>
                                                <Text type="secondary">
                                                    {hid === "__ALL__"
                                                        ? "Chưa có đánh giá"
                                                        : "Homestay đã chọn hiện chưa có đánh giá."}
                                                </Text>
                                                {hid === "__ALL__"
                                                    ? <Text type="secondary">Hãy kiểm tra lại phạm vi lọc.</Text>
                                                    : <Text type="secondary">Chọn homestay khác hoặc đợi khách để lại đánh giá.</Text>}
                                            </Space>
                                        }
                                    />
                                </div>
                            )
                        }}
                        size="middle"
                        onRow={() => ({
                            style: { transition: "background .2s ease" },
                            onMouseEnter: (e) => (e.currentTarget.style.background = "rgba(99,102,241,.05)"),
                            onMouseLeave: (e) => (e.currentTarget.style.background = "transparent"),
                        })}
                    />
                </Card>
                <Divider style={{ opacity: .4 }} />
                <Space direction="vertical" size={4} style={{ opacity: .85 }}>
                    <Space>
                        <EyeTwoTone twoToneColor="#10b981" />
                        <Text>
                            <b>Ẩn</b>: Đánh giá sẽ không còn hiển thị với khách trên website,
                            nhưng vẫn được lưu trong hệ thống để Admin có thể xử lý bất cứ lúc nào.
                        </Text>
                    </Space>
                    <Space>
                        <DeleteOutlined style={{ color: "#ef4444" }} />
                        <Text>
                            <b>Xoá</b>: Đánh giá sẽ bị xóa vĩnh viễn khỏi cơ sở dữ liệu và không thể khôi phục.
                        </Text>
                    </Space>
                </Space>

            </Layout.Content>
        </Layout>
    );
}
