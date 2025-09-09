const paymentService = require('../services/payment.service');
const JSend = require('../jsend');
const ApiError = require('../api-error');

async function createPayment(req, res) {
    try {
        const payment = await paymentService.createPayment(req, req.body);
        return res.status(201).json(JSend.success({ payment }, 'Payment created'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Create payment failed'));
    }
}

async function listPaymentsByBooking(req, res) {
    try {
        const { bookingId } = req.params;
        const payments = await paymentService.listPaymentsByBooking(req, bookingId);
        return res.json(JSend.success({ payments }));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Cannot list payments'));
    }
}

async function updatePaymentStatus(req, res) {
    try {
        const { id } = req.params;
        await paymentService.updatePaymentStatus(req, id, req.body.status);
        return res.json(JSend.success({}, 'Payment status updated'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Update payment status failed'));
    }
}

module.exports = { createPayment, listPaymentsByBooking, updatePaymentStatus };
