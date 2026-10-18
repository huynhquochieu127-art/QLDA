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

// =========================================================================
// Helper: Đồng bộ Schema bảng chamcong (đảm bảo độ dài cột TrangThai & GhiChu)
// =========================================================================
let chamCongSchemaEnsured = false;
async function ensureChamCongSchema() {
  if (chamCongSchemaEnsured) return;
  try {
    await db.query("ALTER TABLE chamcong MODIFY COLUMN TrangThai VARCHAR(50) DEFAULT 'Hợp lệ'");
    await db.query("ALTER TABLE chamcong MODIFY COLUMN GhiChu TEXT NULL");
    chamCongSchemaEnsured = true;
  } catch (err) {
    // Không ném lỗi nếu cột đã có cấu trúc phù hợp
  }
}
ensureChamCongSchema();

/**
 * Helper BẮT BUỘC: Lấy thời gian hiện tại của máy chủ (Server Time).
 * TUYỆT ĐỐI KHÔNG nhận giờ từ thiết bị client nhằm chống gian lận đổi giờ điện thoại/máy tính.
 */
function getServerDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const serverDate = `${year}-${month}-${day}`;
  const serverTime = `${hours}:${minutes}:${seconds}`;
  const serverDateTime = `${serverDate} ${serverTime}`;

  return {
    serverNow: now,
    serverDate,
    serverTime,
    serverDateTime,
    iso: now.toISOString(),
  };
}

/**
 * Helper: Tìm MaNhanVien (INT) từ staffId, MaNhanVienCode, hoặc ID
 */
async function resolveEmployeeId(staffIdentifier) {
  if (!staffIdentifier) return null;
  if (typeof staffIdentifier === "number" || /^\d+$/.test(String(staffIdentifier).trim())) {
    const num = Number(staffIdentifier);
    const [rows] = await db.query("SELECT MaNhanVien FROM nhanvien WHERE MaNhanVien = ?", [num]);
    if (rows.length > 0) return rows[0].MaNhanVien;
  }
  const code = String(staffIdentifier).trim();
  const [rows] = await db.query(
    "SELECT MaNhanVien FROM nhanvien WHERE MaNhanVienCode = ? OR HoTen = ? LIMIT 1",
    [code, code]
  );
  if (rows.length > 0) return rows[0].MaNhanVien;

  const match = code.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    const [numRows] = await db.query("SELECT MaNhanVien FROM nhanvien WHERE MaNhanVien = ?", [num]);
    if (numRows.length > 0) return numRows[0].MaNhanVien;
  }
  return null;
}

/**
 * [POST] /api/timekeeping/checkin (hoặc /api/chamcong/checkin, /api/timekeeping/check-in, /api/timekeeping/button/checkin)
 * Tiếp nhận thao tác bấm nút Check-in từ UI:
 * BẮT BUỘC: Lấy Server Time của máy chủ backend, TUYỆT ĐỐI BỎ QUA giờ từ thiết bị client!
 */
