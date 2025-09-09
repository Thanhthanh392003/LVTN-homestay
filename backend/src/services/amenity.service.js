const knex = require('../database/knex');
const ApiError = require('../api-error');

async function createAmenity(_req, body) {
    const name = body?.name || body?.A_Name;
    if (!name) throw new ApiError(400, 'Missing amenity name');
    const [id] = await knex('AMENITY').insert({ A_Name: name });
    return await knex('AMENITY').where('Amenity_ID', id).first();
}

async function listAmenities() {
    return knex('AMENITY').select('Amenity_ID', 'A_Name').orderBy('A_Name', 'asc');
}

async function assignAmenity(req, body) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const { h_id, amenity_id } = body || {};
    if (!h_id || !amenity_id) throw new ApiError(400, 'Missing fields');

    const own = await knex('HOMESTAY').select('U_ID').where('H_ID', h_id).first();
    if (!own) throw new ApiError(404, 'Homestay not found');
    if (own.U_ID !== uId && req.session.role_id !== 1) throw new ApiError(403, 'Forbidden');

    await knex('HOMESTAY_AMENITY').insert({ H_ID: h_id, Amenity_ID: amenity_id })
        .onConflict(['H_ID', 'Amenity_ID']).ignore();
}

async function removeAmenity(req, body) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const { h_id, amenity_id } = body || {};
    if (!h_id || !amenity_id) throw new ApiError(400, 'Missing fields');

    const own = await knex('HOMESTAY').select('U_ID').where('H_ID', h_id).first();
    if (!own) throw new ApiError(404, 'Homestay not found');
    if (own.U_ID !== uId && req.session.role_id !== 1) throw new ApiError(403, 'Forbidden');

    await knex('HOMESTAY_AMENITY').where({ H_ID: h_id, Amenity_ID: amenity_id }).del();
}

module.exports = { createAmenity, listAmenities, assignAmenity, removeAmenity };
