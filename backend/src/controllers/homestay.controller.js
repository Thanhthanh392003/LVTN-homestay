const homestayService = require('../services/homestay.service');
const JSend = require('../jsend');
const ApiError = require('../api-error');

async function listHomestays(req, res) {
    try {
        const rows = await homestayService.listHomestays(req.query);
        return res.json(JSend.success({ homestays: rows }));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Cannot list homestays'));
    }
}

async function getHomestayById(req, res) {
    try {
        const { id } = req.params;
        const data = await homestayService.getHomestayById(id);
        return res.json(JSend.success(data));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 404;
        return res.status(status).json(JSend.fail(error.message || 'Homestay not found'));
    }
}

async function createHomestay(req, res) {
    try {
        const id = await homestayService.createHomestay(req, req.body);
        return res.status(201).json(JSend.success({ homestay_id: id }, 'Homestay created (pending approval)'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Create homestay failed'));
    }
}

async function updateHomestay(req, res) {
    try {
        const { id } = req.params;
        await homestayService.updateHomestay(req, id, req.body);
        return res.json(JSend.success({}, 'Homestay updated'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Update homestay failed'));
    }
}

async function updateHomestayStatus(req, res) {
    try {
        const { id } = req.params;
        await homestayService.updateHomestayStatus(req, id, req.body.status);
        return res.json(JSend.success({}, 'Status updated'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Update status failed'));
    }
}

async function deleteHomestay(req, res) {
    try {
        const { id } = req.params;
        await homestayService.deleteHomestay(req, id);
        return res.json(JSend.success({}, 'Homestay deleted'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Delete homestay failed'));
    }
}

module.exports = {
    listHomestays,
    getHomestayById,
    createHomestay,
    updateHomestay,
    updateHomestayStatus,
    deleteHomestay,
};
