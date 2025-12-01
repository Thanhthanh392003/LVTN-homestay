// src/pages/OwnerBookings.jsx
import React from "react";
import {
    Table, Button, Tag, message, Space, Typography, Card, Empty, Drawer,
    Descriptions, Divider, Row, Col, Tooltip, Input, Select,
} from "antd";
import {
    CheckCircleTwoTone, ExclamationCircleTwoTone, CloseCircleTwoTone,
    CalendarOutlined, TeamOutlined, HomeOutlined, DollarOutlined,
    CopyOutlined, FieldTimeOutlined, ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { bookingApi } from "../services/bookings";

const { Title, Text } = Typography;

/* ----------------- helpers ----------------- */
const VND = (n) => Number(n || 0).toLocaleString("vi-VN");
const asNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};
const gt0 = (v) => Number.isFinite(v) && v > 0;
const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "-");

const StatusPill = ({ value }) => {
    const v = String(value || "").toLowerCase();
    const map = {
        pending: {
            color: "warning",
            text: "Chờ duyệt",
            icon: <ExclamationCircleTwoTone twoToneColor="#faad14" />,
        },
        confirmed: {
            color: "success",
            text: "Đã xác nhận",
            icon: <CheckCircleTwoTone twoToneColor="#52c41a" />,
        },
        cancelled: {
            color: "error",
            text: "Đã huỷ",
            icon: <CloseCircleTwoTone twoToneColor="#ff4d4f" />,
        },
        paid: {
            color: "success",
            text: "Đã thanh toán",
            icon: <CheckCircleTwoTone twoToneColor="#52c41a" />,
        },
        completed: {
            color: "default",
            text: "Hoàn thành",
            icon: <FieldTimeOutlined />,
        },
    };
    const m =
        map[v] || {
            color: "default",
            text: value || "Unknown",
            icon: <FieldTimeOutlined />,
        };
    return (
        <Tag
            color={m.color}
            style={{
                borderRadius: 999,
                paddingInline: 10,
                height: 26,
                lineHeight: "24px",
            }}
        >
            <Space size={6} align="center">
                {m.icon}
                <span style={{ fontWeight: 600 }}>{m.text}</span>
            </Space>
        </Tag>
    );
};

const pick = (obj, paths, def = undefined) => {
    for (const p of paths) {
        try {
            const val = p
                .split(".")
                .reduce((o, k) => (o == null ? undefined : o[k]), obj);
            if (val !== undefined && val !== null && val !== "") return val;
        } catch { }
    }
    return def;
};
const humanMethod = (m) => {
    const v = String(m || "").toLowerCase();
    if (!v) return "—";
    if (v === "cod") return "Thanh toán tại chỗ (COD)";
    if (v === "bank") return "Chuyển khoản ngân hàng";
    if (v === "vnpay") return "VNPay";
    if (v === "momo") return "MoMo";
    return v;
};

/* ---------- Chuẩn hoá tiền/giảm giá ---------- */
function resolveLineTotal(d) {
    const cands = [
        d?.Line_total_after_discount, d?.line_total_after_discount,
        d?.Final_line_total, d?.final_line_total,
        d?.Payable, d?.amount_after_discount, d?.net_amount,
        d?.Line_total, d?.line_total, d?.Amount,
    ].map(asNum);
    const found = cands.find((x) => gt0(x));
    return gt0(found) ? found : 0;
}

function resolveSubtotalFromDetails(details = []) {
    return (details || []).reduce((s, d) => s + resolveLineTotal(d), 0);
}

function resolvePaidFromPayments(root) {
    // Ưu tiên các nhánh payments/Payment/transactions… (thường có số sau giảm, vd 570000)
    const arrs = [
        root?.payments,
        root?.Payments,
        root?.payment?.items,
        root?.transactions,
        root?.Payment?.items,
    ].filter(Array.isArray);
    for (const arr of arrs) {
        for (const it of arr) {
            const paid = [
                it?.amount,
                it?.Amount,
                it?.paid_amount,
                it?.Paid_amount,
                it?.net_amount,
                it?.final_amount,
                it?.Payable,
                it?.total,
            ]
                .map(asNum)
                .find((x) => gt0(x));
            if (gt0(paid)) return paid;
        }
    }
    const paidObj = [
        root?.Payment?.Amount,
        root?.Payment?.Paid_amount,
        root?.Payment?.Final_amount,
        root?.payment?.amount,
        root?.payment?.paid_amount,
        root?.payment?.final_amount,
    ]
        .map(asNum)
        .find((x) => gt0(x));
    return gt0(paidObj) ? paidObj : 0;
}

