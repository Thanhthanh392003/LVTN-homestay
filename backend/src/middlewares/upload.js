const fs = require("fs");
const path = require("path");
const multer = require("multer");

function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const hid = String(req.params.id || "misc");
        const dir = path.join(__dirname, "../public/uploads/homestays", hid);
        ensureDirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || ".jpg");
        const base = path
            .basename(file.originalname || "img", ext)
            .replace(/\s+/g, "_");
        cb(null, `${Date.now()}_${base}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
        return cb(new Error("Chỉ chấp nhận file ảnh"), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = { upload };
