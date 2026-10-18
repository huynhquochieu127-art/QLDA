const express = require("express");
const router = express.Router();
const shiftController = require("../controllers/shiftController");

// Ca làm việc cơ bản
router.get("/shifts", shiftController.getAllShifts);
router.get("/shifts/part-time", shiftController.getPartTimeShifts);
router.post("/shifts/config-part-time", shiftController.savePartTimeShiftConfig);
router.put("/shifts/config-part-time", shiftController.savePartTimeShiftConfig);

// Đăng ký ca & Quản lý duyệt ca (lưu trữ trực tiếp Database bảng dangky_ca)
router.get("/shifts/registrations", shiftController.getShiftRegistrations);
router.post("/shifts/registrations", shiftController.createShiftRegistration);
router.put("/shifts/registrations/approve-all", shiftController.approveAllShifts);
router.put("/shifts/registrations/:id/status", shiftController.updateRegistrationStatus);
router.put("/shifts/registrations/:id/reassign", shiftController.reassignShift);
router.delete("/shifts/registrations/:id", shiftController.deleteShiftRegistration);
router.post("/shifts/registrations/reset-sample", shiftController.resetSampleRegistrations);

module.exports = router;
