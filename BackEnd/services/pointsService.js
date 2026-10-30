/**
 * pointsService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Service tích điểm tự động chạy ngầm (Hook / Trigger).
 *
 * QUY TẮC TÍCH ĐIỂM:
 *   - Tỷ lệ: 10.000 VNĐ = 1 điểm
 *   - Điểm tích = FLOOR(ThanhTien / 10000)
 *   - Chỉ cộng điểm 1 lần duy nhất mỗi đơn (idempotent — kiểm tra lichsu_diem)
 *   - Chỉ kích hoạt khi TrangThai = "Đã thanh toán"
 *   - Ghi nhật ký vào bảng lichsu_diem để audit & debug
 */

const POINTS_RATIO = 10000; // 10.000 VNĐ = 1 điểm

/**
 * Tự động tạo bảng lichsu_diem nếu chưa tồn tại.
 * Gọi 1 lần khi server khởi động.
 */
async function ensurePointsLogTable(db) {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS lichsu_diem (
        MaLichSu      INT AUTO_INCREMENT PRIMARY KEY,
        MaKhachHang   INT NOT NULL,
        MaDonHang     INT NOT NULL UNIQUE,
        SoDiemCong    INT NOT NULL DEFAULT 0,
        SoTienQuyDoi  DECIMAL(18,2) NOT NULL DEFAULT 0,
        DiemTruocKhi  INT NOT NULL DEFAULT 0,
        DiemSauKhi    INT NOT NULL DEFAULT 0,
        GhiChu        VARCHAR(255) DEFAULT NULL,
        NgayTao       DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_lichsudiem_khach (MaKhachHang),
        INDEX idx_lichsudiem_don   (MaDonHang)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("✅ [PointsService] Bảng lichsu_diem đã sẵn sàng");
  } catch (err) {
    console.warn("⚠️  [PointsService] Không thể tạo bảng lichsu_diem:", err.message);
  }
}

/**
 * Hook chính: Cộng điểm tích lũy ngay khi đơn hàng chuyển sang "Đã thanh toán".
 *
 * Idempotent — gọi nhiều lần trên cùng 1 đơn vẫn an toàn nhờ UNIQUE(MaDonHang).
 *
 * @param {object} connection - MySQL connection đang trong transaction
 * @param {number} orderId    - MaDonHang vừa được chuyển trạng thái
 * @returns {object|null}
 */
async function awardPointsOnPayment(connection, orderId) {
  try {
    // 1. Lấy thông tin đơn hàng
    const [orders] = await connection.query(
      `SELECT MaDonHang, MaKhachHang, ThanhTien FROM donhang WHERE MaDonHang = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      console.warn(`⚠️  [PointsService] Không tìm thấy đơn hàng #${orderId}`);
      return null;
    }

    const order = orders[0];

    // 2. Bỏ qua nếu đơn không có khách hàng (khách vãng lai)
    if (!order.MaKhachHang) {
      return null;
    }

    // 3. Kiểm tra idempotency — đơn này đã được tích điểm chưa?
    const [existingLog] = await connection.query(
      "SELECT MaLichSu, SoDiemCong FROM lichsu_diem WHERE MaDonHang = ?",
      [orderId]
    );

    if (existingLog.length > 0) {
      console.log(
        `ℹ️  [PointsService] Đơn #${orderId} đã tích điểm trước đó (${existingLog[0].SoDiemCong} điểm). Bỏ qua.`
      );
      return null;
    }

    // 4. Tính số điểm được cộng (làm tròn xuống)
    const thanhTien = parseFloat(order.ThanhTien) || 0;
    const pointsEarned = Math.floor(thanhTien / POINTS_RATIO);

    if (pointsEarned <= 0) {
      return null;
    }

    // 5. Lấy điểm hiện tại của khách hàng TRƯỚC khi cộng
    const [customers] = await connection.query(
      "SELECT DiemTichLuy FROM khachhang WHERE MaKhachHang = ?",
      [order.MaKhachHang]
    );

    if (customers.length === 0) {
      console.warn(`⚠️  [PointsService] Không tìm thấy khách hàng #${order.MaKhachHang}`);
      return null;
    }

    const diemTruocKhi = customers[0].DiemTichLuy || 0;
    const diemSauKhi = diemTruocKhi + pointsEarned;

    // 6. Cộng điểm vào bảng khachhang (atomic UPDATE)
    await connection.query(
      "UPDATE khachhang SET DiemTichLuy = DiemTichLuy + ? WHERE MaKhachHang = ?",
      [pointsEarned, order.MaKhachHang]
    );

    // 7. Ghi nhật ký vào lichsu_diem
    await connection.query(
      `INSERT INTO lichsu_diem
         (MaKhachHang, MaDonHang, SoDiemCong, SoTienQuyDoi, DiemTruocKhi, DiemSauKhi, GhiChu)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        order.MaKhachHang,
        orderId,
        pointsEarned,
        thanhTien,
        diemTruocKhi,
        diemSauKhi,
        `Tu dong: ${thanhTien.toLocaleString("vi-VN")}d / ${POINTS_RATIO} = ${pointsEarned} diem`,
      ]
    );

    console.log(
      `🎉 [PointsService] Don #${orderId} — Khach #${order.MaKhachHang}: ` +
      `+${pointsEarned} diem (${diemTruocKhi} -> ${diemSauKhi})`
    );

    return {
      customerId: order.MaKhachHang,
      pointsEarned,
      diemTruocKhi,
      diemSauKhi,
      thanhTien,
    };
  } catch (err) {
    console.error(`❌ [PointsService] Loi tich diem don #${orderId}:`, err.message);
    throw err;
  }
}

module.exports = { ensurePointsLogTable, awardPointsOnPayment, POINTS_RATIO };
