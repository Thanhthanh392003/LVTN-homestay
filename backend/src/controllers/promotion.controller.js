const promoService = require('../services/promotion.service');
const JSend = require('../jsend');
const ApiError = require('../api-error');

async function createPromotion(req, res) {
    try {
        const promotion = await promoService.createPromotion(req, req.body);
        return res.status(201).json(JSend.success({ promotion }, 'Promotion created'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Create promotion failed'));
    }
}

async function updatePromotion(req, res) {
    try {
        const { id } = req.params;
        const promotion = await promoService.updatePromotion(req, id, req.body);
        return res.json(JSend.success({ promotion }, 'Promotion updated'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Update promotion failed'));
    }
}

async function deletePromotion(req, res) {
    try {
        const { id } = req.params;
        await promoService.deletePromotion(req, id);
        return res.json(JSend.success({}, 'Promotion deleted'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Delete promotion failed'));
    }
}

async function getPromotionById(req, res) {
    try {
        const { id } = req.params;
        const data = await promoService.getPromotionById(req, id);
        return res.json(JSend.success(data));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 404;
        return res.status(status).json(JSend.fail(error.message || 'Promotion not found'));
    }
}

async function listPromotions(req, res) {
    try {
        const promotions = await promoService.listPromotions(req.query);
        return res.json(JSend.success({ promotions }));
    } catch (error) {
        return res.status(400).json(JSend.fail(error.message || 'Cannot list promotions'));
    }
}

async function applyPromotionToHomestay(req, res) {
    try {
        const result = await promoService.applyPromotionToHomestay(req, req.body);
        return res.json(JSend.success(result));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Apply promotion failed'));
    }
}

async function removePromotionFromHomestay(req, res) {
    try {
        const result = await promoService.removePromotionFromHomestay(req, req.body);
        return res.json(JSend.success(result));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Remove promotion failed'));
    }
}

async function listActivePromotionsByHomestay(req, res) {
    try {
        const { h_id } = req.params;
        const rows = await promoService.listActivePromotionsByHomestay(h_id);
        return res.json(JSend.success({ promotions: rows }));
    } catch (error) {
        return res.status(400).json(JSend.fail(error.message || 'Cannot list active promotions'));
    }
}

module.exports = {
    createPromotion,
    updatePromotion,
    deletePromotion,
    getPromotionById,
    listPromotions,
    applyPromotionToHomestay,
    removePromotionFromHomestay,
    listActivePromotionsByHomestay,
};
