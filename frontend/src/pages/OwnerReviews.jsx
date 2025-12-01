// src/pages/OwnerReviews.jsx
import React from "react";
import {
    Layout, Row, Col, Card, Typography, Space, Select, Button, Input,
    Table, Rate, Tag, Empty, message, Statistic, Modal, Popconfirm, Tooltip, Divider, Avatar
} from "antd";
import {
    StarOutlined, ReloadOutlined, HomeOutlined, SearchOutlined, FilterOutlined,
    MessageOutlined, EyeOutlined, EyeInvisibleOutlined, DeleteOutlined,
    EditOutlined, PlusOutlined, LikeOutlined, UserOutlined, FireOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import { homestaysApi } from "../services/homestays";
import { reviewsApi } from "../services/reviews";

const { Text, Title } = Typography;
const ALL_KEY = "__ALL__";

// Small helper badge
const Pill = ({ color = "green", children }) => (
    <span
        style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 10px",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 999,
            background: `var(--pill-${color}-bg, rgba(16,185,129,.12))`,
            color: `var(--pill-${color}-fg, #047857)`,
            border: `1px solid var(--pill-${color}-bd, rgba(16,185,129,.35))`,
            transition: "all .2s ease",
        }}
    >
        {children}
    </span>
);

export default function OwnerReviews() {
    const { user, logout } = useAuth();

    // Homestay & params
    const [homes, setHomes] = React.useState([]);
    const [hid, setHid] = React.useState(ALL_KEY);

    // List reviews
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);

    // Paging + filters (FE)
    const [page, setPage] = React.useState(1);
    const [size, setSize] = React.useState(10);
    const [q, setQ] = React.useState("");
    const [minStar, setMinStar] = React.useState(null);

    // New reply UI
    const [replyFor, setReplyFor] = React.useState(null);
    const [replyText, setReplyText] = React.useState("");
    const [replySaving, setReplySaving] = React.useState(false);

    // Edit reply UI
    const [editingReply, setEditingReply] = React.useState(null); // { Reply_ID, Content, ... }
    const [editText, setEditText] = React.useState("");
    const [editSaving, setEditSaving] = React.useState(false);

    // Load homestays của owner (giữ ALL_KEY mặc định)
    React.useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await homestaysApi.myList();
                const list = Array.isArray(res) ? res : res?.homestays || [];
                if (!alive) return;
                setHomes(list);
            } catch (e) {
                message.error("Không tải được danh sách homestay.");
                console.log("[OwnerReviews] homestaysApi.myList error:", e?.response?.data || e?.message || e);
            }
        })();
        return () => { alive = false; };
    }, []);

    // Gọi API lấy review theo H_ID
    const fetchReviewsOne = React.useCallback(async (h, p = page, s = size) => {
        if (!h) return [];
        const sz = Math.max(20, s);
        const data = await reviewsApi.listByHomestay(h, { page: p, size: sz });
        const list =
            (Array.isArray(data) && data) ||
            data?.data || data?.rows || data?.items || [];
        return Array.isArray(list) ? list : [];
    }, [page, size]);

    // Gộp review của tất cả homestay owner
    const fetchReviewsAll = React.useCallback(async () => {
        const items = [];
        for (const h of homes) {
            const hId = h.H_ID || h.id;
            try {
                const list = await fetchReviewsOne(hId, 1, Math.max(20, size));
                list.forEach(r => items.push({ ...r, __HName: h.H_Name || h.name || `Homestay #${hId}` }));
            } catch (e) {
                console.log("[OwnerReviews] fetch one failed (ignore):", hId, e?.response?.status);
            }
        }
        items.sort((a, b) => Number(b.Review_ID) - Number(a.Review_ID));
        return items;
    }, [homes, fetchReviewsOne, size]);

    // Trigger mỗi khi đổi homestay / trang / size
    const reload = React.useCallback(async () => {
        if (!hid && hid !== ALL_KEY) return;
        setLoading(true);
        try {
            const list = hid === ALL_KEY ? await fetchReviewsAll()
                : await fetchReviewsOne(hid, page, size);
            setRows(list);
        } catch (e) {
            message.error(e?.response?.data?.message || "Không tải được đánh giá.");
            console.log("[OwnerReviews] fetch error:", e?.response?.status, e?.response?.data || e?.message);
        } finally {
            setLoading(false);
        }
    }, [hid, page, size, fetchReviewsOne, fetchReviewsAll]);

    React.useEffect(() => { reload(); }, [reload]);

    const onRefresh = () => reload();

    // Quick stats FE
    const stats = React.useMemo(() => {
        if (!rows?.length) return { count: 0, avg: 0, five: 0, four: 0, three: 0, two: 0, one: 0 };
        const count = rows.length;
        const avg = Number(rows.reduce((s, r) => s + (Number(r.Rating) || 0), 0) / count).toFixed(2);
        const bucket = { five: 0, four: 0, three: 0, two: 0, one: 0 };
        rows.forEach(r => {
            const k = Number(r.Rating) || 0;
            if (k >= 5) bucket.five++; else if (k >= 4) bucket.four++;
            else if (k >= 3) bucket.three++; else if (k >= 2) bucket.two++;
            else if (k >= 1) bucket.one++;
        });
        return { count, avg, ...bucket };
    }, [rows]);

    // Lọc FE
    const filtered = React.useMemo(() => {
        const qq = q.trim().toLowerCase();
        return (rows || []).filter(r => {
            const okStar = minStar ? Number(r.Rating || 0) >= Number(minStar) : true;
            if (!qq) return okStar;
            const author = (r.author || r.U_Fullname || "").toLowerCase();
            const content = (r.Content || "").toLowerCase();
            const home = (r.__HName || "").toLowerCase();
            return okStar && (author.includes(qq) || content.includes(qq) || home.includes(qq));
        });
    }, [rows, q, minStar]);

    // ======= TABLE COLUMNS =======
    const columns = [
        {
            title: "Đánh giá",
            dataIndex: "Rating",
            width: 180,
            render: (v) => (
                <Space>
                    <Rate disabled allowHalf value={Number(v) || 0} />
                    <Pill color="yellow">{Number(v) || 0}★</Pill>
                </Space>
            ),
        },
        {
            title: "Người đánh giá",
            dataIndex: "author",
            render: (t, r) => (
                <Space>
                    <Avatar size={24} icon={<UserOutlined />} />
                    <Text strong>{t || r.U_Fullname || `User #${r.U_ID}`}</Text>
                </Space>
            ),
            ellipsis: true,
        },
        {
            title: "Nội dung",
            dataIndex: "Content",
            render: (t) => t ? <span style={{ lineHeight: 1.4 }}>{t}</span> : <Text type="secondary">—</Text>,
            ellipsis: true,
        },
        {
            title: "Ngày",
            dataIndex: "Created_at",
            width: 160,
            render: (v) => dayjs(v).isValid() ? dayjs(v).format("DD/MM/YYYY HH:mm") : "-",
        },
        {
            title: "Mã đơn",
            dataIndex: "Booking_ID",
            width: 100,
            align: "center",
            render: (id) => <Pill color="blue">#{id}</Pill>
        },
        {
            title: "Homestay",
            dataIndex: "__HName",
            render: (t) => t || <Text type="secondary">—</Text>,
            ellipsis: true,
            hidden: hid !== ALL_KEY,
        },
        {
            title: "Hành động",
            key: "act",
            fixed: "right",
            width: 260,
            render: (_, r) => {
                const hasReplies = Array.isArray(r.replies) && r.replies.length > 0;
                return (
                    <Space wrap>
                        <Tooltip title={hasReplies ? "Thêm phản hồi khác" : "Phản hồi"}>
                            <Button
                                type="primary"
                                ghost
                                icon={<PlusOutlined />}
                                onClick={() => { setReplyFor(r); setReplyText(""); }}
                            >
                                {hasReplies ? "Thêm phản hồi" : "Phản hồi"}
                            </Button>
                        </Tooltip>
                        <Tooltip title={hasReplies ? "Xem phản hồi" : "Chưa có phản hồi"}>
                            <Button
                                icon={<MessageOutlined />}
                                onClick={() => {
                                    const key = r.Review_ID;
                                    const row = document.querySelector(`tr[data-row-key="${key}"]`);
                                    row?.querySelector(".ant-table-row-expand-icon")?.click();
                                }}
                                disabled={!hasReplies}
                            >
                                Xem
                            </Button>
                        </Tooltip>
                    </Space>
                );
            }
        }
    ].filter(c => !c.hidden);

    // Xoá một reply
    const onDeleteReply = async (replyId) => {
        try {
            await reviewsApi.removeReply(replyId);
            message.success("Đã xoá phản hồi");
            await reload();
        } catch (e) {
            message.error(e?.response?.data?.message || "Xoá phản hồi thất bại");
        }
    };

    // Row replies (decor)
    const expandedRowRender = (r) => (
        <div style={{ paddingLeft: 8 }}>
            {(Array.isArray(r.replies) ? r.replies : []).length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<Text type="secondary">Chưa có phản hồi từ Owner</Text>}
                />
            ) : (
                (r.replies || []).map(rep => (
                    <Card
                        key={rep.Reply_ID}
                        size="small"
                        style={{
                            marginBottom: 10,
                            borderRadius: 12,
                            background:
                                "linear-gradient(135deg, rgba(236,253,245,1) 0%, rgba(209,250,229,1) 100%)",
                            border: "1px solid rgba(16,185,129,.35)",
                            transition: "transform .15s ease",
                        }}
                        bodyStyle={{ padding: 12 }}
                        className="reply-card"
                        onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                    >
                        <Space wrap align="start" style={{ width: "100%", justifyContent: "space-between" }}>
                            <Space wrap>
                                <Pill color="green"><MessageOutlined style={{ marginRight: 6 }} />Owner phản hồi</Pill>
                                <span style={{ whiteSpace: "pre-wrap" }}>{rep.Content}</span>
                                <Text type="secondary">
                                    {dayjs(rep.Created_at).isValid()
                                        ? dayjs(rep.Created_at).format("DD/MM/YYYY HH:mm")
                                        : ""}
                                </Text>
                            </Space>
                            <Space>
                                <Tooltip title="Sửa phản hồi">
                                    <Button
                                        size="small"
                                        type="default"
                                        icon={<EditOutlined />}
                                        onClick={() => { setEditingReply(rep); setEditText(rep.Content || ""); }}
                                    />
                                </Tooltip>
                                <Popconfirm
                                    title="Xoá phản hồi này?"
                                    okText="Xoá"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => onDeleteReply(rep.Reply_ID)}
                                >
                                    <Button size="small" danger icon={<DeleteOutlined />} />
                                </Popconfirm>
                            </Space>
                        </Space>
                    </Card>
                ))
            )}
        </div>
    );

    // Options cho Select
    const selectOptions = React.useMemo(() => {
        const base = (homes || []).map(h => ({
            value: h.H_ID || h.id, label: h.H_Name || h.name || `Homestay #${h.H_ID}`
        }));
        return [{ value: ALL_KEY, label: "Tất cả" }, ...base];
    }, [homes]);

    // CSS-in-JS (nhẹ)
    const shell = {
        "--pill-yellow-bg": "rgba(250, 204, 21, .12)",
        "--pill-yellow-bd": "rgba(250, 204, 21, .35)",
        "--pill-yellow-fg": "#92400e",
        "--pill-blue-bg": "rgba(59,130,246,.12)",
        "--pill-blue-bd": "rgba(59,130,246,.35)",
        "--pill-blue-fg": "#1e3a8a",
        "--pill-green-bg": "rgba(16,185,129,.12)",
        "--pill-green-bd": "rgba(16,185,129,.35)",
        "--pill-green-fg": "#065f46",
    };

    return (
        <Layout style={{ minHeight: "100vh", background: "#f6f9ff", ...shell }}>
            <TopBar user={user} role="Owner" onLogout={logout} />
            <Layout.Content style={{ padding: 24, maxWidth: 1220, margin: "0 auto" }}>
                {/* Header */}
                <Card
                    bordered={false}
                    bodyStyle={{ padding: 18 }}
                    style={{
                        borderRadius: 20,
                        background:
                            "linear-gradient(135deg, rgba(139,92,246,.14) 0%, rgba(59,130,246,.12) 100%)",
                        boxShadow: "0 24px 60px rgba(15,23,42,.10)",
                        marginBottom: 12,
                        border: "1px solid rgba(99,102,241,.25)"
                    }}
                    title={
                        <Space align="center" size={14}>
                            <div
                                style={{
                                    width: 48, height: 48, borderRadius: 16, display: "grid", placeItems: "center",
                                    background: "linear-gradient(135deg,#8b5cf6,#22d3ee)",
                                    color: "#fff", boxShadow: "0 14px 28px rgba(79,70,229,.35)"
                                }}
                            >
                                <StarOutlined />
                            </div>
                            <Title level={4} style={{ margin: 0 }}>Quản lý đánh giá</Title>
                            <Pill color="blue"><FireOutlined style={{ marginRight: 6 }} /> Realtime</Pill>
                        </Space>
                    }
                    extra={
                        <Space>
                            <Select
                                style={{ minWidth: 340 }}
                                value={hid ?? ALL_KEY}
                                onChange={(v) => { setHid(v); setPage(1); }}
                                options={selectOptions}
                                placeholder="Chọn homestay"
                                suffixIcon={<HomeOutlined />}
                            />
                            <Tooltip title="Tải lại">
                                <Button icon={<ReloadOutlined />} onClick={onRefresh}>Làm mới</Button>
                            </Tooltip>
                        </Space>
                    }
                />

                {/* Quick stats */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={6}>
                        <Card bordered={false} style={{
                            borderRadius: 18,
                            boxShadow: "0 18px 40px rgba(15,23,42,.08)",
                            border: "1px solid rgba(99,102,241,.15)"
                        }}>
                            <Space>
                                <Avatar shape="square" style={{ background: "#EEF2FF", color: "#4338CA" }} icon={<MessageOutlined />} />
                                <Statistic title="Số đánh giá" value={stats.count} />
                            </Space>
                        </Card>
                    </Col>
                    <Col xs={24} md={6}>
                        <Card bordered={false} style={{
                            borderRadius: 18,
                            boxShadow: "0 18px 40px rgba(15,23,42,.08)",
                            border: "1px solid rgba(16,185,129,.18)"
                        }}>
                            <Space>
                                <Avatar shape="square" style={{ background: "#ECFDF5", color: "#047857" }} icon={<LikeOutlined />} />
                                <Statistic title="Điểm TB" value={Number(stats.avg || 0)} suffix="★" precision={2} />
                            </Space>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card bordered={false} style={{
                            borderRadius: 18,
                            boxShadow: "0 18px 40px rgba(15,23,42,.08)",
                            border: "1px solid rgba(59,130,246,.15)"
                        }}>
                            <Space wrap>
                                <Tag color="gold">5★ {stats.five}</Tag>
                                <Tag color="cyan">4★ {stats.four}</Tag>
                                <Tag color="blue">3★ {stats.three}</Tag>
                                <Tag color="purple">2★ {stats.two}</Tag>
                                <Tag color="red">1★ {stats.one}</Tag>
                            </Space>
                        </Card>
                    </Col>
                </Row>

                {/* Filters */}
                <Card
                    bordered={false}
                    style={{
                        borderRadius: 18, marginTop: 12,
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
                                placeholder="Tìm theo người viết, nội dung hoặc homestay…"
                                value={q}
                                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                            />
                            <Select
                                allowClear
                                style={{ width: 220 }}
                                placeholder={<><FilterOutlined />&nbsp;Lọc theo số sao</>}
                                value={minStar}
                                onChange={(v) => { setMinStar(v || null); setPage(1); }}
                                options={[5, 4, 3, 2, 1].map(n => ({ value: n, label: `Từ ${n}★` }))}
                            />
                        </Space>

                        <Space>
                            <Select
                                value={size}
                                onChange={(v) => { setSize(v); setPage(1); }}
                                options={[10, 15, 20, 50].map(n => ({ value: n, label: `Hiển thị ${n}/trang` }))}
                            />
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
                                                <Text type="secondary">Chưa có đánh giá</Text>
                                                <Text type="secondary">Hãy khuyến khích khách để lại đánh giá sau khi hoàn tất đơn.</Text>
                                            </Space>
                                        }
                                    />
                                </div>
                            )
                        }}
                        size="middle"
                        expandable={{ expandedRowRender }}
                        onRow={() => ({
                            style: {
                                transition: "background .2s ease",
                            },
                            onMouseEnter: (e) => (e.currentTarget.style.background = "rgba(99,102,241,.05)"),
                            onMouseLeave: (e) => (e.currentTarget.style.background = "transparent"),
                        })}
                    />
                </Card>
            </Layout.Content>

            {/* Modal Thêm phản hồi */}
            <Modal
                title={(
                    <Space>
                        <MessageOutlined />
                        <span>Phản hồi đánh giá</span>
                    </Space>
                )}
                open={!!replyFor}
                okText="Gửi"
                cancelText="Huỷ"
                okButtonProps={{ icon: <EyeOutlined /> }}
                confirmLoading={replySaving}
                onCancel={() => setReplyFor(null)}
                onOk={async () => {
                    if (!replyText.trim()) return message.warning("Nhập nội dung phản hồi");
                    try {
                        setReplySaving(true);
                        await reviewsApi.reply(replyFor.Review_ID, replyText.trim());
                        message.success("Đã gửi phản hồi");
                        setReplyFor(null);
                        setReplyText("");
                        await reload();
                    } catch (e) {
                        message.error(e?.response?.data?.message || "Gửi phản hồi thất bại");
                    } finally {
                        setReplySaving(false);
                    }
                }}
            >
                <Input.TextArea
                    rows={4}
                    placeholder="Nội dung phản hồi..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                />
                <Divider style={{ margin: "12px 0" }} />
                <Text type="secondary">Phản hồi lịch sự, tập trung giải quyết vấn đề để tăng uy tín homestay.</Text>
            </Modal>

            {/* Modal Sửa phản hồi */}
            <Modal
                title={(
                    <Space>
                        <EditOutlined />
                        <span>Sửa phản hồi</span>
                    </Space>
                )}
                open={!!editingReply}
                okText="Lưu"
                cancelText="Huỷ"
                okButtonProps={{ icon: <EyeInvisibleOutlined /> }}
                confirmLoading={editSaving}
                onCancel={() => setEditingReply(null)}
                onOk={async () => {
                    if (!editText.trim()) return message.warning("Nhập nội dung phản hồi");
                    try {
                        setEditSaving(true);
                        await reviewsApi.updateReply(editingReply.Reply_ID, editText.trim());
                        message.success("Đã cập nhật phản hồi");
                        setEditingReply(null);
                        setEditText("");
                        await reload();
                    } catch (e) {
                        message.error(e?.response?.data?.message || "Cập nhật phản hồi thất bại");
                    } finally {
                        setEditSaving(false);
                    }
                }}
            >
                <Input.TextArea
                    rows={4}
                    placeholder="Nội dung phản hồi..."
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                />
                <Divider style={{ margin: "12px 0" }} />
                <Text type="secondary">Giữ tông giọng thân thiện và giải thích rõ ràng.</Text>
            </Modal>
        </Layout>
    );
}