function resolveDiscount(root) {
    const d =
        asNum(root?.Discount_amount) ||
        asNum(root?.discount_amount) ||
        0;
    return d > 0 ? d : 0;
}


function resolveTotal(root, row) {
    const t =
        asNum(root?.Total_price) ||     // đúng của DB
        asNum(row?.Total_price) ||
        0;

    return t > 0 ? t : 0;
}


function resolveMoney(root, row) {
    // Ưu tiên đọc từ DB Booking
    const subtotal =
        asNum(root?.Subtotal) ||
        asNum(row?.Subtotal) ||
        resolveSubtotalFromDetails(root?.details || row?.details || []);

    let discount =
        asNum(root?.Discount_amount) ||
        asNum(row?.Discount_amount) ||
        asNum(root?.header?.Discount_amount) ||
        0;

    let total =
        asNum(root?.Total_price) ||
        asNum(row?.Total_price) ||
        Math.max(0, subtotal - discount);

    // Fallback: nếu chưa có discount nhưng biết subtotal & total thì suy ra
    if (!gt0(discount) && gt0(subtotal) && total < subtotal) {
        discount = subtotal - total;
    }

    // Chặn âm / vượt quá subtotal
    if (discount < 0) discount = 0;
    if (discount > subtotal) discount = subtotal;
    if (!gt0(total)) total = Math.max(0, subtotal - discount);

    // DEBUG
    console.log("[OwnerBookings] resolveMoney debug:", {
        subtotal,
        discount,
        total,
        raw: {
            rootSubtotal: root?.Subtotal,
            rowSubtotal: row?.Subtotal,
            rootDiscount: root?.Discount_amount,
            rowDiscount: row?.Discount_amount,
            headerDiscount: root?.header?.Discount_amount,
            rootTotal: root?.Total_price,
            rowTotal: row?.Total_price,
        },
    });

    return { subtotal, discount, total };
}



