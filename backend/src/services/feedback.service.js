const knex = require('../database/knex');
const ApiError = require('../api-error');

async function createFeedback(req, body) {
    const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const { booking_id, content, rating } = body || {};
    if (!booking_id || !content) throw new ApiError(400, 'Missing fields');

    const bk = await knex('BOOKING').select('U_ID').where('Booking_ID', booking_id).first();
    if (!bk) throw new ApiError(404, 'Booking not found');
    if (bk.U_ID !== uId && req.session.role_id !== 1) throw new ApiError(403, 'Forbidden');

    const [id] = await knex('FEEDBACK').insert({
        Booking_ID: booking_id, U_ID: uId, Content: content, Rating: rating || null,
    });
    return await knex('FEEDBACK').where('Feedback_ID', id).first();
}

async function listFeedbackByHomestay(h_id) {
    return knex('FEEDBACK as F')
        .join('BOOKING as B', 'B.Booking_ID', 'F.Booking_ID')
        .join('USER as U', 'U.U_ID', 'F.U_ID')
        .select('F.Feedback_ID', 'F.Content', 'F.Rating', 'F.Feedback_created_at', 'U.U_Fullname as customer_name')
        .where('B.H_ID', h_id).orderBy('F.Feedback_created_at', 'desc');
}

async function respondFeedback(req, id, response) {
    const roleId = req.session?.role_id; const uId = req.session?.user_id;
    if (!uId) throw new ApiError(401, 'Unauthorized');

    const row = await knex('FEEDBACK as F')
        .join('BOOKING as B', 'B.Booking_ID', 'F.Booking_ID')
        .join('HOMESTAY as H', 'H.H_ID', 'B.H_ID')
        .select('H.U_ID as Owner_ID').where('F.Feedback_ID', id).first();
    if (!row) throw new ApiError(404, 'Feedback not found');
    if (roleId !== 1 && row.Owner_ID !== uId) throw new ApiError(403, 'Forbidden');

    await knex('FEEDBACK').update({ Response: response || null, Feedback_updated_at: knex.fn.now() })
        .where('Feedback_ID', id);
}

module.exports = { createFeedback, listFeedbackByHomestay, respondFeedback };
