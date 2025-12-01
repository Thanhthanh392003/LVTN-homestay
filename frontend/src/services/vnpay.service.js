// services/vnpay.service.js (ví dụ)
const qs = require("qs");
const crypto = require("crypto");
const dayjs = require("dayjs");

function sortObject(obj) {
    const sorted = {};
    Object.keys(obj).sort().forEach(k => (sorted[k] = obj[k]));
    return sorted;
}

function buildVNPayUrl({ amount, orderInfo, txnRef, ipAddr }) {
    const vnp_TmnCode = process.env.VNP_TMNCODE;
    const vnp_HashSecret = process.env.VNP_HASHSECRET;
    const vnp_ReturnUrl = process.env.VNP_RETURNURL;   // Backend return
    const vnp_Url = process.env.VNP_URL;         // .../paymentv2/vpcpay.html

    const params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: vnp_TmnCode,
        vnp_Locale: "vn",
        vnp_CurrCode: "VND",
        vnp_TxnRef: txnRef,                     // mã giao dịch duy nhất
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: "other",
        vnp_Amount: Math.round(amount) * 100,  // VND x 100
        vnp_ReturnUrl: vnp_ReturnUrl,
        vnp_IpAddr: ipAddr || "127.0.0.1",
        vnp_CreateDate: dayjs().format("YYYYMMDDHHmmss"),
        // ❌ KHÔNG truyền vnp_BankCode => VNPay sẽ hiện trang chọn ngân hàng
    };

    const sorted = sortObject(params);
    const signData = qs.stringify(sorted, { encode: false });
    const secure = crypto.createHmac("sha512", vnp_HashSecret).update(signData).digest("hex");
    return `${vnp_Url}?${signData}&vnp_SecureHash=${secure}`;
}

module.exports = { buildVNPayUrl };
