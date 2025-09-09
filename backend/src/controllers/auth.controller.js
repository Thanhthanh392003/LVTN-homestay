const authService = require('../services/auth.service');
const ApiError = require('../api-error');
const JSend = require('../jsend');

// Ẩn mật khẩu khi trả JSON
function toPublic(userRaw) {
    if (!userRaw) return null;
    const { U_Password, ...rest } = userRaw;
    return rest;
}

async function loginUser(req, res) {
    try {
        const user = await authService.loginUser(req.body);

        if (!req.session) {
            return res.status(500).json(JSend.fail('Session handling error'));
        }

        // Lưu 2 dạng để tương thích cả code cũ & mẫu bạn gửi
        req.session.user = {
            U_ID: user.id,
            ROLE_ID: user.role_id,
            ROLE_Name: user.role,
            U_Email: user.email,
            U_Fullname: user.username,
            U_Phone: user.phone,
            U_Address: user.address,
        };
        req.session.user_id = user.id;
        req.session.email = user.email;
        req.session.username = user.username;
        req.session.role = user.role;
        req.session.phone = user.phone;
        req.session.address = user.address;

        return res
            .status(200)
            .json(JSend.success({ user: toPublic(user.raw) }, 'Login successful'));
    } catch (error) {
        return res.status(400).json(JSend.fail(error.message || 'Login failed'));
    }
}

async function logoutUser(req, res) {
    try {
        const result = await authService.logoutUser(req);
        // Xoá luôn các cookie phiên có thể dùng
        res.clearCookie('sid');
        res.clearCookie('connect.sid');
        return res.status(200).json(JSend.success(null, result.message));
    } catch (error) {
        return res.status(400).json(JSend.fail(error.message || 'Logout failed'));
    }
}

module.exports = {
    loginUser,
    logoutUser,
};
