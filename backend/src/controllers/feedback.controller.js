const feedbackService = require('../services/feedback.service');
const JSend = require('../jsend');
const ApiError = require('../api-error');

async function createFeedback(req, res) {
    try {
        const fb = await feedbackService.createFeedback(req, req.body);
        return res.status(201).json(JSend.success({ feedback: fb }, 'Feedback submitted'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Create feedback failed'));
    }
}

async function listFeedbackByHomestay(req, res) {
    try {
        const { h_id } = req.params;
        const items = await feedbackService.listFeedbackByHomestay(h_id);
        return res.json(JSend.success({ feedbacks: items }));
    } catch (error) {
        return res.status(400).json(JSend.fail(error.message || 'Cannot list feedback'));
    }
}

async function respondFeedback(req, res) {
    try {
        const { id } = req.params;
        const { response } = req.body;
        await feedbackService.respondFeedback(req, id, response);
        return res.json(JSend.success({}, 'Feedback responded'));
    } catch (error) {
        const status = error instanceof ApiError ? error.statusCode : 400;
        return res.status(status).json(JSend.fail(error.message || 'Respond feedback failed'));
    }
}

module.exports = { createFeedback, listFeedbackByHomestay, respondFeedback };
