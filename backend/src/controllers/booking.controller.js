const bookingService = require('../services/booking.service');
const JSend = require('../jsend');
const ApiError = require('../api-error');

async function createBooking(req, res) {
    try {
        const result = await bookingService.createBooking(req, req.body);
        return res.status(201).json(JSend.success(result, 'Booking created'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Create booking failed'));
    }
}

async function listMyBookings(req, res) {
    try {
        const bookings = await bookingService.listMyBookings(req);
        return res.json(JSend.success({ bookings }));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 401;
        return res.status(status).json(JSend.fail(error.message || 'Unauthorized'));
    }
}

async function getBookingById(req, res) {
    try {
        const { id } = req.params;
        const booking = await bookingService.getBookingById(req, id);
        return res.json(JSend.success({ booking }));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 404;
        return res.status(status).json(JSend.fail(error.message || 'Booking not found'));
    }
}

async function cancelBooking(req, res) {
    try {
        const { id } = req.params;
        await bookingService.cancelBooking(req, id);
        return res.json(JSend.success({}, 'Booking canceled'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Cancel booking failed'));
    }
}

async function ownerDecision(req, res) {
    try {
        const { id } = req.params;
        const { decision } = req.body; // 'approved' | 'rejected'
        await bookingService.ownerDecision(req, id, decision);
        return res.json(JSend.success({}, `Booking ${decision}`));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Decision failed'));
    }
}

module.exports = {
    createBooking,
    listMyBookings,
    getBookingById,
    cancelBooking,
    ownerDecision,
};
