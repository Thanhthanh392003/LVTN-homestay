const knex = require('../database/knex');
const ApiError = require('../api-error');

async function createComplaint(req, body) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const { booking_id, content } = body || {};
    if (!booking_id || !content) throw new ApiError(400, 'Missing fields');

    const bk = await knex('BOOKING').select('U_ID').where('Booking_ID', booking_id).first();
    if (!bk) throw new ApiError(404, 'Booking not found');
    if (bk.U_ID !== uId && req.session.role_id !== 1) throw new ApiError(403, 'Forbidden');

    const [id] = await knex('COMPLAINT').insert({
        Booking_ID: booking_id, U_ID: uId, Complaint_content: content, Complaint_status: 'pending',
    });
    return await knex('COMPLAINT').where('Complaint_ID', id).first();
}

async function listMyComplaints(req) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    return knex('COMPLAINT as C')
        .join('BOOKING as B', 'B.Booking_ID', 'C.Booking_ID')
        .join('HOMESTAY as H', 'H.H_ID', 'B.H_ID')
        .select('C.*', 'B.H_ID', 'H.H_Name')
        .where('C.U_ID', uId).orderBy('C.Complaint_created_at', 'desc');
}

async function listComplaintsForOwner(req, query = {}) {
    const roleId = req.session?.role_id;
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const base = knex('COMPLAINT as C')
        .join('BOOKING as B', 'B.Booking_ID', 'C.Booking_ID')
        .join('HOMESTAY as H', 'H.H_ID', 'B.H_ID')
        .join('USER as U', 'U.U_ID', 'C.U_ID')
        .select('C.*', 'B.H_ID', 'H.H_Name', 'U.U_Fullname as CustomerName');

    if (roleId === 1) {
        if (query.h_id) base.where('B.H_ID', Number(query.h_id));
        return base.orderBy('C.Complaint_created_at', 'desc');
    }
    if (roleId === 2) {
        base.where('H.U_ID', uId);
        if (query.h_id) base.where('B.H_ID', Number(query.h_id));
        return base.orderBy('C.Complaint_created_at', 'desc');
    }
    throw new ApiError(403, 'Forbidden');
}

async function updateComplaintStatus(req, id, status) {
    const roleId = req.session?.role_id; const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');
    if (!['pending', 'resolved', 'rejected'].includes(String(status))) throw new ApiError(400, 'Invalid status');

    if (roleId === 1) {
        const ret = await knex('COMPLAINT').update({ Complaint_status: status }).where('Complaint_ID', id);
        if (!ret) throw new ApiError(404, 'Complaint not found');
        return { complaint: await knex('COMPLAINT').where('Complaint_ID', id).first() };
    }
    if (roleId === 2) {
        const row = await knex('COMPLAINT as C')
            .join('BOOKING as B', 'B.Booking_ID', 'C.Booking_ID')
            .join('HOMESTAY as H', 'H.H_ID', 'B.H_ID')
            .select('C.Complaint_ID')
            .where('C.Complaint_ID', id).andWhere('H.U_ID', uId).first();
        if (!row) throw new ApiError(403, 'Forbidden');

        await knex('COMPLAINT').update({ Complaint_status: status }).where('Complaint_ID', id);
        return { complaint: await knex('COMPLAINT').where('Complaint_ID', id).first() };
    }
    throw new ApiError(403, 'Forbidden');
}

module.exports = { createComplaint, listMyComplaints, listComplaintsForOwner, updateComplaintStatus };
