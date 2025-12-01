// src/middlewares/requireLogin.js
const db = require("../database/knex");

// Chuẩn hoá role về chuỗi "admin" | "owner" | "customer"
function normRole(r) {
    if (r === undefined || r === null) return "";
    const s = String(r).trim().toLowerCase();
    if (s === "0") return "admin";
    if (s === "2") return "owner";
    if (s === "1") return "customer";
    return s;
}

// Yêu cầu đăng nhập cơ bản
async function requireLogin(req, res, next) {
    const sessUser = req.session?.user;
    if (!sessUser) {
        return res.status(401).json({ message: "Bạn chưa đăng nhập" });
    }

    try {
        // 🔎 Lấy user mới nhất từ DB để xem có bị khoá / xoá chưa
        const dbUser = await db("USER")
            .where("U_ID", sessUser.U_ID)
            .first();

        if (!dbUser) {
            if (req.session) req.session.destroy(() => { });
            return res
                .status(401)
                .json({ message: "Phiên đăng nhập không hợp lệ" });
        }

        // 🔒 Nếu đã bị admin khoá → chặn luôn
        const status = String(dbUser.U_Status || "").toLowerCase();
        if (status === "suspended") {
            if (req.session) req.session.destroy(() => { });
            return res.status(403).json({
                message:
                    "Tài khoản của bạn đã bị khóa bởi quản trị viên.",
            });
        }

        const role = normRole(
            sessUser.role ??
            sessUser.ROLE ??
            dbUser.ROLE_ID ??
            dbUser.ROLE
        );

        const merged = { ...sessUser, ...dbUser, role };
        req.user = merged;
        req.session.user = merged;

        next();
    } catch (e) {
        console.error("[requireLogin] error", e);
        return res
            .status(500)
            .json({ message: "Lỗi xác thực, vui lòng thử lại sau" });
    }
}

// Kiểm tra role; nếu không khớp, cho phép nếu là CHỦ homestay (HOMESTAY.U_ID = user.U_ID)
requireLogin.role = (...roles) => {
    const allow = (role) => roles.map(normRole).includes(normRole(role));

    return async (req, res, next) => {
        let u = req.session?.user;
        if (!u) {
            return res.status(401).json({ message: "Bạn chưa đăng nhập" });
        }

        try {
            // 🔎 Lấy user mới nhất từ DB
            const dbUser = await db("USER")
                .where("U_ID", u.U_ID)
                .first();

            if (!dbUser) {
                if (req.session) req.session.destroy(() => { });
                return res
                    .status(401)
                    .json({ message: "Phiên đăng nhập không hợp lệ" });
            }

            // 🔒 Nếu bị khoá → chặn luôn
            const status = String(dbUser.U_Status || "").toLowerCase();
            if (status === "suspended") {
                if (req.session) req.session.destroy(() => { });
                return res.status(403).json({
                    message:
                        "Tài khoản của bạn đã bị khóa bởi quản trị viên.",
                });
            }

            u = {
                ...u,
                ...dbUser,
                role: normRole(
                    u.role ?? u.ROLE ?? dbUser.ROLE_ID ?? dbUser.ROLE
                ),
            };
            req.user = u;
            req.session.user = u;
        } catch (e) {
            console.error(
                "[requireLogin.role user check error]",
                e
            );
            return res
                .status(500)
                .json({ message: "Lỗi xác thực, vui lòng thử lại sau" });
        }

        // ✅ Nếu role hợp lệ thì cho qua luôn
        if (allow(u.role ?? u.ROLE)) {
            req.user = { ...u, role: normRole(u.role ?? u.ROLE) };
            return next();
        }

        // Fallback: kiểm tra quyền sở hữu homestay
        const H_ID =
            Number(req.params?.id) ||
            Number(req.params?.hId) ||
            Number(req.body?.H_ID);

        if (!H_ID) {
            return res
                .status(403)
                .json({ message: "Bạn không có quyền thực hiện" });
        }

        try {
            const hs = await db("HOMESTAY").where({ H_ID }).first();
            if (
                hs &&
                (Number(hs.U_ID) === Number(u.U_ID) ||
                    Number(hs.owner_id) === Number(u.U_ID))
            ) {
                req.user = { ...u, role: normRole(u.role ?? u.ROLE) };
                return next();
            }
            return res
                .status(403)
                .json({ message: "Bạn không có quyền thực hiện" });
        } catch (e) {
            console.error(
                "[requireLogin.role ownership check error]",
                e
            );
            return res
                .status(403)
                .json({ message: "Bạn không có quyền thực hiện" });
        }
    };
};

module.exports = requireLogin;
