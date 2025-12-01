// src/pages/OwnerComplaints.jsx
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
    Badge,
    Statistic,
    Tooltip,
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
    HomeOutlined,
    InfoCircleOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import { complaintsApi } from "../services/complaints";

const { Title, Text, Paragraph } = Typography;

export default function OwnerComplaints() {
    const { user, logout } = useAuth();
    const nav = useNavigate();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [viewing, setViewing] = useState(null);

    /* ─────────── UI styles ─────────── */
    const pageBg = {
        minHeight: "100vh",
        background:
            "radial-gradient(1000px 280px at 50% 0%, rgba(59,130,246,.08), transparent 70%)," +
            "radial-gradient(900px 260px at 0% 20%, rgba(16,185,129,.08), transparent 60%)," +
            "radial-gradient(900px 260px at 100% 20%, rgba(236,72,153,.06), transparent 60%)," +
            "radial-gradient(900px 260px at 80% 6%, rgba(168,85,247,.10), transparent 60%), #f5fbff",
    };
    const wrap = { padding: 24, maxWidth: 1200, margin: "0 auto" };
    const whiteCard = {
        borderRadius: 24,
        background:
            "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(16,185,129,0.03))",
        boxShadow: "0 24px 60px rgba(15,23,42,.06)",
        border: "1px solid rgba(148,163,184,0.25)",
    };
    const innerCard = {
        borderRadius: 18,
        background: "#fff",
        boxShadow: "0 18px 45px rgba(15,23,42,.03)",
        border: "1px solid rgba(226,232,240,0.8)",
    };

    /* ─────────── Data loading ─────────── */
    const loadComplaints = async () => {
        try {
            setLoading(true);
            // Owner chỉ lấy các khiếu nại liên quan homestay của mình
            const res = await complaintsApi.getForOwner();

            const list =
                (Array.isArray(res) && res) ||
                (Array.isArray(res?.data) && res.data) ||
                res?.items ||
                res?.rows ||
                res?.list ||
                res?.result ||
                [];

            console.log("[OwnerComplaints] list:", list);
            setItems(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("[OwnerComplaints] loadComplaints error:", err);
            message.error("Không tải được danh sách khiếu nại");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadComplaints();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Hàm này vẫn giữ lại (phòng khi sau này cho Owner đổi trạng thái),
    // hiện tại UI không gọi tới.
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
            console.error("[OwnerComplaints] updateStatus error:", err);
            message.error("Cập nhật trạng thái thất bại");
            // revert
            setItems((prev) =>
                prev.map((c) =>
                    (c.Complaint_ID || c.C_ID) === id ? { ...c, C_Status: oldStatus } : c
                )
            );
        }
    };

    /* ─────────── Stats & filter ─────────── */
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

    /* ─────────── Helpers ─────────── */
    const renderStatusTag = (status) => {
        const s = (status || "").toLowerCase();

        if (s === "open") {
            return (
                <Tag color="blue" icon={<AlertOutlined />}>
                    Mới tạo
                </Tag>
            );
        }
        if (s === "pending" || s === "in_progress") {
            return (
                <Tag
                    color="orange"
                    icon={<ClockCircleTwoTone twoToneColor="#f97316" />}
                >
                    Đang xử lý
                </Tag>
            );
        }
        if (s === "resolved") {
            return (
                <Tag
                    color="green"
                    icon={<CheckCircleTwoTone twoToneColor="#22c55e" />}
                >
                    Đã xử lý
                </Tag>
            );
        }
        if (s === "closed") {
            return (
                <Tag
                    color="red"
                    icon={<CloseCircleTwoTone twoToneColor="#ef4444" />}
                >
                    Đã đóng
                </Tag>
            );
        }
        if (!s) return <Tag>Không rõ</Tag>;
        return <Tag>{status}</Tag>;
    };

    /* ─────────── Table columns ─────────── */
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
            width: 130,
            render: (value) => {
                const t = (value || "").toLowerCase();
                if (t === "booking")
                    return (
                        <Tag color="geekblue" icon={<HomeOutlined />}>
                            Đơn đặt phòng
                        </Tag>
                    );
                if (t === "general")
                    return (
                        <Tag color="purple" icon={<InfoCircleOutlined />}>
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
            width: 150,
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        type="primary"
                        ghost
                        icon={<EyeOutlined />}
                        onClick={() => setViewing(record)}
                    >
                        Xem
                    </Button>
                </Space>
            ),
        },
    ];

    const rowKey = (record) => record.Complaint_ID || record.C_ID || record.id;

    /* ─────────── Render ─────────── */
    return (
        <Layout style={pageBg}>
            <TopBar user={user} role="Owner" onLogout={logout} />

            <div style={wrap}>
                <Space direction="vertical" size={20} style={{ width: "100%" }}>
                    {/* Back button */}
                    <Space
                        align="center"
                        style={{ width: "100%", justifyContent: "space-between" }}
                    >
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => nav("/owner")}
                        >
                            Quay lại bảng điều khiển
                        </Button>
                    </Space>

                    {/* Outer card with gradient */}
                    <Card style={whiteCard} bordered={false} bodyStyle={{ padding: 18 }}>
                        {/* Header + stats */}
                        <Space
                            direction="vertical"
                            size={16}
                            style={{ width: "100%" }}
                        >
                            <Space
                                align="center"
                                style={{ justifyContent: "space-between", width: "100%" }}
                            >
                                <Space align="center">
                                    <div
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: "999px",
                                            background:
                                                "linear-gradient(135deg,#fb923c,#f97316)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            boxShadow: "0 12px 30px rgba(248,113,113,0.35)",
                                        }}
                                    >
                                        <AlertOutlined
                                            style={{ fontSize: 24, color: "#fff" }}
                                        />
                                    </div>
                                    <div>
                                        <Title
                                            level={4}
                                            style={{
                                                margin: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                            }}
                                        >
                                            Quản lý khiếu nại (Owner)
                                            <Tag
                                                color="green"
                                                icon={
                                                    <ThunderboltOutlined
                                                        style={{ fontSize: 12 }}
                                                    />
                                                }
                                            >
                                                Realtime tình hình khách
                                            </Tag>
                                        </Title>
                                        <Text type="secondary">
                                            Xem các khiếu nại / góp ý liên quan đến homestay
                                            của bạn. Việc xử lý và phản hồi sẽ do Admin thực
                                            hiện.
                                        </Text>
                                    </div>
                                </Space>

                                <Space>
                                    <Tooltip title="Tải lại danh sách khiếu nại">
                                        <Button
                                            type="primary"
                                            icon={<ReloadOutlined />}
                                            onClick={loadComplaints}
                                            loading={loading}
                                        >
                                            Làm mới
                                        </Button>
                                    </Tooltip>
                                </Space>
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
                                        minWidth: 160,
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
                                        minWidth: 160,
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
                                        minWidth: 160,
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
                                        minWidth: 160,
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
                                    pagination={{ pageSize: 8, showSizeChanger: false }}
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
                                style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}
                            >
                                {viewing.C_Content || "—"}
                            </Paragraph>
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </Layout>
    );
}
