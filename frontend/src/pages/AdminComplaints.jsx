// src/pages/AdminComplaints.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Layout,
    Card,
    Table,
    Tag,
    Space,
    Button,
    Typography,
    Select,
    message,
    Modal,
    Descriptions,
    Tooltip,
    Badge,
    Statistic,
    Divider,
} from "antd";
import {
    AlertOutlined,
    EyeOutlined,
    CheckCircleTwoTone,
    ClockCircleTwoTone,
    CloseCircleTwoTone,
    ArrowLeftOutlined,
    ThunderboltOutlined,
    MailOutlined,
    SyncOutlined,
    HomeOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import { complaintsApi } from "../services/complaints";

const { Title, Text, Paragraph } = Typography;

export default function AdminComplaints() {
    const { user, logout } = useAuth();
    const nav = useNavigate();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [viewing, setViewing] = useState(null);
    const [replying, setReplying] = useState(null); // complaint đang reply
    const [replyText, setReplyText] = useState(""); // nội dung phản hồi
    const [sending, setSending] = useState(false); // loading khi gửi mail

    /* ============ UI styles ============ */
    const pageBg = {
        minHeight: "100vh",
        background:
            "radial-gradient(1000px 280px at 50% 0%, rgba(59,130,246,.08), transparent 70%)," +
            "radial-gradient(900px 260px at 0% 20%, rgba(16,185,129,.08), transparent 60%)," +
            "radial-gradient(900px 260px at 100% 20%, rgba(236,72,153,.06), transparent 60%)," +
            "radial-gradient(900px 260px at 80% 6%, rgba(168,85,247,.10), transparent 60%), #f5fbff",
    };
    const wrap = { padding: 24, maxWidth: 1200, margin: "0 auto" };
    const outerCard = {
        borderRadius: 24,
        background:
            "linear-gradient(135deg, rgba(15,23,42,0.03), rgba(59,130,246,0.06))",
        boxShadow: "0 24px 60px rgba(15,23,42,.08)",
        border: "1px solid rgba(148,163,184,0.3)",
    };
    const innerCard = {
        borderRadius: 18,
        background: "#fff",
        boxShadow: "0 16px 40px rgba(15,23,42,.04)",
        border: "1px solid rgba(226,232,240,0.9)",
    };

    /* ============ Load data ============ */
    const loadComplaints = async () => {
        try {
            setLoading(true);
            const res = await complaintsApi.getAll();

            const list =
                (Array.isArray(res) && res) ||
                (Array.isArray(res?.data) && res.data) ||
                res?.items ||
                res?.rows ||
                res?.list ||
                res?.result ||
                [];

            console.log("[AdminComplaints] list:", list);
            setItems(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("[AdminComplaints] loadComplaints error:", err);
            message.error("Không tải được danh sách khiếu nại");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadComplaints();
    }, []);

    const handleChangeStatus = async (record, newStatus) => {
        if (!record?.Complaint_ID && !record?.C_ID) return;
        const id = record.Complaint_ID || record.C_ID;
        const oldStatus = record.C_Status;

        // Optimistic update
        setItems((prev) =>
            prev.map((c) =>
                (c.Complaint_ID || c.C_ID) === id ? { ...c, C_Status: newStatus } : c
            )
        );

        try {
            await complaintsApi.updateStatus(id, newStatus);
            message.success("Cập nhật trạng thái khiếu nại thành công");
        } catch (err) {
            console.error("[AdminComplaints] updateStatus error:", err);
            message.error("Cập nhật trạng thái thất bại");
            // revert
            setItems((prev) =>
                prev.map((c) =>
                    (c.Complaint_ID || c.C_ID) === id
                        ? { ...c, C_Status: oldStatus }
                        : c
                )
            );
        }
    };

    /* ============ Stats & filter ============ */
    const stats = useMemo(() => {
        const total = items.length;
        let open = 0,
            inProgress = 0,
            resolved = 0,
            closed = 0;

        items.forEach((c) => {
            const s = (c.C_Status || "").toLowerCase();
            if (s === "open") open += 1;
            else if (s === "in_progress" || s === "pending") inProgress += 1;
            else if (s === "resolved") resolved += 1;
            else if (s === "closed") closed += 1;
        });

        return { total, open, inProgress, resolved, closed };
    }, [items]);

    const filteredItems = useMemo(() => {
        if (statusFilter === "all") return items;

        return items.filter((c) => {
            const s = (c.C_Status || "").toLowerCase();
            if (statusFilter === "in_progress") {
                return s === "in_progress" || s === "pending";
            }
            return s === statusFilter;
        });
    }, [items, statusFilter]);

    /* ============ Helpers ============ */
    const renderStatusTag = (status) => {
        const s = (status || "").toLowerCase();

        if (s === "open") {
            return (
                <Tag
                    style={{
                        background: "rgba(59,130,246,.12)",
                        borderColor: "#3b82f6",
                        color: "#1d4ed8",
                        fontWeight: 600,
                        borderRadius: 999,
                    }}
                >
                    Mới tạo
                </Tag>
            );
        }
        if (s === "pending" || s === "in_progress") {
            return (
                <Tag
                    style={{
                        background: "rgba(245,158,11,.15)",
                        borderColor: "#f59e0b",
                        color: "#b45309",
                        fontWeight: 600,
                        borderRadius: 999,
                    }}
                    icon={<ClockCircleTwoTone twoToneColor="#f59e0b" />}
                >
                    Đang xử lý
                </Tag>
            );
        }
        if (s === "resolved") {
            return (
                <Tag
                    style={{
                        background: "rgba(34,197,94,.18)",
                        borderColor: "#22c55e",
                        color: "#15803d",
                        fontWeight: 600,
                        borderRadius: 999,
                    }}
                    icon={<CheckCircleTwoTone twoToneColor="#22c55e" />}
                >
                    Đã xử lý
                </Tag>
            );
        }
        if (s === "closed") {
            return (
                <Tag
                    style={{
                        background: "rgba(239,68,68,.12)",
                        borderColor: "#ef4444",
                        color: "#b91c1c",
                        fontWeight: 600,
                        borderRadius: 999,
                    }}
                    icon={<CloseCircleTwoTone twoToneColor="#ef4444" />}
                >
                    Đã đóng
                </Tag>
            );
        }
        if (!s) return <Tag>Không rõ</Tag>;
        return <Tag>{status}</Tag>;
    };

    /* ============ Table columns ============ */
    const columns = [
        {
            title: "ID",
            dataIndex: "Complaint_ID",
            key: "id",
            width: 90,
            render: (_, record) => {
                const id = record.Complaint_ID || record.C_ID;
                const type = (record.C_Type || "").toLowerCase();

                const isBooking = type === "booking";

                return (
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontWeight: 600,
                        }}
                    >
                        <span
                            style={{
                                background: isBooking ? "#3b82f6" : "#a855f7",
                                color: "white",
                                fontSize: 12,
                                padding: "2px 6px",
                                borderRadius: 8,
                                boxShadow: "0 2px 6px rgba(0,0,0,.15)",
                            }}
                        >
                            {isBooking ? "B" : "G"}
                        </span>

                        <span style={{ fontSize: 14 }}>{id}</span>
                    </span>
                );
            },
        },
        {
            title: "Loại",
            dataIndex: "C_Type",
            key: "type",
            width: 140,
            render: (value) => {
                const t = (value || "").toLowerCase();
                if (t === "booking")
                    return (
                        <Tag
                            color="geekblue"
                            style={{ borderRadius: 999 }}
                            icon={<HomeOutlined />}
                        >
                            Đơn đặt phòng
                        </Tag>
                    );
                if (t === "general")
                    return (
                        <Tag
                            color="purple"
                            style={{ borderRadius: 999 }}
                            icon={<InfoCircleOutlined />}
                        >
                            Góp ý chung
                        </Tag>
                    );
                return <Tag>{value || "Khác"}</Tag>;
            },
        },
        {
            title: "Đơn #",
            dataIndex: "Booking_ID",
            key: "booking",
            width: 110,
            render: (value) =>
                value ? (
                    <Text strong>{`#${value}`}</Text>
                ) : (
                    <Text type="secondary">N/A</Text>
                ),
        },
        {
            title: "Tiêu đề",
            dataIndex: "C_Subject",
            key: "subject",
            ellipsis: true,
            render: (value) => (
                <Tooltip title={value}>
                    <Text style={{ fontWeight: 500 }}>{value || "—"}</Text>
                </Tooltip>
            ),
        },
        {
            title: "Trạng thái",
            dataIndex: "C_Status",
            key: "status",
            width: 160,
            render: (value) => renderStatusTag(value),
        },
        {
            title: "Thời gian",
            dataIndex: "Created_at",
            key: "created",
            width: 190,
            render: (value) => {
                const d = dayjs(value);
                return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : value || "-";
            },
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 320,
            render: (_, record) => {
                const current = (record.C_Status || "").toLowerCase() || "open";
                const canReply = current !== "resolved" && current !== "closed";

                return (
                    <Space size={6}>
                        {/* Nút XEM – xem tiêu đề & nội dung khiếu nại */}
                        <Tooltip title="Xem tiêu đề & nội dung khiếu nại">
                            <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => setViewing(record)}
                                style={{
                                    borderColor: "#60a5fa",
                                    color: "#3b82f6",
                                    borderRadius: 999,
                                    padding: "0 12px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    background: "white",
                                }}
                            >
                                Xem
                            </Button>
                        </Tooltip>

                        <Select
                            size="small"
                            value={current === "pending" ? "in_progress" : current}
                            onChange={(value) => handleChangeStatus(record, value)}
                            style={{
                                width: 130,
                                borderRadius: 8,
                            }}
                            options={[
                                { value: "open", label: "Mới tạo" },
                                { value: "in_progress", label: "Đang xử lý" },
                                { value: "resolved", label: "Đã xử lý" },
                                { value: "closed", label: "Đã đóng" },
                            ]}
                        />

                        <Tooltip title="Gửi phản hồi qua email cho khách">
                            <Button
                                size="small"
                                style={{
                                    background: canReply
                                        ? "linear-gradient(135deg,#059669,#10b981)"
                                        : "#d1d5db",
                                    border: "none",
                                    color: "white",
                                    fontWeight: 500,
                                    borderRadius: 999,
                                    padding: "0 12px",
                                    boxShadow: canReply
                                        ? "0 4px 12px rgba(16,185,129,.3)"
                                        : "none",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                }}
                                disabled={!canReply}
                                onClick={() => {
                                    setReplying(record);
                                    setReplyText("");
                                }}
                            >
                                <MailOutlined />
                                Phản hồi
                            </Button>
                        </Tooltip>
                    </Space>
                );
            },
        },
    ];

    const rowKey = (record) => record.Complaint_ID || record.C_ID || record.id;

    /* ============ Render ============ */
    return (
        <Layout style={pageBg}>
            <TopBar user={user} role="Admin" onLogout={logout} />

            <div style={wrap}>
                <Space direction="vertical" size={20} style={{ width: "100%" }}>
                    <Space
                        align="center"
                        style={{
                            width: "100%",
                            justifyContent: "space-between",
                        }}
                    >
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => nav("/admin")}
                        >
                            Quay lại bảng điều khiển
                        </Button>
                    </Space>

                    <Card style={outerCard} bordered={false} bodyStyle={{ padding: 18 }}>
                        {/* Header + Stats */}
                        <Space
                            direction="vertical"
                            size={16}
                            style={{ width: "100%" }}
                        >
                            <Space
                                align="center"
                                style={{
                                    justifyContent: "space-between",
                                    width: "100%",
                                }}
                            >
                                <Space align="center" size={14}>
                                    <div
                                        style={{
                                            width: 50,
                                            height: 50,
                                            borderRadius: "50%",
                                            background:
                                                "linear-gradient(135deg,#f97316,#fb923c)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            boxShadow:
                                                "0 14px 30px rgba(248,113,113,0.45)",
                                        }}
                                    >
                                        <AlertOutlined
                                            style={{
                                                fontSize: 24,
                                                color: "white",
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <Title
                                            level={4}
                                            style={{ margin: 0, fontWeight: 700 }}
                                        >
                                            Quản lý khiếu nại (Admin)
                                            <Tag
                                                color="green"
                                                style={{ marginLeft: 8 }}
                                                icon={
                                                    <ThunderboltOutlined
                                                        style={{ fontSize: 12 }}
                                                    />
                                                }
                                            >
                                                Xử lý & phản hồi
                                            </Tag>
                                        </Title>
                                        <Text type="secondary">
                                            Xem – lọc – cập nhật trạng thái và gửi email
                                            phản hồi cho khách hàng.
                                        </Text>
                                    </div>
                                </Space>

                                <Tooltip title="Tải lại danh sách khiếu nại">
                                    <Button
                                        type="primary"
                                        icon={<SyncOutlined />}
                                        onClick={loadComplaints}
                                        loading={loading}
                                        style={{
                                            borderRadius: 999,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        Làm mới
                                    </Button>
                                </Tooltip>
                            </Space>

                            {/* Stats row */}
                            <Space
                                style={{
                                    width: "100%",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                }}
                                size={12}
                            >
                                <Card
                                    size="small"
                                    style={{
                                        ...innerCard,
                                        flex: 1,
                                        minWidth: 170,
                                        padding: 8,
                                    }}
                                    bodyStyle={{ padding: 12 }}
                                >
                                    <Statistic
                                        title="Tổng khiếu nại"
                                        value={stats.total}
                                        prefix={
                                            <AlertOutlined style={{ color: "#f97316" }} />
                                        }
                                    />
                                </Card>
                                <Card
                                    size="small"
                                    style={{
                                        ...innerCard,
                                        flex: 1,
                                        minWidth: 170,
                                        padding: 8,
                                    }}
                                    bodyStyle={{ padding: 12 }}
                                >
                                    <Statistic
                                        title="Mới tạo"
                                        value={stats.open}
                                        prefix={
                                            <Badge
                                                color="blue"
                                                style={{ marginRight: 4 }}
                                            />
                                        }
                                    />
                                </Card>
                                <Card
                                    size="small"
                                    style={{
                                        ...innerCard,
                                        flex: 1,
                                        minWidth: 170,
                                        padding: 8,
                                    }}
                                    bodyStyle={{ padding: 12 }}
                                >
                                    <Statistic
                                        title="Đang xử lý"
                                        value={stats.inProgress}
                                        prefix={
                                            <Badge
                                                color="orange"
                                                style={{ marginRight: 4 }}
                                            />
                                        }
                                    />
                                </Card>
                                <Card
                                    size="small"
                                    style={{
                                        ...innerCard,
                                        flex: 1,
                                        minWidth: 170,
                                        padding: 8,
                                    }}
                                    bodyStyle={{ padding: 12 }}
                                >
                                    <Statistic
                                        title="Đã xử lý"
                                        value={stats.resolved}
                                        prefix={
                                            <Badge
                                                color="green"
                                                style={{ marginRight: 4 }}
                                            />
                                        }
                                    />
                                </Card>
                            </Space>

                            <Divider style={{ margin: "12px 0" }} />

                            {/* Filter + table */}
                            <Card
                                style={innerCard}
                                bordered={false}
                                bodyStyle={{ padding: 16 }}
                            >
                                <Space
                                    style={{
                                        width: "100%",
                                        justifyContent: "space-between",
                                        marginBottom: 12,
                                    }}
                                >
                                    <Space>
                                        <Text type="secondary">
                                            Lọc theo trạng thái:
                                        </Text>
                                        <Select
                                            size="small"
                                            value={statusFilter}
                                            onChange={setStatusFilter}
                                            style={{ minWidth: 180 }}
                                            options={[
                                                { value: "all", label: "Tất cả" },
                                                { value: "open", label: "Mới tạo" },
                                                {
                                                    value: "in_progress",
                                                    label: "Đang xử lý",
                                                },
                                                {
                                                    value: "resolved",
                                                    label: "Đã xử lý",
                                                },
                                                {
                                                    value: "closed",
                                                    label: "Đã đóng",
                                                },
                                            ]}
                                        />
                                    </Space>
                                </Space>

                                <Table
                                    rowKey={rowKey}
                                    loading={loading}
                                    columns={columns}
                                    dataSource={filteredItems}
                                    pagination={{
                                        pageSize: 8,
                                        showSizeChanger: false,
                                    }}
                                    style={{ marginTop: 4 }}
                                    size="middle"
                                />
                            </Card>
                        </Space>
                    </Card>
                </Space>
            </div>

            {/* Modal xem chi tiết */}
            <Modal
                open={!!viewing}
                title={
                    viewing
                        ? `Khiếu nại #${viewing.Complaint_ID || viewing.C_ID || ""}`
                        : "Chi tiết khiếu nại"
                }
                footer={null}
                onCancel={() => setViewing(null)}
                destroyOnClose
            >
                {viewing && (
                    <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="ID">
                            {viewing.Complaint_ID || viewing.C_ID}
                        </Descriptions.Item>
                        <Descriptions.Item label="Loại">
                            {(viewing.C_Type || viewing.type) === "booking"
                                ? "Đơn đặt phòng"
                                : (viewing.C_Type || viewing.type) === "general"
                                    ? "Góp ý chung"
                                    : viewing.C_Type || viewing.type || "Khác"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Đơn đặt phòng">
                            {viewing.Booking_ID ? `#${viewing.Booking_ID}` : "—"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            {renderStatusTag(viewing.C_Status)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Thời gian tạo">
                            {viewing.Created_at
                                ? dayjs(viewing.Created_at).format(
                                    "DD/MM/YYYY HH:mm"
                                )
                                : "—"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tiêu đề">
                            {viewing.C_Subject || "—"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Nội dung">
                            <Paragraph
                                style={{
                                    whiteSpace: "pre-wrap",
                                    marginBottom: 0,
                                }}
                            >
                                {viewing.C_Content || "—"}
                            </Paragraph>
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>

            {/* Modal gửi phản hồi */}
            <Modal
                open={!!replying}
                title={
                    replying
                        ? `Gửi phản hồi cho khiếu nại #${replying.Complaint_ID || replying.C_ID
                        }`
                        : "Gửi phản hồi"
                }
                okText="Gửi phản hồi"
                cancelText="Hủy"
                confirmLoading={sending}
                onCancel={() => {
                    setReplying(null);
                    setReplyText("");
                }}
                onOk={async () => {
                    if (!replying) return;
                    if (!replyText.trim()) {
                        message.warning("Vui lòng nhập nội dung phản hồi");
                        return;
                    }
                    try {
                        setSending(true);
                        const id = replying.Complaint_ID || replying.C_ID;
                        await complaintsApi.reply(id, {
                            message: replyText,
                        });

                        message.success(
                            "Đã gửi phản hồi cho khách & cập nhật trạng thái"
                        );
                        setReplying(null);
                        setReplyText("");

                        // reload list để lấy trạng thái mới
                        await loadComplaints();
                    } catch (err) {
                        console.error(
                            "[AdminComplaints] send reply error:",
                            err
                        );
                        message.error("Gửi phản hồi thất bại");
                    } finally {
                        setSending(false);
                    }
                }}
            >
                <Typography.Paragraph>
                    Phản hồi này sẽ được gửi qua email đến khách hàng và khiếu
                    nại sẽ được đánh dấu là <strong>Đã xử lý</strong>.
                </Typography.Paragraph>

                <Typography.Text strong>Nội dung phản hồi</Typography.Text>
                <Typography.Paragraph
                    type="secondary"
                    style={{ marginBottom: 8 }}
                >
                    Bạn có thể giải thích kết quả xử lý, xin lỗi khách hàng hoặc
                    hướng dẫn các bước tiếp theo.
                </Typography.Paragraph>
                <textarea
                    style={{
                        width: "100%",
                        minHeight: 140,
                        borderRadius: 8,
                        padding: 10,
                        border: "1px solid #d4d4d8",
                        resize: "vertical",
                    }}
                    maxLength={2000}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập nội dung phản hồi sẽ gửi cho khách..."
                />
                <div style={{ textAlign: "right", marginTop: 4 }}>
                    <Typography.Text type="secondary">
                        {replyText.length} / 2000
                    </Typography.Text>
                </div>
            </Modal>
        </Layout>
    );
}
