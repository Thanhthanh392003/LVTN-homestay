const knex = require('../database/knex');
const ApiError = require('../api-error');

const isAdmin = (req) => req.session?.role_id === 1;
const isOwner = (req) => req.session?.role_id === 2;

async function assertLogin(req) {
    if (!req.session?.user_id) throw new ApiError(401, 'Unauthorized');
}

/** Admin: tạo promotion */
async function createPromotion(req, body) {
    await assertLogin(req);
    if (!isAdmin(req)) throw new ApiError(403, 'Forbidden');

    const name = body?.P_Name ?? body?.name;
    const discount = body?.Discount ?? body?.discount;
    const start_date = body?.Start_date ?? body?.start_date;
    const end_date = body?.End_date ?? body?.end_date;
    const description = body?.Promotion_Description ?? body?.description ?? null;

    if (!name || discount == null || !start_date || !end_date) {
        throw new ApiError(400, 'Missing fields');
    }

    const [id] = await knex('PROMOTION').insert({
        P_Name: name,
        Discount: Number(discount),
        Start_date: start_date,
        End_date: end_date,
        Promotion_Description: description,
    });

    return await knex('PROMOTION').where('Promotion_ID', id).first();
}

/** Admin: cập nhật promotion */
async function updatePromotion(req, id, body) {
    await assertLogin(req);
    if (!isAdmin(req)) throw new ApiError(403, 'Forbidden');

    const patch = {};
    if (body.P_Name ?? body.name) patch.P_Name = body.P_Name ?? body.name;
    if (body.Discount ?? body.discount) patch.Discount = Number(body.Discount ?? body.discount);
    if (body.Start_date ?? body.start_date) patch.Start_date = body.Start_date ?? body.start_date;
    if (body.End_date ?? body.end_date) patch.End_date = body.End_date ?? body.end_date;
    if (body.Promotion_Description ?? body.description) {
        patch.Promotion_Description = body.Promotion_Description ?? body.description;
    }

    if (!Object.keys(patch).length) throw new ApiError(400, 'No data to update');

    const ret = await knex('PROMOTION').update(patch).where('Promotion_ID', id);
    if (!ret) throw new ApiError(404, 'Promotion not found');

    return await knex('PROMOTION').where('Promotion_ID', id).first();
}

/** Admin: xóa promotion */
async function deletePromotion(req, id) {
    await assertLogin(req);
    if (!isAdmin(req)) throw new ApiError(403, 'Forbidden');

    await knex('PROMOTION_HOMESTAY').where('Promotion_ID', id).del();
    const ret = await knex('PROMOTION').where('Promotion_ID', id).del();
    if (!ret) throw new ApiError(404, 'Promotion not found');
}

/** Public/Admin/Owner: xem 1 promotion và homestay áp dụng */
async function getPromotionById(_req, id) {
    const row = await knex('PROMOTION').where('Promotion_ID', id).first();
    if (!row) throw new ApiError(404, 'Promotion not found');

    const homestays = await knex('PROMOTION_HOMESTAY as PH')
        .join('HOMESTAY as H', 'H.H_ID', 'PH.H_ID')
        .select('H.H_ID', 'H.H_Name', 'H.H_City')
        .where('PH.Promotion_ID', id);

    return { promotion: row, homestays };
}

/** Public/Admin: danh sách promotion (+ filter optional) */
async function listPromotions(query = {}) {
    const q = knex('PROMOTION').select('*');
    if (query.name) q.where('P_Name', 'like', `%${query.name}%`);
    if (query.active === '1') {
        q.where('Start_date', '<=', knex.fn.now()).andWhere('End_date', '>=', knex.fn.now());
    }
    return q.orderBy('Promotion_created_at', 'desc');
}

/** Owner/Admin: áp dụng promotion vào homestay */
async function applyPromotionToHomestay(req, body) {
    await assertLogin(req);
    if (!isOwner(req) && !isAdmin(req)) throw new ApiError(403, 'Forbidden');

    const promotion_id = body?.promotion_id ?? body?.Promotion_ID;
    const h_id = body?.h_id ?? body?.H_ID;
    if (!promotion_id || !h_id) throw new ApiError(400, 'Missing fields');

    if (isOwner(req)) {
        const own = await knex('HOMESTAY').select('U_ID').where('H_ID', h_id).first();
        if (!own) throw new ApiError(404, 'Homestay not found');
        if (own.U_ID !== req.session.user_id) throw new ApiError(403, 'Forbidden');
    }

    await knex('PROMOTION_HOMESTAY')
        .insert({ Promotion_ID: promotion_id, H_ID: h_id })
        .onConflict(['Promotion_ID', 'H_ID'])
        .ignore();

    return { message: 'Promotion applied' };
}

/** Owner/Admin: gỡ promotion khỏi homestay */
async function removePromotionFromHomestay(req, body) {
    await assertLogin(req);
    if (!isOwner(req) && !isAdmin(req)) throw new ApiError(403, 'Forbidden');

    const promotion_id = body?.promotion_id ?? body?.Promotion_ID;
    const h_id = body?.h_id ?? body?.H_ID;
    if (!promotion_id || !h_id) throw new ApiError(400, 'Missing fields');

    if (isOwner(req)) {
        const own = await knex('HOMESTAY').select('U_ID').where('H_ID', h_id).first();
        if (!own) throw new ApiError(404, 'Homestay not found');
        if (own.U_ID !== req.session.user_id) throw new ApiError(403, 'Forbidden');
    }

    await knex('PROMOTION_HOMESTAY').where({ Promotion_ID: promotion_id, H_ID: h_id }).del();
    return { message: 'Promotion removed' };
}

/** Public: danh sách promotion hiệu lực theo homestay */
async function listActivePromotionsByHomestay(h_id) {
    return knex('PROMOTION_HOMESTAY as PH')
        .join('PROMOTION as P', 'P.Promotion_ID', 'PH.Promotion_ID')
        .select('P.*')
        .where('PH.H_ID', h_id)
        .andWhere('P.Start_date', '<=', knex.fn.now())
        .andWhere('P.End_date', '>=', knex.fn.now())
        .orderBy('P.Discount', 'desc');
}

module.exports = {
    createPromotion,
    updatePromotion,
    deletePromotion,
    getPromotionById,
    listPromotions,
    applyPromotionToHomestay,
    removePromotionFromHomestay,
    listActivePromotionsByHomestay,
};
