const knex = require('../database/knex');
const ApiError = require('../api-error');

// ======================
//  Tạo mới tiện nghi
// ======================
async function createAmenity(_req, body) {
    const name = body?.name || body?.A_Name;
    if (!name) throw new ApiError(400, 'Missing amenity name');

    const [id] = await knex('AMENITY').insert({ A_Name: name });
    return await knex('AMENITY').where('Amenity_ID', id).first();
}

// ======================
//  Lấy danh sách tiện nghi
// ======================
async function listAmenities() {
    return knex('AMENITY')
        .select('Amenity_ID', 'A_Name')
        .orderBy('A_Name', 'asc');
}

// =======================
//  Bộ mới dành cho FE — SET AMENITIES FOR HOMESTAY
// =======================
async function setAmenitiesForHomestay(req, body) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const { h_id, amenities } = body || {};
    if (!h_id || !Array.isArray(amenities))
        throw new ApiError(400, 'Missing homestay or amenities list');

    // Kiểm tra quyền sở hữu
    const own = await knex('HOMESTAY').select('U_ID').where('H_ID', h_id).first();
    if (!own) throw new ApiError(404, 'Homestay not found');
    if (own.U_ID !== uId && req.session.role_id !== 1)
        throw new ApiError(403, 'Forbidden');

    // Danh sách amenity_id sẽ gán lại
    const amenityIds = [];

    for (let name of amenities) {
        name = (name || '').trim();
        if (!name) continue;

        // Kiểm tra tiện nghi đã có chưa
        let exist = await knex('AMENITY').where('A_Name', name).first();

        if (!exist) {
            // Nếu chưa có → tự tạo tiện nghi mới
            const [newId] = await knex('AMENITY').insert({ A_Name: name });
            exist = await knex('AMENITY').where('Amenity_ID', newId).first();
        }

        amenityIds.push(exist.Amenity_ID);
    }

    // Xóa tiện nghi cũ của homestay
    await knex('HOMESTAY_AMENITY').where('H_ID', h_id).del();

    // Insert tiện nghi mới
    for (const A_ID of amenityIds) {
        await knex('HOMESTAY_AMENITY')
            .insert({ H_ID: h_id, Amenity_ID: A_ID })
            .onConflict(['H_ID', 'Amenity_ID'])
            .ignore();
    }

    return { success: true, count: amenityIds.length };
}

// ======================
//  Gán 1 tiện nghi (cũ)
// ======================
async function assignAmenity(req, body) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const { h_id, amenity_id } = body || {};
    if (!h_id || !amenity_id) throw new ApiError(400, 'Missing fields');

    const own = await knex('HOMESTAY').select('U_ID').where('H_ID', h_id).first();
    if (!own) throw new ApiError(404, 'Homestay not found');
    if (own.U_ID !== uId && req.session.role_id !== 1) throw new ApiError(403, 'Forbidden');

    await knex('HOMESTAY_AMENITY')
        .insert({ H_ID: h_id, Amenity_ID: amenity_id })
        .onConflict(['H_ID', 'Amenity_ID'])
        .ignore();
}

// ======================
//  Xóa 1 tiện nghi (cũ)
// ======================
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

module.exports = {
    createAmenity,
    listAmenities,
    assignAmenity,
    removeAmenity,
    setAmenitiesForHomestay
};
