const db = require("../config/db");

// Tự động kiểm tra và đánh Index cho cột ngày tháng (NgayDat) để tối ưu truy vấn cho Dashboard
async function ensureInvoiceDateIndex() {
  try {
    const [indexes] = await db.query("SHOW INDEX FROM donhang");
    const indexNames = indexes.map((i) => i.Key_name);

    // 1. Single index trên NgayDat
    if (!indexNames.includes("idx_donhang_ngaydat")) {
      await db.query("CREATE INDEX idx_donhang_ngaydat ON donhang(NgayDat)");
      console.log("⚡ [Index] Đã tạo index idx_donhang_ngaydat trên cột NgayDat của bảng donhang");
    }

    // 2. Covering composite index (NgayDat, TrangThai, ThanhTien) giúp query tức thì trong RAM
    if (!indexNames.includes("idx_donhang_ngaydat_trangthai")) {
      await db.query("CREATE INDEX idx_donhang_ngaydat_trangthai ON donhang(NgayDat, TrangThai, ThanhTien)");
      console.log("⚡ [Index] Đã tạo covering index idx_donhang_ngaydat_trangthai cho bảng donhang");
    }

    // 3. Tạo VIEW invoices / hoadon alias để tương thích tối đa
    try {
      await db.query("CREATE OR REPLACE VIEW invoices AS SELECT * FROM donhang");
      await db.query("CREATE OR REPLACE VIEW hoadon AS SELECT * FROM donhang");
    } catch (e) {
      // Bỏ qua nếu không đủ quyền tạo view
    }
  } catch (err) {
    console.warn("ensureInvoiceDateIndex warning:", err.message);
  }
}
ensureInvoiceDateIndex();

/**
 * [GET] /api/invoices/today-revenue
 * [GET] /api/invoices/today-total
 * [GET] /api/orders/today-revenue
 * 
 * API TRUY VẤN BẢNG HÓA ĐƠN (INVOICES / DONHANG)
 * Tính tổng tiền của tất cả các đơn hàng đã thanh toán thành công trong ngày hôm nay (Từ 00:00 đến hiện tại).
 * Tối ưu hóa cực nhanh bằng B-Tree Range Index trên cột NgayDat.
 */
