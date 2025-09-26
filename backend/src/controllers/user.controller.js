// backend/src/controllers/user.controller.js
const db = require("../database/knex");                 // dùng knex trực tiếp
const usersService = require("../services/user.service"); // giữ lại cho các API khác
const ApiError = require("../api-error");
const JSend = require("../jsend");

/** Helper: lấy U_ID từ session/middleware */
function getUserId(req) {
    return Number(
        req.session?.user_id ??
        req.user?.U_ID ??
        req.body?.U_ID ??
        req.query?.U_ID
    );
}

/** GET /api/users/me  -> trả thông tin user hiện tại */
async function getMe(req, res) {
    try {
        const uid = getUserId(req);
        if (!uid) return res.status(401).json(JSend.fail("Unauthorized"));

        const me = await db("USER").where({ U_ID: uid }).first();
        if (!me) return res.status(404).json(JSend.fail("User not found"));

        return res.status(200).json(JSend.success({ user: me }));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 500;
        return res.status(status).json(JSend.fail(error.message || "Failed to load profile"));
    }
}

/** PUT /api/users/me/profile  -> cập nhật mềm dẻo, KHÔNG trả 400 nếu không có thay đổi */
async function updateProfile(req, res) {
    try {
        const uid = getUserId(req);
        if (!uid) return res.status(401).json(JSend.fail("Unauthorized"));

        const b = req.body || {};
        const pick = (...args) => args.find((v) => v !== undefined);
        const trim = (v) =>
            v === undefined || v === null ? undefined : String(v).trim();

        const updates = {};

        const fullName = trim(pick(b.U_Fullname, b.fullname, b.full_name));
        if (fullName !== undefined) updates.U_Fullname = fullName;

        // Email thường không cho đổi; nếu muốn cho phép thì mở comment:
        // const email = trim(pick(b.U_Email, b.email));
        // if (email !== undefined) updates.U_Email = email;

        const phone = trim(pick(b.U_Phone, b.phone));
        if (phone !== undefined) updates.U_Phone = phone;

        const address = trim(pick(b.U_Address, b.address));
        if (address !== undefined) updates.U_Address = address;

        const gender = trim(pick(b.U_Gender, b.gender));
        if (gender !== undefined) updates.U_Gender = gender;

        let birthday = pick(b.U_Birthday, b.birthday);
        if (birthday !== undefined && birthday !== null && birthday !== "") {
            const d = new Date(birthday); // chấp nhận YYYY-MM-DD hoặc ISO
            if (!isNaN(d.getTime())) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                updates.U_Birthday = `${yyyy}-${mm}-${dd}`;
            }
        } else if (birthday === "") {
            updates.U_Birthday = null; // clear ngày sinh
        }

        // Không có trường nào? Trả về user hiện tại, tránh 400
        if (Object.keys(updates).length === 0) {
            const me = await db("USER").where({ U_ID: uid }).first();
            return res.status(200).json(JSend.success({ user: me }));
        }

        await db("USER").where({ U_ID: uid }).update(updates);
        const me = await db("USER").where({ U_ID: uid }).first();
        return res.status(200).json(JSend.success({ user: me }));
    } catch (err) {
        return res
            .status(500)
            .json(JSend.fail(err?.sqlMessage || err?.message || "Update profile failed"));
    }
}

/* ======= Các API khác vẫn dùng service như bạn đang có (giữ nguyên) ======= */

// POST /api/users/register (public)
async function register(req, res, next) {
    try {
        const {
            role_id, fullname, email, password, phone, address, gender, birthday, status,
        } = req.body;

        if (!role_id || !fullname || !email || !password) {
            return res.status(400).json(JSend.fail("Missing required fields"));
        }

        const user = await usersService.register({
            ROLE_ID: Number(role_id),
            U_Fullname: fullname,
            U_Email: email,
            U_Password: String(password),
            U_Phone: phone ?? null,
            U_Address: address ?? null,
            U_Gender: gender ?? null,
            U_Birthday: birthday ?? null,
            U_Status: status ?? "active",
        });

        return res.status(201).json(JSend.success(user, "Created"));
    } catch (err) {
        next(err);
    }
}

// PUT /api/users/me/password
async function changePassword(req, res, next) {
    try {
        const result = await usersService.changePassword(req, req.body || {});
        return res.status(200).json(JSend.success(result));
    } catch (err) {
        next(err);
    }
}

// GET /api/users  (admin)
async function listUsers(req, res, next) {
    try {
        const result = await usersService.listUsers(req.query || {});
        return res.status(200).json(JSend.success(result));
    } catch (err) {
        next(err);
    }
}

// GET /api/users/:id
async function getUserById(req, res, next) {
    try {
        const user = await usersService.getUserByIdScoped(req, req.params.id);
        return res.status(200).json(JSend.success({ user }));
    } catch (err) {
        next(err);
    }
}

// PUT /api/users/:id
async function updateUser(req, res, next) {
    try {
        const id = req.params.id;
        const b = req.body || {};
        const updates = {};

        if (b.role_id != null) updates.ROLE_ID = Number(b.role_id);
        if (b.fullname != null) updates.U_Fullname = String(b.fullname);
        if (b.email != null) updates.U_Email = String(b.email);
        if (b.phone != null) updates.U_Phone = String(b.phone);
        if (b.address != null) updates.U_Address = String(b.address);
        if (b.gender != null) updates.U_Gender = String(b.gender);
        if (b.birthday != null) updates.U_Birthday = String(b.birthday);
        if (b.status != null) updates.U_Status = String(b.status);
        if (b.password != null) updates.U_Password = String(b.password);

        const user = await usersService.updateUser(id, updates);
        return res.status(200).json(JSend.success({ user }));
    } catch (err) {
        next(err);
    }
}

// PATCH /api/users/:id/status
async function updateUserStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status } = req.body || {};
        const result = await usersService.updateUserStatus(req, id, status);
        return res.status(200).json(JSend.success(result));
    } catch (err) {
        next(err);
    }
}

// DELETE /api/users/:id
async function deleteUser(req, res, next) {
    try {
        const ok = await usersService.deleteUser(req.params.id);
        return res.status(200).json(JSend.success({ deleted: ok }));
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getMe,
    register,
    updateProfile,
    changePassword,
    listUsers,
    getUserById,
    updateUser,
    updateUserStatus,
    deleteUser,
};
