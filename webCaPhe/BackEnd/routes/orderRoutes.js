const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// API truy vấn tổng tiền tất cả đơn hàng đã thanh toán thành công trong ngày hôm nay (Từ 00:00 đến hiện tại)
router.get("/invoices/today-revenue", orderController.getTodayRevenue);
router.get("/invoices/today-total", orderController.getTodayRevenue);
router.get("/orders/today-revenue", orderController.getTodayRevenue);
router.get("/donhang/today-revenue", orderController.getTodayRevenue);

// Route lấy danh sách đơn hàng
router.get("/orders", orderController.getAllOrders);
router.get("/donhang", orderController.getAllOrders);
router.get("/invoices", orderController.getAllOrders);

// Route cập nhật trạng thái đơn hàng (Thu ngân / Pha chế)
router.patch("/orders/:id/status", orderController.updateOrderStatus);

module.exports = router;
