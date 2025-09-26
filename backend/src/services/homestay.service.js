// src/services/homestay.service.js
const knex = require('../database/knex');
const ApiError = require('../api-error');

function homestayTable() {
    return knex('HOMESTAY');
}

// Chuẩn hoá payload theo cột trong DB
function normalize(payload = {}) {
    return {
        H_Name: payload.H_Name ?? payload.name,
        H_Address: payload.H_Address ?? payload.address,
        H_City: payload.H_City ?? payload.city,
        H_Description: payload.H_Description ?? payload.description ?? null,
        Price_per_day:
            payload.Price_per_day != null
                ? Number.parseFloat(payload.Price_per_day)
                : Number.parseFloat(payload.price_per_day),
        Status: payload.Status ?? payload.status ?? 'active',
        U_ID: payload.U_ID ?? payload.owner_id, // truyền từ controller (session/body)
    };
}

// CREATE
async function createHomestay(payload) {
    const data = normalize(payload);

    if (!data.U_ID) throw new ApiError(401, 'Missing U_ID (owner).');
    if (!data.H_Name || typeof data.H_Name !== 'string') {
        throw new ApiError(400, 'H_Name must be a non-empty string.');
    }
    if (!data.H_Address || !data.H_City) {
        throw new ApiError(400, 'H_Address and H_City are required.');
    }
    if (Number.isNaN(data.Price_per_day)) {
        throw new ApiError(400, 'Price_per_day is invalid.');
    }

    const [insertId] = await homestayTable().insert({
        H_Name: data.H_Name.trim(),
        H_Address: data.H_Address.trim(),
        H_City: data.H_City.trim(),
        H_Description: data.H_Description,
        Price_per_day: data.Price_per_day, // knex sẽ map DECIMAL ok
        Status: data.Status || 'active',
        U_ID: data.U_ID,
    });

    const H_ID = typeof insertId === 'object' ? insertId?.H_ID || insertId?.id : insertId;
    return { H_ID, ...data };
}

// LIST (filter + pagination)
async function getManyHomestays(query = {}) {
    const name = query.name || query.H_Name || '';
    const city = query.H_City || '';
    let page = parseInt(query.page ?? '1', 10);
    let limit = parseInt(query.limit ?? '8', 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 8;
    const offset = (page - 1) * limit;

    const whereFn = (b) => {
        if (name) b.where('H_Name', 'like', `%${name}%`);
        if (city) b.andWhere('H_City', 'like', `%${city}%`);
    };

    const rows = await homestayTable()
        .where(whereFn)
        .select(
            'H_ID',
            'U_ID',
            'H_Name',
            'H_Address',
            'H_City',
            'H_Description',
            'Price_per_day',
            'Status',
            'Created_at',
            'Updated_at'
        )
        .limit(limit)
        .offset(offset);

    const [{ count }] = await homestayTable().where(whereFn).count('H_ID as count');
    const totalRecords = Number(count) || 0;
    const lastPage = totalRecords === 0 ? 1 : Math.ceil(totalRecords / limit);

    return { metadata: { totalRecords, firstPage: 1, lastPage, page, limit }, homestays: rows };
}

async function getHomestayById(id) {
    return homestayTable()
        .where('H_ID', id)
        .select(
            'H_ID',
            'U_ID',
            'H_Name',
            'H_Address',
            'H_City',
            'H_Description',
            'Price_per_day',
            'Status',
            'Created_at',
            'Updated_at'
        )
        .first();
}

async function updateHomestay(id, payload) {
    const existed = await homestayTable().where('H_ID', id).first();
    if (!existed) return null;

    const data = normalize(payload);
    // Không cho đổi owner từ API
    delete data.U_ID;

    // Loại field undefined để tránh set NULL không mong muốn
    const update = {};
    for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) update[k] = v;
    }
    if ('Price_per_day' in update && Number.isNaN(update.Price_per_day)) {
        throw new ApiError(400, 'Price_per_day is invalid.');
    }

    await homestayTable().where('H_ID', id).update(update);
    return { ...existed, ...update, H_ID: id };
}

async function deleteHomestay(id) {
    const existed = await homestayTable().where('H_ID', id).first();
    if (!existed) return null;
    await homestayTable().where('H_ID', id).del();
    return existed;
}

async function getHomestaysByOwner(ownerId) {
    return homestayTable()
        .where('U_ID', ownerId)
        .select('H_ID', 'U_ID', 'H_Name', 'H_Address', 'H_City', 'H_Description', 'Price_per_day', 'Status', 'Created_at', 'Updated_at')
        .orderBy('H_ID', 'desc');
}

module.exports = {
    createHomestay,
    getManyHomestays,
    getHomestayById,
    updateHomestay,
    deleteHomestay,
    getHomestaysByOwner,
};
