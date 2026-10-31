const express = require("express");
const router = express.Router();
const payrollController = require("../controllers/payrollController");

// ADMIN BẮT ĐẦU CHẠY TÍNH LƯƠNG
// Kiểm tra nghiêm ngặt: Chỉ bắt đầu chạy khi nhận được tín hiệu "Đã chốt sổ" từ QH-55 đẩy sang
router.post("/bangluong/calculate", payrollController.calculatePayroll);

// Lấy danh sách bảng lương tháng của Admin
router.get("/bangluong", payrollController.getPayrollList);

// Admin duyệt từng phiếu lương
router.put("/bangluong/:id/approve", payrollController.approvePayrollItem);

// Admin duyệt toàn bộ bảng lương tháng
router.post("/bangluong/approve-all", payrollController.approveAllPayroll);

// Nhân viên xem phiếu lương thật của mình (QH-59)
router.get("/bangluong/my", payrollController.getMyPayslip);

module.exports = router;
