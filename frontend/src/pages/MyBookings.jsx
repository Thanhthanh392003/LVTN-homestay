// --- src/pages/MyBookings.jsx ---
import React from "react";
import {
    Typography, Segmented, Card, Row, Col, Space, Tag, Empty, Skeleton,
    Divider, Button, Drawer, message, Descriptions, Input, DatePicker, Select,
    Modal, Form, Rate, Popconfirm
} from "antd";
import {
    CheckCircleTwoTone, ClockCircleTwoTone, CloseCircleTwoTone,
    TeamOutlined, CalendarOutlined, DollarOutlined, HomeOutlined, EyeOutlined,
    SearchOutlined, ReloadOutlined, FilterOutlined, StarFilled
} from "@ant-design/icons";
import dayjs from "dayjs";
import { bookingApi } from "../services/bookings";
import { reviewsApi } from "../services/reviews";
import { complaintsApi } from "../services/complaints";


const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");


/* ==== UI helpers ==== */
const StatusPill = ({ s }) => {
    const map = {
        pending: { c: "gold", icon: <ClockCircleTwoTone twoToneColor="#faad14" />, lb: "Chờ duyệt" },
        pending_payment: { c: "orange", icon: <ClockCircleTwoTone twoToneColor="#fa8c16" />, lb: "Chờ thanh toán" },
        confirmed: { c: "green", icon: <CheckCircleTwoTone twoToneColor="#52c41a" />, lb: "Đã xác nhận" },
        paid: { c: "cyan", icon: <CheckCircleTwoTone twoToneColor="#13c2c2" />, lb: "Đã thanh toán" },
        cancelled: { c: "volcano", icon: <CloseCircleTwoTone twoToneColor="#ff4d4f" />, lb: "Đã huỷ" },
        completed: { c: "blue", icon: <CheckCircleTwoTone twoToneColor="#1677ff" />, lb: "Hoàn tất" },
    };
    const m = map[String(s || "").toLowerCase()] || { c: "default", icon: null, lb: s || "-" };
    return (
        <Tag color={m.c} className="pill">
            <Space size={6} align="center">{m.icon}<span>{m.lb}</span></Space>
        </Tag>
    );
};

const methodLabel = (m) => {
    const k = String(m || "").toLowerCase();
    return (
        {
            cod: "Thanh toán tại chỗ (COD)",
            bank: "Chuyển khoản ngân hàng",
            vnpay: "VNPay",
            momo: "MoMo",
        }[k] || (m ? String(m) : "—")
    );
};

/* ==== data helpers ==== */
const unwrap = (x) => {
    let v = x;
    for (let i = 0; i < 4; i++) {
        if (v && typeof v === "object" && "data" in v && v.data != null) v = v.data;
        else break;
    }
    return v;
};
const pick = (obj, paths, def = undefined) => {
    for (const p of paths) {
        try {
            const val = p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
            if (val !== undefined && val !== null) return val;
        } catch { }
    }
    return def;
};
const extractMethodFromRow = (row) =>
    pick(row, ["Payment_method", "payment_method", "payment.method", "payments.0.method", "payments.0.Gateway"], "");
const extractCreatedAt = (row) => {
    const c = row?.Created_at || row?.created_at || row?.createdAt;
    if (c) return c;
    const d = row?.details?.[0];
    return d?.Checkin_date || d?.Checkout_date || null;
};
const extractStayRange = (row) => {
    const d0 = row?.details?.[0];
    const ci = d0?.Checkin_date ? dayjs(d0.Checkin_date) : null;
    const co = d0?.Checkout_date ? dayjs(d0.Checkout_date) : null;
    if (ci && ci.isValid() && co && co.isValid()) return [ci.startOf("day"), co.endOf("day")];
    return [null, null];
};
const lastCheckout = (row) => {
    const ds = Array.isArray(row?.details) ? row.details : [];
    let max = null;
    for (const d of ds) {
        if (d?.Checkout_date && dayjs(d.Checkout_date).isValid()) {
            const t = dayjs(d.Checkout_date);
            if (!max || t.isAfter(max)) max = t;
        }
    }
    return max;
};
const canReview = (row) => {
    const st = String(row?.Booking_status || "").toLowerCase();
    const okSt = ["confirmed", "paid", "completed"].includes(st);
    const lastOut = lastCheckout(row);
    return okSt && lastOut && lastOut.isBefore(dayjs());
};

// có được phép huỷ đơn này không
const canCancelBooking = (row) => {
    const st = String(row?.Booking_status || row?.status || "").toLowerCase();
    if (["cancelled", "completed"].includes(st)) return false;
    const lastOut = lastCheckout(row);
    if (lastOut && lastOut.isBefore(dayjs())) return false; // đã qua ngày trả phòng
    return true;
};

