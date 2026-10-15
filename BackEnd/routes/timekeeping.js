const express = require("express");
const router = express.Router();
const db = require("../config/db"); // Đường dẫn tới file kết nối MySQL (mysql2/promise) của bạn

// 1. LẤY DANH SÁCH YÊU CẦU BỔ SUNG ĐIỂM DANH (Có lọc theo trạng thái: pending / approved / rejected / all)
router.get("/yeucau-chamcong", async (req, res) => {
  const { status = "pending" } = req.query;

  try {
    let sql = `
            SELECT 
                yc.MaYeuCau,
                yc.MaNhanVien,
                nv.MaNhanVienCode,
                nv.HoTen,
                cv.TenChucVu,
                DATE_FORMAT(yc.Ngay, '%Y-%m-%d') AS Ngay,
                yc.MaCaLam,
                COALESCE(cl.TenCaLam, yc.CaLam) AS CaLam,
                yc.Loai,
                yc.ThoiGian,
                yc.LyDo,
                yc.TrangThai,
                yc.GhiChuQL,
                DATE_FORMAT(yc.NgayTao, '%d/%m/%Y %H:%i') AS NgayTao
            FROM yeucau_chamcong yc
            JOIN nhanvien nv ON yc.MaNhanVien = nv.MaNhanVien
            LEFT JOIN chucvu cv ON nv.MaChucVu = cv.MaChucVu
            LEFT JOIN calam cl ON yc.MaCaLam = cl.MaCaLam
        `;

    const params = [];
    if (status !== "all") {
      sql += ` WHERE yc.TrangThai = ?`;
      params.push(status);
    }

    sql += ` ORDER BY yc.NgayTao DESC`;

    const [rows] = await db.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Lỗi lấy danh sách yêu cầu chấm công:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Lỗi máy chủ khi tải danh sách yêu cầu",
      });
  }
});

