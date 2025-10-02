// src/routes/homestay.route.js
const router = require("express").Router();
const ctrl = require("../controllers/homestay.controller");
const requireLogin = require("../middlewares/requireLogin");

const multer = require("multer");
const fs = require("fs");
const path = require("path");

const PUBLIC_ROOT = path.resolve(__dirname, "../../public");
const UPLOAD_DIR = path.join(PUBLIC_ROOT, "uploads");

function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureDirSync(UPLOAD_DIR);
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || ".jpg");
        const base = path.basename(file.originalname || "img", ext).replace(/\s+/g, "_");
        const name = `${Date.now()}_${base}${ext}`;
        cb(null, name);
    },
});

const fileFilter = (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) return cb(new Error("Only images"), false);
    cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ========= Owner =========
router.get("/owner/mine", requireLogin, ctrl.listMine);
router.post("/", requireLogin, ctrl.create);
router.put("/:id", requireLogin, ctrl.update);

// ========= PUBLIC =========
router.get("/", ctrl.listPublic);
router.get("/search", ctrl.searchAvailable);
router.get("/:id", ctrl.getOne);
router.get("/:id/images-public", ctrl.listImagesPublic);

// ========= Images (owner) =========
router.get("/:id/images", requireLogin, ctrl.listImages);
router.post("/:id/images", requireLogin, upload.array("images", 10), ctrl.uploadImages);
router.patch("/:id/images/:imageId/main", requireLogin, ctrl.setMainImage);
router.delete("/:id/images/:imageId", requireLogin, ctrl.deleteImage);

// ========= Delete homestay (owner) =========
router.delete("/:id", requireLogin, ctrl.remove);

// ========= ADMIN =========
// Liệt kê homestay cho admin (lọc theo status & tìm kiếm)
router.get("/admin/homestays", requireLogin, ctrl.adminList);
// Phê duyệt / từ chối / xoá
router.post("/admin/homestays/:id/approve", requireLogin, ctrl.adminApprove);
router.post("/admin/homestays/:id/reject", requireLogin, ctrl.adminReject);
router.delete("/admin/homestays/:id", requireLogin, ctrl.adminRemove);

module.exports = router;
