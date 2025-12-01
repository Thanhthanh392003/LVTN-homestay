// src/services/payment.service.js
const crypto = require("crypto");
const knex = require("../database/knex");

let mailer = null;
try { mailer = require("../lib/mailer"); } catch (_) { }

const VNP_TMN_CODE = process.env.VNP_TMN_CODE || process.env.VNP_TMNCODE;
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || process.env.VNP_HASHSECRET || process.env.VNP_SECRET;
const VNP_URL = process.env.VNP_URL;
const VNP_RETURN_URL = process.env.VNP_RETURN_URL; // ex: http://localhost:3000/api/payments/vnpay/return
const FRONTEND_BASE = process.env.FRONTEND_BASE || "http://localhost:5173";
const BRAND_NAME = process.env.BRAND_NAME || "GreenStay";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "cs@greenstay.vn";

function assertEnv() {
    const miss = [];
    if (!VNP_TMN_CODE) miss.push("VNP_TMN_CODE");
    if (!VNP_HASH_SECRET) miss.push("VNP_HASH_SECRET");
    if (!VNP_URL) miss.push("VNP_URL");
    if (!VNP_RETURN_URL) miss.push("VNP_RETURN_URL");
    if (miss.length) throw new Error("[VNPay] Missing env: " + miss.join(", "));
}

const enc = (v) => encodeURIComponent(String(v)).replace(/%20/g, "+");
const nowString = () => {
    const d = new Date(), pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
        pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
};

async function sendMailCompat({ to, subject, html, cc, bcc }) {
    if (!mailer) { console.warn("[MAIL] mailer not found, skip"); return; }
    if (typeof mailer.sendMail === "function") return mailer.sendMail({ to, subject, html, cc, bcc });
    if (typeof mailer.send === "function") return mailer.send(to, subject, html);
    console.warn("[MAIL] no sendMail/send, skip");
}
const fmtVND = (n) => Number(n || 0).toLocaleString("vi-VN") + " đ";

function buildVnpUrl({ amount, orderInfo, txnRef, ipAddr, locale = "vn", orderType = "other" }) {
    assertEnv();
    const params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: VNP_TMN_CODE,
        vnp_Amount: Math.round(amount) * 100,
        vnp_CurrCode: "VND",
        vnp_TxnRef: String(txnRef),
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: orderType,
        vnp_ReturnUrl: VNP_RETURN_URL,
        vnp_Locale: locale,
        vnp_IpAddr: ipAddr || "127.0.0.1",
        vnp_CreateDate: nowString(),
    };
    const sorted = Object.keys(params).sort().reduce((o, k) => (o[k] = params[k], o), {});
    const signData = Object.entries(sorted).map(([k, v]) => `${k}=${enc(v)}`).join("&");
    const vnp_SecureHash = crypto.createHmac("sha512", VNP_HASH_SECRET).update(signData).digest("hex");
    return `${VNP_URL}?${signData}&vnp_SecureHashType=HmacSHA512&vnp_SecureHash=${vnp_SecureHash}`;
}

function verifyVnpayQuery(query) {
    const q = { ...query };
    const secureHash = q.vnp_SecureHash || q.vnp_securehash;
    delete q.vnp_SecureHash; delete q.vnp_securehash; delete q.vnp_SecureHashType;
    const sorted = Object.keys(q).sort().reduce((o, k) => (o[k] = q[k], o), {});
    const signData = Object.entries(sorted).map(([k, v]) => `${k}=${enc(v)}`).join("&");
    const calc = crypto.createHmac("sha512", VNP_HASH_SECRET).update(signData).digest("hex");
    return { ok: calc === secureHash, provided: secureHash, calc, signData };
}

// ----- Promo Usage -----
async function logPromotionUsage(trx, { bookingId, userId, usedAmount, promoCode }) {
    if (!promoCode) return;
    const promo = await trx("PROMOTION").select("Promotion_ID").whereRaw("LOWER(P_Code)=LOWER(?)", [promoCode]).first();
    if (!promo) return;
    try {
        await trx("PROMOTION_USAGE").insert({
            Promotion_ID: promo.Promotion_ID,
            Booking_ID: bookingId,
            U_ID: userId,
            Used_amount: Number(usedAmount || 0),
        });
    } catch (e) {
        if (!String(e.message || "").includes("Duplicate")) console.warn("[PROMO] usage insert:", e.message);
    }
}

