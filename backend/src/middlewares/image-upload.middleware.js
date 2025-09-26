// src/middlewares/image-upload.middleware.js
const multer = require('multer');
const path = require('path');
const ApiError = require('../api-error');

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join('./public/uploads/')),
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    },
});

function imageUpload(req, res, next) {
    const upload = multer({
        storage,
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const ok = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname);
            if (!ok) return cb(new ApiError(400, 'Only jpg/jpeg/png/gif/webp are allowed'));
            cb(null, true);
        },
    }).single('imageFile'); // field name

    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) return next(new ApiError(400, 'Upload image error'));
        if (err) return next(new ApiError(500, 'Unknown error while uploading image'));
        next();
    });
}

module.exports = { imageUpload };
