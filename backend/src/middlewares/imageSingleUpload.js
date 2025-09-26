// src/middlewares/imageSingleUpload.js
const multer = require('multer');
const path = require('path');
const ApiError = require('../api-error');

const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, path.join('./public/uploads/'));
    },
    filename: function (_req, file, cb) {
        const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniquePrefix + path.extname(file.originalname));
    },
});

function imageSingleUpload(req, res, next) {
    const upload = multer({
        storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        fileFilter: (_req, file, cb) => {
            const ok = /(\.jpg|\.jpeg|\.png|\.gif|\.webp)$/i.test(file.originalname);
            if (!ok) return cb(new ApiError(400, 'Chỉ chấp nhận ảnh jpg/jpeg/png/gif/webp'));
            cb(null, true);
        },
    }).single('imageFile'); // <— tên field trong form-data

    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return next(new ApiError(400, 'Lỗi khi upload ảnh (multer)'));
        } else if (err) {
            return next(new ApiError(500, 'Lỗi không xác định khi upload ảnh'));
        }
        next();
    });
}

module.exports = { imageSingleUpload };