// ----- Email -----
function bookingEmailHtml({ brand = BRAND_NAME, customerName, bookingId, homestayName, checkin, checkout, guests, total, note, txnNo }) {
    return `
  <div style="font-family:system-ui,Segoe UI,Arial;max-width:720px;margin:24px auto;line-height:1.6">
    <h2 style="margin:0 0 12px">Xác nhận thanh toán thành công</h2>
    <p>Xin chào <b>${customerName || "Quý khách"}</b>,</p>
    <p>Đơn đặt phòng <b>#${bookingId}</b> của bạn tại <b>${homestayName || "-"}</b> đã được thanh toán qua VNPay.</p>
    <ul>
      <li><b>Thời gian:</b> ${checkin} → ${checkout}</li>
      <li><b>Số khách:</b> ${guests || 1}</li>
      <li><b>Tổng tiền:</b> ${fmtVND(total)}</li>
      ${txnNo ? `<li><b>Mã giao dịch:</b> ${txnNo}</li>` : ""}
      ${note ? `<li><b>Ghi chú:</b> ${note}</li>` : ""}
    </ul>
    <p>Bạn có thể xem/ quản lý đơn tại mục <b>Đặt phòng của tôi</b>.</p>
    <p style="margin-top:20px">Trân trọng,<br/>${brand}</p>
    <hr/><small>Nếu có vấn đề, vui lòng liên hệ ${SUPPORT_EMAIL}</small>
  </div>`;
}
function ownerEmailHtml({ brand = BRAND_NAME, ownerName, bookingId, homestayName, checkin, checkout, guests, total, customerName }) {
    return `
  <div style="font-family:system-ui,Segoe UI,Arial;max-width:720px;margin:24px auto;line-height:1.6">
    <h2 style="margin:0 0 12px">Có đơn đã thanh toán</h2>
    <p>Chào <b>${ownerName || "Chủ nhà"}</b>,</p>
    <p>Đơn <b>#${bookingId}</b> của homestay <b>${homestayName || "-"}</b> đã được khách <b>${customerName || "-"}</b> thanh toán qua VNPay.</p>
    <ul>
      <li><b>Thời gian:</b> ${checkin} → ${checkout}</li>
      <li><b>Số khách:</b> ${guests || 1}</li>
      <li><b>Tổng tiền:</b> ${fmtVND(total)}</li>
    </ul>
    <p>Vui lòng kiểm tra trang <b>Quản lý đặt phòng</b>.</p>
    <p style="margin-top:20px">Trân trọng,<br/>${brand}</p>
  </div>`;
}

// ----- API -----
async function createCheckout(req, body = {}) {
    assertEnv();
    const userId = req.user?.U_ID || req.user?.id || req.session?.user?.U_ID || body.U_ID || null;

    const H_ID = body.H_ID || body.homestayId || body.Homestay_ID;
    const ci = body.Checkin_date;
    const co = body.Checkout_date;
    const guests = Number(body.Guests || 1);
    const subtotal = Number(body.Subtotal || 0);
    const discount = Number(body.Discount_amount || 0);
    const total = Number(body.Total_price ?? body.Total_after_discount ?? subtotal - discount);
    const note = (body.Note || body.Booking_note || "").toString();
    const promoCode = (body.Promotion_code || "").toString();
    const ipAddr = req.headers["x-forwarded-for"] || req.ip || req.connection?.remoteAddress || "127.0.0.1";

    if (!H_ID || !ci || !co || !total) throw new Error("Thiếu dữ liệu đầu vào (H_ID/Checkin/Checkout/Total).");

    const { bookingId } = await knex.transaction(async (trx) => {
        const [id] = await trx("BOOKING").insert({
            U_ID: userId,
            Payment_method: "vnpay",
            Booking_status: "pending_payment",
            Total_price: total,
            Booking_note: note || null,
        });

        let unit = Number(body.Unit_price || 0);
        if (!unit) {
            const hs = await trx("HOMESTAY").select("Price_per_day").where("H_ID", H_ID).first();
            unit = Number(hs?.Price_per_day || 0);
        }
        await trx("BOOKING_DETAIL").insert({
            Booking_ID: id, H_ID, Checkin_date: ci, Checkout_date: co, Guests: guests, Unit_price: unit,
        });

        await trx("PAYMENT").insert({
            Booking_ID: id, Gateway: "vnpay", Amount: total, Currency: "VND", Status: "pending", Txn_ref: String(id),
            Extra: JSON.stringify({ Subtotal: subtotal, Discount: discount, Promotion_code: promoCode || null, H_ID, Checkin_date: ci, Checkout_date: co, Guests: guests, Note: note || null }),
        });
        return { bookingId: id };
    });

    const orderInfo = `Thanh toan dat phong #${bookingId}`;
    const payUrl = buildVnpUrl({ amount: total, orderInfo, txnRef: String(bookingId), ipAddr, locale: "vn", orderType: "other" });
    console.log("[VNPay] URL =>", payUrl);
    return { bookingId: String(bookingId), payUrl };
}

