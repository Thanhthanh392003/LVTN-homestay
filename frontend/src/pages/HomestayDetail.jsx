// --- src/pages/HomestayDetail.jsx ---
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Layout, Row, Col, Card, Typography, Space, Tag, Button, message,
    Image, Skeleton, Descriptions, Divider, Tooltip, Badge, Affix, Breadcrumb,
    Rate, List, Avatar
} from "antd";
import {
    ArrowLeftOutlined, EnvironmentOutlined,
    ShareAltOutlined, HeartOutlined, HeartFilled, DollarOutlined,
    HomeOutlined, StarFilled, CoffeeOutlined, WifiOutlined, FireOutlined,
    SmileOutlined, UserOutlined, PercentageOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

import { homestaysApi } from "../services/homestays";
import { amenityApi } from "../services/amenities";
import { ruleApi } from "../services/rules";
import { favoritesApi } from "../services/favorites";
import { promotionsApi } from "../services/promotions";
import { reviewsApi } from "../services/reviews";
import HomestayBookingPanel from "../components/HomestayBookingPanel";
import { useAuth } from "../context/AuthContext";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/* ───────────────── SmartImg (không đổi API, chỉ UI) ───────────────── */
function normBase(x = "") { return String(x).replace(/\/+$/, ""); }
function stripApiBase(x = "") { return String(x).replace(/\/api\/?$/i, ""); }
function ensureSlash(s = "") { return s.startsWith("/") ? s : `/${s}`; }
function stripLeadingApi(path = "") { return String(path).replace(/^\/+api(\/|$)/i, "/"); }

function makeCandidates(srcLike) {
    const raw0 = String(srcLike || "");
    const raw = stripLeadingApi(raw0);
    const assetBase = normBase(stripApiBase(import.meta.env.VITE_ASSET_BASE || import.meta.env.VITE_API_BASE || ""));
    const apiBase = normBase(stripApiBase(import.meta.env.VITE_API_BASE || ""));
    const guessBE = `${window.location.origin}`.replace(":5173", ":3000");

    if (/^(https?:|blob:|data:)/i.test(raw)) return [raw];

    const p0 = raw.startsWith("/") ? raw : ensureSlash(raw);
    const isFilenameOnly = !p0.includes("/") || /^\/?[^/]+\.(png|jpe?g|gif|webp|svg)$/i.test(p0);
    const set = new Set();

    if (!isFilenameOnly) {
        const p = stripLeadingApi(p0);
        const withPublic = p.startsWith("/public/") ? p : `/public${p}`;
        const noPublic = p.replace(/^\/public/i, "");
        [p, withPublic, noPublic].forEach((pp) => {
            [assetBase, apiBase, guessBE, ""].forEach((b) => set.add(`${b}${pp}`));
        });
    } else {
        const file = p0.replace(/^\//, "");
        [`/uploads/${file}`, `/public/uploads/${file}`, `/images/${file}`, `/public/images/${file}`].forEach((pp) => {
            [assetBase, apiBase, guessBE, ""].forEach((b) => set.add(`${b}${pp}`));
        });
    }
    return Array.from(set);
}

function SmartImg({ src, alt, style, className, preview = true }) {
    const cands = useMemo(() => makeCandidates(src), [src]);
    const [idx, setIdx] = useState(0);
    const current = idx >= 0 ? (cands[idx] || "") : "";
    if (!current) return null;

    return (
        <Image
            src={current}
            alt={alt || ""}
            preview={preview}
            onError={() => setIdx((i) => (i + 1 < cands.length ? i + 1 : -1))}
            style={style}
            className={className}
        />
    );
}
/* ───────────────────────────────────────────────────────────── */

/* ─────────── Reviews helpers: unwrap + normalize ─────────── */
const normalizeReview = (r) => {
    const displayName =
        r.U_Fullname ?? r.user_fullname ?? r.username ?? r.author ??
        r.user?.fullname ?? r.user?.name ?? (r.U_ID ? `User #${r.U_ID}` : "Khách");

    const content = r.Content ?? r.content ?? r.review ?? r.text ?? r.Message ?? r.message ?? "";

    return {
        ...r,
        displayName,
        content,
        Rating: Number(r.Rating ?? r.rating ?? r.stars ?? 0),
        Created_at: r.Created_at ?? r.created_at ?? r.createdAt ?? r.created ?? null,
        replies: Array.isArray(r.replies)
            ? r.replies
            : (typeof r.replies === "string"
                ? (() => { try { return JSON.parse(r.replies); } catch { return []; } })()
                : []),
    };
};

const unwrapReviews = (resp) => {
    let v = resp;
    for (let i = 0; i < 6; i++) {
        if (v && typeof v === "object" && "data" in v) v = v.data; else break;
    }
    const arr =
        (Array.isArray(v) && v) ||
        (Array.isArray(v?.items) && v.items) ||
        (Array.isArray(v?.rows) && v.rows) ||
        (Array.isArray(v?.result) && v.result) ||
        (Array.isArray(v?.list) && v.list) ||
        (Array.isArray(v?.data) && v.data) ||
        [];
    return arr.map(normalizeReview);
};
/* ──────────────────────────────────────────────────────────── */

/* ─────────── Việt hoá trạng thái homestay ─────────── */
const viStatus = (s) => {
    const k = String(s || "").toLowerCase();
    switch (k) {
        case "active": return { text: "Đang hoạt động", color: "success" };
        case "pending": return { text: "Chờ duyệt", color: "warning" };
        case "paused": return { text: "Tạm dừng", color: "default" };
        case "blocked": return { text: "Bị chặn", color: "error" };
        default: return { text: s || "Không rõ", color: "default" };
    }
};

export default function HomestayDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const uid = user?.user_id || user?.U_ID || "guest";

    const [loading, setLoading] = useState(true);
    const [h, setH] = useState(null);
    const [images, setImages] = useState([]);
    const [fav, setFav] = useState(false);
    const [amenities, setAmenities] = useState([]);
    const [rules, setRules] = useState([]);
    const [blocked, setBlocked] = useState([]);
    const [promotions, setPromotions] = useState([]);

    // Reviews
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 5;

    /* ───────── Load homestay base info ───────── */
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const [detail, imgs] = await Promise.all([
                    homestaysApi.getById(id),
                    homestaysApi.getImagesPublic(id),
                ]);
                setH(detail);

                const list = [];
                if (detail?.Cover) list.push({ url: detail.Cover, main: true });
                (Array.isArray(imgs) ? imgs : []).forEach((it) => {
                    const u = it?.Image_url || it?.url || "";
                    if (!u) return;
                    if (!detail?.Cover || String(u) !== String(detail.Cover))
                        list.push({ url: u, main: !!it?.IsMain });
                });
                setImages(list.filter((x) => x?.url));

                const [am, rl] = await Promise.all([
                    amenityApi.getForHomestay(id).catch(() => []),
                    ruleApi.getForHomestay(id).catch(() => []),
                ]);
                setAmenities(am || []);
                setRules(rl || []);

                const blocks = await homestaysApi.getBlockedDates(id).catch(() => []);
                setBlocked(blocks || []);

                try {
                    const mine = await favoritesApi.mine(uid);
                    setFav(Array.isArray(mine) && mine.includes(Number(id)));
                } catch { }
                try {
                    const res = await promotionsApi.forHomestay(id);
                    const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : (res?.promotions || []);
                    setPromotions(arr);
                    setH((prev) => (prev ? { ...prev, promotions: arr } : prev));
                } catch { }
            } catch (e) {
                console.error(e);
                message.error("Không tải được chi tiết homestay");
            } finally {
                setLoading(false);
            }
        })();
    }, [id, uid]);

    /* ───────── Load reviews ───────── */
    useEffect(() => {
        const hid = Number(id);
        if (!hid) return;

        setReviews([]);
        setPage(1);
        setHasMore(true);

        (async () => {
            try {
                setReviewsLoading(true);

                let resp = await reviewsApi
                    .listByHomestay(hid, { verified: 1, page: 1, size: PAGE_SIZE })
                    .catch(() => null);

                if (!resp || !unwrapReviews(resp).length) {
                    try {
                        const r2 = await fetch(`/api/reviews/homestays/${hid}`, { credentials: "include" });
                        const j2 = await r2.json();
                        resp = j2;
                    } catch { }
                }

                const arr = unwrapReviews(resp);
                setReviews(arr);
                if (arr.length < PAGE_SIZE) setHasMore(false);
            } catch {
                setHasMore(false);
            } finally {
                setReviewsLoading(false);
            }
        })();
    }, [id]);

    const loadMoreReviews = async () => {
        if (!hasMore || reviewsLoading) return;
        const hid = Number(id);
        try {
            setReviewsLoading(true);
            const next = page + 1;

            let resp = await reviewsApi
                .listByHomestay(hid, { verified: 1, page: next, size: PAGE_SIZE })
                .catch(() => null);

            if (!resp || !unwrapReviews(resp).length) {
                try {
                    const r2 = await fetch(`/api/reviews/homestays/${hid}?page=${next}&size=${PAGE_SIZE}`, { credentials: "include" });
                    const j2 = await r2.json();
                    resp = j2;
                } catch { }
            }

            const arr = unwrapReviews(resp);
            setReviews((old) => [...old, ...arr]);
            setPage(next);
            if (arr.length < PAGE_SIZE) setHasMore(false);
        } catch {
            setHasMore(false);
        } finally {
            setReviewsLoading(false);
        }
    };

    /* ───────── Actions ───────── */
    const share = async () => {
        const url = window.location.href;

        // 1) Web Share API (mobile / trình duyệt hỗ trợ)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: h?.H_Name || "Chia sẻ homestay",
                    text: "Xem homestay này trên GreenStay:",
                    url,
                });
                return;
            } catch (err) {
                // user cancel hoặc lỗi khác → fallback tiếp
                console.warn("Web Share failed:", err);
            }
        }

        // 2) Clipboard API hiện đại
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(url);
                message.success("Đã sao chép liên kết!");
                return;
            } catch (err) {
                console.warn("Clipboard API failed:", err);
            }
        }

        // 3) Fallback cho môi trường HTTP / cũ: dùng textarea + execCommand
        try {
            const textarea = document.createElement("textarea");
            textarea.value = url;
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(textarea);

            if (ok) {
                message.success("Đã sao chép liên kết!");
            } else {
                message.warning("Không sao chép được, hãy copy URL trên trình duyệt.");
            }
        } catch (err) {
            console.warn("Fallback copy failed:", err);
            message.warning("Không sao chép được, hãy copy URL trên trình duyệt.");
        }
    };

    const toggleFav = async () => {
        const next = !fav;
        setFav(next);
        try {
            if (next) await favoritesApi.add(uid, Number(id));
            else await favoritesApi.removeByHomestay(uid, Number(id));
        } finally {
            window.dispatchEvent(new CustomEvent("favorite:changed", {
                detail: { H_ID: Number(id), action: next ? "add" : "remove" }
            }));
        }
    };

    const priceVND = (n) => Number(n || 0).toLocaleString("vi-VN");
    const apiAvg = Number(h?.Rating_avg || 0);
    const apiCount = Number(h?.Rating_count || 0);
    const localAvg = reviews?.length ? (reviews.reduce((s, r) => s + Number(r?.Rating || 0), 0) / reviews.length) : 0;
    const ratingAvg = apiAvg || localAvg;
    const ratingCount = apiCount || (reviews?.length || 0);

    const container = { maxWidth: 1240, margin: "0 auto" };
    const radius = 18;

    const amenIcon = (name = "") => {
        const n = String(name).toLowerCase();
        if (n.includes("wifi")) return <WifiOutlined />;
        if (n.includes("bữa") || n.includes("breakfast") || n.includes("coffee")) return <CoffeeOutlined />;
        if (n.includes("lò") || n.includes("bbq")) return <FireOutlined />;
        if (n.includes("thân thiện") || n.includes("friendly")) return <SmileOutlined />;
        return <HomeOutlined />;
    };

    const s = viStatus(h?.Status);

    return (
        <Layout style={{ minHeight: "100vh", background: "#f6faf7" }}>
            <Header
                style={{
                    position: "sticky", top: 0, zIndex: 10,
                    background: "rgba(255,255,255,.85)", backdropFilter: "blur(8px)",
                    borderBottom: "1px solid #e5e7eb",
                }}
            >
                <div style={{ ...container, display: "flex", alignItems: "center", gap: 12 }}>
                    <Button className="btn-soft" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Quay lại</Button>
                    <Breadcrumb
                        items={[
                            { title: <a onClick={() => navigate("/")}>Trang chủ</a> },
                            { title: <a onClick={() => navigate("/search")}>Tìm kiếm</a> },
                            { title: "Chi tiết homestay" },
                        ]}
                    />
                </div>
            </Header>

            <Content style={{ padding: 16 }}>
                <div style={container}>
                    {loading || !h ? (
                        <Card style={{ borderRadius: radius }}>
                            <Skeleton active avatar paragraph={{ rows: 8 }} />
                        </Card>
                    ) : (
                        <>
                            {/* HERO */}
                            <Card
                                className="card-hero"
                                style={{
                                    borderRadius: radius, marginBottom: 16,
                                    background: "linear-gradient(135deg, rgba(255,255,255,.96), #f8fffb)",
                                    boxShadow: "0 24px 48px rgba(15,23,42,.08)"
                                }}
                                bodyStyle={{ padding: 18 }}
                            >
                                <Row justify="space-between" align="middle" gutter={[16, 12]}>
                                    <Col flex="auto">
                                        <Space direction="vertical" size={4}>
                                            <Space align="center" wrap>
                                                <Title level={3} style={{ margin: 0 }}>{h.H_Name}</Title>
                                                <Tag color={s.color} style={{ borderRadius: 999, height: 26, lineHeight: "24px" }}>
                                                    {s.text}
                                                </Tag>
                                            </Space>
                                            <Space wrap size={8}>
                                                <Text type="secondary">
                                                    <EnvironmentOutlined /> {h.H_City} • {h.H_Address}
                                                </Text>
                                                <Tag color="blue" style={{ borderRadius: 999 }}>
                                                    <DollarOutlined /> {priceVND(h.Price_per_day)} ₫/đêm
                                                </Tag>
                                                <Space size={4}>
                                                    <Rate allowHalf disabled value={ratingAvg} style={{ fontSize: 16 }} />
                                                    <Text type="secondary">
                                                        ({ratingAvg.toFixed ? ratingAvg.toFixed(1) : ratingAvg}/{ratingCount})
                                                    </Text>
                                                </Space>
                                            </Space>
                                        </Space>
                                    </Col>
                                    <Col>
                                        <Space>
                                            <Tooltip title="Chia sẻ liên kết">
                                                <Button className="btn-soft" onClick={share} icon={<ShareAltOutlined />} />
                                            </Tooltip>
                                            <Button type={fav ? "primary" : "default"} onClick={toggleFav} icon={fav ? <HeartFilled /> : <HeartOutlined />}>
                                                {fav ? "Đã thích" : "Yêu thích"}
                                            </Button>
                                        </Space>
                                    </Col>
                                </Row>
                            </Card>

                            {/* GALLERY */}
                            <Card style={{ borderRadius: radius, overflow: "hidden", marginBottom: 18, boxShadow: "0 18px 38px rgba(15,23,42,.08)" }} bodyStyle={{ padding: 12 }}>
                                <Image.PreviewGroup>
                                    <Row gutter={[10, 10]}>
                                        <Col xs={24} md={14}>
                                            <div className="img-main-wrap">
                                                {(images[0]?.url || h.Cover) && (
                                                    <SmartImg
                                                        src={images[0]?.url || h.Cover}
                                                        alt="main"
                                                        style={{ height: 430, objectFit: "cover", width: "100%", borderRadius: 14 }}
                                                        className="img-main"
                                                    />
                                                )}
                                                <Badge.Ribbon text="Nổi bật" color="cyan" style={{ borderRadius: 8 }} />
                                            </div>
                                        </Col>

                                        <Col xs={24} md={10}>
                                            <Row gutter={[10, 10]}>
                                                {images.slice(1).map((img, idx) =>
                                                    img?.url ? (
                                                        <Col span={12} key={`${img.url}-${idx}`}>
                                                            <div className="img-tile-wrap">
                                                                <SmartImg
                                                                    src={img.url}
                                                                    alt={`img${idx + 1}`}
                                                                    style={{ height: 200, objectFit: "cover", width: "100%", borderRadius: 12 }}
                                                                    className="img-tile"
                                                                />
                                                            </div>
                                                        </Col>
                                                    ) : null
                                                )}
                                            </Row>
                                        </Col>
                                    </Row>
                                </Image.PreviewGroup>
                            </Card>

                            <Row gutter={[16, 16]}>
                                {/* Thông tin + Reviews */}
                                <Col xs={24} lg={16}>
                                    <Card style={{ borderRadius: 18, boxShadow: "0 16px 36px rgba(15,23,42,.06)", background: "linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)" }} bodyStyle={{ padding: 18 }}>
                                        <Space direction="vertical" size={16} style={{ width: "100%" }}>
                                            <Space wrap>
                                                <span className="pill pill-blue"><DollarOutlined />{priceVND(h.Price_per_day)} ₫ / đêm</span>
                                                {h.H_City ? <span className="pill pill-city"><span role="img" aria-label="city">🏙️</span> {h.H_City}</span> : null}
                                                <span className="pill pill-violet"><StarFilled /> Yêu thích của khách</span>
                                            </Space>

                                            <Descriptions
                                                title={<Space><HomeOutlined /> Thông tin</Space>}
                                                bordered size="middle" column={1}
                                                items={[
                                                    { key: "addr", label: "Địa chỉ", children: `${h.H_Address}, ${h.H_City}` },
                                                    { key: "price", label: "Giá/đêm", children: <Text strong>{priceVND(h.Price_per_day)} ₫</Text> },
                                                    { key: "max", label: "Số khách tối đa", children: <Tag color="green"><UserOutlined /> {h.Max_guests || 2} khách</Tag> },
                                                ]}
                                            />

                                            {Array.isArray(h?.promotions) && h.promotions.length > 0 && (
                                                <>
                                                    <Divider style={{ margin: "12px 0" }} />
                                                    <Title level={5} style={{ margin: 0 }}>Ưu đãi & Mã khuyến mãi</Title>
                                                    <Space wrap style={{ marginTop: 6 }}>
                                                        {h.promotions.map((p) => (
                                                            <Tag
                                                                key={p.Promotion_ID}
                                                                color={p.P_Type === "percent" ? "geekblue" : "gold"}
                                                                style={{ borderRadius: 999, paddingInline: 12, fontSize: 14 }}
                                                            >
                                                                {p.P_Type === "percent" ? <PercentageOutlined /> : <DollarOutlined />}{" "}
                                                                <b>{p.P_Code}</b> — {p.P_Name} (
                                                                {p.P_Type === "percent" ? `${p.Discount}%` : `${Number(p.Discount).toLocaleString("vi-VN")} ₫`}
                                                                )
                                                            </Tag>
                                                        ))}
                                                    </Space>
                                                </>
                                            )}

                                            <Divider style={{ margin: "12px 0" }} />
                                            <Title level={5} style={{ margin: 0 }}>Tiện nghi</Title>
                                            {amenities?.length ? (
                                                <Space wrap>
                                                    {amenities.map((a) => (
                                                        <Tag key={a.Code || a.Name} icon={amenIcon(a.Name)} color="success" style={{ borderRadius: 999, paddingInline: 10 }}>
                                                            {a.Name}
                                                        </Tag>
                                                    ))}
                                                </Space>
                                            ) : <Text type="secondary">Chủ nhà chưa cập nhật.</Text>}

                                            <Divider style={{ margin: "12px 0" }} />
                                            <Title level={5} style={{ margin: 0 }}>Nội quy</Title>
                                            {rules?.length ? (
                                                <ul className="rules">
                                                    {rules.map((r, i) => (
                                                        <li key={r.RuleItem_ID || r.name || i}><span className="dot" /><span>{r.name}</span></li>
                                                    ))}
                                                </ul>
                                            ) : <Text type="secondary">Chủ nhà chưa cập nhật.</Text>}

                                            <Divider style={{ margin: "12px 0" }} />
                                            <Title level={5} style={{ margin: 0 }}>Đánh giá & nhận xét</Title>
                                            <Space align="center" size={8} style={{ margin: "6px 0 10px" }}>
                                                <Rate allowHalf disabled value={ratingAvg} />
                                                <Tag color="processing" style={{ borderRadius: 999 }}>
                                                    {ratingAvg ? ratingAvg.toFixed(1) : "0.0"}/5 • {ratingCount} đánh giá
                                                </Tag>
                                            </Space>

                                            <Card size="small" bodyStyle={{ padding: 12 }} style={{ borderRadius: 12 }}>
                                                {reviewsLoading && !reviews.length ? (
                                                    <Skeleton active paragraph={{ rows: 4 }} />
                                                ) : reviews.length ? (
                                                    <>
                                                        <List
                                                            itemLayout="vertical"
                                                            dataSource={reviews}
                                                            renderItem={(r) => (
                                                                <List.Item key={r.Review_ID ?? r.id}>
                                                                    <List.Item.Meta
                                                                        avatar={<Avatar>{String(r.displayName || "U")[0]}</Avatar>}
                                                                        title={
                                                                            <Space size={8}>
                                                                                <span>{r.displayName}</span>
                                                                                <Rate disabled value={Number(r.Rating)} style={{ fontSize: 14 }} />
                                                                                <Text type="secondary">
                                                                                    {r.Created_at ? dayjs(r.Created_at).format("DD/MM/YYYY") : ""}
                                                                                </Text>
                                                                            </Space>
                                                                        }
                                                                    />
                                                                    <div>{r.content ? r.content : <Text type="secondary">Không có nội dung.</Text>}</div>

                                                                    <div style={{ marginTop: 8, paddingLeft: 48 }}>
                                                                        {(Array.isArray(r.replies) ? r.replies : []).map((rep) => (
                                                                            <Card key={rep.Reply_ID ?? rep.id} size="small" style={{ marginBottom: 8, background: "#f6ffed", borderColor: "#b7eb8f" }}>
                                                                                <Space>
                                                                                    <Tag color="green">Phản hồi của chủ nhà</Tag>
                                                                                    <span>{rep.Content ?? rep.content ?? ""}</span>
                                                                                    <Text type="secondary">
                                                                                        {rep.Created_at ? dayjs(rep.Created_at).format("DD/MM/YYYY HH:mm") : ""}
                                                                                    </Text>
                                                                                </Space>
                                                                            </Card>
                                                                        ))}
                                                                    </div>
                                                                </List.Item>
                                                            )}
                                                        />
                                                        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                                                            {hasMore ? (
                                                                <Button onClick={loadMoreReviews} loading={reviewsLoading}>Xem thêm đánh giá</Button>
                                                            ) : (
                                                                <Text type="secondary">Đã hiển thị tất cả đánh giá.</Text>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <Text type="secondary">Chưa có đánh giá nào.</Text>
                                                )}
                                            </Card>
                                        </Space>
                                    </Card>
                                </Col>

                                <Col xs={24} lg={8}>
                                    <Affix offsetTop={90}>
                                        <div className="sticky-panel">
                                            <HomestayBookingPanel homestay={h} blocked={blocked} />
                                        </div>
                                    </Affix>
                                </Col>
                            </Row>
                        </>
                    )}
                </div>
            </Content>

            <style>{`
        .btn-soft { background:#fff; border-color:#e5e7eb; box-shadow:0 6px 16px rgba(15,23,42,.06); }
        .btn-soft:hover { border-color:#91caff; box-shadow:0 10px 24px rgba(59,130,246,.12); }
        .img-main-wrap, .img-tile-wrap { position:relative; overflow:hidden; border-radius:14px; }
        .img-main, .img-tile { transition: transform .35s ease, filter .35s ease; will-change: transform; }
        .img-main-wrap:hover .img-main, .img-tile-wrap:hover .img-tile { transform:scale(1.03); filter:saturate(1.05); }
        .rules { list-style:none; padding-left:0; margin:0; }
        .rules li { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px;
          background:linear-gradient(180deg,#fff 0%,#f9fbff 100%); box-shadow:0 6px 16px rgba(15,23,42,.04); margin-bottom:8px; }
        .rules li .dot { width:8px; height:8px; border-radius:999px; background:#10b981; box-shadow:0 0 0 6px rgba(16,185,129,.12); }
        .sticky-panel { border-radius:16px; box-shadow:0 22px 48px rgba(15,23,42,.10); background:linear-gradient(180deg,#fff 0%, #f5fbff 100%); }
        .pill { display:inline-flex; align-items:center; gap:8px; height:34px; padding:0 14px; border-radius:999px; }
        .pill-blue { border:1px solid rgba(37,99,235,.35); background:rgba(37,99,235,.06); color:#1d4ed8; }
        .pill-city { border:1px solid rgba(14,116,144,.35); background:rgba(14,116,144,.06); color:#0e7490; }
        .pill-violet { border:1px solid rgba(124,58,237,.35); background:rgba(124,58,237,.06); color:#6d28d9; }
      `}</style>
        </Layout>
    );
}
