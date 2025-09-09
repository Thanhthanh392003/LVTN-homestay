const knex = require('../database/knex');
const ApiError = require('../api-error');

function userRepo() {
    return knex('USER as U').join('ROLE as R', 'R.ROLE_ID', 'U.ROLE_ID');
}

const sanitize = (row) => {
    if (!row) return null;
    const { U_Password, ...rest } = row;
    return rest;
};

async function getUserById(id) {
    const row = await userRepo()
        .select(
            'U.U_ID', 'U.ROLE_ID', 'R.ROLE_Name', 'U.U_Fullname', 'U.U_Email',
            'U.U_Phone', 'U.U_Address', 'U.U_Gender', 'U.U_Birthday', 'U.U_Status',
            'U.Created_at', 'U.Updated_at'
        )
        .where('U.U_ID', id)
        .first();
    return sanitize(row);
}

async function register(payload) {
    const exists = await knex('USER').where('U_Email', payload.U_Email).first();
    if (exists) throw new ApiError(409, 'Email already registered');

    const pass = String(payload.U_Password || '');
    if (!pass) throw new ApiError(400, 'Password is required');
    if (pass.length > 10) throw new ApiError(400, 'Password must be <= 10 chars');

    const [id] = await knex('USER').insert({
        ROLE_ID: payload.ROLE_ID,
        U_Password: pass,
        U_Fullname: payload.U_Fullname,
        U_Email: payload.U_Email,
        U_Phone: payload.U_Phone || null,
        U_Address: payload.U_Address || null,
        U_Gender: payload.U_Gender,
        U_Birthday: payload.U_Birthday,
        U_Status: payload.U_Status || 'active',
    });

    const user = await getUserById(id);
    if (!user) throw new ApiError(500, 'Create user failed');
    return user;
}

async function listUsers(query = {}) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.max(parseInt(query.limit || '10', 10), 1);
    const offset = (page - 1) * limit;

    const filters = (qb) => {
        if (query.role_id) qb.where('U.ROLE_ID', Number(query.role_id));
        if (query.status) qb.where('U.U_Status', String(query.status));
        if (query.q) {
            qb.where(b =>
                b.orWhere('U.U_Fullname', 'like', `%${query.q}%`)
                    .orWhere('U.U_Email', 'like', `%${query.q}%`)
                    .orWhere('U.U_Phone', 'like', `%${query.q}%`)
            );
        }
    };

    const base = userRepo()
        .select(
            'U.U_ID', 'U.ROLE_ID', 'R.ROLE_Name', 'U.U_Fullname', 'U.U_Email',
            'U.U_Phone', 'U.U_Address', 'U.U_Gender', 'U.U_Birthday', 'U.U_Status',
            'U.Created_at', 'U.Updated_at'
        )
        .modify(filters);

    const [{ total }] = await userRepo().count({ total: '*' }).modify(filters);
    const rows = await base.orderBy('U.Created_at', 'desc').limit(limit).offset(offset);

    return {
        users: rows.map(sanitize),
        metadata: {
            totalRecord: Number(total || 0),
            firstPage: 1,
            lastPage: Math.max(Math.ceil(Number(total || 0) / limit), 1),
            page, limit,
        },
    };
}

async function getMe(req) {
    if (!req.session?.user_id) throw new ApiError(401, 'Unauthorized');
    const me = await getUserById(req.session.user_id);
    if (!me) throw new ApiError(404, 'User not found');
    return me;
}

async function getUserByIdScoped(req, id) {
    if (!req.session?.user_id) throw new ApiError(401, 'Unauthorized');
    const target = await getUserById(id);
    if (!target) throw new ApiError(404, 'User not found');
    const isAdmin = req.session.role_id === 1;
    const isSelf = Number(id) === Number(req.session.user_id);
    if (!isAdmin && !isSelf) throw new ApiError(403, 'Forbidden');
    return target;
}

async function updateProfile(req, body) {
    if (!req.session?.user_id) throw new ApiError(401, 'Unauthorized');
    const patch = {};
    if (body.fullname) patch.U_Fullname = body.fullname;
    if (body.phone) patch.U_Phone = body.phone;
    if (body.address) patch.U_Address = body.address;
    if (body.gender) patch.U_Gender = body.gender;
    if (body.birthday) patch.U_Birthday = body.birthday;
    if (!Object.keys(patch).length) throw new ApiError(400, 'No data to update');

    await knex('USER').update({ ...patch, Updated_at: knex.fn.now() }).where('U_ID', req.session.user_id);
    return { user: await getUserById(req.session.user_id) };
}

async function changePassword(req, body) {
    if (!req.session?.user_id) throw new ApiError(401, 'Unauthorized');
    const { current_password, new_password } = body || {};
    if (!current_password || !new_password) throw new ApiError(400, 'Missing password');

    const row = await knex('USER').select('U_Password').where('U_ID', req.session.user_id).first();
    if (!row) throw new ApiError(404, 'User not found');

    if (String(current_password) !== String(row.U_Password)) {
        throw new ApiError(400, 'Current password incorrect');
    }

    const nextPass = String(new_password);
    if (nextPass.length > 10) throw new ApiError(400, 'Password must be <= 10 chars');

    await knex('USER').update({ U_Password: nextPass, Updated_at: knex.fn.now() }).where('U_ID', req.session.user_id);
    return { message: 'Password changed' };
}

async function updateUserStatus(req, id, status) {
    if (req.session?.role_id !== 1) throw new ApiError(403, 'Forbidden');
    if (!['active', 'suspended'].includes(String(status))) throw new ApiError(400, 'Invalid status');
    const ret = await knex('USER').update({ U_Status: status, Updated_at: knex.fn.now() }).where('U_ID', id);
    if (!ret) throw new ApiError(404, 'User not found');
    return { user: await getUserById(id) };
}

async function updateUser(userId, updates) {
    if (!Object.keys(updates).length) throw new ApiError(400, 'No data to update');
    const ret = await knex('USER').update({ ...updates, Updated_at: knex.fn.now() }).where('U_ID', userId);
    if (!ret) throw new ApiError(404, 'User not found');
    return await getUserById(userId);
}

async function deleteUser(id) {
    const ret = await knex('USER').where('U_ID', id).del();
    return !!ret;
}

module.exports = {
    getUserById,
    register,
    listUsers,
    getUserByIdScoped,
    getMe,
    updateProfile,
    changePassword,
    updateUserStatus,
    updateUser,
    deleteUser,
};
