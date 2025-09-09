const usersService = require('../services/user.service');
const ApiError = require('../api-error');
const JSend = require('../jsend');


exports.getMe = async (req, res, next) => {
    try {
        const me = await userService.getById(req.user.id);
        res.json(JSend.success(me));
    } catch (err) {
        next(err);
    }
};
// REGISTER (public)
async function register(req, res, next) {
    try {
        const {
            role_id,
            fullname,
            email,
            password,
            phone,
            address,
            gender,
            birthday,
            status,
        } = req.body;

        if (!role_id || !fullname || !email || !password || !gender || !birthday) {
            return res.status(400).json(JSend.fail('Missing required fields'));
        }
        if (String(password).length > 10) {
            return res.status(400).json(JSend.fail('Password must be <= 10 chars'));
        }

        const user = await usersService.register({
            ROLE_ID: Number(role_id),
            U_Fullname: fullname,
            U_Email: email,
            U_Password: String(password), // theo yêu cầu: <= 10 ký tự, không hash
            U_Phone: phone ?? null,
            U_Address: address ?? null,
            U_Gender: gender,
            U_Birthday: birthday,
            U_Status: status ?? 'active',
        });

        return res.status(201).json(JSend.success(user, 'Created'));
    } catch (err) {
        next(err);
    }
}

// GET /api/users/:id (admin hoặc chính chủ)
async function getUserById(req, res, next) {
    try {
        const { id } = req.params;
        const user = await usersService.getUserByIdScoped(req, id);
        return res.status(200).json(JSend.success({ user }));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 404;
        return res.status(status).json(JSend.fail(error.message || 'User not found'));
    }
}

// Alias để tương thích route cũ nếu có
const getUser = getUserById;

// GET /api/users (admin)
async function listUsers(req, res) {
    try {
        const users = await usersService.listUsers(req.query);
        return res.status(200).json(JSend.success(users));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Cannot list users'));
    }
}

// GET /api/users/me (login)
async function getMe(req, res) {
    try {
        const me = await usersService.getMe(req);
        return res.status(200).json(JSend.success({ user: me }));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 401;
        return res.status(status).json(JSend.fail(error.message || 'Unauthorized'));
    }
}

// PUT /api/users/me/profile (login)
async function updateProfile(req, res) {
    try {
        const result = await usersService.updateProfile(req, req.body);
        return res.status(200).json(JSend.success(result, 'Profile updated'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Update profile failed'));
    }
}

// PUT /api/users/me/password (login)
async function changePassword(req, res) {
    try {
        const result = await usersService.changePassword(req, req.body);
        return res.status(200).json(JSend.success(result, 'Password changed'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Change password failed'));
    }
}

// PATCH /api/users/:id/status (admin)
async function updateUserStatus(req, res) {
    try {
        const { id } = req.params;
        const result = await usersService.updateUserStatus(req, id, req.body.status);
        return res.status(200).json(JSend.success(result, 'User status updated'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Update status failed'));
    }
}

// PUT /api/users/:id (login + ràng quyền ở service/controller)
async function updateUser(req, res) {
    const userId = req.params.id;
    const { fullname, password, email, address, phone, gender, birthday, status } = req.body;

    try {
        const existingUser = await usersService.getUserById(userId);
        if (!existingUser) return res.status(404).json(JSend.fail('User not found'));

        const updates = {};
        if (fullname) updates.U_Fullname = fullname;
        if (email) updates.U_Email = email;
        if (address) updates.U_Address = address;
        if (phone) updates.U_Phone = phone;
        if (gender) updates.U_Gender = gender;
        if (birthday) updates.U_Birthday = birthday;
        if (status) updates.U_Status = status;
        if (password) {
            if (String(password).length > 10) {
                return res.status(400).json(JSend.fail('Password must be <= 10 chars'));
            }
            updates.U_Password = String(password);
        }
        if (!Object.keys(updates).length) {
            return res.status(400).json(JSend.fail('No data to update'));
        }

        const updatedUser = await usersService.updateUser(userId, updates);
        if (updatedUser && updatedUser.U_Password) delete updatedUser.U_Password;

        return res.json(JSend.success({ user: updatedUser }, 'User updated successfully'));
    } catch (_e) {
        return res.status(500).json(JSend.fail('An error occurred while updating the user'));
    }
}

// DELETE /api/users/:id (admin)
async function deleteUser(req, res, next) {
    try {
        const { id } = req.params;
        const deleted = await usersService.deleteUser(id);
        if (!deleted) return next(new ApiError(404, 'User not found'));
        return res.json(JSend.success(null, 'User deleted'));
    } catch (_e) {
        return next(new ApiError(500, `Could not delete user with id=${req.params.id}`));
    }
}

module.exports = {
    register,
    getUser,        // alias
    getUserById,
    listUsers,
    getMe,
    updateProfile,
    changePassword,
    updateUserStatus,
    updateUser,
    deleteUser,
};