async function getStatus(bookingId) {
    if (!bookingId) throw new Error("Missing bookingId");
    const b = await knex("BOOKING").select("Booking_status").where("Booking_ID", bookingId).first();
    if (!b) return { bookingId, status: "not_found" };
    const st = String(b.Booking_status || "").toLowerCase();
    if (["paid", "completed"].includes(st)) return { bookingId, status: "paid" };
    const p = await knex("PAYMENT").select("Status").where({ Booking_ID: bookingId, Gateway: "vnpay" }).orderBy("Payment_ID", "desc").first();
    if (p && String(p.Status).toLowerCase() === "success") return { bookingId, status: "paid" };
    return { bookingId, status: st || "pending" };
}

async function afterVnpaySuccess(trx, { bookingId, txnNo, amountVnd }) {
    await trx("PAYMENT").where({ Booking_ID: bookingId, Gateway: "vnpay" })
        .update({ Status: "success", Txn_id: txnNo || null, Amount: amountVnd || undefined, Updated_at: trx.fn.now() });
    await trx("BOOKING").where("Booking_ID", bookingId)
        .update({ Booking_status: "paid", Payment_method: "vnpay", Updated_at: trx.fn.now() });

    const pay = await trx("PAYMENT").select("Extra").where({ Booking_ID: bookingId, Gateway: "vnpay" }).orderBy("Payment_ID", "desc").first();
    let extra = {}; try { extra = pay?.Extra ? JSON.parse(pay.Extra) : {}; } catch (_) { }

    const booking = await trx("BOOKING").select("U_ID", "Total_price", "Booking_note").where("Booking_ID", bookingId).first();
    const bd = await trx("BOOKING_DETAIL").select("H_ID", "Checkin_date", "Checkout_date", "Guests").where("Booking_ID", bookingId).first();
    const homestay = bd ? await trx("HOMESTAY").select("H_Name", "U_ID").where("H_ID", bd.H_ID).first() : null;
    const customer = booking ? await trx("USER").select("U_Email", "U_Fullname").where("U_ID", booking.U_ID).first() : null;
    const owner = homestay ? await trx("USER").select("U_Email", "U_Fullname").where("U_ID", homestay.U_ID).first() : null;

    await logPromotionUsage(trx, { bookingId, userId: booking?.U_ID, usedAmount: extra?.Discount || 0, promoCode: extra?.Promotion_code || null });

    const checkin = bd?.Checkin_date ? new Date(bd.Checkin_date).toISOString().slice(0, 10) : "-";
    const checkout = bd?.Checkout_date ? new Date(bd.Checkout_date).toISOString().slice(0, 10) : "-";

    const htmlCus = bookingEmailHtml({
        customerName: customer?.U_Fullname, bookingId, homestayName: homestay?.H_Name,
        checkin, checkout, guests: bd?.Guests || 1, total: booking?.Total_price, note: booking?.Booking_note, txnNo,
    });
    const htmlOwner = ownerEmailHtml({
        ownerName: owner?.U_Fullname, bookingId, homestayName: homestay?.H_Name,
        checkin, checkout, guests: bd?.Guests || 1, total: booking?.Total_price, customerName: customer?.U_Fullname,
    });

    try {
        console.log("[MAIL] prepare customer:", customer?.U_Email, "owner:", owner?.U_Email, "booking:", bookingId);
        if (customer?.U_Email) await sendMailCompat({ to: customer.U_Email, subject: `[${BRAND_NAME}] Xác nhận thanh toán #${bookingId}`, html: htmlCus });
        if (owner?.U_Email) await sendMailCompat({ to: owner.U_Email, subject: `[${BRAND_NAME}] Đơn đã thanh toán #${bookingId}`, html: htmlOwner });
    } catch (e) {
        console.warn("[MAIL] send error:", e?.message || e);
    }
}

