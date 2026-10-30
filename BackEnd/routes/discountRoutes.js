const express = require("express");
const router = express.Router();
const discountController = require("../controllers/discountController");

// [GET] Danh sách mã giảm giá
router.get("/discounts", discountController.getAllDiscounts);
router.get("/mamgiamgia", discountController.getAllDiscounts);

// [GET] Chi tiết mã giảm giá
router.get("/discounts/:id", discountController.getDiscountById);

// [POST] Tạo mới mã giảm giá (kèm ràng buộc Mốc điểm)
router.post("/discounts", discountController.createDiscount);
router.post("/mamgiamgia", discountController.createDiscount);

// [PUT] Cập nhật mã giảm giá
router.put("/discounts/:id", discountController.updateDiscount);

// [PATCH] Bật / Tắt trạng thái mã giảm giá
router.patch("/discounts/:id/status", discountController.toggleDiscountStatus);

// [DELETE] Xóa mã giảm giá
router.delete("/discounts/:id", discountController.deleteDiscount);

// [POST] Kiểm tra tính hợp lệ & điều kiện mốc điểm của mã giảm giá khi order tại POS
router.post("/discounts/validate", discountController.validateDiscount);
router.post("/discounts/check", discountController.validateDiscount);

module.exports = router;
