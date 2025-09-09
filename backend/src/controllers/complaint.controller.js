const complaintService = require('../services/complaint.service');
const JSend = require('../jsend');
const ApiError = require('../api-error');

async function createComplaint(req, res) {
    try {
        const c = await complaintService.createComplaint(req, req.body);
        return res.status(201).json(JSend.success({ complaint: c }, 'Complaint created'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Create complaint failed'));
    }
}

async function listMyComplaints(req, res) {
    try {
        const rows = await complaintService.listMyComplaints(req);
        return res.json(JSend.success({ complaints: rows }));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 401;
        return res.status(status).json(JSend.fail(error.message || 'Unauthorized'));
    }
}

async function listComplaintsForOwner(req, res) {
    try {
        const rows = await complaintService.listComplaintsForOwner(req, req.query);
        return res.json(JSend.success({ complaints: rows }));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 403;
        return res.status(status).json(JSend.fail(error.message || 'Forbidden'));
    }
}

async function updateComplaintStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await complaintService.updateComplaintStatus(req, id, status);
        return res.json(JSend.success(result, 'Complaint status updated'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Update status failed'));
    }
}

module.exports = {
    createComplaint,
    listMyComplaints,
    listComplaintsForOwner,
    updateComplaintStatus,
};
