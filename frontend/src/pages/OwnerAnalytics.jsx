// src/pages/OwnerAnalytics.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Layout,
    Card,
    DatePicker,
    Segmented,
    Space,
    Row,
    Col,
    Table,
    Statistic,
    Typography,
    message,
    Empty,
    Tag,
    Select,
    Divider,
} from "antd";
import {
    DollarOutlined,
    BarChartOutlined,
    CalendarOutlined,
    LineChartOutlined,
    OrderedListOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import { bookingApi } from "../services/bookings";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as ReTooltip,
    ResponsiveContainer,
} from "recharts";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/* ───────────────── Helpers ───────────────── */

function normalizeBookings(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;

    const cands =
        raw.items ||
        raw.rows ||
        raw.list ||
        raw.result ||
        raw.bookings ||
        (Array.isArray(raw.data) && raw.data) ||
        raw.data?.items ||
        raw.data?.rows ||
        raw.data?.list ||
        raw.data?.result;

    return Array.isArray(cands) ? cands : [];
}

function getPrice(b) {
    if (typeof b?.Total_price === "number") return b.Total_price;
    if (typeof b?.total_price === "number") return b.total_price;
    if (typeof b?.Amount === "number") return b.Amount;
    if (typeof b?.amount === "number") return b.amount;
    return 0;
}

// Chuẩn hoá status để filter + mapping màu/label ổn định
function normalizeStatusKey(value) {
    const raw = String(value || "").toLowerCase().trim();
    if (!raw) return "unknown";

    if (raw.includes("pending") && raw.includes("payment")) return "pending_payment";
    if (raw === "pending") return "pending";

    if (raw === "confirmed" || raw === "confirm") return "confirmed";

    if (raw.startsWith("paid")) return "paid";

    if (
        raw === "completed" ||
        raw === "complete" ||
        raw === "success" ||
        raw === "succces" ||
        raw === "successed"
    )
        return "completed";

    if (raw.startsWith("cancel")) return "cancelled";

    return raw;
}

/* ───────────────── Component ───────────────── */

