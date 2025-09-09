const knex = require('../database/knex');
const ApiError = require('../api-error');
const dayjs = require('dayjs');

async function createBooking(req, body) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const { h_id, guests, note, checkin, checkout, price_per_day } = body || {};
    if (!h_id || !guests || !checkin || !checkout || price_per_day == null) {
        throw new ApiError(400, 'Missing required fields');
    }

    const d1 = dayjs(checkin); const d2 = dayjs(checkout);
    const days = Math.max(d2.diff(d1, 'day'), 1);
    const total = Number(price_per_day) * days;

    return knex.transaction(async trx => {
        const [bookingId] = await trx('BOOKING').insert({
            U_ID: uId, H_ID: h_id, Number_of_guest: guests,
            Booking_status: 'pending', Total_price: total, Booking_note: note || null
        });
        await trx('BOOKING_DETAIL').insert({
            Booking_ID: bookingId,
            Checkin_date: d1.format('YYYY-MM-DD HH:mm:ss'),
            Checkout_date: d2.format('YYYY-MM-DD HH:mm:ss'),
            Number_of_days: days
        });
        return { Booking_ID: bookingId, total_price: total, days };
    });
}

async function listMyBookings(req) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    return knex('BOOKING as B')
        .join('BOOKING_DETAIL as BD', 'BD.Booking_ID', 'B.Booking_ID')
        .join('HOMESTAY as H', 'H.H_ID', 'B.H_ID')
        .select('B.*', 'BD.Checkin_date', 'BD.Checkout_date', 'H.H_Name', 'H.H_City')
        .where('B.U_ID', uId).orderBy('B.Created_at', 'desc');
}

async function getBookingById(req, id) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const row = await knex('BOOKING as B')
        .join('BOOKING_DETAIL as BD', 'BD.Booking_ID', 'B.Booking_ID')
        .join('HOMESTAY as H', 'H.H_ID', 'B.H_ID')
        .select('B.*', 'BD.Checkin_date', 'BD.Checkout_date', 'BD.Number_of_days', 'H.H_Name', 'H.H_City', 'H.U_ID as Owner_ID')
        .where('B.Booking_ID', id).first();
    if (!row) throw new ApiError(404, 'Booking not found');

    const isCustomer = req.session.role_id === 3 && row.U_ID === uId;
    const isOwner = req.session.role_id === 2 && row.Owner_ID === uId;
    const isAdmin = req.session.role_id === 1;
    if (!isCustomer && !isOwner && !isAdmin) throw new ApiError(403, 'Forbidden');

    return row;
}

async function cancelBooking(req, id) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const bk = await knex('BOOKING').select('U_ID', 'Booking_status').where('Booking_ID', id).first();
    if (!bk) throw new ApiError(404, 'Booking not found');
    if (bk.U_ID !== uId && req.session.role_id !== 1) throw new ApiError(403, 'Forbidden');
    if (bk.Booking_status === 'canceled') return;

    await knex('BOOKING').update({ Booking_status: 'canceled', Updated_at: knex.fn.now() }).where('Booking_ID', id);
}

async function ownerDecision(req, id, decision) {
    const uId = req.session?.user_id; const roleId = req.session?.role_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');
    if (!['approved', 'rejected'].includes(String(decision))) throw new ApiError(400, 'Invalid decision');

    const row = await knex('BOOKING as B')
        .join('HOMESTAY as H', 'H.H_ID', 'B.H_ID')
        .select('H.U_ID as Owner_ID').where('B.Booking_ID', id).first();
    if (!row) throw new ApiError(404, 'Booking not found');
    if (row.Owner_ID !== uId && roleId !== 1) throw new ApiError(403, 'Forbidden');

    await knex('BOOKING').update({ Booking_status: decision, Updated_at: knex.fn.now() }).where('Booking_ID', id);
}

module.exports = { createBooking, listMyBookings, getBookingById, cancelBooking, ownerDecision };
