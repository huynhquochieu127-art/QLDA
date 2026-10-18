const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

router.get("/notifications/my", notificationController.getMyNotifications);
router.get("/thongbao/my", notificationController.getMyNotifications);
router.put("/notifications/:id/read", notificationController.markAsRead);
router.put("/notifications/read-all", notificationController.markAllAsRead);

module.exports = router;
