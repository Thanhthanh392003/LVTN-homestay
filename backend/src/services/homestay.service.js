const knex = require('../database/knex');
const ApiError = require('../api-error');

function homestayRepo() {
    return knex('HOMESTAY as H')
        .leftJoin('IMAGE as I', function () {
            this.on('I.H_ID', '=', 'H.H_ID').andOn('I.IsMain', '=', knex.raw('1'));
        });
}

async function listHomestays(query = {}) {
    const q = homestayRepo().select('H.*', 'I.Image_url as main_image');
    if (query.city) q.where('H.H_City', query.city);
    if (query.min != null) q.where('H.Price_per_day', '>=', Number(query.min));
    if (query.max != null) q.where('H.Price_per_day', '<=', Number(query.max));
    if (query.status) q.where('H.Status', String(query.status));
    return q.orderBy('H.Created_at', 'desc');
}

async function getHomestayById(id) {
    const info = await knex('HOMESTAY').where('H_ID', id).first();
    if (!info) throw new ApiError(404, 'Homestay not found');

    const images = await knex('IMAGE').select('Image_ID', 'Image_url', 'IsMain', 'Sort_order')
        .where('H_ID', id).orderBy('Sort_order', 'asc');

    const amenities = await knex('HOMESTAY_AMENITY as HA')
        .join('AMENITY as A', 'A.Amenity_ID', 'HA.Amenity_ID')
        .select('A.Amenity_ID', 'A.A_Name').where('HA.H_ID', id);

    return { info, images, amenities };
}

async function createHomestay(req, body) {
    const uId = req.session?.user_id;
    const roleId = req.session?.role_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');
    if (![1, 2].includes(roleId)) throw new ApiError(403, 'Forbidden');

    const { name, address, city, description, price_per_day } = body || {};
    if (!name || !address || !city || price_per_day == null) throw new ApiError(400, 'Missing required fields');

    const [id] = await knex('HOMESTAY').insert({
        U_ID: uId, H_Name: name, H_Address: address, H_City: city,
        H_Description: description || null, Price_per_day: Number(price_per_day),
        Status: 'pending',
    });
    return id;
}

async function updateHomestay(req, id, body) {
    const uId = req.session?.user_id;
    const roleId = req.session?.role_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const own = await knex('HOMESTAY').select('U_ID').where('H_ID', id).first();
    if (!own) throw new ApiError(404, 'Homestay not found');
    if (own.U_ID !== uId && roleId !== 1) throw new ApiError(403, 'Forbidden');

    const patch = {};
    if (body.name != null) patch.H_Name = body.name;
    if (body.address != null) patch.H_Address = body.address;
    if (body.city != null) patch.H_City = body.city;
    if (body.description != null) patch.H_Description = body.description;
    if (body.price_per_day != null) patch.Price_per_day = Number(body.price_per_day);
    if (!Object.keys(patch).length) throw new ApiError(400, 'No data to update');

    await knex('HOMESTAY').update({ ...patch, Updated_at: knex.fn.now() }).where('H_ID', id);
}

async function updateHomestayStatus(req, id, status) {
    const roleId = req.session?.role_id;
    if (roleId !== 1) throw new ApiError(403, 'Forbidden');
    if (!['pending', 'approved', 'inactive', 'rejected'].includes(String(status))) throw new ApiError(400, 'Invalid status');
    const ret = await knex('HOMESTAY').update({ Status: status, Updated_at: knex.fn.now() }).where('H_ID', id);
    if (!ret) throw new ApiError(404, 'Homestay not found');
}

async function deleteHomestay(req, id) {
    const uId = req.session?.user_id;
    const roleId = req.session?.role_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const own = await knex('HOMESTAY').select('U_ID').where('H_ID', id).first();
    if (!own) throw new ApiError(404, 'Homestay not found');
    if (own.U_ID !== uId && roleId !== 1) throw new ApiError(403, 'Forbidden');

    await knex('HOMESTAY').where('H_ID', id).del();
}

module.exports = {
    listHomestays, getHomestayById, createHomestay, updateHomestay, updateHomestayStatus, deleteHomestay
};
