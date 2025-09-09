const knex = require('../database/knex');
const ApiError = require('../api-error');

async function createPayment(req, body) {
    const { booking_id, amount, method } = body || {};
    if (!booking_id || amount == null || !method) throw new ApiError(400, 'Missing fields');

    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const bk = await knex('BOOKING as B')
        .join('HOMESTAY as H', 'H.H_ID', 'B.H_ID')
        .select('B.U_ID as Customer_ID', 'H.U_ID as Owner_ID')
        .where('B.Booking_ID', booking_id).first();
    if (!bk) throw new ApiError(404, 'Booking not found');

    const isCustomer = req.session.role_id === 3 && bk.Customer_ID === uId;
    const isOwner = req.session.role_id === 2 && bk.Owner_ID === uId;
    const isAdmin = req.session.role_id === 1;
    if (!isCustomer && !isOwner && !isAdmin) throw new ApiError(403, 'Forbidden');

    const [id] = await knex('PAYMENT').insert({
        Booking_ID: booking_id,
        Amount: Number(amount),
        Payment_method: method,
        Payment_status: 'pending',
    });
    return await knex('PAYMENT').where('Payment_ID', id).first();
}

async function listPaymentsByBooking(req, bookingId) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const bk = await knex('BOOKING as B')
        .join('HOMESTAY as H', 'H.H_ID', 'B.H_ID')
        .select('B.U_ID as Customer_ID', 'H.U_ID as Owner_ID')
        .where('B.Booking_ID', bookingId).first();
    if (!bk) throw new ApiError(404, 'Booking not found');

    const isCustomer = req.session.role_id === 3 && bk.Customer_ID === uId;
    const isOwner = req.session.role_id === 2 && bk.Owner_ID === uId;
    const isAdmin = req.session.role_id === 1;
    if (!isCustomer && !isOwner && !isAdmin) throw new ApiError(403, 'Forbidden');

    return knex('PAYMENT').where('Booking_ID', bookingId).orderBy('Payment_created_at', 'desc');
}

async function updatePaymentStatus(req, id, status) {
    const roleId = req.session?.role_id;
    if (roleId !== 1) throw new ApiError(403, 'Forbidden');
    if (!['pending', 'paid', 'failed', 'refunded'].includes(String(status))) throw new ApiError(400, 'Invalid status');

    const ret = await knex('PAYMENT').update({ Payment_status: status }).where('Payment_ID', id);
    if (!ret) throw new ApiError(404, 'Payment not found');
}

module.exports = { createPayment, listPaymentsByBooking, updatePaymentStatus };
