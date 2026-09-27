const db = require("../config/db"); // Đường dẫn kết nối MySQL của bạn

// 1. Lấy danh sách đơn hàng
exports.getAllOrders = (req, res) => {
  const sql = `SELECT * FROM donhang ORDER BY NgayDat DESC`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Lỗi lấy danh sách đơn hàng:", err);
      return res
        .status(500)
        .json({ message: "Lỗi server", error: err.message });
    }
    res.status(200).json(results);
  });
};

// 2. Cập nhật trạng thái đơn hàng (Thu ngân / Pha chế)
exports.updateOrderStatus = (req, res) => {
  const { id } = req.params; // MaDonHang
  const { status } = req.body; // TrangThai mới

  const validStatuses = [
    "Mới tạo",
    "Đang pha chế",
    "Hoàn thành",
    "Đã thanh toán",
    "Đã hủy",
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Trạng thái không hợp lệ" });
  }

  const sql = `UPDATE donhang SET TrangThai = ? WHERE MaDonHang = ?`;

  db.query(sql, [status, id], (err, result) => {
    if (err) {
      console.error("Lỗi cập nhật trạng thái:", err);
      return res
        .status(500)
        .json({ message: "Lỗi máy chủ", error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    res.status(200).json({
      message: "Cập nhật trạng thái thành công",
      MaDonHang: id,
      TrangThai: status,
    });
  });
};
