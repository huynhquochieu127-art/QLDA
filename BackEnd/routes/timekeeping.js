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

// =========================================================================
// 4. LOGIC SO SÁNH GIỜ CHECK-IN THỰC TẾ VỚI GIỜ BẮT ĐẦU CA XẾP LỊCH
// =========================================================================

/**
 * Helper: So sánh giờ Check-in thực tế với Giờ bắt đầu ca
 * @param {Date} checkInDateObj - Đối tượng Date check-in thực tế
 * @param {string} shiftStartTimeStr - Giờ bắt đầu ca (VD: '08:00:00' hoặc '08:00')
 */
function compareCheckInTime(checkInDateObj, shiftStartTimeStr) {
  const checkInHours = checkInDateObj.getHours();
  const checkInMinutes = checkInDateObj.getMinutes();
  const actualTotalMinutes = checkInHours * 60 + checkInMinutes;

  const [shiftH, shiftM] = (shiftStartTimeStr || "08:00").split(":").map(Number);
  const shiftTotalMinutes = shiftH * 60 + (shiftM || 0);

  // Nếu Giờ Check-in > Giờ bắt đầu ca -> ĐI TRỄ
  const isLate = actualTotalMinutes > shiftTotalMinutes;
  const lateMinutes = isLate ? actualTotalMinutes - shiftTotalMinutes : 0;

  return {
    isLate,
    lateMinutes,
    gioBatDau: `${String(shiftH).padStart(2, "0")}:${String(shiftM || 0).padStart(2, "0")}`,
    gioCheckIn: `${String(checkInHours).padStart(2, "0")}:${String(checkInMinutes).padStart(2, "0")}`,
  };
}

/**
 * [GET] /api/timekeeping/late-today (hoặc /api/chamcong/di-tre)
 * Lấy danh sách nhân viên đi trễ trong ngày
 * Đối chiếu: Giờ Check-in thực tế > Giờ bắt đầu ca làm việc
 */
router.get(["/timekeeping/late-today", "/chamcong/di-tre"], async (req, res) => {
  try {
    const today = req.query.date || new Date().toISOString().split("T")[0];

    // Truy vấn các bản ghi check-in trong ngày từ bảng chamcong
    const [rows] = await db.query(
      `SELECT 
        cc.MaChamCong,
        cc.MaNhanVien,
        nv.MaNhanVienCode,
        nv.HoTen,
        IFNULL(cv.TenChucVu, 'Nhân viên') AS ChucVu,
        cv.TenChucVu,
        cl.MaCaLam,
        cl.TenCaLam,
        TIME_FORMAT(cl.GioBatDau, '%H:%i') AS GioBatDau,
        TIME_FORMAT(cl.GioKetThuc, '%H:%i') AS GioKetThuc,
        DATE_FORMAT(cc.GioCheckIn, '%H:%i') AS GioCheckInThucTe,
        DATE_FORMAT(cc.GioCheckIn, '%Y-%m-%d %H:%i:%s') AS GioCheckInFull,
        cc.DiTre,
        cc.GhiChu,
        cc.TrangThai,
        -- Tính số phút đi trễ trực tiếp bằng SQL
        CASE 
          WHEN TIME(cc.GioCheckIn) > cl.GioBatDau 
          THEN TIMESTAMPDIFF(MINUTE, CONCAT(DATE(cc.GioCheckIn), ' ', cl.GioBatDau), cc.GioCheckIn)
          ELSE 0
        END AS SoPhutDiTre
       FROM chamcong cc
       JOIN nhanvien nv ON cc.MaNhanVien = nv.MaNhanVien
       LEFT JOIN chucvu cv ON nv.MaChucVu = cv.MaChucVu
       JOIN calam cl ON cc.MaCaLam = cl.MaCaLam
       WHERE (DATE(cc.GioCheckIn) = ? OR cc.NgayLam = ?)
         AND (TIME(cc.GioCheckIn) > cl.GioBatDau OR cc.DiTre = 1)
       ORDER BY cc.GioCheckIn DESC`,
      [today, today]
    );

    const formatted = rows.map((r) => {
      const minutesLate = r.SoPhutDiTre > 0 ? r.SoPhutDiTre : (r.DiTre ? 15 : 0);
      return {
        id: r.MaChamCong,
        maNhanVien: r.MaNhanVien,
        maNhanVienCode: r.MaNhanVienCode || `NV${String(r.MaNhanVien).padStart(3, "0")}`,
        hoTen: r.HoTen,
        chucVu: r.TenChucVu || r.ChucVu || "Nhân viên",
        maCaLam: r.MaCaLam,
        tenCaLam: r.TenCaLam,
        gioBatDau: r.GioBatDau,
        gioKetThuc: r.GioKetThuc,
        gioCheckInThucTe: r.GioCheckInThucTe,
        gioCheckInFull: r.GioCheckInFull,
        soPhutDiTre: minutesLate,
        moTaViPham: `Check-in trễ ${minutesLate} phút (Ca ${r.GioBatDau} nhưng ${r.GioCheckInThucTe} mới Check-in)`,
        ghiChu: r.GhiChu,
        trangThai: "Đi trễ",
      };
    });

    res.json({
      success: true,
      date: today,
      totalLate: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách đi trễ:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi truy vấn danh sách đi trễ: " + error.message,
    });
  }
});

