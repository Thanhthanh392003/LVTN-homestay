import { useEffect, useMemo, useState } from "react";
import {
    Layout, Card, Table, Button, Space, Tag, Typography, message,
    Select, Segmented, Input, Empty, Tooltip, Popconfirm, Badge
} from "antd";
import {
    GiftOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
    PercentageOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined,
    SearchOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { promotionsApi } from "../services/promotions";
import PromoFormModal from "../components/PromoFormModal";

const { Title, Text } = Typography;

/* Chuẩn hoá kết quả list -> luôn là MẢNG */
const toArray = (res) => {
    const cands = [res?.data?.promotions, res?.promotions, res?.data, res];
    for (const x of cands) if (Array.isArray(x)) return x;
    return [];
};

const StatusTag = ({ value }) =>
    value === "active" ? (
        <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontWeight: 600 }}>
            Đang hoạt động
        </Tag>
    ) : (
        <Tag icon={<ClockCircleOutlined />} color="default" style={{ fontWeight: 600 }}>
            Ngưng hoạt động
        </Tag>
    );


const TypeTag = ({ value }) =>
    value === "percent" ? (
        <Tag icon={<PercentageOutlined />} color="geekblue" style={{ fontWeight: 600 }}>
            Giảm %
        </Tag>
    ) : (
        <Tag icon={<DollarOutlined />} color="gold" style={{ fontWeight: 600 }}>
            Giảm VND
        </Tag>
    );

