const db = require("../config/db");

// Đảm bảo schema bảng thongbao luôn có đủ các cột cần thiết
async function ensureNotificationSchema() {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM thongbao");
    const colNames = cols.map((c) => c.Field);
    if (!colNames.includes("MaNhanVien")) {
      await db.query("ALTER TABLE thongbao ADD COLUMN MaNhanVien INT NULL");
    }
    if (!colNames.includes("Link")) {
      await db.query("ALTER TABLE thongbao ADD COLUMN Link VARCHAR(255) NULL");
    }
    if (!colNames.includes("DaXem")) {
      await db.query("ALTER TABLE thongbao ADD COLUMN DaXem TINYINT(1) DEFAULT 0");
    }
  } catch (err) {
    console.warn("ensureNotificationSchema warning:", err.message);
  }
}
ensureNotificationSchema();

// [GET] /api/notifications/my - Lấy danh sách thông báo của nhân viên
exports.getMyNotifications = async (req, res) => {
  try {
    const maNhanVien = req.query.maNhanVien || req.user?.id || req.user?.MaNhanVien;

    let query = `
      SELECT MaTB, TieuDe, NoiDung, Loai, NgayTao, MaNhanVien, Link, DaXem
      FROM thongbao
    `;
    const params = [];

    if (maNhanVien) {
      query += ` WHERE MaNhanVien = ? OR MaNhanVien IS NULL`;
      params.push(maNhanVien);
    }
    query += ` ORDER BY NgayTao DESC, MaTB DESC LIMIT 50`;

    const [rows] = await db.query(query, params);

    const unreadCount = rows.filter((r) => !r.DaXem).length;

    return res.json({
      success: true,
      data: rows,
      unreadCount,
    });
  } catch (error) {
    console.error("Lỗi getMyNotifications:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// [PUT] /api/notifications/:id/read - Đánh dấu thông báo đã đọc
exports.markAsRead = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query("UPDATE thongbao SET DaXem = 1 WHERE MaTB = ?", [id]);
    return res.json({ success: true, message: "Đã đánh dấu đã đọc" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// [PUT] /api/notifications/read-all - Đánh dấu tất cả thông báo là đã đọc
exports.markAllAsRead = async (req, res) => {
  try {
    const { maNhanVien } = req.body;
    if (maNhanVien) {
      await db.query(
        "UPDATE thongbao SET DaXem = 1 WHERE MaNhanVien = ? OR MaNhanVien IS NULL",
        [maNhanVien]
      );
    } else {
      await db.query("UPDATE thongbao SET DaXem = 1");
    }
    return res.json({ success: true, message: "Đã đánh dấu tất cả là đã đọc" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
