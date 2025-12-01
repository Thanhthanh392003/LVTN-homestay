// backend/src/routes/complaint.route.js

const express = require("express");
const router = express.Router();
const controller = require("../controllers/complaint.controller");

// Gửi khiếu nại / góp ý
router.post("/", controller.createComplaint);

// Lấy danh sách khiếu nại của người dùng đang đăng nhập
router.get("/mine", controller.listMyComplaints);

// Owner xem khiếu nại liên quan đến homestay của mình
router.get("/owner", controller.listComplaintsForOwnerView);

// Admin/Owner xem tất cả khiếu nại
router.get("/", controller.listComplaintsForOwner);

// Update trạng thái complaint
router.patch("/:id/status", controller.updateComplaintStatus);

// Admin gửi phản hồi khiếu nại
router.post("/:id/reply", controller.replyToComplaint);


module.exports = router;