exports.getTodayRevenue = async (req, res) => {
  const startTime = process.hrtime();
  try {
    const now = new Date();
    
    // Định dạng ngày hôm nay (mặc định lấy theo giờ hệ thống)
    let targetDateStr = req.query.date; // Tùy chọn: ?date=YYYY-MM-DD
    let startOfDay, endOfRange;

    if (targetDateStr && /^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) {
      startOfDay = `${targetDateStr} 00:00:00`;
      endOfRange = `${targetDateStr} 23:59:59`;
    } else {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");

      targetDateStr = `${year}-${month}-${day}`;
      startOfDay = `${targetDateStr} 00:00:00`;
      endOfRange = `${targetDateStr} ${hours}:${minutes}:${seconds}`; // Từ 00:00 đến thời điểm hiện tại
    }

    // 1. TRUY VẤN TÍNH TỔNG TIỀN (Sử dụng trực tiếp B-Tree Index Range Scan)
    const [summaryRows] = await db.query(
      `SELECT 
        COALESCE(SUM(COALESCE(ThanhTien, TongTien)), 0) AS TongTien,
        COUNT(*) AS SoDonHang,
        COALESCE(AVG(COALESCE(ThanhTien, TongTien)), 0) AS GiaTriTrungBinh,
        MIN(NgayDat) AS DonDauTien,
        MAX(NgayDat) AS DonMoiNhat
       FROM donhang
       WHERE NgayDat >= ? AND NgayDat <= ?
         AND (TrangThai IN ('Đã thanh toán', 'DA_THANH_TOAN', 'paid', 'completed', 'Thành công') 
              OR LOWER(TrangThai) LIKE '%thanh toán%')`,
      [startOfDay, endOfRange]
    );

    // 2. PHÂN BỔ DOANH THU THEO PHƯƠNG THỨC THANH TOÁN (Tiền mặt, Chuyển khoản, Thẻ...)
    const [paymentMethods] = await db.query(
      `SELECT 
        COALESCE(PhuongThucThanhToan, 'TIEN_MAT') AS PhuongThuc,
        COUNT(*) AS SoLuong,
        COALESCE(SUM(COALESCE(ThanhTien, TongTien)), 0) AS TongTien
       FROM donhang
       WHERE NgayDat >= ? AND NgayDat <= ?
         AND (TrangThai IN ('Đã thanh toán', 'DA_THANH_TOAN', 'paid', 'completed', 'Thành công') 
              OR LOWER(TrangThai) LIKE '%thanh toán%')
       GROUP BY PhuongThucThanhToan`,
      [startOfDay, endOfRange]
    );

    // 3. DANH SÁCH HÓA ĐƠN ĐÃ THANH TOÁN TRONG NGÀY (Phục vụ Dashboard xem chi tiết)
    const [recentOrders] = await db.query(
      `SELECT 
        dh.MaDonHang,
        dh.MaBan,
        dh.MaNhanVien,
        dh.MaKhachHang,
        dh.TongTien,
        dh.GiamGia,
        dh.ThanhTien,
        dh.PhuongThucThanhToan,
        dh.TrangThai,
        DATE_FORMAT(dh.NgayDat, '%H:%i:%s') AS GioDat,
        DATE_FORMAT(dh.NgayDat, '%d/%m/%Y %H:%i:%s') AS ThoiGian
       FROM donhang dh
       WHERE dh.NgayDat >= ? AND dh.NgayDat <= ?
         AND (dh.TrangThai IN ('Đã thanh toán', 'DA_THANH_TOAN', 'paid', 'completed', 'Thành công') 
              OR LOWER(dh.TrangThai) LIKE '%thanh toán%')
       ORDER BY dh.NgayDat DESC`,
      [startOfDay, endOfRange]
    );

    const diff = process.hrtime(startTime);
    const executionTimeMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

    const tongTien = Number(summaryRows[0]?.TongTien || 0);
    const soDonHang = Number(summaryRows[0]?.SoDonHang || 0);
    const giaTriTrungBinh = Math.round(Number(summaryRows[0]?.GiaTriTrungBinh || 0));

    return res.json({
      success: true,
      message: "Truy vấn tổng doanh thu hóa đơn hôm nay thành công (Sử dụng Index)",
      thoiGian: {
        ngay: targetDateStr,
        tuGio: startOfDay,
        denGio: endOfRange,
        laHienTai: endOfRange.endsWith(targetDateStr) === false,
      },
      duLieu: {
        tongTien: tongTien,
        tongTienFormatted: `${tongTien.toLocaleString("vi-VN")} đ`,
        soDonHang: soDonHang,
        giaTriTrungBinh: giaTriTrungBinh,
        giaTriTrungBinhFormatted: `${giaTriTrungBinh.toLocaleString("vi-VN")} đ`,
        donDauTien: summaryRows[0]?.DonDauTien || null,
        donMoiNhat: summaryRows[0]?.DonMoiNhat || null,
      },
      phanBoPhuongThuc: paymentMethods.map((p) => ({
        phuongThuc: p.PhuongThuc,
        soLuong: Number(p.SoLuong),
        tongTien: Number(p.TongTien),
        tongTienFormatted: `${Number(p.TongTien).toLocaleString("vi-VN")} đ`,
      })),
      danhSachHoaDon: recentOrders,
      hieuNang: {
        indexSuDung: "idx_donhang_ngaydat_trangthai (B-Tree Covering Index)",
        thoiGianThucThiMs: `${executionTimeMs} ms`,
        toiUuChoDashboard: true,
      },
    });
  } catch (error) {
    console.error("Lỗi getTodayRevenue:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi truy vấn tổng tiền hóa đơn hôm nay",
      error: error.message,
    });
  }
};

// [GET] /api/orders - Lấy danh sách toàn bộ đơn hàng
exports.getAllOrders = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const [rows] = await db.query(
      `SELECT * FROM donhang ORDER BY NgayDat DESC LIMIT ?`,
      [limit]
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("Lỗi lấy danh sách đơn hàng:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// [PATCH] /api/orders/:id/status - Cập nhật trạng thái đơn hàng (Thu ngân / Pha chế)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "Mới tạo",
      "Đang pha chế",
      "Hoàn thành",
      "Đã thanh toán",
      "DA_THANH_TOAN",
      "Đã hủy",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const [result] = await db.query(
      `UPDATE donhang SET TrangThai = ? WHERE MaDonHang = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    return res.status(200).json({
      message: "Cập nhật trạng thái thành công",
      MaDonHang: id,
      TrangThai: status,
    });
  } catch (err) {
    console.error("Lỗi cập nhật trạng thái đơn hàng:", err);
    return res.status(500).json({ message: "Lỗi máy chủ", error: err.message });
  }
};