export default function OwnerAnalytics() {
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [allBookings, setAllBookings] = useState([]);

    // time mode: "day" | "month" | "year" | "range"
    const [mode, setMode] = useState("month");
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [range, setRange] = useState([null, null]);

    // lọc theo trạng thái & homestay
    const [statusFilter, setStatusFilter] = useState("all");
    const [homestayFilter, setHomestayFilter] = useState("all");

    // ngày đang được chọn ở bảng "Doanh thu theo ngày" để lọc danh sách đơn bên phải
    const [selectedDay, setSelectedDay] = useState(null);

    const pageBg = {
        minHeight: "100vh",
        background:
            "radial-gradient(1000px 280px at 50% 0%, rgba(59,130,246,.10), transparent 60%)," +
            "radial-gradient(900px 260px at 20% 8%, rgba(16,185,129,.10), transparent 60%)," +
            "radial-gradient(900px 260px at 80% 6%, rgba(168,85,247,.08), transparent 60%), #f5fbff",
    };
    const wrap = {
        padding: 24,
        maxWidth: 1200,
        margin: "0 auto",
        animation: "fadeIn .45s ease",
    };
    const whiteCard = {
        borderRadius: 24,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(226,232,240,0.8)",
        boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
        transition: "transform .25s ease, box-shadow .25s ease",
    };

    /* ─────────────── Load dữ liệu ─────────────── */

    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                setLoading(true);
                const res = await bookingApi.ownerList();
                const list = normalizeBookings(res);
                if (alive) setAllBookings(list);
            } catch (e) {
                console.error(
                    "[OwnerAnalytics] load bookings error:",
                    e?.response?.data || e
                );
                message.error(
                    e?.response?.data?.message || "Không tải được dữ liệu đặt phòng."
                );
            } finally {
                if (alive) setLoading(false);
            }
        };
        if (user) load();
        return () => {
            alive = false;
        };
    }, [user]);

    // đổi khoảng thời gian → reset ngày đang chọn
    useEffect(() => {
        setSelectedDay(null);
    }, [mode, selectedDate, range]);

    /* ─────────────── Lấy list homestay cho dropdown ─────────────── */

    const homestayOptions = useMemo(() => {
        const map = {};
        allBookings.forEach((b) => {
            const idRaw = b?.H_ID ?? b?.h_id ?? b?.homestay_id;
            if (idRaw == null) return;
            const id = Number(idRaw);
            if (!Number.isFinite(id)) return;

            const name =
                b?.H_Name ??
                b?.hName ??
                b?.homestay_name ??
                b?.Homestay_Name ??
                `Homestay #${id}`;

            if (!map[id]) {
                map[id] = { value: id, label: name };
            }
        });

        return Object.values(map).sort((a, b) =>
            String(a.label).localeCompare(String(b.label), "vi", {
                sensitivity: "base",
            })
        );
    }, [allBookings]);

    /* ─────────────── Khoảng thời gian đang xem ─────────────── */

    const timeRange = useMemo(() => {
        if (mode === "range" && range?.[0] && range?.[1]) {
            return {
                start: range[0].startOf("day"),
                end: range[1].endOf("day"),
            };
        }

        const base = selectedDate || dayjs();

        if (mode === "day") {
            return {
                start: base.startOf("day"),
                end: base.endOf("day"),
            };
        }

        if (mode === "year") {
            return {
                start: base.startOf("year"),
                end: base.endOf("year"),
            };
        }

        // default: month
        return {
            start: base.startOf("month"),
            end: base.endOf("month"),
        };
    }, [mode, selectedDate, range]);

    /* ─────────────── Lọc booking theo thời gian ─────────────── */

    const filteredByTime = useMemo(() => {
        if (!timeRange?.start || !timeRange?.end) return [];

        return allBookings.filter((b) => {
            const created = dayjs(
                b?.Created_at || b?.created_at || b?.createdAt || b?.Booking_Date
            );
            if (!created.isValid()) return false;
            return (
                !created.isBefore(timeRange.start) &&
                !created.isAfter(timeRange.end)
            );
        });
    }, [allBookings, timeRange]);

    /* ─────────────── Lọc thêm theo trạng thái & homestay ─────────────── */

    const filtered = useMemo(() => {
        let base = [...filteredByTime];

        if (statusFilter !== "all") {
            base = base.filter((b) => {
                const key = normalizeStatusKey(b?.Status || b?.status);
                return key === statusFilter;
            });
        }

        if (homestayFilter !== "all") {
            base = base.filter((b) => {
                const idRaw = b?.H_ID ?? b?.h_id ?? b?.homestay_id;
                const id = Number(idRaw);
                if (!Number.isFinite(id)) return false;
                return id === homestayFilter;
            });
        }

        return base;
    }, [filteredByTime, statusFilter, homestayFilter]);

    /* ─────────────── Tổng hợp stats ─────────────── */

    const stats = useMemo(() => {
        const count = filtered.length;
        const revenue = filtered.reduce((sum, b) => sum + getPrice(b), 0);

        const byDayMap = {};
        filtered.forEach((b) => {
            const created = dayjs(
                b?.Created_at || b?.created_at || b?.createdAt || b?.Booking_Date
            );
            if (!created.isValid()) return;
            const key = created.format("YYYY-MM-DD");
            if (!byDayMap[key]) byDayMap[key] = { date: key, orders: 0, revenue: 0 };
            byDayMap[key].orders += 1;
            byDayMap[key].revenue += getPrice(b);
        });

        const byDay = Object.values(byDayMap).sort((a, b) =>
            a.date.localeCompare(b.date)
        );

        return { count, revenue, byDay };
    }, [filtered]);

    const chartData = useMemo(
        () =>
            stats.byDay.map((d) => ({
                dateLabel: dayjs(d.date).format("DD/MM"),
                revenue: d.revenue,
                orders: d.orders,
            })),
        [stats.byDay]
    );

    /* ─────────────── Dữ liệu cho bảng đơn bên phải ─────────────── */

    const ordersForTable = useMemo(() => {
        if (!selectedDay) return filtered;
        const target = dayjs(selectedDay).format("YYYY-MM-DD");

        return filtered.filter((b) => {
            const created = dayjs(
                b?.Created_at || b?.created_at || b?.createdAt || b?.Booking_Date
            );
            if (!created.isValid()) return false;
            return created.format("YYYY-MM-DD") === target;
        });
    }, [filtered, selectedDay]);

    /* ─────────────── Cột bảng ─────────────── */

    const statusColorMap = {
        pending: "geekblue",
        pending_payment: "gold",
        confirmed: "blue",
        paid: "green",
        completed: "cyan",
        cancelled: "volcano",
        canceled: "volcano",
    };

    const statusLabelMap = {
        pending: "Đang chờ",
        pending_payment: "Chờ thanh toán",
        confirmed: "Đã xác nhận",
        paid: "Đã thanh toán",
        completed: "Hoàn tất",
        cancelled: "Đã hủy",
        canceled: "Đã hủy",
    };

    const columns = [
        {
            title: "Mã đơn",
            dataIndex: "Booking_ID",
            key: "Booking_ID",
            width: 90,
            fixed: "left",
            render: (v, r) => v ?? r?.id ?? r?.booking_id,
        },
        {
            title: "Homestay",
            dataIndex: "H_Name",
            key: "H_Name",
            ellipsis: true,
        },
        {
            title: "Ngày đặt",
            dataIndex: "Created_at",
            key: "Created_at",
            width: 160,
            render: (_, r) => {
                const d = dayjs(
                    r?.Created_at || r?.created_at || r?.createdAt || r?.Booking_Date
                );
                return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "";
            },
        },
        {
            title: "Tổng tiền",
            dataIndex: "Total_price",
            key: "Total_price",
            align: "right",
            width: 130,
            render: (_, r) => `${getPrice(r).toLocaleString("vi-VN")} đ`,
        },
        {
            title: "Trạng thái",
            dataIndex: "Status",
            key: "Status",
            width: 130,
            render: (v, r) => {
                const key = normalizeStatusKey(v || r?.Status || r?.status);
                const color = statusColorMap[key] || "default";
                const label =
                    statusLabelMap[key] || v || r?.Status || r?.status || "";
                return (
                    <Tag
                        color={color}
                        style={{
                            borderRadius: 999,
                            padding: "2px 10px",
                            fontWeight: 600,
                        }}
                    >
                        {label}
                    </Tag>
                );
            },
        },
    ];

    const dayColumns = [
        {
            title: "Ngày",
            dataIndex: "date",
            key: "date",
            width: 120,
            render: (v) => dayjs(v).format("DD/MM/YYYY"),
        },
        {
            title: "Số đơn",
            dataIndex: "orders",
            key: "orders",
            width: 90,
            align: "center",
        },
        {
            title: "Doanh thu",
            dataIndex: "revenue",
            key: "revenue",
            align: "right",
            render: (v) => `${v.toLocaleString("vi-VN")} đ`,
        },
    ];

    /* ─────────────── Label khoảng thời gian ─────────────── */

    const rangeLabel = useMemo(() => {
        if (!timeRange?.start || !timeRange?.end) return "";
        const s = timeRange.start;
        const e = timeRange.end;

        if (mode === "day") {
            return s.format("DD/MM/YYYY");
        }
        if (mode === "year") {
            return `Năm ${s.format("YYYY")}`;
        }
        if (mode === "month") {
            return `Tháng ${s.format("MM/YYYY")}`;
        }
        return `${s.format("DD/MM/YYYY")} - ${e.format("DD/MM/YYYY")}`;
    }, [timeRange, mode]);

    const ordersTitle = selectedDay
        ? `Đơn trong ngày ${dayjs(selectedDay).format("DD/MM/YYYY")}`
        : "Danh sách đơn trong khoảng";

    /* ─────────────── Render ─────────────── */

    return (
        <>
            {/* CSS décor nội tuyến */}
            <style>
                {`
@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes popIn {
  0% { transform: scale(.7); opacity: .3; }
  100% { transform: scale(1); opacity: 1; }
}
.hover-card {
  transition: transform .25s ease, box-shadow .25s ease !important;
}
.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 50px rgba(15,23,42,0.18) !important;
}
.analytics-table .ant-table-thead > tr > th {
  background: #f8fafc !important;
  font-weight: 600;
}
.analytics-header-card {
  position: relative;
  overflow: hidden;
}
.analytics-header-card::after {
  content: "";
  position: absolute;
  inset: -40%;
  background: radial-gradient(circle at 10% 0%, rgba(56,189,248,0.18), transparent 55%),
              radial-gradient(circle at 90% 0%, rgba(129,140,248,0.18), transparent 55%);
  opacity: .9;
  pointer-events: none;
}
`}
            </style>

            <Layout style={pageBg}>
                <TopBar user={user} role="Owner" onLogout={logout} />

                <Layout.Content style={wrap}>
                    {/* Header */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                        <Col span={24}>
                            <Card
                                bordered={false}
                                className="analytics-header-card hover-card"
                                style={{
                                    borderRadius: 26,
                                    background:
                                        "linear-gradient(135deg,rgba(240,253,250,0.98),rgba(219,234,254,0.98))",
                                    boxShadow:
                                        "0 24px 70px rgba(15,23,42,0.25)",
                                    border: "1px solid rgba(191,219,254,0.8)",
                                }}
                                bodyStyle={{ position: "relative", zIndex: 1 }}
                            >
                                <Space
                                    direction="horizontal"
                                    align="center"
                                    style={{
                                        width: "100%",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <Space align="center" size={16}>
                                        <div
                                            style={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 20,
                                                display: "grid",
                                                placeItems: "center",
                                                background:
                                                    "linear-gradient(135deg,#22c55e,#10b981,#0f766e)",
                                                color: "#fff",
                                                boxShadow:
                                                    "0 18px 40px rgba(22,163,74,.55)",
                                                animation: "popIn .45s ease",
                                            }}
                                        >
                                            <LineChartOutlined
                                                style={{ fontSize: 26 }}
                                            />
                                        </div>
                                        <div>
                                            <Title
                                                level={4}
                                                style={{ margin: 0, color: "#0f172a" }}
                                            >
                                                Thống kê doanh thu
                                            </Title>
                                            <Text type="secondary">
                                                Xem hiệu quả đặt phòng & doanh thu theo
                                                ngày / tháng / năm cho các homestay của
                                                bạn.
                                            </Text>
                                            <br />
                                            <Text
                                                type="secondary"
                                                style={{ fontSize: 12 }}
                                            >
                                                Khoảng đang xem:{" "}
                                                <Text strong>{rangeLabel}</Text>
                                            </Text>
                                        </div>
                                    </Space>
                                </Space>
                            </Card>
                        </Col>
                    </Row>

                    {/* Bộ lọc + KPI */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={14}>
                            <Card
                                bordered={false}
                                style={whiteCard}
                                className="hover-card"
                                bodyStyle={{ padding: 20 }}
                            >
                                <Space
                                    direction="vertical"
                                    style={{ width: "100%" }}
                                    size={16}
                                >
                                    {/* Chọn kiểu thời gian */}
                                    <Space
                                        align="center"
                                        style={{
                                            width: "100%",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <Segmented
                                            value={mode}
                                            onChange={(val) => setMode(val)}
                                            options={[
                                                { label: "Theo ngày", value: "day" },
                                                { label: "Theo tháng", value: "month" },
                                                { label: "Theo năm", value: "year" },
                                                {
                                                    label: "Khoảng ngày",
                                                    value: "range",
                                                },
                                            ]}
                                        />
                                    </Space>

                                    {mode === "range" ? (
                                        <RangePicker
                                            style={{ width: "100%" }}
                                            value={range}
                                            onChange={(val) => setRange(val)}
                                            format="DD/MM/YYYY"
                                            allowClear
                                        />
                                    ) : (
                                        <DatePicker
                                            picker={
                                                mode === "year"
                                                    ? "year"
                                                    : mode === "month"
                                                        ? "month"
                                                        : "date"
                                            }
                                            style={{ width: "100%" }}
                                            value={selectedDate}
                                            onChange={(val) =>
                                                setSelectedDate(val || dayjs())
                                            }
                                            format={
                                                mode === "year"
                                                    ? "YYYY"
                                                    : mode === "month"
                                                        ? "MM/YYYY"
                                                        : "DD/MM/YYYY"
                                            }
                                            suffixIcon={<CalendarOutlined />}
                                        />
                                    )}

                                    <Text type="secondary">
                                        Chọn khoảng thời gian để hệ thống tự tính doanh
                                        thu, số đơn và biểu đồ phía dưới.
                                    </Text>

                                    <Divider style={{ margin: "12px 0" }} />

                                    {/* Filter trạng thái & homestay */}
                                    <Space
                                        direction="vertical"
                                        style={{ width: "100%" }}
                                        size={8}
                                    >
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: 12,
                                                marginBottom: 2,
                                            }}
                                        >
                                            Lọc thêm theo trạng thái đơn & homestay
                                        </Text>
                                        <Space wrap>
                                            <Segmented
                                                value={statusFilter}
                                                onChange={(val) =>
                                                    setStatusFilter(val || "all")
                                                }
                                                options={[
                                                    { label: "Tất cả", value: "all" },
                                                    {
                                                        label: "Đang chờ",
                                                        value: "pending",
                                                    },
                                                    {
                                                        label: "Chờ thanh toán",
                                                        value: "pending_payment",
                                                    },
                                                    {
                                                        label: "Đã xác nhận",
                                                        value: "confirmed",
                                                    },
                                                    {
                                                        label: "Đã thanh toán",
                                                        value: "paid",
                                                    },
                                                    {
                                                        label: "Hoàn tất",
                                                        value: "completed",
                                                    },
                                                    {
                                                        label: "Đã hủy",
                                                        value: "cancelled",
                                                    },
                                                ]}
                                            />

                                            <Select
                                                value={homestayFilter}
                                                onChange={(val) =>
                                                    setHomestayFilter(
                                                        val === undefined ? "all" : val
                                                    )
                                                }
                                                style={{ minWidth: 220 }}
                                                options={[
                                                    {
                                                        value: "all",
                                                        label: "Tất cả homestay",
                                                    },
                                                    ...homestayOptions,
                                                ]}
                                                placeholder="Chọn homestay"
                                            />
                                        </Space>
                                    </Space>
                                </Space>
                            </Card>
                        </Col>

                        <Col xs={24} md={10}>
                            <Card
                                bordered={false}
                                style={whiteCard}
                                className="hover-card"
                                bodyStyle={{ padding: 20 }}
                            >
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Statistic
                                            title="Tổng doanh thu"
                                            prefix={<DollarOutlined />}
                                            value={stats.revenue}
                                            precision={0}
                                            formatter={(val) =>
                                                `${Number(val).toLocaleString(
                                                    "vi-VN"
                                                )} đ`
                                            }
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="Tổng số đơn"
                                            value={stats.count}
                                            prefix={<BarChartOutlined />}
                                        />
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                    </Row>

                    {/* Biểu đồ doanh thu */}
                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        <Col span={24}>
                            <Card
                                bordered={false}
                                style={whiteCard}
                                className="hover-card"
                                title={
                                    <Space align="center">
                                        <span
                                            style={{
                                                width: 8,
                                                height: 26,
                                                borderRadius: 6,
                                                background:
                                                    "linear-gradient(135deg,#34d399,#059669)",
                                                display: "inline-block",
                                                marginRight: 6,
                                            }}
                                        />
                                        <span
                                            style={{
                                                fontWeight: 600,
                                                color: "#0f172a",
                                            }}
                                        >
                                            Biểu đồ doanh thu theo ngày
                                        </span>
                                    </Space>
                                }
                                extra={
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Trục X: ngày · Trục Y: doanh thu (đ)
                                    </Text>
                                }
                            >
                                {chartData.length === 0 ? (
                                    <Empty description="Không có dữ liệu trong khoảng này" />
                                ) : (
                                    <div style={{ width: "100%", height: 260 }}>
                                        <ResponsiveContainer>
                                            <LineChart data={chartData}>
                                                <defs>
                                                    <linearGradient
                                                        id="revGradient"
                                                        x1="0"
                                                        y1="0"
                                                        x2="1"
                                                        y2="0"
                                                    >
                                                        <stop
                                                            offset="0%"
                                                            stopColor="#22c55e"
                                                        />
                                                        <stop
                                                            offset="100%"
                                                            stopColor="#059669"
                                                        />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="#e5e7eb"
                                                />
                                                <XAxis
                                                    dataKey="dateLabel"
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <YAxis
                                                    tickFormatter={(v) =>
                                                        v.toLocaleString("vi-VN")
                                                    }
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <ReTooltip
                                                    formatter={(value) =>
                                                        `${value.toLocaleString(
                                                            "vi-VN"
                                                        )} đ`
                                                    }
                                                    labelFormatter={(label) =>
                                                        `Ngày ${label}`
                                                    }
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="revenue"
                                                    stroke="url(#revGradient)"
                                                    strokeWidth={3}
                                                    dot={{
                                                        r: 4,
                                                        stroke: "#fff",
                                                        strokeWidth: 1,
                                                    }}
                                                    activeDot={{ r: 6 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </Card>
                        </Col>
                    </Row>

                    {/* Bảng tổng hợp & danh sách đơn */}
                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                        {/* Doanh thu theo ngày */}
                        <Col xs={24} md={10}>
                            <Card
                                bordered={false}
                                style={whiteCard}
                                className="hover-card"
                                title={
                                    <Space align="center">
                                        <span
                                            style={{
                                                width: 8,
                                                height: 26,
                                                borderRadius: 6,
                                                background:
                                                    "linear-gradient(135deg,#22c55e,#0ea5e9)",
                                                display: "inline-block",
                                                marginRight: 6,
                                            }}
                                        />
                                        <span
                                            style={{
                                                fontWeight: 600,
                                                color: "#0f172a",
                                            }}
                                        >
                                            Doanh thu theo ngày
                                        </span>
                                    </Space>
                                }
                                extra={
                                    <Text
                                        type="secondary"
                                        style={{ fontSize: 12, whiteSpace: "nowrap" }}
                                    >
                                    </Text>
                                }
                            >
                                {stats.byDay.length === 0 ? (
                                    <Empty description="Không có dữ liệu trong khoảng này" />
                                ) : (
                                    <Table
                                        size="small"
                                        rowKey="date"
                                        className="analytics-table"
                                        pagination={{
                                            pageSize: 5,
                                            showSizeChanger: false,
                                        }}
                                        columns={dayColumns}
                                        dataSource={stats.byDay}
                                        onRow={(record) => ({
                                            onClick: () => {
                                                if (!record?.date) return;
                                                const clicked = dayjs(record.date);
                                                if (
                                                    selectedDay &&
                                                    clicked.isSame(
                                                        selectedDay,
                                                        "day"
                                                    )
                                                ) {
                                                    setSelectedDay(null); // click lại để bỏ lọc
                                                } else {
                                                    setSelectedDay(clicked);
                                                }
                                            },
                                            onMouseEnter: (e) => {
                                                e.currentTarget.style.backgroundColor =
                                                    "rgba(16,185,129,0.06)";
                                            },
                                            onMouseLeave: (e) => {
                                                const isSelected =
                                                    selectedDay &&
                                                    dayjs(record.date).isSame(
                                                        selectedDay,
                                                        "day"
                                                    );
                                                e.currentTarget.style.backgroundColor =
                                                    isSelected
                                                        ? "rgba(59,130,246,0.06)"
                                                        : "transparent";
                                            },
                                            style: {
                                                cursor: "pointer",
                                                backgroundColor:
                                                    selectedDay &&
                                                        dayjs(record.date).isSame(
                                                            selectedDay,
                                                            "day"
                                                        )
                                                        ? "rgba(59,130,246,0.06)"
                                                        : "transparent",
                                                transition:
                                                    "background-color .2s ease",
                                            },
                                        })}
                                    />
                                )}
                            </Card>
                        </Col>

                        {/* Danh sách đơn */}
                        <Col xs={24} md={14}>
                            <Card
                                bordered={false}
                                style={whiteCard}
                                className="hover-card"
                                title={
                                    <Space align="center">
                                        <span
                                            style={{
                                                width: 8,
                                                height: 26,
                                                borderRadius: 6,
                                                background:
                                                    "linear-gradient(135deg,#6366f1,#22c55e)",
                                                display: "inline-block",
                                                marginRight: 6,
                                            }}
                                        />
                                        <span
                                            style={{
                                                fontWeight: 600,
                                                color: "#0f172a",
                                            }}
                                        >
                                            {ordersTitle}
                                        </span>
                                    </Space>
                                }
                                extra={
                                    <Space size={8}>
                                        {selectedDay && (
                                            <Tag
                                                color="blue"
                                                style={{
                                                    cursor: "pointer",
                                                    borderRadius: 999,
                                                }}
                                                onClick={() => setSelectedDay(null)}
                                            >
                                                Xem tất cả đơn trong khoảng
                                            </Tag>
                                        )}
                                        <Text
                                            type="secondary"
                                            style={{
                                                fontSize: 12,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                        </Text>
                                    </Space>
                                }
                            >
                                {ordersForTable.length === 0 ? (
                                    <Empty description="Không có đơn nào trong khoảng này" />
                                ) : (
                                    <Table
                                        size="small"
                                        rowKey={(r) =>
                                            r.Booking_ID ||
                                            r.id ||
                                            r.booking_id ||
                                            `${r.Created_at}-${r.H_ID}`
                                        }
                                        loading={loading}
                                        columns={columns}
                                        className="analytics-table"
                                        dataSource={ordersForTable}
                                        pagination={{
                                            pageSize: 8,
                                            showSizeChanger: false,
                                            showTotal: (total) => `${total} đơn`,
                                        }}
                                    />
                                )}
                            </Card>
                        </Col>
                    </Row>
                </Layout.Content>
            </Layout>
        </>
    );
}