// 2. DUYỆT YÊU CẦU ("ĐỒNG Ý") & TỰ ĐỘNG SINH BẢN GHI CHECK-IN/OUT HỢP LỆ
router.put("/yeucau-chamcong/:id/approve", async (req, res) => {
  const maYeuCau = req.params.id;
  const { ghiChuQL } = req.body;

  // Lấy connection để dùng Transaction (nếu dùng pool) hoặc dùng trực tiếp db
  const connection = (await db.getConnection) ? await db.getConnection() : db;

  try {
    if (connection.beginTransaction) await connection.beginTransaction();

    // Bước 1: Kiểm tra yêu cầu trong bảng yeucau_chamcong
    const [requests] = await connection.query(
      `SELECT yc.*, DATE_FORMAT(yc.Ngay, '%Y-%m-%d') AS NgayFormat 
             FROM yeucau_chamcong yc 
             WHERE yc.MaYeuCau = ?`,
      [maYeuCau],
    );

    if (requests.length === 0) {
      if (connection.rollback) await connection.rollback();
      return res
        .status(404)
        .json({
          success: false,
          message: "Không tìm thấy yêu cầu bổ sung điểm danh!",
        });
    }

    const yc = requests[0];
    if (yc.TrangThai !== "pending") {
      if (connection.rollback) await connection.rollback();
      return res
        .status(400)
        .json({
          success: false,
          message: "Yêu cầu này đã được xử lý trước đó!",
        });
    }

    const ngayLam = yc.NgayFormat;
    let maCaLam = yc.MaCaLam;
    let gioBatDau = "06:30:00";
    let gioKetThuc = "15:00:00";

    // Bước 2: Tra cứu thông tin Ca Làm chuẩn từ bảng `calam`
    if (maCaLam) {
      const [caRows] = await connection.query(
        `SELECT MaCaLam, GioBatDau, GioKetThuc FROM calam WHERE MaCaLam = ? LIMIT 1`,
        [maCaLam],
      );
      if (caRows.length > 0) {
        gioBatDau = caRows[0].GioBatDau;
        gioKetThuc = caRows[0].GioKetThuc;
      }
    } else if (yc.CaLam) {
      const [caRows] = await connection.query(
        `SELECT MaCaLam, GioBatDau, GioKetThuc FROM calam WHERE TenCaLam = ? LIMIT 1`,
        [yc.CaLam],
      );
      if (caRows.length > 0) {
        maCaLam = caRows[0].MaCaLam;
        gioBatDau = caRows[0].GioBatDau;
        gioKetThuc = caRows[0].GioKetThuc;
      }
    }

    // Nếu nhân viên có gửi kèm khung giờ cụ thể trong cột `ThoiGian` (VD: "06:30 - 15:00")
    if (yc.ThoiGian && yc.ThoiGian.includes("-")) {
      const parts = yc.ThoiGian.split("-").map((s) => s.trim());
      if (parts[0] && parts[1]) {
        gioBatDau = parts[0].length === 5 ? `${parts[0]}:00` : parts[0];
        gioKetThuc = parts[1].length === 5 ? `${parts[1]}:00` : parts[1];
      }
    }

    // Tạo mốc thời gian Check-in & Check-out đầy đủ (YYYY-MM-DD HH:mm:ss)
    const gioCheckIn = `${ngayLam} ${gioBatDau}`;
    const gioCheckOut = `${ngayLam} ${gioKetThuc}`;

    // Tính tổng số giờ làm việc hợp lệ
    const [timeDiff] = await connection.query(
      `SELECT ROUND(TIMESTAMPDIFF(MINUTE, ?, ?) / 60, 2) AS SoGioLam`,
      [gioCheckIn, gioCheckOut],
    );
    const soGioLam = Math.max(0, timeDiff[0]?.SoGioLam || 8.0);

    // Bước 3: Kiểm tra xem ngày hôm đó nhân viên đã có bản ghi chấm công nào chưa
    const [existingChamCong] = await connection.query(
      `SELECT MaChamCong FROM chamcong WHERE MaNhanVien = ? AND NgayLam = ? AND (MaCaLam = ? OR MaCaLam IS NULL)`,
      [yc.MaNhanVien, ngayLam, maCaLam],
    );

    const ghiChuChamCong = `Bổ sung điểm danh hợp lệ (Từ YC #${yc.MaYeuCau}: ${yc.LyDo})`;

    if (existingChamCong.length > 0) {
      // Cập nhật lại bản ghi bị thiếu check-in/out thành hợp lệ
      await connection.query(
        `UPDATE chamcong 
                 SET MaCaLam = ?,
                     GioCheckIn = ?,
                     GioCheckOut = ?,
                     SoGioLam = ?,
                     DiTre = 0,
                     VeSom = 0,
                     TrangThai = 'Hợp lệ',
                     GhiChu = ?
                 WHERE MaChamCong = ?`,
        [
          maCaLam,
          gioCheckIn,
          gioCheckOut,
          soGioLam,
          ghiChuChamCong,
          existingChamCong[0].MaChamCong,
        ],
      );
    } else {
      // Tự động sinh mới một bản ghi Check-in/out hợp lệ vào bảng `chamcong`
      await connection.query(
        `INSERT INTO chamcong 
                 (MaNhanVien, MaCaLam, NgayLam, GioCheckIn, GioCheckOut, SoGioLam, DiTre, VeSom, TrangThai, GhiChu)
                 VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'Hợp lệ', ?)`,
        [
          yc.MaNhanVien,
          maCaLam,
          ngayLam,
          gioCheckIn,
          gioCheckOut,
          soGioLam,
          ghiChuChamCong,
        ],
      );
    }

    // Bước 4: Cập nhật trạng thái yêu cầu thành 'approved'
    await connection.query(
      `UPDATE yeucau_chamcong 
             SET TrangThai = 'approved', 
                 MaCaLam = COALESCE(MaCaLam, ?),
                 GhiChuQL = ? 
             WHERE MaYeuCau = ?`,
      [maCaLam, ghiChuQL || "Đã duyệt bổ sung công hợp lệ", maYeuCau],
    );

    if (connection.commit) await connection.commit();

    return res.json({
      success: true,
      message: `Đã duyệt! Hệ thống đã tự động ghi nhận ${soGioLam} giờ công hợp lệ ngày ${ngayLam}.`,
    });
  } catch (error) {
    if (connection.rollback) await connection.rollback();
    console.error("Lỗi khi duyệt bổ sung điểm danh:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Lỗi máy chủ khi xử lý duyệt điểm danh",
      });
  } finally {
    if (connection.release) connection.release();
  }
});

// 3. TỪ CHỐI YÊU CẦU ("TỪ CHỐI")
router.put("/yeucau-chamcong/:id/reject", async (req, res) => {
  const maYeuCau = req.params.id;
  const { ghiChuQL } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE yeucau_chamcong 
             SET TrangThai = 'rejected', 
                 GhiChuQL = ? 
             WHERE MaYeuCau = ? AND TrangThai = 'pending'`,
      [ghiChuQL || "Từ chối yêu cầu bổ sung điểm danh", maYeuCau],
    );

    if (result.affectedRows === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Yêu cầu không tồn tại hoặc đã được xử lý!",
        });
    }

    return res.json({
      success: true,
      message: "Đã từ chối yêu cầu bổ sung điểm danh.",
    });
  } catch (error) {
    console.error("Lỗi khi từ chối yêu cầu:", error);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
});

module.exports = router;
