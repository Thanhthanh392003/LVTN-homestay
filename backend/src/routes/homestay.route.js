// src/routes/homestay.route.js
const router = require("express").Router();
const ctrl = require("../controllers/homestay.controller");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// ==== Middleware loader an toàn (tránh crash nếu export khác dạng) ====
function loadMw(modPath, key) {
    try {
        const m = require(modPath);
        if (key && typeof m?.[key] === "function") return m[key];
        if (typeof m?.default === "function") return m.default;
        if (typeof m === "function") return m;
        return (req, _res, next) => next();
    } catch (_e) {
        return (req, _res, next) => next();
    }
}

const requireLogin = loadMw("../middlewares/requireLogin");
const authRequired = loadMw("../middlewares/auth", "authRequired");
const ownerOnly = loadMw("../middlewares/auth", "ownerOnly");

const needLogin = (req, res, next) =>
    requireLogin(req, res, () => authRequired(req, res, () => next()));
const needOwner = (req, res, next) => ownerOnly(req, res, () => next());

// ====== Multer for images ======
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
        const base = path
            .basename(file.originalname || "img", ext)
            .replace(/\s+/g, "_");
        cb(null, `${Date.now()}_${base}${ext}`);
    },
});
const fileFilter = (req, file, cb) =>
    file.mimetype?.startsWith("image/")
        ? cb(null, true)
        : cb(new Error("Only images"), false);
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

// ========= OWNER =========
router.get("/owner/mine", needLogin, ctrl.listMine);
router.post("/", needLogin, ctrl.create);
router.put("/:id", needLogin, ctrl.update);

// ========= PUBLIC =========
// ⚠️ search-by-price phải đặt TRƯỚC "/:id" để không bị nuốt bởi route động
router.get("/search-by-price", ctrl.searchByPrice);
router.get("/", ctrl.listPublic);
router.get(
    "/search",
    ctrl.searchAvailable ?? ((req, res) => res.json({ status: "success", data: [] }))
);
router.get("/:id", ctrl.getOne);
router.get("/:id/images-public", ctrl.listImagesPublic);

// ========= BLOCKED DATES / CALENDAR =========
router.get("/:id/blocked-dates", ctrl.getBlockedDates);
router.get("/:id/calendar", needLogin, ctrl.getOwnerCalendar);

// ========= IMAGES (owner) =========
router.get("/:id/images", needLogin, ctrl.listImages);
router.post("/:id/images", needLogin, upload.array("images", 10), ctrl.uploadImages);
router.patch("/:id/images/:imageId/main", needLogin, ctrl.setMainImage);
router.delete("/:id/images/:imageId", needLogin, ctrl.deleteImage);

// ========= PROMOTIONS BINDING =========
router.get("/:id/promotions", needLogin, ctrl.getPromotionsOfHomestay);
router.patch("/:id/promotions", needLogin, needOwner, ctrl.setPromotionsBulk);

// ========= DELETE (owner) =========
router.delete("/:id", needLogin, ctrl.remove);

// ========= ADMIN =========
router.get("/admin/homestays", needLogin, ctrl.adminList);
router.post("/admin/homestays/:id/approve", needLogin, ctrl.adminApprove);
router.post("/admin/homestays/:id/reject", needLogin, ctrl.adminReject);

// ⭐ THÊM 2 ROUTE NÀY ĐỂ CHẶN / BỎ CHẶN
router.post("/admin/homestays/:id/block", needLogin, ctrl.adminBlock);
router.post("/admin/homestays/:id/unblock", needLogin, ctrl.adminUnblock);

router.delete("/admin/homestays/:id", needLogin, ctrl.adminRemove);

module.exports = router;
