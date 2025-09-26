// src/services/owner.service.js
const knex = require('../database/knex');
const ApiError = require('../api-error');

async function listMyHomestays(userId) {
    return knex('HOMESTAY')
        .select('*')
        .where({ U_ID: userId })
        .orderBy('Created_at', 'desc');
}

async function createHomestay(userId, payload) {
    const { H_Name, H_Address, H_City, H_Description = null, Price_per_day, Status = 'active' } = payload || {};
    if (!H_Name || !H_Address || !H_City || !Price_per_day) {
        throw new ApiError(400, 'Thiếu trường bắt buộc: H_Name, H_Address, H_City, Price_per_day');
    }
    const [id] = await knex('HOMESTAY').insert({
        U_ID: userId,
        H_Name,
        H_Address,
        H_City,
        H_Description,
        Price_per_day,
        Status,
    });
    return knex('HOMESTAY').where({ H_ID: id }).first();
}

async function getMineById(userId, hId) {
    const row = await knex('HOMESTAY').where({ H_ID: hId, U_ID: userId }).first();
    if (!row) throw new ApiError(403, 'Không có quyền truy cập homestay này');
    return row;
}

async function updateMine(userId, hId, patch) {
    // Chỉ cho sửa các field sau
    const allowed = (({ H_Name, H_Address, H_City, H_Description, Price_per_day, Status }) =>
        ({ H_Name, H_Address, H_City, H_Description, Price_per_day, Status }))(patch || {});
    Object.keys(allowed).forEach(k => allowed[k] === undefined && delete allowed[k]);

    const existed = await knex('HOMESTAY').where({ H_ID: hId, U_ID: userId }).first();
    if (!existed) throw new ApiError(403, 'Không có quyền cập nhật homestay này');

    await knex('HOMESTAY').where({ H_ID: hId }).update(allowed);
    return knex('HOMESTAY').where({ H_ID: hId }).first();
}

async function removeMine(userId, hId) {
    const existed = await knex('HOMESTAY').where({ H_ID: hId, U_ID: userId }).first();
    if (!existed) throw new ApiError(403, 'Không có quyền xoá homestay này');
    await knex('HOMESTAY').where({ H_ID: hId }).delete();
    return { H_ID: Number(hId) };
}

async function addImages(hId, files) {
    if (!files?.length) throw new ApiError(400, 'Chưa chọn ảnh');
    const rows = files.map((f, i) => ({
        H_ID: Number(hId),
        Image_url: `/uploads/${f.filename}`,
        IsMain: i === 0,
        Sort_order: i + 1,
    }));
    await knex('IMAGE').insert(rows);
    return rows;
}

// BOOKINGS của owner: toàn bộ booking thuộc các homestay do owner tạo
async function listMyBookings(userId) {
    return knex('BOOKING as b')
        .join('HOMESTAY as h', 'h.H_ID', 'b.H_ID')
        .leftJoin('BOOKING_DETAIL as d', 'd.Booking_ID', 'b.Booking_ID')
        .leftJoin('USER as u', 'u.U_ID', 'b.U_ID')
        .where('h.U_ID', userId)
        .select(
            'b.Booking_ID',
            'b.Booking_status',
            'b.Total_price',
            'b.Created_at',
            'u.U_Fullname as customer',
            'u.U_Phone as customer_phone',
            'h.H_Name as homestay',
            'd.Checkin_date',
            'd.Checkout_date',
            'd.Number_of_days'
        )
        .orderBy('b.Created_at', 'desc');
}

async function updateBookingStatus(userId, bookingId, newStatus) {
    // chỉ cho update nếu booking thuộc homestay của owner
    const row = await knex('BOOKING as b')
        .join('HOMESTAY as h', 'h.H_ID', 'b.H_ID')
        .where('b.Booking_ID', bookingId)
        .andWhere('h.U_ID', userId)
        .select('b.Booking_ID')
        .first();
    if (!row) throw new ApiError(403, 'Không có quyền cập nhật booking này');

    await knex('BOOKING').where({ Booking_ID: bookingId }).update({
        Booking_status: newStatus,
        Updated_at: knex.fn.now()
    });

    return knex('BOOKING').where({ Booking_ID: bookingId }).first();
}

// dashboard đơn giản
async function dashboard(userId) {
    const [{ cnt: homestays }] = await knex('HOMESTAY').where({ U_ID: userId }).count({ cnt: '*' });
    const [{ cnt: bookings }] = await knex('BOOKING as b')
        .join('HOMESTAY as h', 'h.H_ID', 'b.H_ID')
        .where('h.U_ID', userId)
        .count({ cnt: '*' });
    const [{ sum: revenue }] = await knex('BOOKING as b')
        .join('HOMESTAY as h', 'h.H_ID', 'b.H_ID')
        .where('h.U_ID', userId)
        .andWhere('b.Booking_status', 'paid')
        .sum({ sum: 'b.Total_price' });

    return {
        homestays: Number(homestays || 0),
        bookings: Number(bookings || 0),
        revenue: Number(revenue || 0),
    };
}

module.exports = {
    listMyHomestays,
    createHomestay,
    getMineById,
    updateMine,
    removeMine,
    addImages,
    listMyBookings,
    updateBookingStatus,
    dashboard,
};
