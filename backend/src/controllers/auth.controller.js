// controllers/auth.controller.js
const knex = require("../database/knex");
const bcrypt = require("bcrypt");
const ApiError = require("../api-error");
const JSend = require("../jsend");

function toPublic(userRaw) {
    if (!userRaw) return null;
    const { U_Password, ...rest } = userRaw;
    return rest;
}

function resolveRoleName(roleId) {
    if (Number(roleId) === 1) return "admin";
    if (Number(roleId) === 2) return "owner";
    return "customer";
}

async function loginUser(req, res) {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res
                .status(400)
                .json(JSend.fail("Email and password are required"));
        }

        const user = await knex("USER").where("U_Email", email).first();
        if (!user) {
            return res
                .status(401)
                .json(JSend.fail("Invalid email or password"));
        }

        // 1) Thử so sánh bcrypt chuẩn
        let ok = false;
        try {
            ok = await bcrypt.compare(
                String(password),
                String(user.U_Password || "")
            );
        } catch (e) {
            ok = false;
        }

        // 2) Nếu sai, kiểm tra xem mật khẩu DB có phải bcrypt hash không
        const looksLikeBcrypt =
            typeof user.U_Password === "string" &&
            user.U_Password.startsWith("$2");

        // 3) Nếu DB đang lưu plaintext và plaintext khớp -> auto-migrate sang bcrypt
        if (
            !ok &&
            !looksLikeBcrypt &&
            String(password) === String(user.U_Password || "")
        ) {
            const newHash = await bcrypt.hash(String(password), 10);
            await knex("USER")
                .where("U_ID", user.U_ID)
                .update({ U_Password: newHash });
            ok = true;
            user.U_Password = newHash; // đồng bộ biến cục bộ
        }

        if (!ok) {
            return res
                .status(401)
                .json(JSend.fail("Invalid email or password"));
        }

        // 🔐 NEW: chặn tài khoản không active
        const status = String(user.U_Status || "").toLowerCase();

        if (status === "suspended") {
            return res.status(403).json(
                JSend.fail(
                    "Tài khoản của bạn đã bị khoá bởi quản trị viên. Vui lòng liên hệ bộ phận hỗ trợ để được mở khoá."
                )
            );
        }

        if (status && status !== "active") {
            // cho các trạng thái khác: pending, banned,...
            return res.status(403).json(
                JSend.fail(
                    "Tài khoản của bạn hiện không ở trạng thái hoạt động. Vui lòng liên hệ quản trị viên để được hỗ trợ."
                )
            );
        }

        // session + resolve role giữ nguyên
        if (!req.session) {
            return res
                .status(500)
                .json(JSend.fail("Session handling error"));
        }

        req.session.user = {
            U_ID: user.U_ID,
            ROLE_ID: user.ROLE_ID,
            role: resolveRoleName(user.ROLE_ID),
            U_Email: user.U_Email,
            U_Fullname: user.U_Fullname,
        };
        req.session.user_id = user.U_ID;
        req.session.role_id = user.ROLE_ID;
        req.session.email = user.U_Email;
        req.session.username = user.U_Fullname;
        req.session.role = resolveRoleName(user.ROLE_ID);
        req.session.phone = user.U_Phone;
        req.session.address = user.U_Address;

        return res
            .status(200)
            .json(
                JSend.success(
                    { user: toPublic({ ...user, role: req.session.role }) },
                    "Login successful"
                )
            );
    } catch (error) {
        return res
            .status(400)
            .json(JSend.fail(error.message || "Login failed"));
    }
}

async function logoutUser(req, res) {
    try {
        await new Promise((resolve) => {
            if (req.session) {
                req.session.destroy(() => resolve());
            } else resolve();
        });
        res.clearCookie("sid");
        res.clearCookie("connect.sid");
        return res.status(200).json(JSend.success(null, "Logged out"));
    } catch (error) {
        return res
            .status(400)
            .json(JSend.fail(error.message || "Logout failed"));
    }
}

module.exports = {
    loginUser,
    logoutUser,
};
