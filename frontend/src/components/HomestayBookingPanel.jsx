// src/pages/HomestayBookingPanel.jsx
import React from "react";
import {
    Card, Space, Typography, DatePicker, InputNumber, Button, Tag,
    Form, Alert, message, Descriptions, Modal, Steps, Radio, Spin,
    Input, Divider
} from "antd";
import {
    CalendarOutlined, TeamOutlined, DollarOutlined, CreditCardOutlined, QrcodeOutlined,
    HomeOutlined, ArrowRightOutlined, SafetyCertificateOutlined, CheckCircleTwoTone,
    ReloadOutlined, ThunderboltOutlined, UserOutlined, MailOutlined, PhoneOutlined,
    PercentageOutlined, GiftOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import axios from "axios";

import paymentsApi from "../services/payments";
import { bookingApi } from "../services/bookings";
import { promotionsApi } from "../services/promotions";
import { useAuth } from "../context/AuthContext";

const { RangePicker } = DatePicker;
const { Text } = Typography;
const VND = (n) => Number(n || 0).toLocaleString("vi-VN");

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || "http://localhost:3000",
    withCredentials: true,
});

export default function HomestayBookingPanel({ homestay, blocked: blockedFromProps = [] }) {
    const nav = useNavigate();
    const { user } = useAuth();

    const [form] = Form.useForm();
    const [customerForm] = Form.useForm();

    const noteWatch = Form.useWatch("note", customerForm);
    const [noteState, setNoteState] = React.useState("");

    const [range, setRange] = React.useState([null, null]);
    const [guests, setGuests] = React.useState(1);
    const [nights, setNights] = React.useState(0);
    const [subtotal, setSubtotal] = React.useState(0);

    const [blocked, setBlocked] = React.useState(blockedFromProps || []);
    const [loadingBlocked, setLoadingBlocked] = React.useState(false);

    const [open, setOpen] = React.useState(false);
    const [step, setStep] = React.useState(0);
    const [method, setMethod] = React.useState("cod");
    const [paying, setPaying] = React.useState(false);
    const [bookingId, setBookingId] = React.useState(null);
    const [payUrl, setPayUrl] = React.useState(null);
    const [result, setResult] = React.useState(null);

    // Promo
    const [promoList, setPromoList] = React.useState([]);
    const [selectedPromoId, setSelectedPromoId] = React.useState(null);
    const [codeInput, setCodeInput] = React.useState("");
    const [discount, setDiscount] = React.useState(0);
    const [appliedCode, setAppliedCode] = React.useState("");

    React.useEffect(() => {
        customerForm.setFieldsValue({
            fullName: user?.U_Fullname || user?.username || "",
            email: user?.U_Email || user?.email || "",
            phone: user?.U_Phone || user?.phone || "",
            note: customerForm.getFieldValue("note") ?? "",
        });
    }, [user, customerForm]);

    React.useEffect(() => {
        const [a, b] = range || [];
        const diff = a && b ? dayjs(b).startOf("day").diff(dayjs(a).startOf("day"), "day") : 0;
        const n = diff > 0 ? diff : 0;
        setNights(n);
        setSubtotal(n * Number(homestay?.Price_per_day || 0));
    }, [range, homestay]);

    React.useEffect(() => {
        if (Array.isArray(blockedFromProps) && blockedFromProps.length) {
            setBlocked(
                blockedFromProps.map((r) => ({
                    start: dayjs(r.start || r.Checkin_date).format("YYYY-MM-DD"),
                    end: dayjs(r.end || r.Checkout_date).format("YYYY-MM-DD"),
                }))
            );
        }
    }, [blockedFromProps]);

    React.useEffect(() => {
        async function fetchUnavailable() {
            if (!homestay?.H_ID) return;
            try {
                setLoadingBlocked(true);
                const res = await api.get(`/api/bookings/unavailable/${homestay.H_ID}`);
                const raw = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
                const extra = raw.map((r) => ({
                    start: dayjs(r.start || r.Checkin_date).format("YYYY-MM-DD"),
                    end: dayjs(r.end || r.Checkout_date).format("YYYY-MM-DD"),
                }));
                if (extra.length) {
                    setBlocked((old) => {
                        const k = (x) => `${x.start}->${x.end}`;
                        const map = new Map();
                        [...old, ...extra].forEach((x) => map.set(k(x), x));
                        return Array.from(map.values());
                    });
                }
            } catch (e) {
                console.warn("Fetch unavailable fail:", e?.response?.status, e?.response?.data || e?.message);
            } finally {
                setLoadingBlocked(false);
            }
        }
        fetchUnavailable();
    }, [homestay?.H_ID]);

    React.useEffect(() => {
        const arr = Array.isArray(homestay?.promotions) ? homestay.promotions : [];
        setPromoList(arr);
    }, [homestay?.promotions]);

    const isDateBlocked = (current) => {
        if (!current) return false;
        if (current.isBefore(dayjs().startOf("day"))) return true;
        const c = current.startOf("day");
        for (const r of blocked) {
            const s = dayjs(r.start, "YYYY-MM-DD").startOf("day");
            const e = dayjs(r.end, "YYYY-MM-DD").startOf("day");
            if (c.isSame(s) || (c.isAfter(s) && c.isBefore(e))) return true;
        }
        return false;
    };
    const disabledDate = (current) => isDateBlocked(current);
    const dateRender = (current) => (
        <div className={`ant-picker-cell-inner ${isDateBlocked(current) ? "cell-disabled" : ""}`}>{current.date()}</div>
    );

    const openCheckout = () => {
        const [a, b] = range || [];
        if (!a || !b) return message.warning("Bạn hãy chọn ngày đến và ngày đi.");
        if (nights <= 0) return message.warning("Ngày đi phải sau ngày đến ít nhất 1 đêm.");
        if (guests <= 0) return message.warning("Số khách phải lớn hơn 0.");
        setStep(0);
        setOpen(true);
    };

    const Summary = ({ withMoney = true }) => {
        const [a, b] = range || [];
        const totalAfter = Math.max(0, (subtotal || 0) - (discount || 0));
        return (
            <Card size="small" style={{ borderRadius: 14, background: "linear-gradient(180deg,#fff,#f5fbff)" }} bodyStyle={{ padding: 12 }}>
                <Space direction="vertical" style={{ width: "100%" }}>
                    <Space align="center" wrap>
                        <HomeOutlined style={{ color: "#10b981" }} />
                        <Text strong>{homestay?.H_Name}</Text>
                        <Tag color="geekblue" style={{ borderRadius: 999 }}>
                            <CalendarOutlined /> {a ? dayjs(a).format("DD/MM/YYYY") : "-"} → {b ? dayjs(b).format("DD/MM/YYYY") : "-"}
                        </Tag>
                        <Tag color="green" style={{ borderRadius: 999 }}>
                            <TeamOutlined /> Khách: {guests}
                        </Tag>
                    </Space>
                    {withMoney && (
                        <Descriptions
                            size="small"
                            column={1}
                            colon
                            items={[
                                { key: "nights", label: "Số đêm", children: nights },
                                { key: "price", label: "Giá/đêm", children: `${VND(homestay?.Price_per_day)} ₫` },
                                { key: "subtotal", label: "Tạm tính", children: `${VND(subtotal)} ₫` },
                                ...(discount > 0
                                    ? [{ key: "discount", label: "Giảm", children: <Text type="success">- {VND(discount)} ₫</Text> }]
                                    : []),
                                { key: "total", label: "Tổng tiền", children: <Text strong style={{ color: "#0ea5e9" }}>{VND(totalAfter)} ₫</Text> },
                            ]}
                        />
                    )}
                </Space>
            </Card>
        );
    };

    // ===== Promo helpers =====
    const findPromoById = (id) => promoList.find((p) => p.Promotion_ID === id);
    const findPromoByCode = (code) =>
        promoList.find((p) => String(p.P_Code).toLowerCase() === String(code).toLowerCase());
    const computeDiscountAmount = (promo, base) => {
        if (!promo || !base) return 0;
        const t = String(promo.P_Type || "").toLowerCase();
        const d = Number(promo.Discount || 0);
        if (t === "percent") return Math.max(0, Math.floor((base * d) / 100));
        return Math.max(0, Math.floor(d));
    };
    const applyPromoClient = (promo) => {
        const amt = computeDiscountAmount(promo, subtotal);
        setDiscount(amt);
        setAppliedCode(promo?.P_Code || "");
    };
    const clearPromo = () => {
        setSelectedPromoId(null);
        setCodeInput("");
        setDiscount(0);
        setAppliedCode("");
    };
    const onSelectPromo = (id) => {
        setSelectedPromoId(id);
        const p = findPromoById(id);
        setCodeInput(p?.P_Code || "");
        applyPromoClient(p);
    };
    const onManualCodeBlur = async () => {
        const code = (codeInput || "").trim();
        if (!code) return clearPromo();
        const p = findPromoByCode(code);
        if (p) {
            setSelectedPromoId(p.Promotion_ID);
            applyPromoClient(p);
            return;
        }
        try {
            const uid = user?.U_ID || user?.user_id || user?.id;
            if (!uid) {
                message.info("Đăng nhập để xác thực mã khuyến mãi.");
                return;
            }
            const r = await promotionsApi.validate({
                code,
                userId: uid,
                homestayId: homestay?.H_ID,
                subtotal,
            });
            if (r?.ok) {
                const amt = computeDiscountAmount({ P_Type: r.type, Discount: r.discount, P_Code: code }, subtotal);
                setDiscount(amt);
                setAppliedCode(code);
                setSelectedPromoId(null);
                message.success("Áp dụng mã thành công.");
            } else {
                message.warning(r?.message || "Mã không hợp lệ.");
                clearPromo();
            }
        } catch (e) {
            message.warning(e?.response?.data?.message || "Không xác thực được mã.");
            clearPromo();
        }
    };

    // ===== Booking helpers =====
    const readNoteSafe = () => {
        const fromWatch = noteWatch;
        const fromState = noteState;
        const fromForm = customerForm.getFieldValue("note");
        const val = (fromWatch ?? fromState ?? fromForm ?? "").toString();
        return val.trim();
    };
    const currentTotalAfter = () => Math.max(0, (subtotal || 0) - (discount || 0));

    const createBookingDirect = async () => {
        const [a, b] = range || [];
        const items = [{
            H_ID: homestay?.H_ID,
            checkin: dayjs(a).format("YYYY-MM-DD"),
            checkout: dayjs(b).format("YYYY-MM-DD"),
            guests,
            Price_per_day: Number(homestay?.Price_per_day || 0),
            Promotion_code: appliedCode || codeInput || "",
            Discount_amount: discount || 0
        }];
        const cleanNote = readNoteSafe();
        const totalAfter = currentTotalAfter();

        const payloadCore = {
            note: cleanNote,
            Booking_note: cleanNote,
            items,
            paymentMethod: method,
            Payment_method: method,
            Promotion_code: appliedCode || codeInput || "",
            Discount_amount: discount || 0,
            Subtotal: subtotal,
            Total_price: totalAfter,
        };

        const res = await bookingApi.create(payloadCore);
        const id =
            res?.header?.Booking_ID ||
            res?.data?.header?.Booking_ID ||
            res?.Booking_ID ||
            res?.data?.Booking_ID;
        if (!id) throw new Error("Không lấy được Booking_ID");

        if (cleanNote) await bookingApi.updateNote(id, { note: cleanNote }).catch(() => { });

        const uid = user?.U_ID || user?.user_id || user?.id;
        if (uid && (appliedCode || codeInput) && discount > 0) {
            promotionsApi.applyUsage({
                code: appliedCode || codeInput,
                userId: uid,
                bookingId: id,
                discountAmount: discount,
            }).catch(() => { });
        }

        setBookingId(id);
        return id;
    };

    const sendEmailConfirm = async (id) => {
        const v = customerForm.getFieldsValue();
        const email = (v?.email || user?.U_Email || user?.email || "").toString().trim();
        const fullName = (v?.fullName || user?.U_Fullname || user?.username || "").toString().trim();
        if (!id || !email) return;
        try {
            await bookingApi.sendConfirmation(id, { toEmail: email, toName: fullName || "Guest" });
            message.success("Đã gửi email xác nhận.");
        } catch { }
    };

    // ====== OPEN GATEWAY (VNPay) — đã sửa redirect ======
    // ====== OPEN GATEWAY (VNPay) — bản redirect siêu-chắc ======
    const startPayment = async () => {
        const [a, b] = range || [];
        const ci = dayjs(a).format("YYYY-MM-DD");
        const co = dayjs(b).format("YYYY-MM-DD");
        const totalAfter = Math.max(0, (subtotal || 0) - (discount || 0));

        if (method === "cod" || method === "bank") {
            try {
                setPaying(true);
                const id = await createBookingDirect();
                await sendEmailConfirm(id);
                setResult({
                    status: method === "cod" ? "success" : "bank",
                    message: method === "cod"
                        ? "Đơn đã tạo (thanh toán tại chỗ)."
                        : "Đơn đã tạo – vui lòng chuyển khoản theo hướng dẫn.",
                });
                setStep(3);
            } catch (e) {
                message.error(e?.response?.data?.message || e?.message || "Tạo đơn thất bại");
            } finally {
                setPaying(false);
            }
            return;
        }

        // → VNPay
        try {
            setPaying(true);

            const payload = {
                H_ID: homestay?.H_ID,
                Checkin_date: ci,
                Checkout_date: co,
                Guests: guests,
                Subtotal: subtotal,
                Discount_amount: discount || 0,
                Total_price: totalAfter,
                Payment_method: method, // "vnpay"
                Gateway: method,
                Note: readNoteSafe(),
                Promotion_code: appliedCode || codeInput || "",
            };

            const { bookingId: id, payUrl: url } = await paymentsApi.createCheckout(payload);
            setBookingId(id || null);

            if (!url) {
                message.warning("Không nhận được URL thanh toán. Tạo đơn trực tiếp.");
                const fallbackId = await createBookingDirect();
                await sendEmailConfirm(fallbackId);
                setResult({ status: "success", message: "Đơn đã tạo ở trạng thái pending." });
                setStep(3);
                return;
            }

            console.log("[FE] Redirecting to VNPay =", url);
            setPayUrl(url); // để hiển thị fallback link

            // Cách 1: replace (an toàn nhất, ít bị chặn)
            try {
                window.location.replace(url);
                return; // nếu chạy được thì dừng
            } catch { }

            // Cách 2: mở cùng tab (_self)
            try {
                const opened = window.open(url, "_self");
                if (opened) return;
            } catch { }

            // Cách 3: assign (điều hướng cứng)
            try {
                window.location.assign(url);
                return;
            } catch { }

            // Cách 4: “giả click” 1 thẻ <a> (tránh 1 số chặn lặt vặt)
            try {
                const aEl = document.createElement("a");
                aEl.href = url;
                aEl.target = "_self";
                aEl.rel = "noreferrer";
                document.body.appendChild(aEl);
                aEl.click();
                aEl.remove();
                return;
            } catch { }

            message.info("Nếu trình duyệt không tự chuyển, bấm link bên dưới để mở VNPay.");
            // Không setStep(3); giữ nguyên ở bước 2 để user thấy link fallback
        } catch (e) {
            console.error("[PAYMENTS] checkout failed =", e?.response?.data || e?.message || e);
            message.warning("Cổng thanh toán chưa sẵn sàng, chuyển sang tạo đơn trực tiếp.");
            try {
                const id = await createBookingDirect();
                await sendEmailConfirm(id);
                setResult({ status: "success", message: "Đơn đã tạo ở trạng thái pending." });
                setStep(3);
            } catch (ee) {
                message.error(ee?.response?.data?.message || ee?.message || "Tạo đơn thất bại");
            }
        } finally {
            setPaying(false);
        }
    };


    const verifyPayment = async () => {
        if (!bookingId) return message.warning("Chưa có mã đơn để kiểm tra.");
        try {
            setPaying(true);
            const st = await paymentsApi.checkStatus(bookingId);
            const code = (st?.status || "").toLowerCase();
            if (code === "success" || code === "paid") {
                const uid = user?.U_ID || user?.user_id || user?.id;
                if (uid && (appliedCode || codeInput) && discount > 0) {
                    promotionsApi.applyUsage({
                        code: appliedCode || codeInput,
                        userId: uid,
                        bookingId,
                        discountAmount: discount,
                    }).catch(() => { });
                }
                await sendEmailConfirm(bookingId);
                setResult({ status: "success", message: "Thanh toán thành công!" });
                setStep(3);
            } else if (code === "pending") {
                message.info("Giao dịch đang xử lý, vui lòng thử lại sau.");
            } else {
                setResult({ status: "failed", message: "Thanh toán chưa thành công hoặc đã huỷ." });
                setStep(3);
            }
        } catch (e) {
            message.error(e?.response?.data?.message || e?.message || "Không kiểm tra được trạng thái.");
        } finally {
            setPaying(false);
        }
    };

    return (
        <Card
            title={<Space align="center"><DollarOutlined style={{ color: "#1677ff" }} /><span>Đặt homestay</span></Space>}
            extra={<Tag color="cyan" style={{ borderRadius: 999 }}>{VND(homestay?.Price_per_day)} ₫/đêm</Tag>}
            style={{ borderRadius: 16, background: "linear-gradient(180deg,#ffffff 0%, #f7fbff 100%)", boxShadow: "0 22px 48px rgba(15,23,42,.10)" }}
            bodyStyle={{ padding: 16 }}
        >
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
                <Form layout="vertical" form={form} onSubmitCapture={(e) => e.preventDefault()}>
                    <Form.Item label="Chọn ngày" required>
                        <RangePicker
                            style={{ width: "100%" }}
                            disabledDate={disabledDate}
                            dateRender={dateRender}
                            onChange={(vals) => {
                                setRange(vals);
                                const [a, b] = vals || [];
                                if (!a || !b) { setDiscount(0); return; }
                                const days = dayjs(b).diff(dayjs(a), "day");
                                const base = Math.max(0, days) * Number(homestay?.Price_per_day || 0);
                                const p = selectedPromoId ? findPromoById(selectedPromoId) : findPromoByCode(appliedCode || codeInput);
                                if (p) setDiscount(computeDiscountAmount(p, base)); else setDiscount(0);
                            }}
                            allowClear
                            format="DD/MM/YYYY"
                            inputReadOnly
                        />
                        {loadingBlocked && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>Đang tải lịch đã đặt…</div>}
                    </Form.Item>

                    <Form.Item label="Số khách" required>
                        <InputNumber
                            min={1}
                            max={homestay?.Max_guests || 16}
                            value={guests}
                            onChange={setGuests}
                            addonAfter="khách"
                            style={{ width: "100%" }}
                        />
                    </Form.Item>
                </Form>

                <Summary />

                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                    <Button type="primary" icon={<ArrowRightOutlined />} onClick={openCheckout}>
                        Đặt & thanh toán
                    </Button>
                </Space>
            </Space>

            <Modal
                open={open}
                onCancel={() => setOpen(false)}
                footer={null}
                width={780}
                destroyOnClose
                title={<Space><CreditCardOutlined /><span>Thanh toán đặt phòng</span></Space>}
            >
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <Steps
                        current={step}
                        size="small"
                        items={[
                            { title: "Thông tin KH", icon: <UserOutlined /> },
                            { title: "Xác nhận", icon: <SafetyCertificateOutlined /> },
                            { title: "Thanh toán", icon: <CreditCardOutlined /> },
                            { title: "Kết quả", icon: <CheckCircleTwoTone twoToneColor="#52c41a" /> },
                        ]}
                    />

                    {step === 0 && (
                        <>
                            <Summary />
                            <Card size="small" style={{ borderRadius: 12 }} bodyStyle={{ padding: 12 }} title="Thông tin khách hàng">
                                <Form
                                    form={customerForm}
                                    layout="vertical"
                                    initialValues={{
                                        fullName: user?.U_Fullname || user?.username || "",
                                        email: user?.U_Email || user?.email || "",
                                        phone: user?.U_Phone || user?.phone || "",
                                        note: "",
                                    }}
                                    onValuesChange={(_, all) => setNoteState(all?.note ?? "")}
                                    onFinish={() => setStep(1)}
                                >
                                    <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}>
                                        <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" />
                                    </Form.Item>
                                    <Form.Item
                                        name="email"
                                        label="Email"
                                        rules={[
                                            { required: true, message: "Vui lòng nhập email" },
                                            { type: "email", message: "Email không hợp lệ" },
                                        ]}
                                    >
                                        <Input prefix={<MailOutlined />} placeholder="email@example.com" />
                                    </Form.Item>
                                    <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}>
                                        <Input prefix={<PhoneOutlined />} placeholder="090..." />
                                    </Form.Item>
                                    <Form.Item name="note" label="Ghi chú (tuỳ chọn)">
                                        <Input.TextArea rows={3} placeholder="Yêu cầu thêm (nếu có)..." />
                                    </Form.Item>

                                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                        <Button onClick={() => setOpen(false)}>Huỷ</Button>
                                        <Button type="primary" htmlType="submit">Xác nhận thông tin</Button>
                                    </Space>
                                </Form>
                            </Card>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <Summary />
                            <Card
                                size="small"
                                style={{ borderRadius: 12 }}
                                bodyStyle={{ padding: 12 }}
                                title={<Space><GiftOutlined /><span>Mã khuyến mãi</span></Space>}
                                extra={discount > 0 ? <Tag color="green" style={{ borderRadius: 999 }}>Đã áp dụng</Tag> : null}
                            >
                                {promoList?.length ? (
                                    <>
                                        <Text type="secondary">Chọn 1 mã có sẵn do chủ nhà gán cho homestay này:</Text>
                                        <div style={{ marginTop: 8 }}>
                                            <Radio.Group
                                                value={selectedPromoId}
                                                onChange={(e) => onSelectPromo(e.target.value)}
                                            >
                                                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                                                    {promoList.map((p) => (
                                                        <label
                                                            key={p.Promotion_ID}
                                                            className={`pay-tile ${selectedPromoId === p.Promotion_ID ? "active" : ""}`}
                                                            onClick={() => onSelectPromo(p.Promotion_ID)}
                                                            style={{ cursor: "pointer" }}
                                                        >
                                                            <Radio value={p.Promotion_ID} />
                                                            <Space size={8} wrap>
                                                                <Tag color={String(p.P_Type).toLowerCase() === "percent" ? "geekblue" : "gold"} style={{ borderRadius: 999 }}>
                                                                    <PercentageOutlined /> {p.P_Code}
                                                                </Tag>
                                                                <Text strong>{p.P_Name}</Text>
                                                                <Text type="secondary">
                                                                    {String(p.P_Type).toLowerCase() === "percent"
                                                                        ? `Giảm ${p.Discount}%`
                                                                        : `Giảm ${VND(p.Discount)} ₫`}
                                                                </Text>
                                                            </Space>
                                                        </label>
                                                    ))}
                                                </Space>
                                            </Radio.Group>
                                        </div>
                                        <Divider style={{ margin: "10px 0" }} />
                                    </>
                                ) : (
                                    <Alert type="info" showIcon message="Homestay hiện chưa có mã khuyến mãi được gán." />
                                )}

                                <Text type="secondary">Hoặc nhập mã của bạn (nếu có):</Text>
                                <Space.Compact style={{ width: "100%", marginTop: 6 }}>
                                    <Input
                                        placeholder="Nhập mã khuyến mãi"
                                        value={codeInput}
                                        onChange={(e) => setCodeInput(e.target.value)}
                                        onBlur={onManualCodeBlur}
                                    />
                                    <Button onClick={onManualCodeBlur}>Áp dụng</Button>
                                    <Button onClick={clearPromo} danger>Hủy</Button>
                                </Space.Compact>

                                {discount > 0 && (
                                    <div style={{ marginTop: 8 }}>
                                        <Text type="success">Đã giảm: </Text>
                                        <Text strong type="success">- {VND(discount)} ₫</Text>
                                    </div>
                                )}
                            </Card>

                            <Descriptions
                                size="small"
                                column={1}
                                colon
                                title="Thông tin khách"
                                items={[
                                    { key: "name", label: "Người đặt", children: customerForm.getFieldValue("fullName") || "—" },
                                    { key: "email", label: "Email", children: customerForm.getFieldValue("email") || "—" },
                                    { key: "phone", label: "SĐT", children: customerForm.getFieldValue("phone") || "—" },
                                    { key: "note", label: "Ghi chú", children: customerForm.getFieldValue("note") || "—" },
                                ]}
                            />
                            {!user && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    message="Bạn chưa đăng nhập"
                                    description="Hãy đăng nhập để xác thực mã khuyến mãi và theo dõi đơn."
                                />
                            )}
                            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                <Button onClick={() => setStep(0)}>Sửa thông tin</Button>
                                <Button type="primary" onClick={() => setStep(2)} icon={<CreditCardOutlined />}>
                                    Chọn phương thức thanh toán
                                </Button>
                            </Space>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Summary />
                            <Card size="small" style={{ borderRadius: 12 }} bodyStyle={{ padding: 12 }} title="Phương thức thanh toán">
                                <Radio.Group value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: "100%" }}>
                                    <Space direction="vertical" size={10} style={{ width: "100%" }}>
                                        <div className={`pay-tile ${method === "cod" ? "active" : ""}`} onClick={() => setMethod("cod")}>
                                            <Radio value="cod" />{" "}
                                            <Space size={8}><QrcodeOutlined /><Text strong>Thanh toán tại chỗ (tiền mặt)</Text></Space>
                                        </div>
                                        <div className={`pay-tile ${method === "vnpay" ? "active" : ""}`} onClick={() => setMethod("vnpay")}>
                                            <Radio value="vnpay" />{" "}
                                            <Space size={8}><CreditCardOutlined /><Text strong>Thanh toán qua VNPay</Text></Space>
                                        </div>
                                    </Space>
                                </Radio.Group>
                            </Card>

                            {/* Link fallback nếu trình duyệt không tự chuyển */}
                            {method === "vnpay" && payUrl && (
                                <Alert
                                    type="info"
                                    showIcon
                                    message="Nếu trình duyệt không tự chuyển, bấm link bên dưới để mở VNPay."
                                    description={<a href={payUrl} target="_self" rel="noreferrer">{payUrl}</a>}
                                />
                            )}

                            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                <Button onClick={() => setStep(1)}>Quay lại</Button>
                                <Button type="primary" icon={<ThunderboltOutlined />} loading={paying} onClick={startPayment}>
                                    {method === "cod" ? "Đặt ngay" : "Mở cổng thanh toán"}
                                </Button>
                            </Space>
                        </>
                    )}

                    {step === 3 && (
                        <Spin spinning={false}>
                            <Space direction="vertical" size={10} style={{ width: "100%" }}>
                                {result?.status === "success" && (
                                    <Alert
                                        type="success"
                                        showIcon
                                        message="Đặt phòng thành công!"
                                        description={
                                            <Space direction="vertical">
                                                <Text>Mã đơn: <Text code>#{bookingId}</Text></Text>
                                                <Text>{result?.message}</Text>
                                            </Space>
                                        }
                                    />
                                )}
                                {result?.status === "bank" && (
                                    <Alert
                                        type="info"
                                        showIcon
                                        message="Đơn đã tạo – chờ chuyển khoản"
                                        description={
                                            <Space direction="vertical">
                                                <Text>Mã đơn: <Text code>#{bookingId}</Text></Text>
                                                <Text>{result?.message}</Text>
                                            </Space>
                                        }
                                    />
                                )}
                                {result?.status === "failed" && (
                                    <Alert
                                        type="error"
                                        showIcon
                                        message="Thanh toán chưa thành công"
                                        description={
                                            <Space direction="vertical">
                                                <Text>Mã đơn (nếu có): <Text code>#{bookingId || "—"}</Text></Text>
                                                <Text>{result?.message || "Bạn có thể thử lại phương thức khác."}</Text>
                                            </Space>
                                        }
                                    />
                                )}

                                <Summary />

                                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                    <Button onClick={() => { setStep(0); setResult(null); setBookingId(null); setPayUrl(null); }}>
                                        Đặt đơn khác
                                    </Button>
                                    <Button type="primary" onClick={() => nav("/my-bookings")}>
                                        Xem đơn của tôi
                                    </Button>
                                </Space>
                            </Space>
                        </Spin>
                    )}
                </Space>

                <style>{`
          .pay-tile {
            display:flex; align-items:center; gap:10px;
            padding:10px 12px; border:1px solid #eef2f7; border-radius:12px;
            transition:all .2s ease; cursor:pointer; background:#fff;
          }
          .pay-tile:hover { transform: translateY(-1px); box-shadow: 0 12px 26px rgba(15,23,42,.08); border-color:#dbeafe; }
          .pay-tile.active { border-color:#60a5fa; box-shadow: 0 14px 30px rgba(59,130,246,.18); background: linear-gradient(180deg,#ffffff 0%, #f4faff 100%); }
          .cell-disabled { color:#a1a1aa; opacity:.55; text-decoration: line-through; pointer-events:none; }
        `}</style>
            </Modal>
        </Card>
    );
}
