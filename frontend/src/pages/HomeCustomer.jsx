import React, { useMemo, useState, useEffect, useRef } from "react";
import {
    Layout, Row, Col, Card, Typography, Space, Popconfirm, Button, Input, Select, Tabs,
    Badge, Empty, message, DatePicker, InputNumber, Skeleton, Segmented,
    Tooltip, Tag, Dropdown, Avatar, Divider, Modal, Descriptions, Rate, Statistic,
    Drawer, Form
} from "antd";
import {
    HomeFilled, HomeOutlined, SearchOutlined, EnvironmentOutlined, StarFilled,
    HeartOutlined, HeartFilled, DollarOutlined, CalendarOutlined, NumberOutlined,
    CheckCircleTwoTone, CloseCircleTwoTone, ClockCircleTwoTone,
    ThunderboltFilled, FileDoneOutlined,
    UserOutlined, SettingOutlined, LogoutOutlined, DownOutlined,
    InfoCircleOutlined, SmileOutlined, RocketOutlined,
    EyeOutlined, StopOutlined, DeleteOutlined,
    ArrowDownOutlined, ArrowUpOutlined, NumberOutlined as NumberIcon
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { bookingApi } from "../services/bookings";
import { favoritesApi } from "../services/favorites";
import { usersApi } from "../services/users";
import { complaintsApi } from "../services/complaints";
import AboutGreenStay from "../components/AboutGreenStay";
import RasaChatbot from "../components/RasaChatbot";
import BookingCart from "./BookingCart";

import dayjs from "dayjs";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const GREEN = { dark: "#065f46", main: "#10b981", light: "#34d399", border: "#e5e7eb" };
const HEADER_H = 72;
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");
const HERO_IMAGES = ["/banner1.jpg", "/banner2.jpg", "/banner3.jpg"];
const nightsBetween = (a, b) => Math.max(1, dayjs(b).diff(dayjs(a), "day") || 1);

const VN34_PROVINCES = [
    "An Giang", "Bà Rịa–Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre",
    "Bình Dương", "Bình Định", "Bình Phước", "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng",
    "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang",
    "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên",
    "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu"
];

function pickDisplayName(u) {
    if (!u) return "Tài khoản";
    return (
        u.fullname || u.Fullname || u.full_name || u.Full_name ||
        u.name || u.Name || u.username || u.Username ||
        u.U_Fullname || u.U_FullName || u.U_Name ||
        u.email || "Tài khoản"
    );
}

const StatusPill = ({ s }) => {
    const v = String(s || "").toLowerCase();

    const map = {
        pending: { bg: "#fff7e6", bd: "#ffd591", color: "#ad6800", text: "Chờ duyệt" },
        confirmed: { bg: "#e6fffb", bd: "#87e8de", color: "#006d75", text: "Đã xác nhận" },
        cancelled: { bg: "#fff1f0", bd: "#ffbb96", color: "#a8071a", text: "Đã huỷ" },
        completed: { bg: "#e6f4ff", bd: "#91caff", color: "#0958d9", text: "Hoàn thành" },

        paid: { bg: "#f6ffed", bd: "#b7eb8f", color: "#389e0d", text: "Đã thanh toán" },
        pending_payment: { bg: "#fff7e6", bd: "#ffd591", color: "#ad6800", text: "Chờ thanh toán" }
    };

    const m = map[v] || { bg: "#f6f6f6", bd: "#eee", color: "#555", text: s || "-" };

    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px",
            borderRadius: 999, background: m.bg, border: `1px solid ${m.bd}`,
            color: m.color, fontWeight: 600, textTransform: "none"
        }}>
            {m.text}
        </span>
    );
};

const PaymentPill = ({ status }) => {
    const v = String(status ?? "").toLowerCase();

    const map = {
        success: { c: "#f6ffed", bd: "#b7eb8f", color: "#389e0d", label: "Thành công" },
        paid: { c: "#f6ffed", bd: "#b7eb8f", color: "#389e0d", label: "Đã thanh toán" },
        pending: { c: "#fff7e6", bd: "#ffd591", color: "#ad6800", label: "Chờ thanh toán" },
        unpaid: { c: "#fff1f0", bd: "#ffbb96", color: "#a8071a", label: "Chưa thanh toán" },
        failed: { c: "#fff1f0", bd: "#ffbb96", color: "#a8071a", label: "Thanh toán lỗi" },
        canceled: { c: "#fff1f0", bd: "#ffbb96", color: "#a8071a", label: "Đã huỷ" },
    };

    const m = map[v] || { c: "#f6f6f6", bd: "#eee", color: "#555", label: status || "-" };

    return (
        <span style={{
            display: "inline-flex", alignItems: "center", padding: "4px 10px",
            borderRadius: 999, background: m.c, border: `1px solid ${m.bd}`,
            color: m.color, fontWeight: 600
        }}>
            {m.label}
        </span>
    );
};

/* =====================================
   SLIDESHOW + UI COMPONENTS GIỮ NGUYÊN
   ===================================== */
function HeroSlideshow({ images = [], interval = 6000, children }) {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        if (!images.length) return;
        const t = setInterval(() => setIndex((i) => (i + 1) % images.length), interval);
        return () => clearInterval(t);
    }, [images, interval]);

    return (
        <div style={{ position: "relative", height: 380, borderRadius: 24, overflow: "hidden", marginBottom: 24 }}>
            {images.map((src, i) => (
                <div
                    key={src}
                    style={{
                        position: "absolute", inset: 0,
                        background: `url('${src}') center/cover no-repeat`,
                        transition: "opacity 1.2s ease-in-out, transform 6s ease-out",
                        opacity: i === index ? 1 : 0,
                        transform: i === index ? "scale(1.05)" : "scale(1.0)"
                    }}
                />
            ))}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,.55))" }} />
            <div style={{
                position: "relative", zIndex: 2, height: "100%", display: "flex",
                alignItems: "center", justifyContent: "center", flexDirection: "column",
                textAlign: "center", paddingInline: 16, color: "#fff"
            }}>
                {children}
            </div>
        </div>
    );
}

/* =====================================================
   BẮT ĐẦU COMPONENT CHÍNH HomeCustomer (PHẦN 1)
   ===================================================== */