/* ----------------- sub panel ----------------- */
const DetailPanel = ({ r }) => {
    // Nếu có truyền __overrideTotal (đã trừ khuyến mãi) thì ưu tiên dùng
    const line =
        r.__overrideTotal != null ? r.__overrideTotal : resolveLineTotal(r);
    return (
        <div
            style={{
                background: "#fafafa",
                border: "1px solid #eee",
                borderRadius: 10,
                padding: 10,
                marginBottom: 6,
            }}
        >
            <Row gutter={[8, 8]}>
                <Col xs={24} md={12}>
                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                        <Space size={8} align="center">
                            <HomeOutlined style={{ color: "#10b981" }} />
                            <Text strong>{r.H_Name}</Text>
                        </Space>
                        <Space wrap>
                            <Tag
                                icon={<CalendarOutlined />}
                                color="geekblue"
                                style={{ borderRadius: 999, marginBottom: 0 }}
                            >
                                {fmtDate(r.Checkin_date)} → {fmtDate(r.Checkout_date)}
                            </Tag>
                            <Tag
                                icon={<TeamOutlined />}
                                color="green"
                                style={{ borderRadius: 999, marginBottom: 0 }}
                            >
                                Khách: {r.Guests}
                            </Tag>
                        </Space>
                    </Space>
                </Col>
                <Col xs={24} md={12}>
                    <Row gutter={8}>
                        <Col span={12}>
                            <Space size={6}>
                                <DollarOutlined style={{ color: "#1890ff" }} />
                                <Text>{VND(r.Unit_price)} ₫ / đêm</Text>
                            </Space>
                        </Col>
                        <Col span={12}>
                            <Space size={6} wrap>
                                <Text type="secondary">Thành tiền:</Text>
                                <Text strong style={{ color: "#0ea5e9" }}>
                                    {VND(line)} ₫
                                </Text>
                            </Space>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
};

export default function OwnerBookings() {
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(false);

    // Drawer
    const [open, setOpen] = React.useState(false);
    const [focus, setFocus] = React.useState(null);
    const [header, setHeader] = React.useState({ method: "", note: "" });
    const [money, setMoney] = React.useState({
        subtotal: 0,
        discount: 0,
        total: 0,
    });

    // map Booking_ID -> tổng sau giảm
    const [totalsById, setTotalsById] = React.useState({});

    // filter
    const [qId, setQId] = React.useState("");
    const [month, setMonth] = React.useState("all");
    const [year, setYear] = React.useState("all");

    // prefetch tổng tiền sau giảm cho tất cả đơn
    const prefetchTotals = async (items) => {
        const map = {};
        await Promise.all(
            (items || []).map(async (row) => {
                try {
                    const full = await bookingApi.get(row.Booking_ID);
                    const root = full?.data?.data || full?.data || full || {};
                    const m = resolveMoney(root, row);
                    map[row.Booking_ID] = m.total;
                } catch (e) {
                    console.warn(
                        "[OwnerBookings] prefetchTotals error for",
                        row.Booking_ID,
                        e?.response?.data || e?.message
                    );
                    const m = resolveMoney(row, row);
                    map[row.Booking_ID] = m.total;
                }
            })
        );
        setTotalsById(map);
    };

    const load = async () => {
        try {
            setLoading(true);
            const data = await bookingApi.ownerList();
            const list =
                (Array.isArray(data) && data) ||
                data?.items ||
                data?.rows ||
                data?.list ||
                data?.result ||
                (Array.isArray(data?.data) && data?.data) ||
                data?.data?.items ||
                data?.data?.rows ||
                data?.data?.list ||
                data?.data?.result ||
                [];
            const arr = Array.isArray(list) ? list : [];
            setRows(arr);
            await prefetchTotals(arr);
        } catch (e) {
            const code = e?.response?.status;
            const msg = e?.response?.data?.message;
            if (code === 401)
                message.error(
                    "Bạn cần đăng nhập bằng tài khoản chủ nhà (owner)."
                );
            else if (code === 403) message.error("Tài khoản hiện không có quyền Owner.");
            else message.error(msg || "Không tải được danh sách đơn.");
        } finally {
            setLoading(false);
        }
    };
    React.useEffect(() => {
        load();
    }, []);

    const setStatus = async (id, st) => {
        try {
            await bookingApi.updateStatus(id, st);
            message.success("Đã cập nhật");
            load();
            setOpen(false);
        } catch (e) {
            message.error(e?.response?.data?.message || "Lỗi cập nhật");
        }
    };

    const openDetail = async (row) => {
        setFocus(row);
        setOpen(true);

        const method0 = pick(
            row,
            [
                "Payment_method",
                "payment_method",
                "Method",
                "method",
                "Header.Payment_method",
                "header.Payment_method",
                "payment.method",
                "payments.0.method",
                "Payments.0.method",
                "booking.Payment_method",
                "booking.payment_method",
                "Header.payment.method",
                "header.payment.method",
            ],
            ""
        );
        const note0 = pick(
            row,
            [
                "Booking_note",
                "booking_note",
                "note",
                "Header.Booking_note",
                "header.Booking_note",
                "booking.Booking_note",
                "booking.note",
                "details.0.Booking_note",
                "details.0.booking_note",
                "Header.Note",
                "header.Note",
                "booking.Note",
                "Note",
                "Customer_note",
                "customer_note",
            ],
            ""
        );
        if (method0 || note0) setHeader({ method: method0, note: note0 });

        try {
            const full = await bookingApi.get(row.Booking_ID);
            console.log("[OwnerBookings] booking detail payload =", full);
            const root = full?.data?.data || full?.data || full || {};

            const details =
                root?.details || full?.details || full?.data?.details || [];
            if (Array.isArray(details) && !Array.isArray(row?.details)) {
                setFocus((prev) => ({ ...prev, details }));
            }

            if (!method0 || !note0) {
                const method =
                    method0 ||
                    pick(
                        root,
                        [
                            "Header.Payment_method",
                            "header.Payment_method",
                            "Payment_method",
                            "payment_method",
                            "payment.method",
                            "payments.0.method",
                            "Payments.0.method",
                        ],
                        ""
                    );
                const note =
                    note0 ||
                    pick(
                        root,
                        [
                            "Header.Booking_note",
                            "header.Booking_note",
                            "Booking_note",
                            "booking_note",
                            "booking.Booking_note",
                            "booking.note",
                            "customer_note",
                            "Customer_note",
                        ],
                        ""
                    );
                setHeader({ method, note });
            }

            const m = resolveMoney(root, row);
            console.log("[OwnerBookings] money after resolve:", m);
            setMoney(m);
            setTotalsById((prev) => ({
                ...prev,
                [row.Booking_ID]: m.total,
            }));

        } catch (e) {
            console.warn(
                "[OwnerBookings] fetch detail fallback failed:",
                e?.response?.data || e?.message
            );
            const m = resolveMoney(row, row);
            setMoney(m);
            setTotalsById((prev) => ({
                ...prev,
                [row.Booking_ID]: m.total,
            }));
        }
    };

    /* ---------- filter ---------- */
    const [monthStartEnd, matchMonthYear, matchCode] = React.useMemo(() => {
        const monthStartEnd =
            month === "all" || year === "all"
                ? null
                : {
                    start: dayjs(
                        `${year}-${String(month).padStart(2, "0")}-01`
                    ).startOf("month"),
                    end: dayjs(
                        `${year}-${String(month).padStart(2, "0")}-01`
                    ).endOf("month"),
                };
        const matchMonthYear = (b) => {
            if (!monthStartEnd) return true;
            const created =
                b?.Created_at ||
                b?.created_at ||
                b?.createdAt ||
                b?.Header?.Created_at ||
                b?.header?.Created_at;
            if (created && dayjs(created).isValid()) {
                const d = dayjs(created);
                return (
                    d.isAfter(monthStartEnd.start.subtract(1, "ms")) &&
                    d.isBefore(monthStartEnd.end.add(1, "ms"))
                );
            }
            const details = Array.isArray(b?.details) ? b.details : [];
            return details.some((d) => {
                const ci = d?.Checkin_date || d?.checkin || d?.checkin_date;
                const co = d?.Checkout_date || d?.checkout || d?.checkout_date;
                const a = ci ? dayjs(ci).startOf("day") : null;
                const b2 = co ? dayjs(co).startOf("day") : null;
                if (!a?.isValid?.() || !b2?.isValid?.()) return false;
                return !(
                    b2.isBefore(monthStartEnd.start) || a.isAfter(monthStartEnd.end)
                );
            });
        };
        const matchCode = (b) => {
            const key = String(qId || "").replace("#", "").trim();
            if (!key) return true;
            return String(b?.Booking_ID ?? "").includes(key);
        };
        return [monthStartEnd, matchMonthYear, matchCode];
    }, [month, year, qId]);

    const filteredRows = React.useMemo(
        () => rows.filter((b) => matchCode(b) && matchMonthYear(b)),
        [rows, matchCode, matchMonthYear]
    );

    const yearOptions = React.useMemo(() => {
        const years = new Set();
        rows.forEach((b) => {
            const c = b?.Created_at || b?.created_at || b?.createdAt;
            if (c && dayjs(c).isValid()) years.add(dayjs(c).year());
            (b?.details || []).forEach((d) => {
                const ci = d?.Checkin_date || d?.checkin || d?.checkin_date;
                const co = d?.Checkout_date || d?.checkout || d?.checkout_date;
                if (ci && dayjs(ci).isValid()) years.add(dayjs(ci).year());
                if (co && dayjs(co).isValid()) years.add(dayjs(co).year());
            });
        });
        if (years.size === 0) {
            const y = dayjs().year();
            [y - 2, y - 1, y, y + 1, y + 2].forEach((v) => years.add(v));
        }
        return Array.from(years).sort((a, b) => a - b);
    }, [rows]);

    const columns = [
        {
            title: "Mã đơn",
            dataIndex: "Booking_ID",
            render: (v) => (
                <Space size={8}>
                    <Text strong>#{v}</Text>
                    <Tooltip title="Copy mã đơn">
                        <Button
                            size="small"
                            type="text"
                            icon={<CopyOutlined />}
                            onClick={() => {
                                navigator.clipboard.writeText(String(v));
                                message.success("Đã copy mã đơn");
                            }}
                        />
                    </Tooltip>
                </Space>
            ),
            width: 160,
        },
        {
            title: "Trạng thái",
            dataIndex: "Booking_status",
            render: (v) => <StatusPill value={v} />,
            width: 160,
        },
        {
            title: "Tổng tiền",
            dataIndex: "Total_price",
            render: (_, row) => {
                const cached = totalsById[row.Booking_ID];
                let total;

                if (gt0(cached)) {
                    total = cached;
                } else {
                    const m = resolveMoney(row, row);
                    total = gt0(m.total)
                        ? m.total
                        : [
                            row.Total_after_discount,
                            row.total_after_discount,
                            row.Final_total,
                            row.Grand_total,
                            row.Payable_amount,
                            row.Amount_paid,
                            row.Total_price,
                        ]
                            .map(asNum)
                            .find((x) => gt0(x)) || 0;
                }

                return (
                    <Text strong style={{ color: "#0ea5e9" }}>
                        {VND(total)} ₫
                    </Text>
                );
            },
            width: 160,
        },
        {
            title: "Tạo lúc",
            dataIndex: "Created_at",
            render: (v) => (
                <Space>
                    <FieldTimeOutlined />
                    <Text type="secondary">
                        {v ? dayjs(v).format("HH:mm DD/MM/YYYY") : "-"}
                    </Text>
                </Space>
            ),
            width: 180,
            responsive: ["lg"],
        },
        {
            title: "Thao tác",
            fixed: "right",
            width: 340,
            render: (_, r) => {
                const st = String(r.Booking_status || r.status).toLowerCase();
                const canConfirm = st === "pending" || st === "paid";
                const lastOut = r?.details?.reduce(
                    (m, d) => (!m || d.Checkout_date > m ? d.Checkout_date : m),
                    null
                );
                const canComplete =
                    (st === "confirmed" || st === "paid") &&
                    lastOut &&
                    new Date() >= new Date(lastOut);
                return (
                    <Space size={8} wrap>
                        <Button size="small" onClick={() => openDetail(r)}>
                            Chi tiết
                        </Button>
                        <Button
                            size="small"
                            type="primary"
                            onClick={() => setStatus(r.Booking_ID, "confirmed")}
                            disabled={!canConfirm}
                        >
                            Xác nhận
                        </Button>
                        <Button
                            size="small"
                            danger
                            onClick={() => setStatus(r.Booking_ID, "cancelled")}
                            disabled={st === "completed"}
                        >
                            Hủy
                        </Button>
                        <Button
                            size="small"
                            onClick={() => setStatus(r.Booking_ID, "completed")}
                            disabled={!canComplete}
                        >
                            Hoàn thành
                        </Button>
                    </Space>
                );
            },
        },
    ];

    return (
        <div
            style={{
                minHeight: "100%",
                padding: 12,
                background:
                    "radial-gradient(900px 180px at 8% -8%, rgba(16,185,129,.08), transparent 55%), radial-gradient(900px 180px at 85% -6%, rgba(59,130,246,.08), transparent 55%), #f9fbfa",
            }}
        >
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <Card
                    style={{
                        borderRadius: 14,
                        background: "linear-gradient(135deg,#ffffff,#f5fbff)",
                        boxShadow: "0 10px 20px rgba(15,23,42,.06)",
                    }}
                    bodyStyle={{ padding: 12 }}
                >
                    <Space
                        align="center"
                        style={{ width: "100%", justifyContent: "space-between" }}
                    >
                        <Space align="center" wrap>
                            <HomeOutlined style={{ fontSize: 22, color: "#10b981" }} />
                            <Title level={5} style={{ margin: 0 }}>
                                Đơn đặt của khách
                            </Title>
                            <Tag
                                color="cyan"
                                style={{
                                    borderRadius: 999,
                                    height: 24,
                                    lineHeight: "22px",
                                }}
                            >
                                Owner Panel
                            </Tag>
                        </Space>
                        <Button size="small" icon={<ReloadOutlined />} onClick={load}>
                            Tải lại
                        </Button>
                    </Space>
                </Card>

                <Card
                    style={{
                        borderRadius: 14,
                        boxShadow: "0 8px 18px rgba(15,23,42,.05)",
                    }}
                    bodyStyle={{ padding: 12 }}
                >
                    <Row gutter={[8, 8]}>
                        <Col xs={24} md={10}>
                            <Input
                                allowClear
                                value={qId}
                                onChange={(e) => setQId(e.target.value)}
                                placeholder="Tìm theo mã đơn (ví dụ: 126 hoặc #126)"
                            />
                        </Col>
                        <Col xs={12} md={5}>
                            <Select
                                value={month}
                                onChange={setMonth}
                                style={{ width: "100%" }}
                                options={[
                                    { value: "all", label: "Tất cả tháng" },
                                    ...Array.from({ length: 12 }, (_, i) => ({
                                        value: i + 1,
                                        label: `Tháng ${i + 1}`,
                                    })),
                                ]}
                            />
                        </Col>
                        <Col xs={12} md={5}>
                            <Select
                                value={year}
                                onChange={setYear}
                                style={{ width: "100%" }}
                                options={[
                                    { value: "all", label: "Tất cả năm" },
                                    ...yearOptions.map((y) => ({
                                        value: y,
                                        label: String(y),
                                    })),
                                ]}
                            />
                        </Col>
                        <Col xs={24} md={4}>
                            <Space wrap>
                                <Button
                                    onClick={() => {
                                        setQId("");
                                        setMonth("all");
                                        setYear("all");
                                    }}
                                >
                                    Xoá lọc
                                </Button>
                            </Space>
                        </Col>
                    </Row>
                    <div style={{ marginTop: 8 }}>
                        <Text type="secondary">
                            Đang hiển thị <b>{filteredRows.length}</b> / {rows.length} đơn
                            {month !== "all" && year !== "all"
                                ? ` (tháng ${month}/${year})`
                                : ""}
                            .
                        </Text>
                    </div>
                </Card>

                <Card
                    style={{
                        borderRadius: 14,
                        boxShadow: "0 8px 18px rgba(15,23,42,.05)",
                    }}
                    bodyStyle={{ padding: 8 }}
                >
                    <Table
                        loading={loading}
                        rowKey="Booking_ID"
                        dataSource={filteredRows}
                        size="small"
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        <Space direction="vertical" size={2}>
                                            <Text strong>Không có đơn phù hợp</Text>
                                            <Text type="secondary">
                                                Thử thay đổi bộ lọc hoặc xoá từ khoá tìm kiếm.
                                            </Text>
                                        </Space>
                                    }
                                />
                            ),
                        }}
                        scroll={{ x: 980 }}
                        expandable={{
                            expandedRowRender: (parent) => {
                                const details = parent?.details || [];
                                const totalAfter = totalsById[parent.Booking_ID];
                                const useOverride = details.length === 1 && gt0(totalAfter);

                                return (
                                    <Space
                                        direction="vertical"
                                        style={{ width: "100%" }}
                                        size={6}
                                    >
                                        {details.map((d, idx) => (
                                            <div
                                                key={d.Booking_Detail_ID || idx}
                                                style={{
                                                    background: idx % 2
                                                        ? "#fff"
                                                        : "#fdfefe",
                                                    borderRadius: 10,
                                                }}
                                            >
                                                <DetailPanel
                                                    r={
                                                        useOverride
                                                            ? { ...d, __overrideTotal: totalAfter }
                                                            : d
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </Space>
                                );
                            },
                            expandRowByClick: true,
                        }}
                        columns={columns}
                        pagination={{
                            pageSize: 8,
                            showSizeChanger: false,
                        }}
                        style={{ borderRadius: 10 }}
                    />
                </Card>
            </Space>

            <Drawer
                title={
                    <Space>
                        <HomeOutlined />
                        <span>Chi tiết đơn #{focus?.Booking_ID}</span>
                    </Space>
                }
                onClose={() => setOpen(false)}
                open={open}
                width={680}
            >
                {focus ? (
                    <Space direction="vertical" style={{ width: "100%" }} size={10}>
                        <Space align="center" wrap>
                            <StatusPill value={focus.Booking_status} />
                            <Tag
                                icon={<DollarOutlined />}
                                color="processing"
                                style={{ borderRadius: 999 }}
                            >
                                Tổng: {VND(money.total)} ₫
                            </Tag>
                            <Tag
                                icon={<FieldTimeOutlined />}
                                color="default"
                                style={{ borderRadius: 999 }}
                            >
                                Tạo:{" "}
                                {focus.Created_at
                                    ? dayjs(focus.Created_at).format(
                                        "HH:mm DD/MM/YYYY"
                                    )
                                    : "-"}
                            </Tag>
                        </Space>

                        <Descriptions size="small" column={2} colon>
                            <Descriptions.Item label="Phương thức thanh toán">
                                {humanMethod(header?.method)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ghi chú của khách" span={2}>
                                {header?.note && String(header.note).trim()
                                    ? String(header.note)
                                    : "—"}
                            </Descriptions.Item>
                        </Descriptions>
                        <Divider style={{ margin: "8px 0" }} />

                        <Title level={5} style={{ marginTop: 0 }}>
                            Danh sách hạng mục
                        </Title>
                        <Space direction="vertical" size={8} style={{ width: "100%" }}>
                            {(focus.details || []).map((d, i) => (
                                <Card
                                    key={d.Booking_Detail_ID || i}
                                    size="small"
                                    style={{ borderRadius: 12 }}
                                    bodyStyle={{ padding: 10 }}
                                    title={
                                        <Space>
                                            <HomeOutlined />
                                            <Text strong>{d.H_Name}</Text>
                                        </Space>
                                    }
                                    extra={<Tag color="blue">#{d.Booking_Detail_ID}</Tag>}
                                >
                                    <Row gutter={[8, 6]}>
                                        <Col xs={24} md={12}>
                                            <Descriptions
                                                size="small"
                                                column={1}
                                                colon
                                                items={[
                                                    {
                                                        key: "in",
                                                        label: "Check-in",
                                                        children: fmtDate(d.Checkin_date),
                                                    },
                                                    {
                                                        key: "out",
                                                        label: "Check-out",
                                                        children: fmtDate(d.Checkout_date),
                                                    },
                                                    {
                                                        key: "guests",
                                                        label: "Số khách",
                                                        children: d.Guests,
                                                    },
                                                ]}
                                            />
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Descriptions
                                                size="small"
                                                column={1}
                                                colon
                                                items={[
                                                    {
                                                        key: "unit",
                                                        label: "Đơn giá/đêm",
                                                        children: `${VND(d.Unit_price)} ₫`,
                                                    },
                                                    {
                                                        key: "line",
                                                        label: "Thành tiền",
                                                        children: (
                                                            <Text strong>
                                                                {VND(
                                                                    focus.details?.length ===
                                                                        1 && gt0(money.total)
                                                                        ? money.total
                                                                        : resolveLineTotal(d)
                                                                )}{" "}
                                                                ₫
                                                            </Text>
                                                        ),
                                                    },
                                                ]}
                                            />
                                        </Col>
                                    </Row>
                                </Card>
                            ))}
                        </Space>

                        <Divider />
                        <Descriptions size="small" column={1} colon>
                            <Descriptions.Item label="Tạm tính">
                                {VND(money.subtotal)} ₫
                            </Descriptions.Item>
                            <Descriptions.Item label="Giảm giá">
                                - {VND(Number(money.discount || 0))} ₫
                            </Descriptions.Item>

                            <Descriptions.Item label="Tổng thanh toán">
                                <Text strong style={{ fontSize: 16 }}>
                                    {VND(money.total)} ₫
                                </Text>
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider />
                        <Space size={8} wrap>
                            <Button
                                type="primary"
                                icon={
                                    <CheckCircleTwoTone twoToneColor="#ffffff" />
                                }
                                disabled={
                                    !["pending", "paid"].includes(
                                        String(focus.Booking_status).toLowerCase()
                                    )
                                }
                                onClick={() =>
                                    setStatus(focus.Booking_ID, "confirmed")
                                }
                            >
                                Xác nhận
                            </Button>
                            <Button
                                danger
                                icon={<CloseCircleTwoTone twoToneColor="#ffffff" />}
                                disabled={
                                    String(focus.Booking_status).toLowerCase() ===
                                    "cancelled"
                                }
                                onClick={() =>
                                    setStatus(focus.Booking_ID, "cancelled")
                                }
                            >
                                Huỷ
                            </Button>
                            <Tooltip title="Copy mã đơn">
                                <Button
                                    icon={<CopyOutlined />}
                                    onClick={() => {
                                        navigator.clipboard.writeText(
                                            String(focus.Booking_ID)
                                        );
                                        message.success("Đã copy mã đơn");
                                    }}
                                >
                                    Copy mã
                                </Button>
                            </Tooltip>
                        </Space>
                    </Space>
                ) : null}
            </Drawer>

            <style>{`
                .ant-table-tbody > tr > td,
                .ant-table-thead > tr > th {
                    padding: 8px 12px !important;
                }
            `}</style>
        </div>
    );
}
