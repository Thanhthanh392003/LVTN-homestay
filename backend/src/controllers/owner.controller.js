// src/controllers/owner.controller.js
const JSend = require('../jsend');
const ApiError = require('../api-error');
const ownerService = require('../services/owner.service');

const getUserId = (req) => {
    const uid = req.session?.user_id;
    if (!uid) throw new ApiError(401, 'Bạn cần đăng nhập');
    return uid;
};

exports.dashboard = async (req, res, next) => {
    try {
        const uid = getUserId(req);
        const data = await ownerService.dashboard(uid);
        res.json(JSend.success(data));
    } catch (err) { next(err); }
};

exports.listHomestays = async (req, res, next) => {
    try {
        const uid = getUserId(req);
        const rows = await ownerService.listMyHomestays(uid);
        res.json(JSend.success(rows));
    } catch (err) { next(err); }
};

exports.createHomestay = async (req, res, next) => {
    try {
        const uid = getUserId(req);
        const created = await ownerService.createHomestay(uid, req.body);
        res.status(201).json(JSend.success(created, 'Tạo homestay thành công'));
    } catch (err) { next(err); }
};

exports.getHomestay = async (req, res, next) => {
    try {
        const uid = getUserId(req);
        const row = await ownerService.getMineById(uid, req.params.id);
        res.json(JSend.success(row));
    } catch (err) { next(err); }
};

exports.updateHomestay = async (req, res, next) => {
    try {
        const uid = getUserId(req);
        const updated = await ownerService.updateMine(uid, req.params.id, req.body);
        res.json(JSend.success(updated, 'Cập nhật thành công'));
    } catch (err) { next(err); }
};

exports.deleteHomestay = async (req, res, next) => {
    try {
        const uid = getUserId(req);
        const r = await ownerService.removeMine(uid, req.params.id);
        res.json(JSend.success(r, 'Đã xoá'));
    } catch (err) { next(err); }
};

exports.addImages = async (req, res, next) => {
    try {
        const uid = getUserId(req);
        // bảo vệ quyền sở hữu
        await ownerService.getMineById(uid, req.params.id);
        const imgs = await ownerService.addImages(req.params.id, req.files);
        res.json(JSend.success(imgs, 'Upload thành công'));
    } catch (err) { next(err); }
};

exports.listBookings = async (req, res, next) => {
    try {
        const uid = getUserId(req);
        const rows = await ownerService.listMyBookings(uid);
        res.json(JSend.success(rows));
    } catch (err) { next(err); }
};

exports.updateBookingStatus = async (req, res, next) => {
    try {
        const uid = getUserId(req);
        const { status } = req.body || {};
        if (!status) throw new ApiError(400, 'Thiếu status');
        const row = await ownerService.updateBookingStatus(uid, req.params.id, status);
        res.json(JSend.success(row, 'Đã cập nhật trạng thái'));
    } catch (err) { next(err); }
};