async function handleVnpayReturn(query) {
    assertEnv();
    const { ok, provided, calc } = verifyVnpayQuery(query);
    const bookingId = Number(query.vnp_TxnRef);
    const txnNo = query.vnp_TransactionNo || null;
    const bank = query.vnp_BankCode || null;
    const amountVnd = Number(query.vnp_Amount || 0) / 100;
    const isSuccess = ok && String(query.vnp_ResponseCode) === "00" && bookingId;

    if (bookingId) {
        try {
            await knex.transaction(async (trx) => {
                if (isSuccess) await afterVnpaySuccess(trx, { bookingId, txnNo, amountVnd });
                else await trx("PAYMENT").where({ Booking_ID: bookingId, Gateway: "vnpay" }).update({ Status: "failed", Updated_at: trx.fn.now() });
            });
        } catch (e) { console.error("[VNPay] return DB update error:", e); }
    }

    const homeHref = `${FRONTEND_BASE.replace(/\/$/, "")}/vnpay-return`;

    const html =
        `<!doctype html><meta charset="utf-8"><title>VNPay result</title>
   <div style="font-family:system-ui,Segoe UI,Arial;max-width:760px;margin:40px auto">
     <h2>${isSuccess ? "✅ Thanh toán thành công" : "❌ Thanh toán thất bại"}</h2>
     <p><b>Mã giao dịch:</b> ${txnNo || ""}</p>
     <p><b>Mã đơn hàng:</b> ${bookingId || ""}</p>
     <p><b>Ngân hàng:</b> ${bank || ""}</p>
     <p><b>ResponseCode:</b> ${query.vnp_ResponseCode || ""}</p>
     <hr/>
     <details style="margin-bottom:14px"><summary>Chi tiết ký</summary>
       <div>Provided: ${provided || ""}</div>
       <div>Calculated: ${calc || ""}</div>
     </details>
     <a href="${homeHref}" 
   style="display:inline-block;padding:10px 14px;border-radius:10px;background:#16a34a;color:#fff;text-decoration:none">
    ↩ Quay lại trang chủ
</a>
   </div>`;
    return html;
}

async function handleVnpayIpn(query) {
    assertEnv();
    const { ok } = verifyVnpayQuery(query);
    if (!ok) return { RspCode: "97", Message: "Invalid signature" };

    const bookingId = Number(query.vnp_TxnRef);
    const amountVnd = Number(query.vnp_Amount || 0) / 100;
    const rspCode = String(query.vnp_ResponseCode || "");
    const txnNo = query.vnp_TransactionNo || null;

    if (!bookingId) return { RspCode: "01", Message: "Missing booking id" };

    try {
        await knex.transaction(async (trx) => {
            if (rspCode === "00") await afterVnpaySuccess(trx, { bookingId, txnNo, amountVnd });
            else await trx("PAYMENT").where({ Booking_ID: bookingId, Gateway: "vnpay" }).update({ Status: "failed", Updated_at: trx.fn.now() });
        });
        return { RspCode: "00", Message: "Success" };
    } catch (e) {
        console.error("[VNPay] IPN DB error:", e);
        return { RspCode: "99", Message: "DB error" };
    }
}

module.exports = {
    createCheckout,
    getStatus,
    handleVnpayReturn,
    handleVnpayIpn,
};
