const express = require("express");
const router = express.Router();
const timesheetController = require("../controllers/timesheetController");

// Lấy danh sách bảng công tháng (QH-55)
router.get("/bangcong-thang", timesheetController.getMonthlyTimesheet);

// Nạp kịch bản mẫu kiểm thử có khiếu nại (QH-55)
router.post("/bangcong-thang/seed-demo", timesheetController.seedDemoTimesheetWithComplaint);

// Quản lý chỉnh sửa thông tin công nhân viên (QH-55)
router.put("/bangcong-thang/:id", timesheetController.updateEmployeeTimesheet);

// Quản lý giải quyết khiếu nại sau khi kiểm tra camera/sổ sách (QH-55)
router.put("/bangcong-thang/:id/resolve-complaint", timesheetController.resolveComplaint);

// Quản lý duyệt nhanh xác nhận đúng cho nhân viên
router.post("/bangcong-thang/confirm-all", timesheetController.quickConfirmAll);

// QUẢN LÝ BẤM NÚT [CHỐT BẢNG CÔNG THÁNG] VÀ GỬI SANG ADMIN TÍNH LƯƠNG (QH-55)
router.post("/bangcong-thang/close-and-submit-to-admin", timesheetController.closeAndSubmitToAdmin);

// Dành cho nhân viên kiểm tra & phản hồi bảng công (QH-54)
router.get("/bangcong-thang/my", timesheetController.getMyTimesheet);
router.post("/bangcong-thang/my/confirm", timesheetController.confirmMyTimesheet);
router.post("/bangcong-thang/my/dispute", timesheetController.disputeMyTimesheet);

module.exports = router;
