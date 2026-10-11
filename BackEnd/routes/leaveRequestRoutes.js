const express = require("express");
const router = express.Router();
const leaveRequestController = require("../controllers/leaveRequestController");

// [GET] Lấy danh sách đơn xin nghỉ (hỗ trợ lọc status, search, employeeId)
router.get("/", leaveRequestController.getAllLeaveRequests);

// [POST] Gửi đơn xin nghỉ phép mới
router.post("/", leaveRequestController.createLeaveRequest);

// [PATCH] Cập nhật trạng thái đơn: Phê duyệt (approved) hoặc Từ chối (rejected)
router.patch("/:id/status", leaveRequestController.updateLeaveRequestStatus);

// [PUT] Hỗ trợ method PUT tương thích
router.put("/:id/status", leaveRequestController.updateLeaveRequestStatus);

// [DELETE] Xóa đơn xin nghỉ
router.delete("/:id", leaveRequestController.deleteLeaveRequest);

module.exports = router;
