const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// Route lấy danh sách đơn hàng
router.get("/orders", orderController.getAllOrders);

// Route cập nhật trạng thái đơn hàng (Thu ngân / Pha chế)
router.patch("/orders/:id/status", orderController.updateOrderStatus);

module.exports = router;