/**
 * [POST] /api/timekeeping/checkin (hoặc /api/chamcong/checkin)
 * Thực hiện Check-in: Tự động so sánh Giờ Check-in thực tế với Giờ bắt đầu ca
 * Nếu lớn hơn: Đưa vào danh sách đi trễ (DiTre = 1) và tính số phút trễ
 */
router.post(["/timekeeping/checkin", "/chamcong/checkin"], async (req, res) => {
  try {
    const { maNhanVien, maCaLam, gioCheckIn } = req.body;

    if (!maNhanVien) {
      return res.status(400).json({
        success: false,
        message: "Mã nhân viên (maNhanVien) là bắt buộc!",
      });
    }

    const checkInDate = gioCheckIn ? new Date(gioCheckIn) : new Date();
    const ngayLam = checkInDate.toISOString().split("T")[0];

    // Tra cứu ca làm việc xếp lịch
    let shiftId = maCaLam;
    let shiftInfo = null;

    if (shiftId) {
      const [shifts] = await db.query(
        "SELECT MaCaLam, TenCaLam, GioBatDau, GioKetThuc FROM calam WHERE MaCaLam = ? LIMIT 1",
        [shiftId]
      );
      if (shifts.length > 0) shiftInfo = shifts[0];
    }

    // Nếu không truyền maCaLam, tra cứu từ đăng ký ca hoặc ca mặc định
    if (!shiftInfo) {
      const [regShifts] = await db.query(
        `SELECT cl.MaCaLam, cl.TenCaLam, cl.GioBatDau, cl.GioKetThuc
         FROM dangky_ca dkc
         JOIN calam cl ON dkc.MaCaLam = cl.MaCaLam
         WHERE dkc.MaNhanVien = ? AND dkc.NgayLam = ?
         LIMIT 1`,
        [maNhanVien, ngayLam]
      );
      if (regShifts.length > 0) {
        shiftInfo = regShifts[0];
        shiftId = shiftInfo.MaCaLam;
      } else {
        const [defaultShifts] = await db.query("SELECT * FROM calam LIMIT 1");
        if (defaultShifts.length > 0) {
          shiftInfo = defaultShifts[0];
          shiftId = shiftInfo.MaCaLam;
        }
      }
    }

    // SO SÁNH GIỜ CHECK-IN THỰC TẾ VỚI GIỜ BẮT ĐẦU CA
    const shiftStart = shiftInfo ? shiftInfo.GioBatDau : "08:00:00";
    const comp = compareCheckInTime(checkInDate, shiftStart);
    const diTre = comp.isLate ? 1 : 0;
    const ghiChu = comp.isLate
      ? `Đi trễ ${comp.lateMinutes} phút (Ca ${comp.gioBatDau} vào lúc ${comp.gioCheckIn})`
      : "Check-in đúng giờ";

    // Kiểm tra bản ghi chấm công trong ngày
    const [existing] = await db.query(
      "SELECT MaChamCong FROM chamcong WHERE MaNhanVien = ? AND NgayLam = ? AND (MaCaLam = ? OR MaCaLam IS NULL) LIMIT 1",
      [maNhanVien, ngayLam, shiftId]
    );

    let chamCongId;
    if (existing.length > 0) {
      chamCongId = existing[0].MaChamCong;
      await db.query(
        `UPDATE chamcong 
         SET GioCheckIn = ?, MaCaLam = ?, DiTre = ?, GhiChu = ?, TrangThai = ?
         WHERE MaChamCong = ?`,
        [checkInDate, shiftId, diTre, ghiChu, comp.isLate ? "Đi trễ" : "Hợp lệ", chamCongId]
      );
    } else {
      const [insertRes] = await db.query(
        `INSERT INTO chamcong (MaNhanVien, MaCaLam, NgayLam, GioCheckIn, DiTre, VeSom, TrangThai, GhiChu)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [maNhanVien, shiftId, ngayLam, checkInDate, diTre, comp.isLate ? "Đi trễ" : "Hợp lệ", ghiChu]
      );
      chamCongId = insertRes.insertId;
    }

    // Tra cứu thông tin nhân viên
    const [empRows] = await db.query(
      "SELECT HoTen, MaNhanVienCode FROM nhanvien WHERE MaNhanVien = ?",
      [maNhanVien]
    );
    const emp = empRows[0] || {};

    return res.status(201).json({
      success: true,
      message: comp.isLate
        ? `CẢNH BÁO: Nhân viên ${emp.HoTen || ""} đi trễ ${comp.lateMinutes} phút! (Ca ${comp.gioBatDau} - Check-in ${comp.gioCheckIn})`
        : `Check-in thành công cho ${emp.HoTen || ""} đúng giờ!`,
      isLate: comp.isLate,
      lateMinutes: comp.lateMinutes,
      data: {
        maChamCong: chamCongId,
        maNhanVien,
        hoTen: emp.HoTen,
        maNhanVienCode: emp.MaNhanVienCode,
        caLam: shiftInfo ? shiftInfo.TenCaLam : "Ca chuẩn",
        gioBatDau: comp.gioBatDau,
        gioCheckIn: comp.gioCheckIn,
        diTre: diTre,
        soPhutDiTre: comp.lateMinutes,
        ghiChu,
      },
    });
  } catch (error) {
    console.error("Lỗi Check-in:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * [POST] /api/timekeeping/seed-demo-late
 * Thêm bản ghi mẫu thử nghiệm (Ví dụ: Ca 08:00 nhưng 08:15 mới Check-in -> Trễ 15 phút)
 */
router.post("/timekeeping/seed-demo-late", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [empRows] = await db.query("SELECT MaNhanVien, HoTen FROM nhanvien LIMIT 1");
    if (empRows.length === 0) {
      return res.status(400).json({ success: false, message: "Chưa có nhân viên nào trong CSDL!" });
    }

    const emp = empRows[0];
    const [caRows] = await db.query("SELECT MaCaLam, TenCaLam, GioBatDau FROM calam LIMIT 1");
    const ca = caRows[0] || { MaCaLam: 1, TenCaLam: "Ca Sáng", GioBatDau: "08:00:00" };

    // Tạo mốc thời gian Check-in trễ 15 phút: Ví dụ ca 08:00 -> vào lúc 08:15
    const [shiftH, shiftM] = (ca.GioBatDau || "08:00:00").split(":").map(Number);
    const lateHour = String(shiftH).padStart(2, "0");
    const lateMin = String((shiftM || 0) + 15).padStart(2, "0");
    const checkInDateTime = `${today} ${lateHour}:${lateMin}:00`;

    await db.query(
      `INSERT INTO chamcong (MaNhanVien, MaCaLam, NgayLam, GioCheckIn, DiTre, VeSom, TrangThai, GhiChu)
       VALUES (?, ?, ?, ?, 1, 0, 'Đi trễ', ?)`,
      [
        emp.MaNhanVien,
        ca.MaCaLam,
        today,
        checkInDateTime,
        `Đi trễ 15 phút (Ca ${ca.GioBatDau} vào lúc ${lateHour}:${lateMin})`,
      ]
    );

    res.json({
      success: true,
      message: `Đã tạo bản ghi đi trễ mẫu cho nhân viên ${emp.HoTen}: Ca ${ca.GioBatDau} nhưng ${lateHour}:${lateMin} mới Check-in (Trễ 15 phút)!`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

