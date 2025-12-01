const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking.controller");

const F = (fnName) => {
    const fn = bookingController?.[fnName];
    if (typeof fn === "function") return fn;
    return (req, res) =>
        res.status(501).json({ message: `Route not implemented: bookingController.${fnName}` });
};

// -------- Khách hàng --------
router.post("/", F("create"));
router.get("/mine", F("mine"));

// -------- Chủ nhà / Admin --------
router.get("/owner", F("ownerList"));
router.get("/admin", F("adminList"));
router.get("/admin/revenue", bookingController.adminRevenue);
router.get("/admin", bookingController.getAllForAdmin);
// -------- Tiện ích --------
router.get("/unavailable/:hid", F("getUnavailableByHomestay"));

// -------- Theo ID --------
router.get("/:id", F("getById"));

router.patch("/:id/status", F("updateStatus"));
router.patch("/:id/note", F("updateNote"));
router.post("/:id/send-confirmation", F("sendConfirmation"));

// ✅ Xóa booking
router.delete("/:id", F("remove"));

module.exports = router;
