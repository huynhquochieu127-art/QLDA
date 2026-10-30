const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");

// [POST] Tạo mới nhân viên và tài khoản (Bcrypt mật khẩu mặc định)
router.post("/employees", employeeController.createEmployee);
router.post("/users", employeeController.createEmployee); // Alias hỗ trợ

// [GET] Lấy danh sách nhân viên & phân trang
router.get("/employees", employeeController.getAllEmployees);
router.get("/users", employeeController.getAllEmployees); // Alias

// [GET] Lấy chi tiết nhân viên
router.get("/employees/:id", employeeController.getEmployeeById);

// [PUT] Cập nhật nhân viên
router.put("/employees/:id", employeeController.updateEmployee);

// [PUT / PATCH] Cập nhật mức lương và loại lương (HOURLY / MONTHLY)
router.put("/employees/:id/salary", employeeController.updateEmployeeSalary);
router.patch("/employees/:id/salary", employeeController.updateEmployeeSalary);

// [DELETE] Xóa nhân viên
router.delete("/employees/:id", employeeController.deleteEmployee);

const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// [GET] Tải file mẫu template Excel (.xlsx)
router.get("/employees/template", employeeController.downloadEmployeeTemplate);
router.get("/users/template", employeeController.downloadEmployeeTemplate);

// [POST] Upload và đọc file Excel để bóc tách & insert vào CSDL
router.post(
  "/employees/import",
  upload.single("file"),
  employeeController.importEmployeesFromExcel
);
router.post(
  "/users/import",
  upload.single("file"),
  employeeController.importEmployeesFromExcel
);

// [GET] Danh sách vai trò
router.get("/roles", employeeController.getRoles);

module.exports = router;
