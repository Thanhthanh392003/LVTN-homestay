// src/middlewares/imageUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    },
});

const allowed = /jpeg|jpg|png|gif|webp/i;
const fileFilter = (req, file, cb) => {
    if (allowed.test(file.mimetype) || allowed.test(path.extname(file.originalname))) {
        return cb(null, true);
    }
    return cb(new Error('Chỉ cho phép ảnh'));
};

const uploadManyImages = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB/file
}).array('images', 10);

module.exports = { uploadManyImages };