export default function HomeCustomer() {
    const navigate = useNavigate();
    const { user, logout, setUser } = useAuth();
    const authed = !!user;
    const uid = user?.user_id || user?.U_ID || "guest";

    const rawBase = import.meta.env.VITE_ASSET_BASE || import.meta.env.VITE_API_BASE || "http://localhost:3000";
    const assetBase = rawBase.replace(/\/api\/?$/, "");
    const toPublicUrl = (url) => (url?.startsWith("http") ? url : `${assetBase}${url || ""}`);

    // ========= HOMESTAYS =========
    const [recs, setRecs] = useState([]);
    const [loading, setLoading] = useState(false);

    const normalizeList = (json) => {
        const candidate =
            (json && json.data && json.data.homestays) ??
            json?.homestays ??
            (Array.isArray(json?.data) ? json.data : null) ??
            json?.items ??
            (Array.isArray(json) ? json : []);
        return Array.isArray(candidate) ? candidate : [];
    };

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`${assetBase}/api/homestays`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                const list = normalizeList(json);
                const mapped = list.map((h) => {
                    const ratingAvg =
                        Number(h.Rating_avg ?? h.rating_avg ?? h.Rating ?? h.rating ?? 0) || 0;
                    const ratingCnt =
                        Number(h.Rating_count ?? h.rating_count ?? h.reviews ?? 0) || 0;

                    return {
                        id: Number(h.H_ID ?? h.id),
                        name: h.H_Name ?? h.name,
                        address: h.H_Address ?? h.address ?? "",
                        city: h.H_City ?? h.city ?? "",
                        pricePerDay: Number(h.Price_per_day ?? h.pricePerDay ?? h.price_per_day ?? 0) || 0,
                        cover: h.Cover ? toPublicUrl(h.Cover) : (h.cover ? toPublicUrl(h.cover) : "/hero.jpg"),
                        status: h.Status || h.status || "available",
                        rating: ratingAvg,
                        ratingCount: ratingCnt,
                        maxGuests: h.Max_guests ?? h.max_guests ?? 2,
                    };
                });

                setRecs(mapped);
            } catch (e) {
                console.error(e);
                message.error("Không tải được homestay");
            } finally {
                setLoading(false);
            }
        })();
    }, [assetBase]);

    // ========= FILTERS =========
    const [keyword, setKeyword] = useState("");
    const [city, setCity] = useState();
    const [tab, setTab] = useState("explore");
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [tab]);
    const [priceSort, setPriceSort] = useState(undefined); // 'asc' | 'desc' | undefined
    const [dateRange, setDateRange] = useState([]);
    const [guests, setGuests] = useState(2);

    const cityOptions = useMemo(() =>
        (VN34_PROVINCES.length ? VN34_PROVINCES : Array.from(new Set(recs.map(r => r.city).filter(Boolean))))
            .map((c) => String(c).trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "vi"))
            .map((c) => ({ value: c, label: c }))
        , [recs]);

    const hasFilter = (keyword?.trim() !== "") || !!city || (Array.isArray(dateRange) && dateRange.length === 2);
    const isSearching = hasFilter;
    const resultsRef = useRef(null);
    const resetFilters = () => { setKeyword(""); setCity(undefined); setDateRange([]); };
    const chooseCity = (name) => setCity((curr) => (curr === name ? undefined : name));
    const onHeroSearch = () => { resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

    const filteredRecs = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        const base = [...recs];
        if (priceSort) base.sort((a, b) => priceSort === "asc" ? (a.pricePerDay - b.pricePerDay) : (b.pricePerDay - a.pricePerDay));
        return base.filter((r) => {
            const matchCity = city ? r.city === city : true;
            const matchKw = !kw || r.name?.toLowerCase().includes(kw) || r.city?.toLowerCase().includes(kw) || r.address?.toLowerCase().includes(kw);
            return matchCity && matchKw;
        });
    }, [recs, city, keyword, priceSort]);

    const sortByPrice = (list) => {
        if (!priceSort) return list;
        const arr = [...list];
        arr.sort((a, b) => priceSort === "asc" ? (a.pricePerDay - b.pricePerDay) : (b.pricePerDay - a.pricePerDay));
        return arr;
    };
    const filteredSorted = useMemo(() => sortByPrice(filteredRecs), [filteredRecs, priceSort]);
    const allSorted = useMemo(() => sortByPrice(recs), [recs, priceSort]);

    // ========= FAVORITES =========
    const [favorites, setFavorites] = useState(new Set());
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const ids = await favoritesApi.mine(uid);
                if (alive) setFavorites(new Set((ids || []).map(Number)));
            } catch {
                if (alive) setFavorites(new Set());
            }
        })();
        return () => { alive = false; };
    }, [uid]);

    useEffect(() => {
        const onFavChanged = (e) => {
            const { H_ID, action } = e?.detail || {};
            if (!H_ID) return;
            const id = Number(H_ID);
            setFavorites((prev) => {
                const next = new Set(prev);
                if (action === "add") next.add(id); else next.delete(id);
                return next;
            });
        };
        const onStorage = (ev) => {
            if (ev.key === "greenstay:favorites:updated") {
                favoritesApi.mine(uid).then((ids) => setFavorites(new Set((ids || []).map(Number)))).catch(() => { });
            }
        };
        window.addEventListener("favorite:changed", onFavChanged);
        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener("favorite:changed", onFavChanged);
            window.removeEventListener("storage", onStorage);
        };
    }, [uid]);

    const viewHomestay = (id) => navigate(`/homestays/${id}`);
    const bookHomestay = (item) => {
        if (!authed) return navigate("/login", { state: { redirectTo: `/homestays/${item.id}?action=book` } });
        navigate(`/homestays/${item.id}?action=book`);
    };
    const toggleFavorite = async (id) => {
        const n = Number(id);
        const had = favorites.has(n);
        setFavorites((prev) => { const next = new Set(prev); had ? next.delete(n) : next.add(n); return next; });
        try { had ? await favoritesApi.removeByHomestay(uid, n) : await favoritesApi.add(uid, n); }
        catch {
            setFavorites((prev) => { const next = new Set(prev); had ? next.add(n) : next.delete(n); return next; });
            message.error("Cập nhật yêu thích thất bại");
        }
    };

    // ========= BOOKINGS =========
    const [bkLoading, setBkLoading] = useState(false);
    const [bkList, setBkList] = useState([]);
    const [bkFilter, setBkFilter] = useState("all");
    const [viewing, setViewing] = useState(null);

    const [cancelingId, setCancelingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);


    // Thay cho Modal.confirm (static)
    const [confirmCancelFor, setConfirmCancelFor] = useState(null);
    const [confirmDeleteFor, setConfirmDeleteFor] = useState(null);
    const [cancelReason, setCancelReason] = useState("");

    // Rating
    const [ratingFor, setRatingFor] = useState(null);
    const [ratingScore, setRatingScore] = useState(5);
    const [ratingText, setRatingText] = useState("");
    const [ratingLoading, setRatingLoading] = useState(false);

    // ========== COMPLAINTS ==========
    const [complaintOpen, setComplaintOpen] = useState(false);
    const [complaintSubmitting, setComplaintSubmitting] = useState(false);
    const [complaintForm] = Form.useForm();
    const [complaintContext, setComplaintContext] = useState(null);
    const [myComplaints, setMyComplaints] = useState([]);


    // Mở form khiếu nại cho 1 booking
    const openComplaintForBooking = (bk) => {
        if (!bk) return;
        setComplaintContext({
            type: "booking",
            bookingId: bk.Booking_ID,
            title: `Đơn #${bk.Booking_ID}`,
        });
        complaintForm.resetFields();
        setComplaintOpen(true);
    };

    // Mở góp ý chung
    const openGeneralFeedback = () => {
        setComplaintContext({
            type: "general",
            title: "Góp ý & Hỗ trợ chung",
        });
        complaintForm.resetFields();
        setComplaintOpen(true);
    };

    const handleSubmitComplaint = async () => {
        try {
            const values = await complaintForm.validateFields();
            setComplaintSubmitting(true);

            await complaintsApi.create({
                type: complaintContext?.type || "general",
                bookingId: complaintContext?.bookingId || null,
                subject: values.subject,
                content: values.content,
                userId: uid,
            });

            message.success("Đã gửi khiếu nại / góp ý!");
            await loadMyComplaints();
            setComplaintOpen(false);
            complaintForm.resetFields();
        } catch (e) {
            console.error("[complaint] submit error:", e);
            message.error("Gửi khiếu nại thất bại.");
        } finally {
            setComplaintSubmitting(false);
        }
    };

    // Load tất cả khiếu nại của user hiện tại
    const loadMyComplaints = async () => {
        try {
            const res = await complaintsApi.mine();
            // res có thể là mảng [] hoặc { status, data: [] }
            const list = Array.isArray(res)
                ? res
                : Array.isArray(res?.data)
                    ? res.data
                    : [];

            console.log("[complaint] mine ->", list.length, list);
            setMyComplaints(list);
        } catch (e) {
            console.error("[complaint] loadMine error:", e);
        }
    };


    useEffect(() => {
        if (tab !== "bookings") return;

        let alive = true;
        (async () => {
            try {
                setBkLoading(true);
                const rows = await bookingApi.mine();
                if (alive) setBkList(rows || []);
            } finally {
                if (alive) setBkLoading(false);
            }
        })();

        return () => { alive = false; };
    }, [tab]);

    const bkFiltered = useMemo(
        () => (bkFilter === "all" ? bkList : (bkList || []).filter((b) => String(b.Booking_status).toLowerCase() === bkFilter)),
        [bkList, bkFilter]
    );
    const bkTotal = useMemo(() => (bkFiltered || []).reduce((s, b) => s + Number(b.Total_price || 0), 0), [bkFiltered]);

    const canCancel = (b) => ["pending", "confirmed", "pending_payment", "paid"].includes(String(b?.Booking_status || "").toLowerCase());

    const openDetail = async (b) => {
        setViewing({ ...b });
        try {
            const res = await bookingApi.getById(b.Booking_ID);
            const data = res?.data ? res.data : res;
            if (!data) return;
            setViewing((prev) => {
                if (!prev || prev.Booking_ID !== b.Booking_ID) return prev;
                const merged = data.header
                    ? { ...prev, ...data.header, details: Array.isArray(data.details) ? data.details : (prev.details || []), payments: Array.isArray(data.payments) ? data.payments : (prev.payments || []) }
                    : { ...prev, ...data };
                return merged;
            });
        } catch (e) {
            console.error("[BOOKINGS] getById error:", e?.response?.data || e?.message || e);
        }
    };

    // ---- Actions
    const doCancel = async (b, reason = "") => {
        console.group("[BOOKINGS] cancel start"); console.log("bookingId:", b?.Booking_ID, "reason:", reason);
        try {
            setCancelingId(b.Booking_ID);
            if (typeof bookingApi.cancel === "function") {
                const resp = await bookingApi.cancel(b.Booking_ID, { reason }); console.log("api.cancel resp:", resp);
            } else if (typeof bookingApi.updateStatus === "function") {
                const resp = await bookingApi.updateStatus(b.Booking_ID, { status: "cancelled", reason }); console.log("api.updateStatus resp:", resp);
            } else if (typeof bookingApi.update === "function") {
                const resp = await bookingApi.update(b.Booking_ID, { Booking_status: "cancelled", reason }); console.log("api.update resp:", resp);
            } else {
                throw new Error("API huỷ đơn chưa được khai báo ở services/bookings");
            }
            try { if (typeof bookingApi.notifyOwner === "function") await bookingApi.notifyOwner(b.Booking_ID, { type: "user_cancelled", reason }); }
            catch (e) { console.warn("notifyOwner warn:", e?.response?.data || e?.message || e); }

            message.success(`Đã huỷ đơn #${b.Booking_ID}`);
            const rows = await bookingApi.mine();
            console.log("[BOOKINGS] mine after cancel ->", Array.isArray(rows) ? rows.length : rows);
            setBkList(rows || []);
            setViewing((v) => (v && v.Booking_ID === b.Booking_ID ? { ...v, Booking_status: "cancelled" } : v));
        } catch (e) {
            console.error("[BOOKINGS] cancel error:", e?.response?.data || e?.message || e);
            message.error(e?.response?.data?.message || e?.message || "Huỷ đơn thất bại");
        } finally {
            console.groupEnd();
            setCancelingId(null);
        }
    };

    const doDelete = async (b) => {
        console.group("[BOOKINGS] delete start"); console.log("bookingId:", b?.Booking_ID);
        try {
            setDeletingId(b.Booking_ID);
            if (typeof bookingApi.remove === "function") {
                const resp = await bookingApi.remove(b.Booking_ID); console.log("api.remove resp:", resp);
            } else if (typeof bookingApi.delete === "function") {
                const resp = await bookingApi.delete(b.Booking_ID); console.log("api.delete resp:", resp);
            } else if (typeof bookingApi.destroy === "function") {
                const resp = await bookingApi.destroy(b.Booking_ID); console.log("api.destroy resp:", resp);
            } else {
                throw new Error("API xoá đơn chưa được khai báo ở services/bookings");
            }
            message.success(`Đã xoá đơn #${b.Booking_ID}`);
            const rows = await bookingApi.mine();
            console.log("[BOOKINGS] mine after delete ->", Array.isArray(rows) ? rows.length : rows);
            setBkList(rows || []);
            if (viewing?.Booking_ID === b.Booking_ID) setViewing(null);
        } catch (e) {
            console.error("[BOOKINGS] delete error:", e?.response?.data || e?.message || e);
            message.error(e?.response?.data?.message || e?.message || "Xoá đơn thất bại");
        } finally {
            console.groupEnd();
            setDeletingId(null);
        }
    };

    // ==== UI helpers to open controlled Modals ====
    const openConfirmCancel = (b) => { console.log("[BOOKINGS] openConfirmCancel ->", b?.Booking_ID); setCancelReason(""); setConfirmCancelFor(b); };
    const openConfirmDelete = (b) => { console.log("[BOOKINGS] openConfirmDelete ->", b?.Booking_ID); setConfirmDeleteFor(b); };

    // ========= EXTRACTORS =========
    const extractNote = (obj) => {
        if (!obj || typeof obj !== "object") return "";
        const candidates = [
            obj.Note, obj.Customer_note, obj.User_note, obj.note, obj.note_text,
            obj.customer_note, obj.booking_note, obj.special_request, obj.Special_request,
            obj.message, obj.Message, obj.comment, obj.Comment, obj.additional_info, obj.Additional_info
        ].map(v => (typeof v === "string" ? v.trim() : v)).filter(Boolean);
        if (candidates.length) return String(candidates[0]);
        for (const [k, v] of Object.entries(obj)) {
            if (/(note|request|message|comment)/i.test(k) && v) {
                const s = typeof v === "string" ? v.trim() : v;
                if (s) return String(s);
            }
        }
        return "";
    };
    const extractAllNotes = (booking) => {
        const list = [];
        const main = extractNote(booking);
        if (main) list.push({ scope: "Đơn", text: main });
        (booking?.details || []).forEach((d, idx) => {
            const n = extractNote(d); if (n) list.push({ scope: `Dòng #${idx + 1}`, text: n });
        });
        return list;
    };
    const extractPaymentInfo = (b) => {
        const get = (...keys) => {
            for (const k of keys) {
                const v = k.split(".").reduce((o, kk) => (o ? o[kk] : undefined), b);
                if (v !== undefined && v !== null && v !== "") return v;
            } return undefined;
        };
        let status = get("Payment_status", "payment_status", "PaymentStatus", "paymentStatus", "payment.status", "pay_status", "transaction_status");
        if (status === undefined) {
            if (b?.Is_paid !== undefined) status = b.Is_paid ? "paid" : "unpaid";
            if (b?.isPaid !== undefined) status = b.isPaid ? "paid" : "unpaid";
            if (b?.Paid !== undefined) status = b.Paid ? "paid" : "unpaid";
        }
        const method = get("Payment_method", "payment_method", "PaymentMethod", "paymentMethod", "payment.method", "channel", "gateway");
        const ref = get("Transaction_id", "transaction_id", "transactionId", "payment.id", "payment.transaction_id", "Payment_code", "payment_ref");
        return { status, method, ref };
    };

    /* ====== TÍNH TIỀN GIỐNG MyBookings/Owner: suy ra giảm giá & phải trả ====== */
    const asNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };
    const gt0 = (v) => Number.isFinite(v) && v > 0;

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

    function resolveDiscount(root) {
        const raw = [
            root?.Discount_amount, root?.discount_amount,
            root?.Promotion_amount, root?.promotion_amount,
            root?.Promotion_discount, root?.promotion_discount,
            root?.Total_discount, root?.total_discount,
            root?.Header?.Discount_amount, root?.header?.Discount_amount,
        ].map(asNum).find(gt0);
        return gt0(raw) ? raw : 0;
    }

    function resolveTotal(root, row) {
        const raw = [
            root?.Total_price, root?.total_price,
            root?.Total_after_discount, root?.total_after_discount,
            root?.Final_total, root?.final_total,
            root?.Grand_total, root?.grand_total,
        ].map(asNum).find(gt0);
        return gt0(raw) ? raw : 0;
    }

    function resolveMoney(root, row) {
        const details = root?.details || row?.details || [];

        // Lấy subtotal từ details
        const subtotal = resolveSubtotalFromDetails(details);

        // Lấy discount chuẩn từ Booking
        let discount = resolveDiscount(root);

        // Fallback nếu discount BE không trả
        if ((!gt0(discount)) && gt0(subtotal) && gt0(root?.Total_price) && root.Total_price <= subtotal) {
            discount = subtotal - Number(root.Total_price);
        }

        if (discount > subtotal) discount = subtotal;

        // Lấy total chuẩn từ Booking
        let total = resolveTotal(root, row);
        if (!gt0(total)) total = Math.max(0, subtotal - discount);

        return { subtotal, discount, total };
    }

    const moneyViewing = useMemo(
        () => (viewing ? resolveMoney(viewing, viewing) : { subtotal: 0, discount: 0, total: 0 }),
        [viewing]
    );


    // ========= BOOKING ITEM =========
    // ========== CANCEL BOOKING (giống MyBookings, KHÔNG CÓ LÝ DO) ==========
    const canCancelBooking = (b) => {
        if (!b) return false;
        const st = String(b.Booking_status || "").toLowerCase();
        return ["pending", "pending_payment", "confirmed", "paid"].includes(st);
    };

    const handleCancelBooking = async (b) => {
        if (!b) return;
        const id = b.Booking_ID;

        try {
            await bookingApi.updateStatus(id, "cancelled");
            message.success("Đã huỷ đơn #" + id);
            const rows = await bookingApi.mine();
            setBkList(rows || []);
        } catch (err) {
            console.error("[cancel] error:", err?.response?.data || err);
            message.error(err?.response?.data?.message || "Hủy đơn thất bại");
        }
    };

    const BookingItem = ({ b }) => {
        const money = resolveMoney(b, b);  // <--- dùng chung logic MyBookings
        const first = b?.details?.[0];

        const title = first?.H_Name || "Homestay";
        const dateRange = first ? `${first.Checkin_date} — ${first.Checkout_date}` : "-";
        const guests = first?.Guests || b?.Guests || 1;

        return (
            <Card key={b.Booking_ID} bodyStyle={{ padding: 14 }} style={{ borderRadius: 16 }}>
                <Row align="middle" gutter={[12, 12]}>
                    <Col xs={24} md={6}>
                        <Space direction="vertical" size={4}>
                            <Space size={8} wrap>
                                <Tag color="green" style={{ fontWeight: 700 }}>#{b.Booking_ID}</Tag>
                                <StatusPill s={b.Booking_status} />
                            </Space>
                        </Space>
                    </Col>

                    <Col xs={24} md={11}>
                        <Space direction="vertical" size={6}>
                            <Space wrap>
                                <Text strong>{title}</Text>
                            </Space>
                            <Space wrap>
                                <Tag icon={<CalendarOutlined />}>{dateRange}</Tag>
                                <Tag>{guests} khách</Tag>
                            </Space>
                        </Space>
                    </Col>

                    <Col xs={24} md={7}>
                        <Row justify="end" gutter={[8, 8]}>
                            <Col span={24} style={{ textAlign: "right" }}>
                                <Text type="secondary">Tổng tiền</Text>
                                <Title level={4} style={{ margin: 0 }}>
                                    {fmt(money.total)} ₫
                                </Title>
                                {money.discount > 0 && (
                                    <div style={{ color: "green", fontSize: 13 }}>
                                        Giảm: -{fmt(money.discount)} ₫
                                    </div>
                                )}
                            </Col>

                            <Col>
                                <Space>
                                    <Button icon={<EyeOutlined />} onClick={() => openDetail(b)}>
                                        Chi tiết
                                    </Button>
                                    <Popconfirm
                                        title="Huỷ đơn này?"
                                        description="Bạn chắc chắn muốn huỷ đơn này?"
                                        okText="Huỷ"
                                        cancelText="Không"
                                        onConfirm={() => handleCancelBooking(b)}
                                        disabled={!canCancelBooking(b)}
                                    >
                                        <Button danger disabled={!canCancelBooking(b)}>
                                            Huỷ đơn
                                        </Button>
                                    </Popconfirm>


                                </Space>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Card>
        );
    };

    const displayName = pickDisplayName(user);

    const hotCities = [
        { name: "Đà Lạt", img: "/city-dalat.jpg" },
        { name: "Hà Nội", img: "/city-hanoi.jpg" },
        { name: "Hội An", img: "/city-hoian.jpg" },
        { name: "Nha Trang", img: "/city-nhatrang.jpg" },
        { name: "Đà Nẵng", img: "/city-danang.jpg" },
        { name: "TP. HCM", img: "/city-hcm.jpg" },
        { name: "Cần Thơ", img: "/city-cantho.jpg" },
    ];

    const stats = [
        { label: "Thành phố phủ sóng", value: hotCities.length, icon: <EnvironmentOutlined /> },
        { label: "Homestay đang hiển thị", value: filteredRecs.length || recs.length, icon: <HomeFilled /> },
        { label: "Đánh giá hài lòng", value: "4.8/5", icon: <SmileOutlined /> },
        { label: "Thời gian phản hồi", value: "< 5 phút", icon: <RocketOutlined /> },
    ];

    // ======= helpers for right sidebar in Bookings =======
    const latestDate = useMemo(() => {
        const d = (bkList || [])
            .flatMap(b => (b.details || []).map(d => d.Checkin_date))
            .filter(Boolean)
            .sort((a, b) => new Date(b) - new Date(a))[0];
        return d ? dayjs(d).format("D/M/YYYY") : "-";
    }, [bkList]);

    // ======= PROFILE DRAWER (Customer) =======
    const [pOpen, setPOpen] = useState(false);
    const [pSaving, setPSaving] = useState(false);
    const [pForm] = Form.useForm();

    const onUserClick = async () => {
        try {
            const res = await usersApi.me();
            const me = res?.user || res;
            pForm.setFieldsValue({
                U_Fullname: me?.U_Fullname ?? me?.full_name ?? "",
                U_Email: me?.U_Email ?? me?.email ?? "",
                U_Phone: me?.U_Phone ?? me?.phone ?? "",
                U_Address: me?.U_Address ?? me?.address ?? "",
                U_Gender: me?.U_Gender ?? me?.gender ?? undefined,
                U_Birthday: me?.U_Birthday ? dayjs(me.U_Birthday) : undefined,
            });
            setPOpen(true);
        } catch (e) {
            // giữ style log nhất quán với file này
            console.group("[HomeCustomer][profile load]");
            console.log(e?.response?.status, e?.response?.data || e?.message || e);
            console.groupEnd();
            message.error(e?.response?.data?.message || "Không tải được thông tin người dùng");
        }
    };

    const onProfileSave = async (vals) => {
        setPSaving(true);
        const payload = {
            U_Fullname: (vals.U_Fullname || "").trim(),
            U_Email: (vals.U_Email || "").trim(),
            U_Phone: (vals.U_Phone || "").trim(),
            U_Address: (vals.U_Address || "").trim(),
            U_Gender: vals.U_Gender || null,
            U_Birthday: vals.U_Birthday ? vals.U_Birthday.format("YYYY-MM-DD") : null,
        };
        try {
            await usersApi.updateMe(payload);
            if (setUser) setUser((prev) => ({ ...prev, ...payload }));
            message.success("Cập nhật thông tin thành công");
            setPOpen(false);
        } catch (e) {
            console.group("[HomeCustomer][profile save]");
            console.log(e?.response?.status, e?.response?.data || e?.message || e);
            console.groupEnd();
            message.error(e?.response?.data?.message || "Cập nhật thất bại");
        } finally {
            setPSaving(false);
        }
    };

    return (

        <Layout style={{
            minHeight: "100vh",
            backgroundImage: `
        radial-gradient(70% 80% at -10% -10%, #ecfdf5 0%, #ffffff 55%),
        radial-gradient(55% 70% at 110% -10%, #e6fff6 0%, #ffffff 55%),
        radial-gradient(20% 25% at 85% 85%, rgba(16,185,129,.08), transparent 70%),
        linear-gradient(180deg, rgba(255,255,255,.0), rgba(22,163,74,.04))` }}>
            {/* HEADER */}
            <Header style={{
                position: "sticky", top: 0, zIndex: 1000, height: HEADER_H, lineHeight: 1, padding: "10px 20px",
                background: `linear-gradient(102deg, ${GREEN.dark} 0%, ${GREEN.main} 50%, ${GREEN.light} 100%)`,
                boxShadow: "0 12px 28px rgba(16,185,129,.25)", borderBottom: "1px solid rgba(255,255,255,.18)", backdropFilter: "blur(4px)"
            }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
                    {/* logo */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,.25)",
                            display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)"
                        }}>
                            <HomeFilled style={{ color: "#fff", fontSize: 20 }} />
                        </div>
                        <div>
                            <div style={{ color: "#fff", fontWeight: 900, fontSize: 18, lineHeight: 1, letterSpacing: .3 }}>GreenStay</div>
                            <div style={{ color: "rgba(255,255,255,.92)", fontSize: 12 }}>Homestay cho kỳ nghỉ xanh</div>
                        </div>
                    </div>

                    {/* header search */}
                    <div style={{ flex: 1, display: "flex", gap: 10, marginLeft: 12 }}>
                        <Input size="large" allowClear value={keyword} onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Tìm tên, thành phố, địa chỉ…" prefix={<SearchOutlined style={{ color: "#10b981" }} />}
                            style={{ height: 40, borderRadius: 999, border: "none", boxShadow: "0 10px 24px rgba(0,0,0,.08)" }} />
                        <Select size="large" allowClear value={city} onChange={setCity} placeholder="Thành phố"
                            style={{ width: 220, height: 40, borderRadius: 999, boxShadow: "0 10px 24px rgba(0,0,0,.08)" }}
                            options={cityOptions} showSearch optionFilterProp="label" />
                    </div>

                    {/* user */}
                    {!authed ? (
                        <Button ghost size="middle" onClick={() => navigate("/login", { state: { redirectTo: "/" } })}
                            style={{ color: "#fff", borderColor: "rgba(255,255,255,.75)", borderRadius: 999, boxShadow: "0 6px 16px rgba(0,0,0,.2)" }}>
                            Đăng nhập
                        </Button>
                    ) : (
                        <Dropdown
                            menu={{
                                items: [
                                    { key: "profile", icon: <SettingOutlined />, label: <span style={{ fontWeight: 500 }}>Sửa hồ sơ</span>, onClick: onUserClick },
                                    { type: "divider" },
                                    { key: "logout", danger: true, icon: <LogoutOutlined />, label: <span style={{ fontWeight: 600 }}>Đăng xuất</span>, onClick: logout },
                                ]
                            }} trigger={["click"]} placement="bottomRight">
                            <Button type="text" style={{
                                color: "#fff", borderRadius: 999, height: 44, padding: "0 14px",
                                background: "rgba(255,255,255,.13)", boxShadow: "0 10px 22px rgba(0,0,0,.18)", display: "flex", alignItems: "center", gap: 10
                            }}>
                                <Avatar size={28} style={{ background: "#e6fff2", color: "#0ea5e9", border: "1px solid #c8f4e1" }}
                                    icon={<UserOutlined style={{ color: "#10b981" }} />}>{(displayName || "U")[0]}</Avatar>
                                <span style={{ fontWeight: 700 }}>{displayName}</span>
                                <DownOutlined style={{ fontSize: 12, opacity: 0.9 }} />
                            </Button>
                        </Dropdown>
                    )}
                </div>
            </Header>

            {/* Tabs */}
            <div style={{ position: "sticky", top: HEADER_H, zIndex: 900, background: "#fff", borderBottom: `1px solid ${GREEN.border}` }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", paddingInline: 16 }}>
                    <Tabs activeKey={tab} onChange={setTab} items={[
                        { key: "explore", label: <Space><HomeFilled />Khám phá</Space> },
                        { key: "favorites", label: <Space><HeartFilled style={{ color: "#ef4444" }} />Yêu thích</Space> },
                        { key: "bookings", label: <Space><FileDoneOutlined />Đặt phòng</Space> },
                        { key: "about", label: <Space><InfoCircleOutlined />Về chúng tôi</Space> }
                    ]} />
                </div>
            </div>

            <Content style={{ padding: 16 }}>
                <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                    {/* ======= EXPLORE ======= */}
                    {tab === "explore" ? (
                        <HeroSlideshow images={HERO_IMAGES} interval={6000}>
                            <Title style={{ color: "#fff", fontSize: 38, marginBottom: 6 }}>Tìm homestay lý tưởng cho kỳ nghỉ</Title>
                            <Text style={{ color: "#d1fae5" }}>Ưu đãi độc quyền – Nhiều lựa chọn được đánh giá cao</Text>

                            <div style={{
                                width: "min(100%, 1000px)", display: "grid", gridTemplateColumns: "2fr 1.2fr 1.8fr 1fr 1.4fr auto", gap: 12,
                                background: "linear-gradient(180deg, #ffffff 0%, #f8fffb 100%)", padding: 12, borderRadius: 999, marginTop: 24,
                                boxShadow: "0 18px 45px rgba(0,0,0,.35), 0 0 0 2px rgba(16,185,129,.18), 0 0 0 8px rgba(16,185,129,.08)"
                            }}>
                                <Input placeholder="Thành phố, homestay…" prefix={<SearchOutlined />} size="large" value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)} style={{ border: "1px solid #e5f7ef", borderRadius: 999, height: 48 }} />
                                <Select placeholder="Thành phố" value={city} onChange={setCity} size="large" style={{ borderRadius: 999, height: 48 }}
                                    options={cityOptions} showSearch optionFilterProp="label" />
                                <DatePicker.RangePicker allowClear size="large" value={dateRange} onChange={setDateRange}
                                    style={{ width: "100%", borderRadius: 999, height: 48 }} />
                                <InputNumber size="large" min={1} max={20} value={guests} onChange={setGuests}
                                    style={{ width: "100%", borderRadius: 999, height: 48 }} prefix={<NumberOutlined />} />
                                <div style={{
                                    height: 48, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
                                    paddingInline: 8, border: "1px solid #e5f7ef", background: "#fff", boxShadow: "inset 0 0 0 1px rgba(16,185,129,.05)"
                                }}>
                                    <Space size={8}>
                                        <DollarOutlined style={{ color: "#10b981" }} />
                                        <Segmented value={priceSort || "none"} onChange={(v) => setPriceSort(v === "none" ? undefined : v)}
                                            options={[{ label: "Mặc định", value: "none" }, { label: <span>Giá ↑</span>, value: "asc", icon: <ArrowUpOutlined /> },
                                            { label: <span>Giá ↓</span>, value: "desc", icon: <ArrowDownOutlined /> }]} />
                                    </Space>
                                </div>
                                <Button type="primary" size="large" onClick={onHeroSearch} icon={<SearchOutlined />} style={{ borderRadius: 999, fontWeight: 800, height: 48 }}>
                                    Tìm kiếm
                                </Button>
                            </div>

                            {isSearching && (<Button onClick={resetFilters} style={{ marginTop: 12, borderRadius: 999 }}>Hiện tất cả</Button>)}
                        </HeroSlideshow>
                    ) : null}
                    {/* Điểm đến nổi bật: chỉ hiển thị khi ở tab Khám phá */}
                    {tab === "explore" && (
                        <Card
                            style={{
                                borderRadius: 20,
                                background: "linear-gradient(135deg,#f0fdf4,#ffffff)",
                                boxShadow: "0 10px 28px rgba(0,0,0,.06)",
                                marginBottom: 20,
                            }}
                            headStyle={{ borderBottom: "none" }}
                            title={<Text strong style={{ color: "#065f46" }}>Điểm đến nổi bật</Text>}
                        >
                            <Space wrap size="middle">
                                {hotCities.map((c) => (
                                    <Button
                                        key={c.name}
                                        onClick={() => chooseCity(c.name)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 12,
                                            borderRadius: 999, background: city === c.name ? "#dcfce7" : "white",
                                            border: "1px solid #bbf7d0", padding: "8px 18px",
                                            boxShadow: "0 8px 18px rgba(0,0,0,.05)",
                                            transition: "transform .15s ease",
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                                    >
                                        <img src={c.img} alt={c.name} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
                                        <span style={{ fontWeight: 700 }}>{c.name}</span>
                                        <Tag color="green" style={{ borderRadius: 999, marginLeft: 4 }}>Hot</Tag>
                                    </Button>
                                ))}
                            </Space>
                        </Card>
                    )}

                    {/* ======= DANH SÁCH HOMESTAY ======= */}
                    {tab === "explore" && (
                        <>
                            <div ref={resultsRef} />
                            <Space align="center" style={{ margin: "0 0 12px" }}>
                                <Title level={4} style={{ margin: 0, color: "#064e3b" }}>
                                    {isSearching ? "Kết quả tìm kiếm" : "Tất cả homestay"}
                                </Title>
                                {loading ? (
                                    <Badge color="green" text="Đang tải..." />
                                ) : (
                                    <Badge color="green" text={`${filteredRecs.length} kết quả`} />
                                )}
                            </Space>

                            {loading ? (
                                <Row gutter={[16, 16]}>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <Col xs={24} sm={12} md={8} key={i}>
                                            <Card style={{ borderRadius: 14 }}>
                                                <Skeleton active paragraph={{ rows: 4 }} />
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            ) : filteredRecs.length === 0 ? (
                                <Empty description={isSearching ? "Không có homestay phù hợp" : "Chưa có dữ liệu"} />
                            ) : (
                                <Row gutter={[16, 16]}>
                                    {filteredRecs.map((item) => (
                                        <Col xs={24} sm={12} md={8} key={item.id}>
                                            <Card
                                                hoverable
                                                style={{
                                                    borderRadius: 14, overflow: "hidden",
                                                    transition: "transform .18s, box-shadow .18s",
                                                    boxShadow: "0 10px 26px rgba(2,6,23,.06)"
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                                                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                                                cover={
                                                    <div
                                                        onClick={() => viewHomestay(item.id)}
                                                        style={{
                                                            height: 200, position: "relative", cursor: "pointer",
                                                            background: `url('${toPublicUrl(item.cover)}') center/cover no-repeat`,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                position: "absolute", left: 12, top: 12, padding: "6px 10px",
                                                                borderRadius: 999, background: "rgba(0,0,0,.55)", color: "white", fontWeight: 700, backdropFilter: "blur(4px)",
                                                            }}
                                                        >
                                                            <DollarOutlined /> {item.pricePerDay.toLocaleString("vi-VN")} ₫/đêm
                                                        </div>
                                                        <div
                                                            style={{
                                                                position: "absolute", right: 12, top: 12,
                                                                background: "rgba(255,255,255,.9)", borderRadius: 999, padding: "6px 8px",
                                                                boxShadow: "0 6px 16px rgba(0,0,0,.12)"
                                                            }}
                                                            onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                                                        >
                                                            {favorites.has(item.id) ? <HeartFilled style={{ color: "#ef4444" }} /> : <HeartOutlined />}
                                                        </div>
                                                        <div
                                                            style={{
                                                                position: "absolute", left: 0, right: 0, bottom: 0, height: 90,
                                                                background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.50) 90%)",
                                                            }}
                                                        />
                                                    </div>
                                                }
                                                actions={[
                                                    <Space key="price"><DollarOutlined />{item.pricePerDay.toLocaleString("vi-VN")} ₫/đêm</Space>,
                                                    favorites.has(item.id)
                                                        ? <span key="heart" onClick={() => toggleFavorite(item.id)} style={{ color: "#ef4444" }}><HeartFilled /> Đã thích</span>
                                                        : <span key="heart" onClick={() => toggleFavorite(item.id)}><HeartOutlined /> Yêu thích</span>,
                                                    <span key="book" onClick={() => bookHomestay(item)} style={{ fontWeight: 700 }}>Đặt ngay</span>,
                                                ]}
                                            >
                                                <Space direction="vertical" style={{ width: "100%" }}>
                                                    <Space align="center">
                                                        <Badge color="green" />
                                                        <Text strong style={{ fontSize: 16 }}>{item.name}</Text>
                                                        <Space style={{ marginLeft: "auto" }}>
                                                            <StarFilled style={{ color: "#f59e0b" }} />
                                                            <Text>{item.rating}</Text>
                                                        </Space>
                                                    </Space>
                                                    <Space size={6}>
                                                        <EnvironmentOutlined />
                                                        <Text type="secondary">{item.address}, {item.city}</Text>
                                                    </Space>
                                                </Space>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            )}

                            <Divider />
                        </>
                    )}

                    {/* ======= CÁC KHỐI BỔ TRỢ: CHỈ KHI KHÔNG TÌM KIẾM ======= */}
                    {tab === "explore" && !isSearching && (
                        <>
                            {/* Ưu đãi đặc biệt */}
                            <Card
                                title={<Text strong style={{ color: "#065f46" }}>Ưu đãi đặc biệt</Text>}
                                style={{
                                    borderRadius: 20,
                                    background: "linear-gradient(135deg,#f0fdf4,#ffffff)",
                                    boxShadow: "0 6px 18px rgba(0,0,0,.06)",
                                    marginBottom: 24,
                                }}
                            >
                                <Row gutter={[16, 16]}>
                                    {[
                                        { img: "/promo1.jpg", title: "Giảm 20% cho khách hàng mới", desc: "Áp dụng đến 31/12/2025" },
                                        { img: "/promo2.jpg", title: "Trải nghiệm cao cấp chỉ từ 499k", desc: "Ưu đãi cuối tuần" },
                                        { img: "/promo3.jpg", title: "Đặt sớm – Giá tốt", desc: "Siêu ưu đãi đến 30%" },
                                    ].map((p) => (
                                        <Col xs={24} sm={12} md={8} key={p.title}>
                                            <Card
                                                hoverable
                                                cover={<img src={p.img} alt={p.title} style={{ height: 180, objectFit: "cover" }} />}
                                                style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,0.05)" }}
                                            >
                                                <Title level={5} style={{ marginBottom: 6 }}>{p.title}</Title>
                                                <Text type="secondary">{p.desc}</Text>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            </Card>

                            {/* Khám phá gần bạn (bản đồ) */}
                            <Card
                                title={<Text strong style={{ color: "#065f46" }}>Khám phá gần bạn</Text>}
                                extra={<a style={{ color: "#10b981" }} onClick={() => message.info("Demo: Xem tất cả")}>Xem tất cả</a>}
                                style={{ borderRadius: 18, marginBottom: 24, boxShadow: "0 10px 30px rgba(0,0,0,.05)" }}
                            >
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={14}>
                                        <iframe
                                            title="map"
                                            src="https://www.google.com/maps?q=Ho%20Chi%20Minh%20City&hl=vi&z=12&output=embed"
                                            width="100%"
                                            height="320"
                                            style={{ borderRadius: 14, border: 0, display: "block", minHeight: 320 }}
                                            loading="lazy"
                                            allowFullScreen
                                            referrerPolicy="no-referrer-when-downgrade"
                                        />
                                        <div style={{ marginTop: 8 }}>
                                            <a
                                                href="https://www.google.com/maps?q=Ho%20Chi%20Minh%20City"
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: "#10b981" }}
                                            >
                                                Mở bản đồ trên Google Maps
                                            </a>
                                        </div>
                                    </Col>

                                    <Col xs={24} md={10}>
                                        <Space direction="vertical" style={{ width: "100%" }}>
                                            {(filteredRecs.slice(0, 4)).map((h) => (
                                                <Card
                                                    key={h.id}
                                                    hoverable
                                                    style={{ borderRadius: 12 }}
                                                    onClick={() => viewHomestay(h.id)}
                                                >
                                                    <Space align="start">
                                                        <div style={{
                                                            width: 72, height: 72, borderRadius: 10,
                                                            background: `url('${toPublicUrl(h.cover)}') center/cover no-repeat`
                                                        }} />
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 700 }}>{h.name}</div>
                                                            <Text type="secondary" style={{ display: "block" }}>
                                                                <EnvironmentOutlined /> {h.city}
                                                            </Text>
                                                            <div style={{ marginTop: 8 }}>
                                                                <DollarOutlined /> {h.pricePerDay.toLocaleString("vi-VN")} ₫/đêm
                                                            </div>
                                                        </div>
                                                    </Space>
                                                </Card>
                                            ))}
                                        </Space>
                                    </Col>
                                </Row>
                            </Card>

                            {/* Lý do chọn GreenStay */}
                            <Card
                                style={{
                                    borderRadius: 18,
                                    background: "#ecfdf5",
                                    marginBottom: 40,
                                    boxShadow: "0 10px 26px rgba(2,6,23,.06)",
                                }}
                            >
                                <Row gutter={[16, 16]} justify="center">
                                    {[
                                        { icon: <SmileOutlined />, title: "Trải nghiệm thân thiện", desc: "Giao diện dễ dùng – đặt phòng nhanh chóng" },
                                        { icon: <CheckCircleTwoTone twoToneColor="#10b981" />, title: "An toàn & tin cậy", desc: "Thanh toán bảo mật – hoàn tiền rõ ràng" },
                                        { icon: <RocketOutlined />, title: "Hỗ trợ 24/7", desc: "Phản hồi nhanh – đồng hành mọi lúc" },
                                    ].map((f, i) => (
                                        <Col xs={24} sm={12} md={8} key={i}>
                                            <Space direction="vertical" align="center" style={{ textAlign: "center" }}>
                                                <div style={{ fontSize: 36, color: "#10b981" }}>{f.icon}</div>
                                                <Title level={5} style={{ margin: 0 }}>{f.title}</Title>
                                                <Text type="secondary">{f.desc}</Text>
                                            </Space>
                                        </Col>
                                    ))}
                                </Row>
                            </Card>
                        </>
                    )}

                    {/* ======= FAVORITES ======= */}
                    {tab === "favorites" && (
                        <>
                            <Title level={4}>Yêu thích của tôi</Title>
                            {!recs.length ? (
                                <Empty description="Chưa có dữ liệu" />
                            ) : (
                                <Row gutter={[16, 16]}>
                                    {recs.filter((r) => favorites.has(r.id)).map((item) => (
                                        <Col xs={24} sm={12} md={8} key={item.id}>
                                            <Card hoverable style={{ borderRadius: 14 }} cover={<div onClick={() => viewHomestay(item.id)} style={{ height: 200, background: `url('${toPublicUrl(item.cover)}') center/cover no-repeat` }} />}
                                                actions={[
                                                    <Space key="price"><DollarOutlined />{item.pricePerDay.toLocaleString("vi-VN")} ₫/đêm</Space>,
                                                    <span key="heart" onClick={() => toggleFavorite(item.id)} style={{ color: "#ef4444" }}><HeartFilled /> Bỏ thích</span>,
                                                    <span key="book" onClick={() => bookHomestay(item)} style={{ fontWeight: 700 }}>Đặt ngay</span>,
                                                ]}>
                                                <Space direction="vertical" style={{ width: "100%" }}>
                                                    <Space align="center"><Badge color="green" /><Text strong style={{ fontSize: 16 }}>{item.name}</Text></Space>
                                                    <Space size={6}><EnvironmentOutlined /><Text type="secondary">{item.address}, {item.city}</Text></Space>
                                                </Space>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            )}
                        </>
                    )}

                    {/* ======= BOOKINGS ======= */}
                    {tab === "bookings" && (
                        <>
                            {/* ======= CHẶN CHƯA ĐĂNG NHẬP ======= */}
                            {!authed && (
                                <div
                                    style={{
                                        padding: 40,
                                        textAlign: "center",
                                        background: "#fff",
                                        borderRadius: 14,
                                        marginBottom: 20,
                                    }}
                                >
                                    <Title level={4} style={{ color: "#065f46", marginBottom: 10 }}>
                                        Bạn cần đăng nhập để xem đơn đặt phòng
                                    </Title>

                                    <Text type="secondary">
                                        Hãy đăng nhập để xem và quản lý các đơn đặt phòng của bạn.
                                    </Text>

                                    <br /><br />

                                    <Button
                                        type="primary"
                                        size="large"
                                        style={{ background: GREEN.main, borderRadius: 8 }}
                                        onClick={() =>
                                            navigate("/login", {
                                                state: { redirectTo: "/?tab=bookings" },
                                            })
                                        }
                                    >
                                        Đăng nhập ngay
                                    </Button>
                                </div>
                            )}

                            {/* Nếu chưa đăng nhập → kết thúc block */}
                            {!authed && null}

                            {/* ======= ĐÃ ĐĂNG NHẬP ======= */}
                            {authed && (
                                <>
                                    {/* Tiêu đề + Segmented filter */}
                                    <div
                                        style={{
                                            marginBottom: 12,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                        }}
                                    >
                                        <ThunderboltFilled style={{ color: "#10b981" }} />
                                        <Title level={5} style={{ margin: 0 }}>
                                            Đơn đặt của bạn <Badge status="processing" />{" "}
                                            <span style={{ fontWeight: 600 }}>
                                                {bkList?.length || 0} đơn
                                            </span>
                                        </Title>
                                    </div>

                                    <Segmented
                                        value={bkFilter}
                                        onChange={setBkFilter}
                                        options={[
                                            { label: "Tất cả", value: "all" },
                                            { label: "Chờ duyệt", value: "pending" },
                                            { label: "Đã xác nhận", value: "confirmed" },
                                            { label: "Đã hủy", value: "cancelled" },
                                            { label: "Hoàn tất", value: "completed" },
                                        ]}
                                        style={{ marginBottom: 16 }}
                                    />

                                    {/* ======= LIST ======= */}
                                    <Row gutter={[16, 16]}>
                                        {/* Cột trái: danh sách đơn */}
                                        <Col xs={24} md={16}>
                                            {bkLoading ? (
                                                <Space direction="vertical" style={{ width: "100%" }}>
                                                    {Array.from({ length: 3 }).map((_, i) => (
                                                        <Card key={i} style={{ borderRadius: 16 }}>
                                                            <Skeleton active paragraph={{ rows: 3 }} />
                                                        </Card>
                                                    ))}
                                                </Space>
                                            ) : !bkFiltered.length ? (
                                                <Empty description="Chưa có đơn đặt phòng" />
                                            ) : (
                                                <Space direction="vertical" style={{ width: "100%" }}>
                                                    {bkFiltered.map((b) => (
                                                        <BookingItem key={b.Booking_ID} b={b} />
                                                    ))}
                                                </Space>
                                            )}
                                        </Col>

                                        {/* Cột phải: thống kê */}
                                        <Col xs={24} md={8}>
                                            <Space direction="vertical" style={{ width: "100%" }}>

                                                <Card style={{ borderRadius: 14, background: "#ecfdf5" }}>
                                                    <Space align="center">
                                                        <div
                                                            style={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: 10,
                                                                background: "#d1fae5",
                                                                display: "grid",
                                                                placeItems: "center",
                                                            }}
                                                        >
                                                            <NumberIcon />
                                                        </div>
                                                        <Space direction="vertical" size={0}>
                                                            <Text type="secondary">Số đơn</Text>
                                                            <Title level={4} style={{ margin: 0 }}>
                                                                {bkFiltered.length}
                                                            </Title>
                                                        </Space>
                                                    </Space>
                                                </Card>

                                                <Card style={{ borderRadius: 14, background: "#ecfdf5" }}>
                                                    <Space direction="vertical" size={0}>
                                                        <Text type="secondary">Tổng tạm tính</Text>
                                                        <Title level={4} style={{ margin: 0 }}>
                                                            {fmt(bkTotal)} ₫
                                                        </Title>
                                                    </Space>
                                                </Card>

                                                <Card style={{ borderRadius: 14, background: "#e6f4ff" }}>
                                                    <Space direction="vertical" size={0}>
                                                        <Text type="secondary">Đơn gần nhất</Text>
                                                        <Title level={5} style={{ margin: 0 }}>
                                                            {latestDate}
                                                        </Title>
                                                    </Space>
                                                </Card>

                                                <Button
                                                    type="primary"
                                                    size="large"
                                                    style={{ borderRadius: 10 }}
                                                    onClick={() => navigate("/my-bookings")}
                                                >
                                                    <Space>
                                                        <CalendarOutlined /> Xem tất cả đơn
                                                    </Space>
                                                </Button>
                                            </Space>
                                        </Col>
                                    </Row>

                                    {/* Modal chi tiết đơn — GỌN & RÕ: Tổng / Giảm giá / Thành tiền */}
                                    <Modal
                                        open={!!viewing}
                                        onCancel={() => setViewing(null)}
                                        footer={null}
                                        width={820}
                                        title={
                                            <Space>
                                                Chi tiết đơn #{viewing?.Booking_ID} <StatusPill s={viewing?.Booking_status} />
                                            </Space>
                                        }
                                    >
                                        {!!viewing && (
                                            <Space direction="vertical" style={{ width: "100%" }}>
                                                {/* Thanh toán & trạng thái */}
                                                <Descriptions bordered size="small" column={1} items={[
                                                    {
                                                        key: "status",
                                                        label: "Trạng thái",
                                                        children: <StatusPill s={viewing.Booking_status} />
                                                    },
                                                    (() => {
                                                        const pay = extractPaymentInfo(viewing);
                                                        return {
                                                            key: "payment",
                                                            label: "Thanh toán",
                                                            children: (
                                                                <Space wrap>
                                                                    <PaymentPill status={pay.status ?? (viewing?.Is_paid ? "paid" : undefined)} />
                                                                    {pay.method && <Tag>{String(pay.method).toUpperCase()}</Tag>}
                                                                    {pay.ref && <Tag icon={<NumberOutlined />}>Mã GD: {String(pay.ref)}</Tag>}
                                                                </Space>
                                                            )
                                                        };
                                                    })(),
                                                ]} />

                                                {/* Ghi chú (nếu có) */}
                                                {(() => {
                                                    const notes = extractAllNotes(viewing);
                                                    if (!notes.length) return null;
                                                    return (
                                                        <Card size="small" bordered style={{ borderRadius: 10, background: "#fffbeb" }} title="Ghi chú của khách" bodyStyle={{ padding: 12 }}>
                                                            <Space direction="vertical" style={{ width: "100%" }}>
                                                                {notes.map((n, i) => (
                                                                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                                                                        <Tag color="gold">{n.scope}</Tag>
                                                                        <Text>{n.text}</Text>
                                                                    </div>
                                                                ))}
                                                            </Space>
                                                        </Card>
                                                    );
                                                })()}
                                                {/* Khiếu nại / Góp ý cho đơn này */}
                                                <Card
                                                    size="small"
                                                    style={{ borderRadius: 10, background: "#ecfeff" }}
                                                    title="Khiếu nại / Góp ý cho đơn này"
                                                    bodyStyle={{ padding: 12 }}
                                                >
                                                    <Space direction="vertical" style={{ width: "100%" }}>
                                                        <Text type="secondary">
                                                            Nếu bạn gặp vấn đề với đơn này, vui lòng gửi khiếu nại để chúng tôi hỗ trợ nhanh hơn.
                                                        </Text>

                                                        <Button
                                                            type="primary"
                                                            icon={<InfoCircleOutlined />}
                                                            onClick={() => openComplaintForBooking(viewing)}
                                                        >
                                                            Gửi khiếu nại / góp ý
                                                        </Button>

                                                        {/* ======= DANH SÁCH KHIẾU NẠI ĐÃ GỬI CHO ĐƠN NÀY ======= */}
                                                        {(myComplaints || [])
                                                            .filter(c => {
                                                                if (!c) return false;
                                                                if (c.Booking_ID == null || viewing?.Booking_ID == null) return false;
                                                                return Number(c.Booking_ID) === Number(viewing.Booking_ID);
                                                            })
                                                            .map((c, idx) => (
                                                                <Card
                                                                    key={c.Complaint_ID || c.C_ID || idx}
                                                                    size="small"
                                                                    style={{ marginTop: 10, borderRadius: 8, background: "#f0f9ff" }}
                                                                >
                                                                    <Space direction="vertical" style={{ width: "100%" }}>
                                                                        <Space align="baseline">
                                                                            <Tag color="blue">
                                                                                #{c.Complaint_ID || c.C_ID || "?"}
                                                                            </Tag>
                                                                            <Text strong>{c.C_Subject}</Text>
                                                                        </Space>

                                                                        <Text type="secondary">{c.C_Content}</Text>

                                                                        <Tag
                                                                            color={
                                                                                c.C_Status === "pending"
                                                                                    ? "orange"
                                                                                    : c.C_Status === "resolved"
                                                                                        ? "green"
                                                                                        : c.C_Status === "open"
                                                                                            ? "blue"
                                                                                            : "default"
                                                                            }
                                                                        >
                                                                            {c.C_Status === "pending" && "Đang xử lý"}
                                                                            {c.C_Status === "resolved" && "Đã xử lý"}
                                                                            {c.C_Status === "open" && "Mới tạo"}
                                                                            {c.C_Status !== "pending" &&
                                                                                c.C_Status !== "resolved" &&
                                                                                c.C_Status !== "open" &&
                                                                                c.C_Status}
                                                                        </Tag>
                                                                    </Space>
                                                                </Card>
                                                            ))}
                                                    </Space>
                                                </Card>



                                                <Divider>Chi tiết</Divider>

                                                {/* Các dòng homestay trong đơn */}
                                                {/* Các dòng homestay trong đơn — chỉ giữ thông tin ngắn gọn, bỏ bảng */}
                                                <Space direction="vertical" style={{ width: "100%" }}>
                                                    {(viewing.details || []).map((d) => {
                                                        const nights = nightsBetween?.(d.Checkin_date, d.Checkout_date) ?? 1;

                                                        return (
                                                            <Card
                                                                key={d.Booking_Detail_ID}
                                                                size="small"
                                                                bodyStyle={{ padding: 14, borderRadius: 12 }}
                                                            >
                                                                {/* Thông tin homestay + ngày + khách + đêm */}
                                                                <Space wrap>
                                                                    <Tag color="green">{d.H_Name || "Homestay"}</Tag>
                                                                    <Tag icon={<CalendarOutlined />}>
                                                                        {d.Checkin_date} — {d.Checkout_date}
                                                                    </Tag>
                                                                    <Tag>{d.Guests || 1} khách</Tag>
                                                                    <Tag>{nights} đêm</Tag>
                                                                </Space>

                                                                {/* Giá hiển thị ngắn gọn */}
                                                                <div style={{ marginTop: 8, textAlign: "right" }}>
                                                                    <Text type="secondary">{fmt(d.Unit_price)} đ/đêm</Text>
                                                                    <br />
                                                                </div>
                                                            </Card>
                                                        );
                                                    })}
                                                </Space>



                                                {/* Tóm tắt tiền — tách thành 3 dòng rõ ràng */}
                                                <Divider />
                                                <Descriptions column={1} bordered style={{ marginTop: 12 }}>
                                                    <Descriptions.Item label="Tạm tính">
                                                        {fmt(moneyViewing.subtotal)} ₫
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="Giảm giá">
                                                        -{fmt(moneyViewing.discount)} ₫
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="Tổng cộng">
                                                        <b>{fmt(moneyViewing.total)} ₫</b>
                                                    </Descriptions.Item>
                                                </Descriptions>

                                                <Divider />

                                                {/* Hành động */}
                                                <Space size={8} wrap>
                                                    <Button icon={<EyeOutlined />} onClick={() => openDetail(viewing)}>Làm mới</Button>
                                                    <Button
                                                        danger
                                                        disabled={!canCancel(viewing)}
                                                        loading={cancelingId === viewing?.Booking_ID}
                                                        onClick={() => {
                                                            console.log("[BOOKINGS][UI] modal-cancel -> id:", viewing?.Booking_ID);
                                                            openConfirmCancel(viewing);
                                                        }}
                                                    >
                                                        Hủy đơn
                                                    </Button>
                                                    <Button
                                                        type="text"
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        loading={deletingId === viewing?.Booking_ID}
                                                        onClick={() => {
                                                            console.log("[BOOKINGS][UI] modal-delete -> id:", viewing?.Booking_ID);
                                                            openConfirmDelete(viewing);
                                                        }}
                                                    >
                                                        Xóa đơn
                                                    </Button>
                                                </Space>
                                            </Space>
                                        )}
                                    </Modal>


                                    {/* Modal xác nhận HUỶ */}
                                    <Modal
                                        open={!!confirmCancelFor}
                                        onCancel={() => setConfirmCancelFor(null)}
                                        okText="Xác nhận huỷ"
                                        cancelText="Không"
                                        okButtonProps={{ danger: true, loading: cancelingId === confirmCancelFor?.Booking_ID }}
                                        title={<Space><StopOutlined /> Huỷ đơn #{confirmCancelFor?.Booking_ID}</Space>}
                                        onOk={() => {
                                            console.log("[BOOKINGS] confirmCancel onOk -> id:", confirmCancelFor?.Booking_ID, "reason:", cancelReason);
                                            if (confirmCancelFor) doCancel(confirmCancelFor, cancelReason);
                                            setConfirmCancelFor(null);
                                        }}
                                    >
                                        <p>Bạn có chắc muốn huỷ? Chủ nhà sẽ nhận thông báo.</p>
                                        <Input.TextArea autoFocus placeholder="Lý do (tuỳ chọn)" rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                                    </Modal>

                                    {/* Modal xác nhận XOÁ */}
                                    <Modal
                                        open={!!confirmDeleteFor}
                                        onCancel={() => setConfirmDeleteFor(null)}
                                        okText="Xoá đơn"
                                        cancelText="Không"
                                        okButtonProps={{ danger: true, loading: deletingId === confirmDeleteFor?.Booking_ID }}
                                        title={<Space><DeleteOutlined /> Xoá đơn #{confirmDeleteFor?.Booking_ID}</Space>}
                                        onOk={() => {
                                            console.log("[BOOKINGS] confirmDelete onOk -> id:", confirmDeleteFor?.Booking_ID);
                                            if (confirmDeleteFor) doDelete(confirmDeleteFor);
                                            setConfirmDeleteFor(null);
                                        }}
                                    >
                                        <p>Hành động không thể hoàn tác.</p>
                                    </Modal>

                                    {/* Modal đánh giá */}
                                    <Modal open={!!ratingFor} onCancel={() => setRatingFor(null)} onOk={async () => {
                                        if (!ratingFor) return;
                                        const payload = { bookingId: ratingFor.Booking_ID, rating: ratingScore, comment: ratingText?.trim() || "" };
                                        try {
                                            setRatingLoading(true);
                                            if (typeof bookingApi.review === "function") await bookingApi.review(ratingFor.Booking_ID, payload);
                                            else if (typeof bookingApi.rate === "function") await bookingApi.rate(ratingFor.Booking_ID, payload);
                                            else if (typeof bookingApi.addReview === "function") await bookingApi.addReview(ratingFor.Booking_ID, payload);
                                            else if (typeof bookingApi.createReview === "function") await bookingApi.createReview(ratingFor.Booking_ID, payload);
                                            else throw new Error("API đánh giá chưa được khai báo ở services/bookings");
                                            message.success("Cảm ơn bạn đã đánh giá!");
                                            setRatingFor(null);
                                            try { const rows = await bookingApi.mine(); console.log("[BOOKINGS] mine after review ->", Array.isArray(rows) ? rows.length : rows); setBkList(rows || []); } catch { }
                                        } catch (e) {
                                            console.error("[BOOKINGS] review error:", e?.response?.data || e?.message || e);
                                            message.error(e?.response?.data?.message || e?.message || "Gửi đánh giá thất bại");
                                        } finally { setRatingLoading(false); }
                                    }} okText={ratingLoading ? "Đang gửi..." : "Gửi đánh giá"} okButtonProps={{ loading: ratingLoading }}
                                        title={<Space><SmileOutlined /> Đánh giá trải nghiệm</Space>}>
                                        <Space direction="vertical" style={{ width: "100%" }}>
                                            <Rate allowHalf value={ratingScore} onChange={setRatingScore} />
                                            <Input.TextArea placeholder="Cảm nhận của bạn" rows={4} value={ratingText} onChange={(e) => setRatingText(e.target.value)} />
                                        </Space>
                                    </Modal>

                                </>
                            )}


                        </>
                    )}
                    {/* ======= ABOUT ======= */}
                    {tab === "about" && (
                        <Space direction="vertical" size={20} style={{ width: "100%" }}>
                            <AboutGreenStay
                                stats={stats}
                                onStart={() => setTab("explore")}
                            />

                            {/* Góp ý & hỗ trợ */}
                            <Card
                                style={{
                                    borderRadius: 18,
                                    background: "linear-gradient(135deg,#ecfeff,#f0fdf4)",
                                    border: "1px solid #bae6fd",
                                }}
                                bodyStyle={{ padding: 20 }}
                            >
                                <Title level={4} style={{ margin: 0, color: "#0369a1" }}>Góp ý & Hỗ trợ</Title>
                                <Text type="secondary">
                                    Nếu bạn có góp ý về trải nghiệm hoặc cần hỗ trợ, hãy gửi phản hồi cho GreenStay.
                                </Text>

                                <Button
                                    size="large"
                                    type="primary"
                                    icon={<SmileOutlined />}
                                    style={{ marginTop: 12, borderRadius: 999 }}
                                    onClick={openGeneralFeedback}
                                >
                                    Gửi góp ý
                                </Button>
                            </Card>
                        </Space>
                    )}

                </div>
            </Content>

            {/* FOOTER */}
            <footer style={{
                marginTop: 40, background: "linear-gradient(180deg,#f0fdf4 0%,#ffffff 90%)", borderTop: "1px solid #d1fae5",
                boxShadow: "0 -4px 14px rgba(0,0,0,.05)", padding: "40px 16px 20px"
            }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 20 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, background: "#10b981", display: "grid", placeItems: "center" }}>
                                <HomeFilled style={{ color: "#fff", fontSize: 20 }} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, color: "#065f46", fontSize: 18 }}>GreenStay</div>
                                <div style={{ color: "#047857", fontSize: 13 }}>Homestay cho kỳ nghỉ xanh</div>
                            </div>
                        </div>
                        <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
                            Nền tảng đặt homestay thân thiện môi trường, giúp bạn tận hưởng kỳ nghỉ yên bình
                            và góp phần bảo vệ thiên nhiên Việt Nam.
                        </Text>
                    </div>
                    <div>
                        <Title level={5} style={{ color: "#065f46" }}>Liên kết nhanh</Title>
                        <Space direction="vertical" size={6}>
                            <a onClick={() => setTab("explore")} style={{ color: "#047857" }}>Trang chủ</a>
                            <a onClick={() => setTab("favorites")} style={{ color: "#047857" }}>Yêu thích</a>
                            <a onClick={() => setTab("bookings")} style={{ color: "#047857" }}>Đặt phòng</a>
                            <a onClick={() => setTab("about")} style={{ color: "#047857" }}>Về chúng tôi</a>
                        </Space>
                    </div>
                    <div>
                        <Title level={5} style={{ color: "#065f46" }}>Liên hệ</Title>
                        <Space direction="vertical" size={6}>
                            <span><strong>📞</strong> 0123 456 789</span>
                            <span><strong>✉️</strong> <a href="mailto:support@greenstay.vn">support@greenstay.vn</a></span>
                            <span><strong>📍</strong> 222 Nguyễn Văn Cừ, Ninh Kiều, Cần Thơ</span>
                        </Space>
                    </div>
                </div>
                <div style={{ textAlign: "center", marginTop: 40, paddingTop: 16, borderTop: "1px solid #d1fae5", color: "#065f46", fontSize: 13 }}>
                    © {new Date().getFullYear()} <strong>GreenStay</strong>. All rights reserved.
                </div>
            </footer>

            {/* Drawer Sửa hồ sơ (Customer) */}
            <Drawer
                open={pOpen}
                onClose={() => setPOpen(false)}
                width={640}
                bodyStyle={{ padding: 0 }}
                title={null}
                extra={null}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "18px 24px",
                        background: "linear-gradient(135deg,#e0f7ff,#f0fff4)",
                        borderBottom: "1px solid #f0f0f0",
                    }}
                >
                    <Space align="center" size={14} style={{ width: "100%", justifyContent: "space-between" }}>
                        <Space align="center" size={12}>
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: "#16a34a",
                                    color: "#fff",
                                    display: "grid",
                                    placeItems: "center",
                                    fontWeight: 700,
                                    boxShadow: "0 10px 22px rgba(22,163,74,.25)",
                                }}
                            >
                                {(pickDisplayName(user) || "U").toString().charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <Title level={4} style={{ margin: 0 }}>Sửa thông tin cá nhân</Title>
                                <Text type="secondary">Cập nhật hồ sơ để trải nghiệm tốt hơn</Text>
                            </div>
                        </Space>

                        <Space>
                            <Tag color="green" style={{ borderRadius: 999 }}>Khách hàng</Tag>
                            <Button onClick={() => setPOpen(false)}>Huỷ</Button>
                            <Button type="primary" loading={pSaving} onClick={() => pForm.submit()}>
                                Lưu
                            </Button>
                        </Space>
                    </Space>
                </div>

                {/* Form nội dung */}
                <div style={{ padding: 20 }}>
                    <Form layout="vertical" form={pForm} onFinish={onProfileSave}>
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="U_Fullname"
                                    label="Họ tên"
                                    rules={[{ required: true, message: "Nhập họ tên" }]}
                                >
                                    <Input size="large" placeholder="Nguyễn Văn A" prefix={<UserOutlined className="text-gray-400" />} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="U_Email"
                                    label="Email"
                                    rules={[
                                        { required: true, message: "Nhập email" },
                                        { type: "email", message: "Email không hợp lệ" },
                                    ]}
                                >
                                    <Input size="large" placeholder="name@example.com" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item name="U_Phone" label="Số điện thoại">
                                    <Input size="large" placeholder="09xx xxx xxx" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="U_Address" label="Địa chỉ">
                                    <Input size="large" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item name="U_Gender" label="Giới tính">
                                    <Select
                                        size="large"
                                        options={[
                                            { value: "male", label: "Nam" },
                                            { value: "female", label: "Nữ" },
                                            { value: "other", label: "Khác" },
                                        ]}
                                        placeholder="Chọn giới tính"
                                        allowClear
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="U_Birthday" label="Ngày sinh">
                                    <DatePicker size="large" style={{ width: "100%" }} placeholder="YYYY-MM-DD" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </div>
            </Drawer>
            {/* Modal Khiếu nại / Góp ý */}
            <Modal
                open={complaintOpen}
                onCancel={() => setComplaintOpen(false)}
                onOk={handleSubmitComplaint}
                okText="Gửi"
                confirmLoading={complaintSubmitting}
                title={
                    <Space>
                        <InfoCircleOutlined />
                        {complaintContext?.title || "Khiếu nại / Góp ý"}
                    </Space>
                }
            >
                <Form layout="vertical" form={complaintForm}>
                    <Form.Item
                        name="subject"
                        label="Tiêu đề"
                        rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
                    >
                        <Input maxLength={200} showCount placeholder="Nhập tiêu đề..." />
                    </Form.Item>

                    <Form.Item
                        name="content"
                        label="Nội dung"
                        rules={[{ required: true, message: "Vui lòng mô tả chi tiết" }]}
                    >
                        <Input.TextArea rows={5} maxLength={1000} showCount />
                    </Form.Item>
                </Form>
            </Modal>
            <RasaChatbot userId={uid} endpoint={`${assetBase}/api/rasa/webhook`} />


        </Layout>
    );
}