router.post(
  ["/timekeeping/checkin", "/chamcong/checkin", "/timekeeping/check-in", "/timekeeping/button/checkin"],
  async (req, res) => {
    try {
      await ensureChamCongSchema();
      const { maNhanVien, staffId, maCaLam, shiftType, ghiChu: clientGhiChu } = req.body;

      // 1. Phân giải mã nhân viên từ body
      const empId = await resolveEmployeeId(maNhanVien || staffId);
      if (!empId) {
        return res.status(400).json({
          success: false,
          message: "Mã nhân viên (maNhanVien hoặc staffId) không hợp lệ hoặc không tồn tại trong hệ thống!",
        });
      }

      // 2. LẤY GIỜ MÁY CHỦ (SERVER TIME) - KHÔNG LẤY TỪ THIẾT BỊ NHÂN VIÊN
      const { serverNow, serverDate, serverTime, serverDateTime, iso } = getServerDateTime();

      // 3. Tra cứu ca làm việc xếp lịch
      let shiftId = maCaLam ? Number(maCaLam) : null;
      let shiftInfo = null;

      if (shiftId) {
        const [shifts] = await db.query(
          "SELECT MaCaLam, TenCaLam, GioBatDau, GioKetThuc FROM calam WHERE MaCaLam = ? LIMIT 1",
          [shiftId]
        );
        if (shifts.length > 0) shiftInfo = shifts[0];
      }

      // Nếu không truyền maCaLam hoặc truyền shiftType dạng chữ (morning, Ca 1...)
      if (!shiftInfo && shiftType) {
        const shiftStr = String(shiftType).toLowerCase().trim();
        let shiftName = "Ca 1";
        if (shiftStr.includes("ca 1") || shiftStr.includes("morning")) shiftName = "Ca 1";
        else if (shiftStr.includes("ca 2") || shiftStr.includes("afternoon")) shiftName = "Ca 2";
        else if (shiftStr.includes("ca 3") || shiftStr.includes("evening")) shiftName = "Ca 3";
        else if (shiftStr.includes("ca a") || shiftStr.includes("ca_a")) shiftName = "Ca A";
        else if (shiftStr.includes("ca b") || shiftStr.includes("ca_b")) shiftName = "Ca B";

        const [namedShifts] = await db.query(
          "SELECT MaCaLam, TenCaLam, GioBatDau, GioKetThuc FROM calam WHERE TenCaLam = ? LIMIT 1",
          [shiftName]
        );
        if (namedShifts.length > 0) {
          shiftInfo = namedShifts[0];
          shiftId = shiftInfo.MaCaLam;
        }
      }

      // Nếu vẫn chưa có, tra cứu từ đăng ký ca được duyệt trong ngày của nhân viên
      if (!shiftInfo) {
        const [regShifts] = await db.query(
          `SELECT cl.MaCaLam, cl.TenCaLam, cl.GioBatDau, cl.GioKetThuc
           FROM dangky_ca dkc
           JOIN calam cl ON dkc.MaCaLam = cl.MaCaLam
           WHERE dkc.MaNhanVien = ? AND dkc.NgayLam = ?
           ORDER BY dkc.MaDangKy DESC
           LIMIT 1`,
          [empId, serverDate]
        );
        if (regShifts.length > 0) {
          shiftInfo = regShifts[0];
          shiftId = shiftInfo.MaCaLam;
        } else {
          // Ca mặc định nếu nhân viên chưa đăng ký ca nào
          const [defaultShifts] = await db.query("SELECT * FROM calam ORDER BY MaCaLam ASC LIMIT 1");
          if (defaultShifts.length > 0) {
            shiftInfo = defaultShifts[0];
            shiftId = shiftInfo.MaCaLam;
          }
        }
      }

      // 4. SO SÁNH SERVER TIME VỚI GIỜ BẮT ĐẦU CA XẾP LỊCH
      const shiftStart = shiftInfo ? shiftInfo.GioBatDau : "08:00:00";
      const comp = compareCheckInTime(serverNow, shiftStart);
      const diTre = comp.isLate ? 1 : 0;
      const trangThai = comp.isLate ? "Đi trễ" : "Hợp lệ";
      const serverNote = comp.isLate
        ? `Đi trễ ${comp.lateMinutes} phút (Ca ${comp.gioBatDau} - Máy chủ ghi nhận: ${serverTime})`
        : `Check-in đúng giờ lúc ${serverTime} (Giờ máy chủ)`;
      const ghiChu = clientGhiChu ? `${clientGhiChu} | ${serverNote}` : serverNote;

      // 5. Kiểm tra bản ghi chấm công trong ngày của nhân viên
      const [existing] = await db.query(
        "SELECT MaChamCong FROM chamcong WHERE MaNhanVien = ? AND NgayLam = ? AND (MaCaLam = ? OR MaCaLam IS NULL) LIMIT 1",
        [empId, serverDate, shiftId]
      );

      let chamCongId;
      if (existing.length > 0) {
        chamCongId = existing[0].MaChamCong;
        await db.query(
          `UPDATE chamcong 
           SET GioCheckIn = ?, MaCaLam = ?, DiTre = ?, GhiChu = ?, TrangThai = ?
           WHERE MaChamCong = ?`,
          [serverDateTime, shiftId, diTre, ghiChu, trangThai, chamCongId]
        );
      } else {
        const [insertRes] = await db.query(
          `INSERT INTO chamcong (MaNhanVien, MaCaLam, NgayLam, GioCheckIn, DiTre, VeSom, TrangThai, GhiChu)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
          [empId, shiftId, serverDate, serverDateTime, diTre, trangThai, ghiChu]
        );
        chamCongId = insertRes.insertId;
      }

      // 6. Tra cứu thông tin nhân viên
      const [empRows] = await db.query(
        "SELECT HoTen, MaNhanVienCode, ChucVu FROM nhanvien WHERE MaNhanVien = ?",
        [empId]
      );
      const emp = empRows[0] || {};

      return res.status(201).json({
        success: true,
        action: "checkin",
        message: comp.isLate
          ? `CẢNH BÁO: Nhân viên ${emp.HoTen || ""} đi trễ ${comp.lateMinutes} phút! (Ca ${comp.gioBatDau} - Giờ máy chủ: ${serverTime})`
          : `Check-in thành công cho ${emp.HoTen || ""} đúng giờ lúc ${serverTime} (Giờ máy chủ)!`,
        timeSource: "SERVER_TIME",
        serverTime: serverDateTime,
        serverTimeString: serverTime,
        serverDate,
        isLate: comp.isLate,
        lateMinutes: comp.lateMinutes,
        data: {
          maChamCong: chamCongId,
          maNhanVien: empId,
          hoTen: emp.HoTen,
          maNhanVienCode: emp.MaNhanVienCode,
          chucVu: emp.ChucVu,
          caLam: shiftInfo ? shiftInfo.TenCaLam : "Ca chuẩn",
          gioBatDau: comp.gioBatDau,
          gioCheckIn: serverTime,
          ngayLam: serverDate,
          diTre,
          soPhutDiTre: comp.lateMinutes,
          trangThai,
          ghiChu,
        },
      });
    } catch (error) {
      console.error("Lỗi Check-in Server Time:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * [POST] /api/timekeeping/checkout (hoặc /api/chamcong/checkout, /api/timekeeping/check-out, /api/timekeeping/button/checkout)
 * Tiếp nhận thao tác bấm nút Check-out từ UI:
 * BẮT BUỘC: Lấy Server Time của máy chủ backend, tự động tính số giờ làm việc thực tế
 */
router.post(
  ["/timekeeping/checkout", "/chamcong/checkout", "/timekeeping/check-out", "/timekeeping/button/checkout"],
  async (req, res) => {
    try {
      await ensureChamCongSchema();
      const { maNhanVien, staffId, maCaLam, ghiChu: clientGhiChu } = req.body;

      const empId = await resolveEmployeeId(maNhanVien || staffId);
      if (!empId) {
        return res.status(400).json({
          success: false,
          message: "Mã nhân viên (maNhanVien hoặc staffId) không hợp lệ!",
        });
      }

      // LẤY GIỜ MÁY CHỦ HIỆN TẠI (SERVER TIME)
      const { serverNow, serverDate, serverTime, serverDateTime } = getServerDateTime();

      // Tìm bản ghi chấm công của nhân viên hôm nay hoặc bản ghi đang mở chưa checkout
      const [openRows] = await db.query(
        `SELECT cc.MaChamCong, cc.MaCaLam, cc.NgayLam, cc.GioCheckIn, cl.TenCaLam, cl.GioBatDau, cl.GioKetThuc
         FROM chamcong cc
         LEFT JOIN calam cl ON cc.MaCaLam = cl.MaCaLam
         WHERE cc.MaNhanVien = ? AND (cc.GioCheckOut IS NULL OR cc.NgayLam = ?)
         ORDER BY cc.MaChamCong DESC
         LIMIT 1`,
        [empId, serverDate]
      );

      if (openRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Không tìm thấy lượt Check-in nào chưa Check-out của bạn hôm nay!",
        });
      }

      const currentRecord = openRows[0];
      const chamCongId = currentRecord.MaChamCong;

      // Tính số giờ làm thực tế từ GioCheckIn đến Server Time Check-out
      let soGioLam = 0;
      if (currentRecord.GioCheckIn) {
        const checkInDate = new Date(currentRecord.GioCheckIn);
        const diffMs = serverNow.getTime() - checkInDate.getTime();
        soGioLam = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
      }

      // Kiểm tra về sớm nếu có giờ kết thúc ca
      let veSom = 0;
      if (currentRecord.GioKetThuc) {
        const [endH, endM] = currentRecord.GioKetThuc.split(":").map(Number);
        const shiftEndTotalMinutes = endH * 60 + (endM || 0);
        const serverMinutes = serverNow.getHours() * 60 + serverNow.getMinutes();
        if (serverMinutes < shiftEndTotalMinutes) {
          veSom = 1;
        }
      }

      const checkoutNote = `Check-out lúc ${serverTime} (Giờ máy chủ) · Thực làm: ${soGioLam} giờ`;
      const finalGhiChu = clientGhiChu ? `${clientGhiChu} | ${checkoutNote}` : checkoutNote;

      await db.query(
        `UPDATE chamcong 
         SET GioCheckOut = ?, SoGioLam = ?, VeSom = ?, GhiChu = CONCAT(COALESCE(GhiChu, ''), ' | ', ?)
         WHERE MaChamCong = ?`,
        [serverDateTime, soGioLam, veSom, finalGhiChu, chamCongId]
      );

      const [empRows] = await db.query(
        "SELECT HoTen, MaNhanVienCode FROM nhanvien WHERE MaNhanVien = ?",
        [empId]
      );
      const emp = empRows[0] || {};

      return res.json({
        success: true,
        action: "checkout",
        message: `Check-out thành công cho ${emp.HoTen || ""} lúc ${serverTime} (Ghi nhận bằng giờ máy chủ)! Số giờ làm: ${soGioLam}h.`,
        timeSource: "SERVER_TIME",
        serverTime: serverDateTime,
        serverTimeString: serverTime,
        serverDate,
        soGioLam,
        veSom,
        data: {
          maChamCong: chamCongId,
          maNhanVien: empId,
          hoTen: emp.HoTen,
          gioCheckIn: currentRecord.GioCheckIn,
          gioCheckOut: serverDateTime,
          soGioLam,
          veSom,
        },
      });
    } catch (error) {
      console.error("Lỗi Check-out Server Time:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * [POST] /api/timekeeping/button-action (hoặc /api/timekeeping/clock)
 * API chung tiếp nhận thao tác bấm nút từ UI (Check-in hoặc Check-out)
 */
router.post(["/timekeeping/button-action", "/timekeeping/clock"], async (req, res) => {
  const { action = "checkin" } = req.body;
  if (action === "checkout") {
    // Chuyển hướng xử lý Check-out
    req.url = "/timekeeping/checkout";
    return router.handle(req, res);
  }
  // Mặc định xử lý Check-in
  req.url = "/timekeeping/checkin";
  return router.handle(req, res);
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