export default function AdminPromotions() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // toolbar
    const [status, setStatus] = useState("active"); // active | inactive | all
    const [type, setType] = useState("all");        // all | percent | fixed
    const [q, setQ] = useState("");

    // modal
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);   // record đang sửa

    async function fetchPromotions() {
        setLoading(true);
        try {
            const params = {};
            if (status !== "all") params.status = status;
            if (type !== "all") params.type = type;
            if (q) params.q = q;
            const res = await promotionsApi.list(params);
            setRows(toArray(res));
        } catch (e) {
            console.error(e);
            message.error("Không thể tải danh sách khuyến mãi");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchPromotions(); /* eslint-disable-next-line */ }, [status, type]);

    const filteredRows = useMemo(() => {
        if (!q) return rows;
        const k = q.trim().toLowerCase();
        return rows.filter(r =>
            (r.P_Code || "").toLowerCase().includes(k) ||
            (r.P_Name || "").toLowerCase().includes(k)
        );
    }, [rows, q]);

    const columns = [
        {
            title: "Mã",
            dataIndex: "P_Code",
            width: 155,
            render: (v) => (
                <Badge.Ribbon text="Code" color="green">
                    <div
                        style={{
                            background: "#f6ffed",
                            border: "1px solid #b7eb8f",
                            borderRadius: 12,
                            padding: "6px 12px",
                            display: "inline-block",
                            fontWeight: 700,
                            color: "#237804",
                        }}
                    >
                        {v}
                    </div>
                </Badge.Ribbon>
            ),
        },
        {
            title: "Tên khuyến mãi",
            dataIndex: "P_Name",
            ellipsis: true,
            render: (v) => <Text strong>{v}</Text>,
        },
        { title: "Loại", dataIndex: "P_Type", width: 130, render: (_, r) => <TypeTag value={r.P_Type} /> },
        {
            title: "Giá trị",
            dataIndex: "Discount",
            width: 130,
            align: "right",
            render: (v, r) => (r.P_Type === "percent" ? `${v}%` : `${Number(v).toLocaleString()}₫`),
        },
        {
            title: "Hiệu lực",
            width: 260,
            render: (_, r) => {
                const s = r.Start_date || r.start_date || r.from_date;
                const e = r.End_date || r.end_date || r.to_date;
                const fmt = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "--");
                return `${fmt(s)} → ${fmt(e)}`;
            },
        },
        { title: "Trạng thái", dataIndex: "P_Status", width: 140, render: (_, r) => <StatusTag value={r.P_Status} /> },
        {
            title: "Thao tác",
            width: 170,
            fixed: "right",
            render: (_, record) => (
                <Space>
                    <Tooltip title="Chỉnh sửa">
                        <Button
                            size="small"
                            type="default"
                            icon={<EditOutlined />}
                            onClick={() => {
                                setEditing(record);
                                setOpen(true);
                            }}
                            style={{ borderRadius: 10 }}
                        />
                    </Tooltip>

                    {/* ✅ Dùng Popconfirm để xoá chắc chắn */}
                    <Popconfirm
                        title={`Xoá mã ${record.P_Code}?`}
                        okText="Xoá"
                        cancelText="Huỷ"
                        okButtonProps={{ danger: true }}
                        onConfirm={async () => {
                            try {
                                await promotionsApi.remove(record.Promotion_ID ?? record.P_ID ?? record.id);
                                message.success("Đã xoá");
                                fetchPromotions();
                            } catch (e) {
                                console.error(e);
                                message.error("Không thể xoá mã");
                            }
                        }}
                    >
                        <Tooltip title="Xoá">
                            <Button
                                size="small"
                                danger
                                type="primary"
                                ghost
                                icon={<DeleteOutlined />}
                                style={{ borderRadius: 10 }}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Layout
            style={{
                minHeight: "100vh",
                background:
                    "radial-gradient(1100px 500px at 75% -20%, rgba(219,255,234,.65) 0%, transparent 60%), linear-gradient(180deg,#f6fffb 0%,#f8fbff 100%)",
            }}
        >
            <Layout.Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
                {/* Hero */}
                <Card
                    style={{
                        borderRadius: 26,
                        backdropFilter: "saturate(180%) blur(8px)",
                        background:
                            "linear-gradient(135deg, rgba(230,244,255,.9) 0%, rgba(236,253,245,.9) 55%, rgba(255,255,255,.95) 100%)",
                        border: "1px solid #eef2ff",
                        boxShadow: "0 16px 50px rgba(15, 23, 42, 0.06)",
                        marginBottom: 18,
                    }}
                    bodyStyle={{ padding: 20 }}
                >
                    <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
                        <Space align="center">
                            <div
                                style={{
                                    width: 46, height: 46, borderRadius: 14,
                                    background: "linear-gradient(135deg,#22c55e,#16a34a 60%,#0ea5e9)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "#fff", boxShadow: "0 10px 24px rgba(34,197,94,.35)",
                                }}
                            >
                                <GiftOutlined style={{ fontSize: 22 }} />
                            </div>
                            <div>
                                <Title level={3} style={{ margin: 0, letterSpacing: .2 }}>
                                    Quản lý mã khuyến mãi
                                </Title>
                                <Text type="secondary">
                                    Trải nghiệm quản trị theo phong cách Traveloka/Booking – gọn gàng, hiện đại.
                                </Text>
                            </div>
                        </Space>

                        {/* Toolbar */}
                        <Space wrap>
                            <Segmented
                                value={status}
                                onChange={setStatus}
                                options={[
                                    { label: "Đang hoạt động", value: "active" },
                                    { label: "Ngưng", value: "inactive" },
                                    { label: "Tất cả", value: "all" },
                                ]}
                            />
                            <Select
                                value={type}
                                onChange={setType}
                                style={{ width: 160 }}
                                options={[
                                    { value: "all", label: "Tất cả loại" },
                                    { value: "percent", label: "Giảm %" },
                                    { value: "fixed", label: "Giảm VND" },
                                ]}
                            />
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onPressEnter={fetchPromotions}
                                prefix={<SearchOutlined />}
                                placeholder="Tìm theo mã hoặc tên"
                                style={{ width: 240, borderRadius: 999 }}
                            />
                            <Button onClick={fetchPromotions} style={{ borderRadius: 999 }}>Lọc</Button>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => { setEditing(null); setOpen(true); }}
                                style={{
                                    borderRadius: 999,
                                    paddingInline: 16,
                                    background: "linear-gradient(135deg,#16a34a,#22c55e 60%,#0ea5e9)",
                                    border: 0,
                                    boxShadow: "0 10px 24px rgba(2,132,199,.25)",
                                    fontWeight: 600,
                                }}
                            >
                                Tạo mã
                            </Button>
                        </Space>
                    </Space>
                </Card>

                {/* Table */}
                <Card
                    style={{
                        borderRadius: 22,
                        background: "#fff",
                        boxShadow: "0 12px 36px rgba(15,23,42,0.05)",
                    }}
                    bodyStyle={{ padding: 16 }}
                >
                    <Table
                        rowKey={(r) => r.Promotion_ID ?? r.P_ID ?? r.id ?? r.P_Code}
                        loading={loading}
                        dataSource={filteredRows}
                        columns={columns}
                        pagination={{ pageSize: 8, showSizeChanger: false }}
                        size="middle"
                        sticky
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        <span>
                                            Chưa có khuyến mãi phù hợp bộ lọc.{" "}
                                            <a onClick={() => { setQ(""); setType("all"); setStatus("all"); }}>
                                                Xoá bộ lọc
                                            </a>
                                        </span>
                                    }
                                />
                            ),
                        }}
                        rowClassName={(_, idx) => (idx % 2 === 0 ? "lux-row even" : "lux-row")}
                        style={{ borderRadius: 16, overflow: "hidden" }}
                    />
                </Card>

                {/* Modal form */}
                <PromoFormModal
                    open={open}
                    initialValues={editing}
                    onCancel={() => { setOpen(false); setEditing(null); }}
                    onOk={async (payload) => {
                        try {
                            if (editing) {
                                const id = editing.Promotion_ID ?? editing.P_ID ?? editing.id;
                                await promotionsApi.update(id, payload);
                                message.success("Đã cập nhật mã khuyến mãi");
                            } else {
                                await promotionsApi.create(payload);
                                message.success("Đã tạo mã khuyến mãi");
                            }
                            setOpen(false);
                            setEditing(null);
                            fetchPromotions();
                        } catch (e) {
                            console.error(e);
                            const msg = e?.response?.data?.message || e?.message || "Lưu thất bại";
                            message.error(msg);
                        }
                    }}
                />
            </Layout.Content>

            {/* subtle zebra & hover */}
            <style>{`
        .lux-row:hover td { background: #f8fafc !important; transition: background .25s ease; }
        .lux-row.even td { background: #fcfeff; }
        .ant-table-thead > tr > th {
          background: linear-gradient(180deg,#f8fbff,#f2f7ff) !important;
          font-weight: 700;
        }
      `}</style>
        </Layout>
    );
}