/* ==== component ==== */
export default function MyBookings() {
    const [loading, setLoading] = React.useState(true);
    const [rows, setRows] = React.useState([]);
    const [statusFilter, setStatusFilter] = React.useState("all");

    // Tìm kiếm & Lọc
    const [q, setQ] = React.useState("");
    const [range, setRange] = React.useState(null);
    const [method, setMethod] = React.useState("all");

    // Drawer detail
    const [detailOpen, setDetailOpen] = React.useState(false);
    const [detailId, setDetailId] = React.useState(null);
    const [detail, setDetail] = React.useState(null);
    const [detailLoading, setDetailLoading] = React.useState(false);

    // Review Modal
    const [reviewOpen, setReviewOpen] = React.useState(false);
    const [reviewTarget, setReviewTarget] = React.useState(null);     // booking row
    const [existingReview, setExistingReview] = React.useState(null); // {Review_ID, Rating, Content}
    const [reviewForm] = Form.useForm();

    // Complaint Modal
    const [complaintOpen, setComplaintOpen] = React.useState(false);
    const [complaintMode, setComplaintMode] = React.useState("booking");
    const [complaintBookingId, setComplaintBookingId] = React.useState(null);
    const [complaintForm] = Form.useForm();
    const [complaintPreview, setComplaintPreview] = React.useState(null);
    const [complaintPreviewOpen, setComplaintPreviewOpen] = React.useState(false);
    const [viewMode, setViewMode] = React.useState("bookings");
    const [myComplaints, setMyComplaints] = React.useState([]);
    const [loadingComplaints, setLoadingComplaints] = React.useState(false);




    // helpers: tìm review cho 1 booking
    const fetchReviewFor = React.useCallback(async (row) => {
        const d0 = row?.details?.[0] || {};
        const hid = d0?.H_ID || row?.H_ID;
        const bid = row?.Booking_ID;
        if (!hid || !bid) return null;

        // ưu tiên API riêng cho 1 booking nếu có
        if (typeof reviewsApi.getMineByBooking === "function") {
            try {
                const r = await reviewsApi.getMineByBooking(bid);
                return r?.data || r || null;
            } catch { }
        }
        // fallback: lấy danh sách review của tôi theo homestay rồi lọc theo Booking_ID
        try {
            const list = await reviewsApi.listByHomestay(hid, { mine: 1 });
            const arr = Array.isArray(list?.data) ? list.data : (Array.isArray(list) ? list : []);
            return arr.find((x) => Number(x?.Booking_ID) === Number(bid)) || null;
        } catch { return null; }
    }, []);

    const openReview = async (row) => {
        setReviewTarget(row);
        const r = await fetchReviewFor(row);
        setExistingReview(r || null);
        reviewForm.setFieldsValue({
            Rating: r?.Rating ?? undefined,
            Content: r?.Content ?? ""
        });
        setReviewOpen(true);
    };

    const submitReview = async () => {
        try {
            const v = await reviewForm.validateFields();
            const d0 = reviewTarget?.details?.[0] || {};
            const payload = {
                Booking_ID: reviewTarget?.Booking_ID,
                H_ID: d0?.H_ID || reviewTarget?.H_ID,
                Rating: v.Rating,
                Content: v.Content || "",
                Images: [],
            };

            if (existingReview?.Review_ID) {
                const id = existingReview.Review_ID;
                const resp = await (reviewsApi.update
                    ? reviewsApi.update(id, payload)
                    : reviewsApi.patch
                        ? reviewsApi.patch(id, payload)
                        : reviewsApi.edit
                            ? reviewsApi.edit(id, payload)
                            : Promise.reject(new Error("API update review chưa có")));
                console.log("[MyBookings.updateReview] ✓", resp);
                message.success("Đã cập nhật đánh giá.");
            } else {
                const resp = await reviewsApi.create(payload);
                console.log("[MyBookings.createReview] ✓", resp);
                message.success("Cảm ơn bạn! Đánh giá đã được gửi.");
            }

            setReviewOpen(false);
            setExistingReview(null);
        } catch (e) {
            const status = e?.response?.status;
            const resp = e?.response?.data;
            console.error("[MyBookings.submitReview] ❌ error:", { status, resp, e });
            const msg = resp?.message || e?.message || "Gửi đánh giá thất bại";
            message.error(msg);
        }
    };

    const handleDeleteReview = async () => {
        if (!existingReview?.Review_ID) return;
        try {
            const id = existingReview.Review_ID;
            if (reviewsApi.remove) await reviewsApi.remove(id);
            else if (reviewsApi.delete) await reviewsApi.delete(id);
            else if (reviewsApi.destroy) await reviewsApi.destroy(id);
            else throw new Error("API delete review chưa có");

            message.success("Đã xoá đánh giá.");
            setExistingReview(null);
            setReviewOpen(false);
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || "Xoá đánh giá thất bại";
            message.error(msg);
        }
    };

    // load list
    const reload = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await bookingApi.mine();
            const list =
                (Array.isArray(data) && data) ||
                data?.items || data?.rows || data?.list || data?.result ||
                (Array.isArray(data?.data) && data?.data) ||
                data?.data?.items || data?.data?.rows || data?.data?.list || data?.data?.result || [];
            setRows(Array.isArray(list) ? list : []);
        } catch (e) {
            message.error("Không tải được danh sách đơn");
            console.warn("[MyBookings] load error:", e?.response?.data || e?.message);
        } finally { setLoading(false); }
    }, []);
    React.useEffect(() => { reload(); }, [reload]);

    // HUỶ ĐƠN
    const handleCancelBooking = async (row) => {
        const id = row?.Booking_ID || row?.id || detailId;
        if (!id) return;
        try {
            await bookingApi.updateStatus(id, "cancelled");
            message.success("Đã huỷ đơn.");
            await reload();
            setDetailOpen(false);
        } catch (e) {
            console.error("[MyBookings.cancel] error:", e?.response?.data || e?.message);
            const msg = e?.response?.data?.message || e?.message || "Huỷ đơn thất bại";
            message.error(msg);
        }
    };

    // ======= Complaint helpers =======
    const openComplaint = (booking) => {
        setComplaintBookingId(booking.Booking_ID);
        setComplaintMode("booking");
        complaintForm.resetFields();
        setComplaintOpen(true);
    };


    const submitComplaint = async () => {
        try {
            const values = await complaintForm.validateFields();

            const payload = {
                type: "booking",
                bookingId: complaintBookingId,
                subject: values.subject,
                content: values.content,
            };

            await complaintsApi.create(payload);

            message.success("Đã gửi khiếu nại / góp ý!");

            // đóng form nhập
            setComplaintOpen(false);

            // lưu lại để hiển thị cho khách xem
            setComplaintPreview({
                ...payload,
                createdAt: new Date().toISOString(),
            });
            setComplaintPreviewOpen(true);

            complaintForm.resetFields();
        } catch (err) {
            console.error("Complaint error:", err);
            message.error("Gửi khiếu nại thất bại!");
        }
    };

    const loadComplaints = async () => {
        try {
            setLoadingComplaints(true);
            const resp = await complaintsApi.mine?.();
            const list = resp?.data || resp || [];
            setMyComplaints(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("Load complaints error:", err);
            message.error("Không tải được danh sách khiếu nại");
        } finally {
            setLoadingComplaints(false);
        }
    };


    // mở chi tiết
    const openDetail = (id) => {
        setDetail(null);
        setDetailId(id);
        setDetailOpen(true);
    };

    // fetch detail
    React.useEffect(() => {
        let alive = true;
        const run = async () => {
            if (!detailOpen || !detailId) return;
            try {
                setDetailLoading(true);
                const resp = await bookingApi.get(detailId);
                const raw = unwrap(resp);
                const header = raw?.header || raw?.Header || raw || {};
                const details = raw?.details || [];
                const payments = raw?.payments || header?.payments || [];

                const method =
                    pick(header, ["Payment_method", "payment_method", "payment.method"]) ||
                    pick(payments?.[0] || {}, ["Gateway", "gateway", "method"], "");
                const note =
                    pick(header, ["Booking_note", "booking_note", "note"]) ||
                    pick(details?.[0] || {}, ["Booking_note", "booking_note"], "");

                // tổng theo chi tiết
                const detailSum = details.reduce((s, d) => s + Number(d?.Line_total || 0), 0);


                // tạm tính và số tiền được giảm
                let subtotal = Number(header?.Subtotal ?? 0);
                let discountAmount = Number(header?.Discount_amount ?? 0);
                let total = Number(header?.Total_price ?? 0);

                // fallback nếu backend không trả Subtotal (không xảy ra sau khi bạn sửa BE)
                if (!subtotal) {
                    const detailSum = details.reduce((s, d) => s + Number(d?.Line_total || 0), 0);
                    subtotal = detailSum;
                }
                if (!total) total = subtotal - discountAmount;

                // never let negative values
                if (subtotal < 0) subtotal = 0;
                if (discountAmount < 0) discountAmount = 0;
                if (total < 0) total = 0;

                const packed = {
                    id: header?.Booking_ID || detailId,
                    status: header?.Booking_status,
                    created: header?.Created_at,
                    subtotal,
                    discount: discountAmount,
                    total,
                    method,
                    note,
                    details,
                };
                if (alive) setDetail(packed);
            } catch (e) {
                message.error("Không lấy được chi tiết đơn");
                console.warn("[MyBookings] detail error:", e?.response?.data || e?.message);
            } finally { if (alive) setDetailLoading(false); }
        };
        run();
        return () => { alive = false; };
    }, [detailOpen, detailId]);

    // Lọc danh sách
    const filtered = React.useMemo(() => {
        const kw = String(q || "").trim().toLowerCase();
        const hasKw = kw.length > 0;
        const rStart = range?.[0] ? dayjs(range[0]).startOf("day") : null;
        const rEnd = range?.[1] ? dayjs(range[1]).endOf("day") : null;
        const mSel = String(method || "all").toLowerCase();
        const stSel = String(statusFilter || "all").toLowerCase();

        return rows.filter((b) => {
            if (stSel !== "all" && String(b?.Booking_status).toLowerCase() !== stSel) return false;

            if (hasKw) {
                const idMatch = String(b?.Booking_ID || "").includes(kw.replace("#", ""));
                const name = b?.details?.[0]?.H_Name || "";
                const nameMatch = String(name).toLowerCase().includes(kw);
                if (!idMatch && !nameMatch) return false;
            }

            if (rStart && rEnd) {
                const [bStart, bEnd] = extractStayRange(b);
                if (bStart && bEnd) {
                    const noOverlap = bEnd.isBefore(rStart) || bStart.isAfter(rEnd);
                    if (noOverlap) return false;
                } else {
                    const created = extractCreatedAt(b);
                    if (created && dayjs(created).isValid()) {
                        const d = dayjs(created);
                        if (d.isBefore(rStart) || d.isAfter(rEnd)) return false;
                    }
                }
            }

            if (mSel !== "all") {
                const m = String(extractMethodFromRow(b) || "").toLowerCase();
                if (m !== mSel) return false;
            }
            return true;
        });
    }, [rows, q, range, method, statusFilter]);

    // Cache trạng thái review cho từng Booking_ID -> {exists, rating, id}
    const [reviewStatus, setReviewStatus] = React.useState({});

    const prefetchReview = async (row) => {
        const bid = row?.Booking_ID;
        if (!bid || reviewStatus[bid]) return;
        const r = await fetchReviewFor(row);
        setReviewStatus((m) => ({ ...m, [bid]: r ? { exists: true, rating: r.Rating, id: r.Review_ID } : { exists: false } }));
    };

    const renderItem = (b) => {
        const first = b?.details?.[0];
        const title = first?.H_Name || "Homestay";
        const dateRange = first ? `${first.Checkin_date} → ${first.Checkout_date}` : "-";
        const guests = first?.Guests || b?.Guests || 1;
        const rs = reviewStatus[b.Booking_ID];
        const canCancel = canCancelBooking(b);

        // Tính tạm tính / giảm / tổng sau giảm cho card list
        const subtotalFromDetails = (b.details || []).reduce(
            (s, d) => s + Number(d?.Line_total || 0),
            0
        );
        let totalHeader = Number(b.Total_price || 0);
        if (!totalHeader && subtotalFromDetails) totalHeader = subtotalFromDetails;

        // ưu tiên discount BE trả về
        let discountAmt = Number(b.Discount_amount || 0);

        // fallback nếu BE chưa trả discount
        if (!discountAmt && subtotalFromDetails > 0 && totalHeader <= subtotalFromDetails) {
            discountAmt = subtotalFromDetails - totalHeader;
        }

        // bảo vệ
        if (discountAmt < 0) discountAmt = 0;

        const totalAfter = totalHeader || subtotalFromDetails;

        return (
            <Card
                key={b.Booking_ID}
                hoverable
                className="booking-card"
                onMouseEnter={() => prefetchReview(b)}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            >
                <Row align="middle" gutter={[12, 12]}>
                    <Col xs={24} md={6}>
                        <Space direction="vertical" size={6}>
                            <Space>
                                <Text type="secondary">Mã đơn</Text>
                                <Title level={5} style={{ margin: 0 }}>#{b.Booking_ID}</Title>
                            </Space>
                            <StatusPill s={b.Booking_status} />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                <CalendarOutlined /> {b.Created_at ? new Date(b.Created_at).toLocaleString("vi-VN") : "-"}
                            </Text>
                        </Space>
                    </Col>

                    <Col xs={24} md={10}>
                        <Space direction="vertical" size={6}>
                            <Space>
                                <HomeOutlined className="ico-home" />
                                <Text strong>{title}</Text>
                            </Space>
                            <Space wrap>
                                <Tag icon={<CalendarOutlined />} className="tag-soft">{dateRange}</Tag>
                                <Tag icon={<TeamOutlined />} className="tag-soft">{guests} khách</Tag>
                                {discountAmt > 0 && (
                                    <Tag icon={<DollarOutlined />} color="green" className="pill">
                                        Giảm: -{fmt(discountAmt)} ₫
                                    </Tag>
                                )}
                            </Space>
                        </Space>
                    </Col>

                    <Col xs={24} md={8}>
                        <Space direction="vertical" align="end" style={{ width: "100%" }}>
                            <Text type="secondary">Tổng tiền</Text>
                            <Title level={4} className="price">{fmt(totalAfter)} ₫</Title>
                            <Space wrap>
                                <Button className="btn-ghost" icon={<EyeOutlined />} onClick={() => openDetail(b.Booking_ID)}>Chi tiết</Button>

                                {canReview(b) && (!rs || !rs.exists) ? (
                                    <Button type="primary" onClick={() => openReview(b)} icon={<StarFilled />}>
                                        Đánh giá
                                    </Button>
                                ) : canReview(b) && rs && rs.exists ? (
                                    <>
                                        <Button onClick={() => openReview(b)}>Xem / Sửa</Button>
                                        <Popconfirm
                                            title="Xoá đánh giá này?"
                                            okText="Xoá"
                                            cancelText="Huỷ"
                                            onConfirm={async () => {
                                                setExistingReview({ Review_ID: rs.id });
                                                await handleDeleteReview();
                                                setReviewStatus((m) => ({ ...m, [b.Booking_ID]: { exists: false } }));
                                            }}
                                        >
                                            <Button danger>XOÁ</Button>
                                        </Popconfirm>
                                    </>
                                ) : (
                                    <Popconfirm
                                        title="Huỷ đơn này?"
                                        description="Bạn chắc chắn muốn huỷ đơn này?"
                                        okText="Huỷ đơn"
                                        cancelText="Không"
                                        onConfirm={() => handleCancelBooking(b)}
                                        disabled={!canCancel}
                                    >
                                        <Button
                                            danger
                                            className="btn-danger-soft"
                                            disabled={!canCancel}
                                        >
                                            Huỷ
                                        </Button>
                                    </Popconfirm>
                                )}
                            </Space>
                        </Space>
                    </Col>
                </Row>
            </Card>
        );
    };

    const clearFilters = () => {
        setQ(""); setRange(null); setMethod("all"); setStatusFilter("all");
    };

    React.useEffect(() => {
        if (viewMode === "complaints") {
            loadComplaints();
        }
    }, [viewMode]);


    return (
        <div className="bk-wrap">
            <div className="bk-container">
                {/* Header + Bộ lọc */}
                <Segmented
                    value={viewMode}
                    onChange={setViewMode}
                    options={[
                        { label: "Đơn đặt", value: "bookings" },
                        { label: "Khiếu nại của tôi", value: "complaints" },
                    ]}
                />

                <Divider />

                <Card className="header-card" bodyStyle={{ padding: 16 }}>
                    <Space direction="vertical" style={{ width: "100%" }} size={12}>
                        <Row align="middle" justify="space-between" gutter={[12, 12]}>
                            <Col flex="auto">
                                <Space direction="vertical" size={2}>
                                    <Title level={3} style={{ margin: 0 }}>Đơn đặt của bạn</Title>
                                    <Text type="secondary">Theo dõi trạng thái và quản lý đơn nhanh chóng</Text>
                                </Space>
                            </Col>
                            <Col>
                                <Segmented
                                    value={statusFilter}
                                    onChange={(v) => setStatusFilter(v)}
                                    options={[
                                        { label: "Tất cả", value: "all" },
                                        { label: "Chờ duyệt", value: "pending" },
                                        { label: "Đã xác nhận", value: "confirmed" },
                                        { label: "Đã thanh toán", value: "paid" },
                                        { label: "Đã huỷ", value: "cancelled" },
                                        { label: "Hoàn tất", value: "completed" },
                                    ]}
                                />
                            </Col>
                        </Row>

                        {/* Filter bar */}
                        <Card bodyStyle={{ padding: 12 }} className="filter-bar">
                            <Row gutter={[10, 10]} align="middle">
                                <Col xs={24} md={8}>
                                    <Input
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        allowClear
                                        prefix={<SearchOutlined style={{ color: "#64748b" }} />}
                                        placeholder="Tìm theo #mã đơn hoặc tên homestay…"
                                        className="input-soft"
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <RangePicker
                                        value={range}
                                        onChange={setRange}
                                        style={{ width: "100%" }}
                                        placeholder={["Từ ngày", "Đến ngày"]}
                                        className="picker-soft"
                                        suffixIcon={<CalendarOutlined style={{ color: "#0ea5e9" }} />}
                                    />
                                </Col>
                                <Col xs={24} md={4}>
                                    <Select
                                        value={method}
                                        onChange={setMethod}
                                        style={{ width: "100%" }}
                                        className="select-soft"
                                        options={[
                                            { value: "all", label: "Mọi phương thức" },
                                            { value: "cod", label: "COD" },
                                            { value: "bank", label: "Bank" },
                                            { value: "vnpay", label: "VNPay" },
                                            { value: "momo", label: "MoMo" },
                                        ]}
                                    />
                                </Col>
                                <Col xs={24} md={4}>
                                    <Space>
                                        <Button icon={<FilterOutlined />} type="primary">Lọc</Button>
                                        <Button icon={<ReloadOutlined />} onClick={clearFilters}>Xóa lọc</Button>
                                    </Space>
                                </Col>
                            </Row>
                        </Card>
                    </Space>
                </Card>

                <Divider />

                {/* List */}
                {viewMode === "bookings" && (
                    loading ? (
                        <Card className="skeleton-card"><Skeleton active paragraph={{ rows: 8 }} /></Card>
                    ) : !filtered.length ? (
                        <Card className="empty-card" bodyStyle={{ padding: 36 }}>
                            <Empty description="Không có đơn phù hợp với bộ lọc" />
                        </Card>
                    ) : (
                        <Space direction="vertical" size={12} style={{ width: "100%" }}>
                            {filtered.map(renderItem)}
                        </Space>
                    )
                )}

                {viewMode === "complaints" && (
                    loadingComplaints ? (
                        <Card className="skeleton-card"><Skeleton active paragraph={{ rows: 5 }} /></Card>
                    ) : !myComplaints.length ? (
                        <Card className="empty-card" bodyStyle={{ padding: 36 }}>
                            <Empty description="Bạn chưa gửi khiếu nại nào" />
                        </Card>
                    ) : (
                        <Space direction="vertical" size={12} style={{ width: "100%" }}>
                            {myComplaints.map((c) => (
                                <Card key={c.Complaint_ID} className="booking-card">
                                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                                        <Text strong>Đơn #{c.Booking_ID}</Text>
                                        <Text type="secondary">Tiêu đề:</Text>
                                        <Text>{c.C_Subject || "(không có tiêu đề)"}</Text>

                                        <Text type="secondary">Nội dung:</Text>
                                        <Text style={{ whiteSpace: "pre-line" }}>{c.C_Content}</Text>

                                        <Text type="secondary">
                                            Trạng thái:
                                            {{
                                                open: "Chờ xử lý",
                                                in_progress: "Đang xử lý",
                                                pending: "Đang xử lý",
                                                resolved: "Đã xử lý",
                                                closed: "Đã đóng"
                                            }[String(c.C_Status || c.Status || "").toLowerCase()] || "Không xác định"}
                                        </Text>

                                    </Space>
                                </Card>
                            ))}

                        </Space>
                    )
                )}

            </div>

            {/* Drawer Chi tiết */}
            <Drawer
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                width={760}
                title={
                    detail ? (
                        <Space>
                            <HomeOutlined />
                            <span>Chi tiết đơn #{detail.id}</span>
                        </Space>
                    ) : (
                        "Chi tiết đơn"
                    )
                }
                className="glass-drawer"
            >
                {detailLoading || !detail ? (
                    <Skeleton active paragraph={{ rows: 8 }} />
                ) : (
                    <Space direction="vertical" size={10} style={{ width: "100%" }}>

                        {/* ===== STATUS + MONEY ===== */}
                        <Space align="center" wrap>
                            <StatusPill s={detail.status} />

                            {detail.subtotal != null && (
                                <Tag className="pill" color="default">
                                    Tạm tính: {fmt(detail.subtotal)} ₫
                                </Tag>
                            )}

                            {detail.discount > 0 && (
                                <Tag className="pill" color="green">
                                    Giảm: -{fmt(detail.discount)} ₫
                                </Tag>
                            )}

                            <Tag color="processing" className="pill">
                                Tổng: {fmt(detail.total)} ₫
                            </Tag>

                            <Tag className="pill" color="default">
                                Tạo:{" "}
                                {detail.created
                                    ? dayjs(detail.created).format("HH:mm DD/MM/YYYY")
                                    : "-"}
                            </Tag>
                        </Space>

                        {/* ===== THÔNG TIN THANH TOÁN ===== */}
                        <Descriptions size="small" column={2} colon>
                            <Descriptions.Item label="Phương thức thanh toán">
                                {methodLabel(detail.method)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ghi chú của khách" span={2}>
                                {detail.note && String(detail.note).trim().length
                                    ? String(detail.note)
                                    : "—"}
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider style={{ margin: "8px 0" }} />

                        {/* ===== DANH SÁCH HẠNG MỤC ===== */}
                        <Title level={5} style={{ marginTop: 0 }}>
                            Danh sách hạng mục
                        </Title>

                        <Space direction="vertical" size={8} style={{ width: "100%" }}>
                            {detail.details.map((d, i) => {
                                const nights =
                                    dayjs(d.Checkout_date).diff(dayjs(d.Checkin_date), "day") ||
                                    1;

                                const baseLine =
                                    Number(d.Line_total ||
                                        nights * Number(d.Unit_price || 0) ||
                                        0);

                                let displayLine = baseLine;
                                if (detail.details.length === 1 && detail.total != null) {
                                    displayLine = Number(detail.total || 0);
                                }

                                return (
                                    <Card
                                        key={d.Booking_Detail_ID || i}
                                        size="small"
                                        className="detail-card"
                                        bodyStyle={{ padding: 10 }}
                                        title={
                                            <Space>
                                                <HomeOutlined className="ico-home" />
                                                <Text strong>{d.H_Name}</Text>
                                            </Space>
                                        }
                                        extra={
                                            <Tag className="pill" color="blue">
                                                #{d.Booking_Detail_ID}
                                            </Tag>
                                        }
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
                                                            children: dayjs(
                                                                d.Checkin_date
                                                            ).format("DD/MM/YYYY"),
                                                        },
                                                        {
                                                            key: "out",
                                                            label: "Check-out",
                                                            children: dayjs(
                                                                d.Checkout_date
                                                            ).format("DD/MM/YYYY"),
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
                                                            children: `${fmt(
                                                                d.Unit_price
                                                            )} ₫`,
                                                        },
                                                        {
                                                            key: "line",
                                                            label: "Thành tiền",
                                                            children: (
                                                                <Text strong className="price">
                                                                    {fmt(displayLine)} ₫
                                                                </Text>
                                                            ),
                                                        },
                                                    ]}
                                                />
                                            </Col>
                                        </Row>
                                    </Card>
                                );
                            })}
                        </Space>

                        {/* ===== ACTIONS ===== */}
                        <Space
                            style={{ width: "100%", justifyContent: "flex-end" }}
                            wrap
                        >
                            <Button
                                onClick={() => setDetailOpen(false)}
                                className="btn-ghost"
                            >
                                Đóng
                            </Button>

                            {/* Gửi khiếu nại — dùng DETAIL thay vì b */}
                            <Button
                                className="btn-ghost"
                                onClick={() =>
                                    openComplaint({
                                        Booking_ID: detail.id,
                                    })
                                }
                            >
                                Gửi khiếu nại
                            </Button>

                            {/* Đánh giá */}
                            {canReview({
                                ...detail,
                                details: detail.details,
                            }) && (
                                    <Button
                                        type="primary"
                                        onClick={() =>
                                            openReview({
                                                Booking_ID: detail.id,
                                                details: detail.details,
                                                Booking_status: detail.status,
                                            })
                                        }
                                    >
                                        Đánh giá
                                    </Button>
                                )}

                            {/* Huỷ đơn */}
                            <Popconfirm
                                title="Huỷ đơn này?"
                                okText="Huỷ đơn"
                                cancelText="Không"
                                onConfirm={() => handleCancelBooking({ Booking_ID: detail.id })}
                                disabled={!canCancelBooking(detail)}
                            >
                                <Button
                                    danger
                                    className="btn-danger-soft"
                                    disabled={!canCancelBooking(detail)}
                                >
                                    Huỷ đơn này
                                </Button>
                            </Popconfirm>
                        </Space>
                    </Space>
                )}
            </Drawer>


            {/* Modal Đánh giá (tạo/sửa) */}
            <Modal
                open={reviewOpen}
                onCancel={() => { setReviewOpen(false); setExistingReview(null); }}
                title={existingReview ? "Sửa đánh giá" : "Đánh giá trải nghiệm"}
                footer={[
                    existingReview ? (
                        <Popconfirm
                            key="del"
                            title="Xoá đánh giá này?"
                            okText="Xoá"
                            cancelText="Huỷ"
                            onConfirm={handleDeleteReview}
                        >
                            <Button danger>XOÁ</Button>
                        </Popconfirm>
                    ) : null,
                    <Button key="cancel" onClick={() => { setReviewOpen(false); setExistingReview(null); }}>
                        Hủy
                    </Button>,
                    <Button key="ok" type="primary" onClick={submitReview}>
                        {existingReview ? "Lưu thay đổi" : "Gửi đánh giá"}
                    </Button>,
                ]}
            >
                <Form form={reviewForm} layout="vertical">
                    <Form.Item name="Rating" label="Chấm điểm" rules={[{ required: true, message: "Chọn số sao" }]}>
                        <Rate />
                    </Form.Item>
                    <Form.Item name="Content" label="Nhận xét">
                        <Input.TextArea rows={4} placeholder="Bạn thấy homestay thế nào?" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal Gửi khiếu nại */}
            <Modal
                open={complaintOpen}
                onCancel={() => setComplaintOpen(false)}
                title={`Đơn #${complaintBookingId}`}
                okText="Gửi"
                onOk={submitComplaint}
            >
                <Form form={complaintForm} layout="vertical">
                    <Form.Item
                        name="subject"
                        label="Tiêu đề"
                        rules={[{ required: true, message: "Vui lòng nhập tiêu đề!" }]}
                    >
                        <Input placeholder="Nhập tiêu đề…" maxLength={200} />
                    </Form.Item>

                    <Form.Item
                        name="content"
                        label="Nội dung"
                        rules={[{ required: true, message: "Vui lòng nhập nội dung!" }]}
                    >
                        <Input.TextArea
                            rows={5}
                            maxLength={1000}
                            placeholder="Mô tả chi tiết vấn đề bạn gặp phải…"
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal xem lại khiếu nại đã gửi */}
            <Modal
                open={complaintPreviewOpen}
                onCancel={() => setComplaintPreviewOpen(false)}
                footer={[
                    <Button
                        key="close"
                        type="primary"
                        onClick={() => setComplaintPreviewOpen(false)}
                    >
                        Đóng
                    </Button>,
                ]}
                title={
                    complaintPreview
                        ? `Đơn #${complaintPreview.bookingId} - Khiếu nại đã gửi`
                        : "Khiếu nại đã gửi"
                }
            >
                {complaintPreview && (
                    <Space direction="vertical" style={{ width: "100%" }}>
                        <div>
                            <Text type="secondary">Tiêu đề</Text>
                            <div>{complaintPreview.subject}</div>
                        </div>

                        <div>
                            <Text type="secondary">Nội dung</Text>
                            <div style={{ whiteSpace: "pre-line" }}>
                                {complaintPreview.content}
                            </div>
                        </div>
                    </Space>
                )}
            </Modal>


            {/* ===== Soft styles ===== */}
            <style>{`
        .bk-wrap {
          min-height: 100vh;
          padding: 18px;
          background:
            radial-gradient(900px 200px at 10% -8%, rgba(16,185,129,.08), transparent 60%),
            radial-gradient(900px 200px at 85% -8%, rgba(59,130,246,.08), transparent 60%),
            #f6faf8;
        }
        .bk-container { max-width: 1100px; margin: 0 auto; }
        .header-card { border-radius: 16px; background: linear-gradient(135deg,#ffffff,#f6fffa); box-shadow: 0 16px 34px rgba(15,23,42,.08); }
        .filter-bar { border-radius: 14px; background: linear-gradient(180deg,#ffffff,#f5fbff); box-shadow: inset 0 0 0 1px #eef2f3; }
        .input-soft, .picker-soft, .select-soft { border-radius: 10px; border-color: #e2e8f0; background: #ffffff; }
        .skeleton-card, .empty-card { border-radius: 16px; box-shadow: 0 10px 20px rgba(15,23,42,.06); }
        .booking-card { border-radius: 18px; border: 1px solid #eef2f3; background: linear-gradient(180deg,#ffffff,#f8fbfa); box-shadow: 0 12px 28px rgba(15,23,42,.06); transition: transform .15s ease, box-shadow .15s ease; }
        .booking-card:hover { box-shadow: 0 16px 36px rgba(15,23,42,.10); }
        .detail-card { border-radius: 12px; border: 1px solid #edf2f7; background: linear-gradient(180deg,#ffffff,#f7fbff); }
        .pill { border-radius: 999px; padding: 2px 10px; font-weight: 500; }
        .price { color: #0ea5e9 !important; margin: 0; }
        .ico-home { color: #10b981; }
        .tag-soft { border-radius: 999px; border: 1px dashed #dbeafe; background: #f0f9ff; }
        .btn-ghost { border-radius: 10px; border-color: #dbeafe; background: #f0f9ff; }
        .btn-ghost:hover { background: #e7f3ff; }
        .btn-danger-soft { border-radius: 10px; background: #fff5f5; border-color: #ffe3e3; }
        .btn-danger-soft:hover { background: #ffecec; }
        .glass-drawer .ant-drawer-content { backdrop-filter: saturate(1.2) blur(6px); background: linear-gradient(180deg, rgba(255,255,255,.95), rgba(250,252,255,.92)); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
      `}</style>
        </div>
    );
}
