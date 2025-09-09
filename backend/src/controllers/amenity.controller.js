const amenityService = require('../services/amenity.service');
const JSend = require('../jsend');
const ApiError = require('../api-error');

async function createAmenity(req, res) {
    try {
        const amenity = await amenityService.createAmenity(req, req.body);
        return res.status(201).json(JSend.success({ amenity }, 'Amenity created'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Create amenity failed'));
    }
}

async function listAmenities(_req, res) {
    try {
        const amenities = await amenityService.listAmenities();
        return res.json(JSend.success({ amenities }));
    } catch (error) {
        return res.status(400).json(JSend.fail(error.message || 'Cannot list amenities'));
    }
}

async function assignAmenity(req, res) {
    try {
        await amenityService.assignAmenity(req, req.body);
        return res.json(JSend.success({}, 'Amenity assigned'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Assign amenity failed'));
    }
}

async function removeAmenity(req, res) {
    try {
        await amenityService.removeAmenity(req, req.body);
        return res.json(JSend.success({}, 'Amenity removed'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Remove amenity failed'));
    }
}

module.exports = {
    createAmenity,
    listAmenities,
    assignAmenity,
    removeAmenity,
};
