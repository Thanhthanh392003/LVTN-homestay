const knex = require('../database/knex');

/** Tìm user theo email (kèm ROLE_Name) */
async function findUserByEmail(email) {
    return knex('USER as u')
        .leftJoin('ROLE as r', 'r.ROLE_ID', 'u.ROLE_ID')
        .select('u.*', 'r.ROLE_Name')
        .where('u.U_Email', email)
        .first();
}

/** Đăng nhập (giữ nguyên cột & so sánh plaintext theo U_Password) */
async function loginUser(payload) {
    const { email, password } = payload || {};
    if (!email || !password) throw new Error('Missing email or password');

    const user = await findUserByEmail(email);
    if (!user) throw new Error('User not found');

    // DB đang để VARCHAR(10) => so sánh nguyên văn
    if (String(password) !== String(user.U_Password)) {
        throw new Error('Invalid password');
    }

    // Trả về dạng “phẳng” để set session dễ dàng
    return {
        id: user.U_ID,
        email: user.U_Email,
        username: user.U_Fullname,     // không có username => dùng fullname
        role_id: user.ROLE_ID,
        role: user.ROLE_Name,
        phone: user.U_Phone,
        address: user.U_Address,
        raw: user,                     // giữ bản đầy đủ nếu cần
    };
}

/** Logout: huỷ session */
async function logoutUser(req) {
    return new Promise((resolve, reject) => {
        if (!req.session) return reject(new Error('No active session found'));

        req.session.destroy((err) => {
            if (err) return reject(new Error('Logout failed'));
            resolve({ message: 'Logout successful' });
        });
    });
}

module.exports = {
    findUserByEmail,
    loginUser,
    logoutUser,
};
