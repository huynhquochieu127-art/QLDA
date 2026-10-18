const db = require("../config/db");

/**
 * Tự động đồng bộ và bổ sung cột cho bảng `calam` và `dangky_ca`
 */
let shiftSchemaEnsured = false;

// Helper: tính số tiếng làm việc từ giờ bắt đầu và giờ kết thúc (HH:mm)
function calculateShiftHours(startTime, endTime) {
  try {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    let startMins = startH * 60 + (startM || 0);
    let endMins = endH * 60 + (endM || 0);
    if (endMins < startMins) {
      endMins += 24 * 60; // Qua đêm
    }
    const diffHours = (endMins - startMins) / 60;
    return Math.round(diffHours * 10) / 10;
  } catch (e) {
    return 5.0;
  }
}

// Helper: Lấy ngày Thứ Hai của tuần cho một ngày bất kỳ
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDateISO(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Tự động gieo dữ liệu mẫu thực tế vào bảng dangky_ca nếu bảng còn trống
async function seedInitialDangKyCa(target) {
  try {
    const [countRows] = await target.query("SELECT COUNT(*) AS total FROM dangky_ca");
    if (countRows[0]?.total > 0) return;

    // Lấy danh sách nhân viên thực từ bảng nhanvien
    const [employees] = await target.query(
      "SELECT MaNhanVien, HoTen, ChucVu, LoaiNhanVien FROM nhanvien ORDER BY MaNhanVien ASC LIMIT 8"
    );
    if (!employees || employees.length === 0) return;

    // Lấy 3 ca ngắn
    const [shifts] = await target.query(
      "SELECT MaCaLam, TenCaLam FROM calam WHERE TenCaLam IN ('Ca 1', 'Ca 2', 'Ca 3') ORDER BY MaCaLam ASC"
    );
    if (!shifts || shifts.length === 0) return;

    const thisMonday = getMonday(new Date());
    const sampleInserts = [];

    // Duyệt 14 ngày (7 ngày tuần này + 7 ngày tuần sau)
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const curDate = new Date(thisMonday);
      curDate.setDate(thisMonday.getDate() + dayOffset);
      const dateKey = formatDateISO(curDate);
      const isCurrentWeek = dayOffset < 7;

      employees.forEach((emp, empIdx) => {
        // Phân bổ nhân viên vào ca theo ngày để có dữ liệu đa dạng
        const shiftIndex = (empIdx + dayOffset) % shifts.length;
        // Bỏ bớt một số ngày để giống thực tế (nhân viên không đi làm cả 7 ngày)
        if ((empIdx + dayOffset) % 3 === 0) return;

        const shift = shifts[shiftIndex];
        // Tuần này thì đã được duyệt ('approved'), tuần sau có ca chờ ('pending') và ca đã duyệt
        const status = isCurrentWeek
          ? "approved"
          : (empIdx % 2 === 0 ? "pending" : "approved");

        sampleInserts.push([
          emp.MaNhanVien,
          shift.MaCaLam,
          dateKey,
          status,
          new Date(),
          isCurrentWeek ? "Quản lý duyệt" : null,
        ]);
      });
    }

    if (sampleInserts.length > 0) {
      await target.query(
        `INSERT INTO dangky_ca (MaNhanVien, MaCaLam, NgayLam, TrangThai, NgayDangKy, GhiChu)
         VALUES ?`,
        [sampleInserts]
      );
      console.log(`[ShiftController] Đã khởi tạo ${sampleInserts.length} lượt đăng ký ca mẫu vào bảng dangky_ca.`);
    }
  } catch (err) {
    console.warn("Lưu ý gieo dữ liệu dangky_ca:", err.message);
  }
}

async function ensureShiftSchema(conn) {
  if (shiftSchemaEnsured) return;
  const target = conn || db;

  const alterStatements = [
    "ALTER TABLE calam ADD COLUMN LoaiCa VARCHAR(30) DEFAULT 'Part-time'",
    "ALTER TABLE calam ADD COLUMN SoTieng DECIMAL(4,2) DEFAULT 5.0",
    "ALTER TABLE calam ADD COLUMN TargetStaff INT DEFAULT 3",
  ];

  for (const sql of alterStatements) {
    try {
      await target.query(sql);
    } catch (err) {
      if (err.errno !== 1060 && err.code !== "ER_DUP_FIELDNAME") {
        console.warn("Lưu ý migration cột calam:", err.message);
      }
    }
  }

  // Khởi tạo/đồng bộ 3 ca ngắn cho Part-time (Ca 1, Ca 2, Ca 3)
  try {
    const defaultPartTimeShifts = [
      {
        tenCaLam: "Ca 1",
        gioBatDau: "07:00:00",
        gioKetThuc: "12:00:00",
        soTieng: 5.0,
        targetStaff: 3,
        moTa: "Ca 1 ngắn linh động cho sinh viên (Sáng, 07:00 - 12:00)",
      },
      {
        tenCaLam: "Ca 2",
        gioBatDau: "12:00:00",
        gioKetThuc: "17:00:00",
        soTieng: 5.0,
        targetStaff: 3,
        moTa: "Ca 2 ngắn linh động cho sinh viên (Chiều, 12:00 - 17:00)",
      },
      {
        tenCaLam: "Ca 3",
        gioBatDau: "17:00:00",
        gioKetThuc: "22:30:00",
        soTieng: 5.5,
        targetStaff: 4,
        moTa: "Ca 3 ngắn linh động cho sinh viên (Tối, 17:00 - 22:30)",
      },
    ];

    for (const s of defaultPartTimeShifts) {
      const [existing] = await target.query(
        "SELECT MaCaLam FROM calam WHERE TenCaLam = ?",
        [s.tenCaLam]
      );
      if (existing.length > 0) {
        await target.query(
          `UPDATE calam SET 
            GioBatDau = ?, GioKetThuc = ?, SoTieng = ?, TargetStaff = ?, LoaiCa = 'Part-time', MoTa = ?
           WHERE MaCaLam = ?`,
          [s.gioBatDau, s.gioKetThuc, s.soTieng, s.targetStaff, s.moTa, existing[0].MaCaLam]
        );
      } else {
        await target.query(
          `INSERT INTO calam (TenCaLam, GioBatDau, GioKetThuc, SoTieng, TargetStaff, LoaiCa, MoTa)
           VALUES (?, ?, ?, ?, ?, 'Part-time', ?)`,
          [s.tenCaLam, s.gioBatDau, s.gioKetThuc, s.soTieng, s.targetStaff, s.moTa]
        );
      }
    }

    // Khởi tạo/đồng bộ 2 ca chính cho Full-time và Quản lý (Ca A, Ca B)
    const defaultFullTimeShifts = [
      {
        tenCaLam: "Ca A",
        gioBatDau: "07:00:00",
        gioKetThuc: "15:00:00",
        soTieng: 8.0,
        targetStaff: 4,
        moTa: "Ca A ca sáng 8 tiếng dành cho nhân viên Full-time và Quản lý (07:00 - 15:00)",
      },
      {
        tenCaLam: "Ca B",
        gioBatDau: "14:30:00",
        gioKetThuc: "22:30:00",
        soTieng: 8.0,
        targetStaff: 4,
        moTa: "Ca B ca chiều/tối 8 tiếng dành cho nhân viên Full-time và Quản lý (14:30 - 22:30)",
      },
    ];

    for (const s of defaultFullTimeShifts) {
      const [existing] = await target.query(
        "SELECT MaCaLam FROM calam WHERE TenCaLam = ?",
        [s.tenCaLam]
      );
      if (existing.length > 0) {
        await target.query(
          `UPDATE calam SET 
            GioBatDau = ?, GioKetThuc = ?, SoTieng = ?, TargetStaff = ?, LoaiCa = 'Full-time', MoTa = ?
           WHERE MaCaLam = ?`,
          [s.gioBatDau, s.gioKetThuc, s.soTieng, s.targetStaff, s.moTa, existing[0].MaCaLam]
        );
      } else {
        await target.query(
          `INSERT INTO calam (TenCaLam, GioBatDau, GioKetThuc, SoTieng, TargetStaff, LoaiCa, MoTa)
           VALUES (?, ?, ?, ?, ?, 'Full-time', ?)`,
          [s.tenCaLam, s.gioBatDau, s.gioKetThuc, s.soTieng, s.targetStaff, s.moTa]
        );
      }
    }

    // Đánh dấu các ca dài khác (nếu có Ca A, Ca B) là Full-time
    await target.query(
      "UPDATE calam SET LoaiCa = 'Full-time' WHERE TenCaLam NOT IN ('Ca 1', 'Ca 2', 'Ca 3')"
    );
  } catch (e) {
    console.warn("Lưu ý đồng bộ ca làm:", e.message);
  }

  // Đảm bảo bảng dangky_ca tồn tại
  try {
    await target.query(`
      CREATE TABLE IF NOT EXISTS dangky_ca (
        MaDangKy INT AUTO_INCREMENT PRIMARY KEY,
        MaNhanVien INT NOT NULL,
        MaCaLam INT NOT NULL,
        NgayLam DATE NOT NULL,
        TrangThai VARCHAR(50) DEFAULT 'pending',
        NgayDangKy DATETIME DEFAULT CURRENT_TIMESTAMP,
        NguoiDuyet INT NULL,
        NgayDuyet DATETIME NULL,
        GhiChu TEXT NULL,
        INDEX idx_nv_ngay (MaNhanVien, NgayLam),
        INDEX idx_ngay_ca (NgayLam, MaCaLam)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const alterDkStatements = [
      "ALTER TABLE dangky_ca ADD COLUMN TrangThai VARCHAR(50) DEFAULT 'pending'",
      "ALTER TABLE dangky_ca ADD COLUMN NgayDangKy DATETIME DEFAULT CURRENT_TIMESTAMP",
      "ALTER TABLE dangky_ca ADD COLUMN NguoiDuyet INT NULL",
      "ALTER TABLE dangky_ca ADD COLUMN NgayDuyet DATETIME NULL",
      "ALTER TABLE dangky_ca ADD COLUMN GhiChu TEXT NULL",
      "ALTER TABLE dangky_ca ADD COLUMN TenNhanVien VARCHAR(100) NULL",
      "ALTER TABLE dangky_ca ADD COLUMN ChucVu VARCHAR(50) NULL",
    ];

    for (const sql of alterDkStatements) {
      try {
        await target.query(sql);
      } catch (err) {
        if (err.errno !== 1060 && err.code !== "ER_DUP_FIELDNAME") {
          // ignore duplicate column
        }
      }
    }

    // Tự động nạp dữ liệu mẫu ban đầu nếu bảng trống
    await seedInitialDangKyCa(target);
  } catch (err) {
    console.warn("Lưu ý tạo bảng dangky_ca:", err.message);
  }

  shiftSchemaEnsured = true;
}

// Khởi chạy schema
ensureShiftSchema();

// Helper: Tìm MaNhanVien (INT) từ staffId, MaNhanVienCode, hoặc ID
async function resolveEmployeeId(staffIdentifier) {
  if (!staffIdentifier) return 1;
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

  const [first] = await db.query("SELECT MaNhanVien FROM nhanvien LIMIT 1");
  return first.length > 0 ? first[0].MaNhanVien : 1;
}

// Helper: Tìm MaCaLam (INT) từ shiftType ("morning", "Ca 1", "Ca A", v.v.)
async function resolveShiftId(shiftIdentifier) {
  if (!shiftIdentifier) return 1;
  if (typeof shiftIdentifier === "number" || /^\d+$/.test(String(shiftIdentifier).trim())) {
    return Number(shiftIdentifier);
  }
  const str = String(shiftIdentifier).toLowerCase().trim();
  if (str === "ca a" || str === "caa" || str === "ca_a") {
    const [r] = await db.query("SELECT MaCaLam FROM calam WHERE TenCaLam = 'Ca A' LIMIT 1");
    if (r.length > 0) return r[0].MaCaLam;
  }
  if (str === "ca b" || str === "cab" || str === "ca_b") {
    const [r] = await db.query("SELECT MaCaLam FROM calam WHERE TenCaLam = 'Ca B' LIMIT 1");
    if (r.length > 0) return r[0].MaCaLam;
  }
  if (str === "morning" || str === "ca 1" || str === "ca1") {
    const [r] = await db.query("SELECT MaCaLam FROM calam WHERE TenCaLam = 'Ca 1' LIMIT 1");
    if (r.length > 0) return r[0].MaCaLam;
  }
  if (str === "afternoon" || str === "ca 2" || str === "ca2") {
    const [r] = await db.query("SELECT MaCaLam FROM calam WHERE TenCaLam = 'Ca 2' LIMIT 1");
    if (r.length > 0) return r[0].MaCaLam;
  }
  if (str === "evening" || str === "ca 3" || str === "ca3") {
    const [r] = await db.query("SELECT MaCaLam FROM calam WHERE TenCaLam = 'Ca 3' LIMIT 1");
    if (r.length > 0) return r[0].MaCaLam;
  }
  const [any] = await db.query("SELECT MaCaLam FROM calam WHERE TenCaLam = ? LIMIT 1", [shiftIdentifier]);
  if (any.length > 0) return any[0].MaCaLam;
  return 1;
}

/**
 * [GET] /api/shifts
 * Lấy tất cả các ca làm việc
 */
exports.getAllShifts = async (req, res) => {
  try {
    await ensureShiftSchema();
    const { type } = req.query;

    let sql = "SELECT * FROM calam";
    const params = [];

    if (type) {
      sql += " WHERE LoaiCa = ?";
      params.push(type);
    }

    sql += " ORDER BY MaCaLam ASC";

    const [rows] = await db.query(sql, params);

    const formatted = rows.map((r) => {
      const start = String(r.GioBatDau || "07:00:00").slice(0, 5);
      const end = String(r.GioKetThuc || "12:00:00").slice(0, 5);
      const hours = r.SoTieng ? Number(r.SoTieng) : calculateShiftHours(start, end);

      return {
        maCaLam: r.MaCaLam,
        tenCaLam: r.TenCaLam,
        gioBatDau: start,
        gioKetThuc: end,
        thoiGianHienThi: `${start} - ${end} (${hours} tiếng)`,
        soTieng: hours,
        targetStaff: r.TargetStaff || 3,
        loaiCa: r.LoaiCa || "Part-time",
        moTa: r.MoTa || "",
      };
    });

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách ca làm:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [GET] /api/shifts/part-time
 * Lấy danh sách 3 ca ngắn chuyên biệt dành cho sinh viên / nhân viên Part-time
 */
exports.getPartTimeShifts = async (req, res) => {
  try {
    await ensureShiftSchema();
    const [rows] = await db.query(
      "SELECT * FROM calam WHERE LoaiCa = 'Part-time' OR TenCaLam IN ('Ca 1', 'Ca 2', 'Ca 3') ORDER BY MaCaLam ASC"
    );

    const formatted = rows.map((r, index) => {
      const start = String(r.GioBatDau || "07:00:00").slice(0, 5);
      const end = String(r.GioKetThuc || "12:00:00").slice(0, 5);
      const hours = r.SoTieng ? Number(r.SoTieng) : calculateShiftHours(start, end);

      return {
        id: `shift_${index + 1}`,
        maCaLam: r.MaCaLam,
        tenCaLam: r.TenCaLam,
        gioBatDau: start,
        gioKetThuc: end,
        soTieng: hours,
        thoiGian: `${start} - ${end}`,
        thoiLuongChu: `${hours} tiếng`,
        targetStaff: r.TargetStaff || 3,
        loaiCa: r.LoaiCa || "Part-time",
        moTa: r.MoTa || "",
      };
    });

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách 3 ca Part-time:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [POST] /api/shifts/config-part-time
 * Quản trị viên/Quản lý lưu cấu hình 3 ca ngắn vào Database
 */
exports.savePartTimeShiftConfig = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await ensureShiftSchema(connection);
    await connection.beginTransaction();

    const shiftsToUpdate = req.body.shifts || req.body;

    if (!Array.isArray(shiftsToUpdate) || shiftsToUpdate.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Dữ liệu cấu hình 3 ca không hợp lệ (cần danh sách các ca).",
      });
    }

    const savedResults = [];

    for (const item of shiftsToUpdate) {
      const tenCaLam = item.tenCaLam || item.name;
      const rawStart = item.gioBatDau || item.start || "07:00";
      const rawEnd = item.gioKetThuc || item.end || "12:00";
      const targetStaff = item.targetStaff ? parseInt(item.targetStaff, 10) : 3;
      const moTa =
        item.moTa ||
        item.description ||
        `${tenCaLam} ngắn linh động cho sinh viên (${rawStart} - ${rawEnd})`;

      const gioBatDau = rawStart.length === 5 ? `${rawStart}:00` : rawStart;
      const gioKetThuc = rawEnd.length === 5 ? `${rawEnd}:00` : rawEnd;
      const soTieng =
        item.soTieng !== undefined
          ? Number(item.soTieng)
          : calculateShiftHours(rawStart, rawEnd);

      const [existing] = await connection.query(
        "SELECT MaCaLam FROM calam WHERE TenCaLam = ?",
        [tenCaLam]
      );

      let maCaLam;
      if (existing.length > 0) {
        maCaLam = existing[0].MaCaLam;
        await connection.query(
          `UPDATE calam SET 
            GioBatDau = ?, 
            GioKetThuc = ?, 
            SoTieng = ?, 
            TargetStaff = ?, 
            LoaiCa = 'Part-time',
            MoTa = ?
           WHERE MaCaLam = ?`,
          [gioBatDau, gioKetThuc, soTieng, targetStaff, moTa, maCaLam]
        );
      } else {
        const [insertRes] = await connection.query(
          `INSERT INTO calam (TenCaLam, GioBatDau, GioKetThuc, SoTieng, TargetStaff, LoaiCa, MoTa)
           VALUES (?, ?, ?, ?, ?, 'Part-time', ?)`,
          [tenCaLam, gioBatDau, gioKetThuc, soTieng, targetStaff, moTa]
        );
        maCaLam = insertRes.insertId;
      }

      savedResults.push({
        maCaLam,
        tenCaLam,
        gioBatDau,
        gioKetThuc,
        soTieng,
        targetStaff,
        loaiCa: "Part-time",
        moTa,
      });
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "Lưu cấu hình 3 ca ngắn linh động (Part-time) vào Database thành công!",
      data: savedResults,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Lỗi lưu cấu hình 3 ca Part-time:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lưu cấu hình ca làm: " + error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * [GET] /api/shifts/full-time
 * Lấy danh sách 2 ca làm việc chính (Ca A, Ca B) dành cho Full-time và Quản lý
 */
exports.getFullTimeShifts = async (req, res) => {
  try {
    await ensureShiftSchema();
    const [rows] = await db.query(
      "SELECT * FROM calam WHERE LoaiCa = 'Full-time' OR TenCaLam IN ('Ca A', 'Ca B') ORDER BY MaCaLam ASC"
    );

    const formatted = rows.map((r, index) => {
      const defaultStart = index === 0 ? "07:00:00" : "14:30:00";
      const defaultEnd = index === 0 ? "15:00:00" : "22:30:00";
      const start = String(r.GioBatDau || defaultStart).slice(0, 5);
      const end = String(r.GioKetThuc || defaultEnd).slice(0, 5);
      const hours = r.SoTieng ? Number(r.SoTieng) : calculateShiftHours(start, end);

      return {
        id: `shift_full_${index + 1}`,
        maCaLam: r.MaCaLam,
        tenCaLam: r.TenCaLam,
        gioBatDau: start,
        gioKetThuc: end,
        soTieng: hours,
        thoiGian: `${start} - ${end}`,
        thoiLuongChu: `${hours} tiếng`,
        targetStaff: r.TargetStaff || 4,
        loaiCa: "Full-time",
        moTa: r.MoTa || "",
      };
    });

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách 2 ca Full-time:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [POST] /api/shifts/config-full-time
 * Quản lý lưu cấu hình 2 ca chính (Ca A, Ca B) vào Database
 */
exports.saveFullTimeShiftConfig = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await ensureShiftSchema(connection);
    await connection.beginTransaction();

    const shiftsToUpdate = req.body.shifts || req.body;

    if (!Array.isArray(shiftsToUpdate) || shiftsToUpdate.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Dữ liệu cấu hình 2 ca Full-time không hợp lệ (cần danh sách các ca).",
      });
    }

    const savedResults = [];

    for (const item of shiftsToUpdate) {
      const tenCaLam = item.tenCaLam || item.name;
      const defaultStart = tenCaLam === "Ca A" ? "07:00" : "14:30";
      const defaultEnd = tenCaLam === "Ca A" ? "15:00" : "22:30";
      const rawStart = item.gioBatDau || item.start || defaultStart;
      const rawEnd = item.gioKetThuc || item.end || defaultEnd;
      const targetStaff = item.targetStaff ? parseInt(item.targetStaff, 10) : 4;
      const moTa =
        item.moTa ||
        item.description ||
        `${tenCaLam} 8 tiếng dành cho nhân viên Full-time và Quản lý (${rawStart} - ${rawEnd})`;

      const gioBatDau = rawStart.length === 5 ? `${rawStart}:00` : rawStart;
      const gioKetThuc = rawEnd.length === 5 ? `${rawEnd}:00` : rawEnd;
      const soTieng =
        item.soTieng !== undefined
          ? Number(item.soTieng)
          : calculateShiftHours(rawStart, rawEnd);

      const [existing] = await connection.query(
        "SELECT MaCaLam FROM calam WHERE TenCaLam = ?",
        [tenCaLam]
      );

      let maCaLam;
      if (existing.length > 0) {
        maCaLam = existing[0].MaCaLam;
        await connection.query(
          `UPDATE calam SET 
            GioBatDau = ?, 
            GioKetThuc = ?, 
            SoTieng = ?, 
            TargetStaff = ?, 
            LoaiCa = 'Full-time',
            MoTa = ?
           WHERE MaCaLam = ?`,
          [gioBatDau, gioKetThuc, soTieng, targetStaff, moTa, maCaLam]
        );
      } else {
        const [insertRes] = await connection.query(
          `INSERT INTO calam (TenCaLam, GioBatDau, GioKetThuc, SoTieng, TargetStaff, LoaiCa, MoTa)
           VALUES (?, ?, ?, ?, ?, 'Full-time', ?)`,
          [tenCaLam, gioBatDau, gioKetThuc, soTieng, targetStaff, moTa]
        );
        maCaLam = insertRes.insertId;
      }

      savedResults.push({
        maCaLam,
        tenCaLam,
        gioBatDau,
        gioKetThuc,
        soTieng,
        targetStaff,
        loaiCa: "Full-time",
        moTa,
      });
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "Lưu cấu hình 2 ca chính (Ca A, Ca B) vào Database thành công!",
      data: savedResults,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Lỗi lưu cấu hình 2 ca Full-time:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lưu cấu hình ca làm: " + error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * [GET] /api/shifts/registrations
 * Lấy dữ liệu đăng ký ca từ bảng dangky_ca trong Database
 */
exports.getShiftRegistrations = async (req, res) => {
  try {
    await ensureShiftSchema();
    const { startDate, endDate, staffId, status } = req.query;

    let sql = `
      SELECT 
        dkc.MaDangKy AS id,
        dkc.MaDangKy AS registrationId,
        COALESCE(nv.MaNhanVienCode, CONCAT('NV', LPAD(dkc.MaNhanVien, 3, '0'))) AS staffId,
        dkc.MaNhanVien AS maNhanVien,
        COALESCE(nv.HoTen, dkc.TenNhanVien, 'Nhân viên') AS staffName,
        COALESCE(nv.ChucVu, dkc.ChucVu, 'Nhân viên') AS role,
        COALESCE(nv.LoaiNhanVien, 'Part-time') AS loaiNhanVien,
        DATE_FORMAT(dkc.NgayLam, '%Y-%m-%d') AS dateKey,
        dkc.MaCaLam AS maCaLam,
        cl.TenCaLam AS tenCaLam,
        COALESCE(cl.LoaiCa, 'Full-time') AS loaiCa,
        CASE 
          WHEN cl.TenCaLam = 'Ca A' OR cl.TenCaLam LIKE '%Ca A%' THEN 'ca_a'
          WHEN cl.TenCaLam = 'Ca B' OR cl.TenCaLam LIKE '%Ca B%' THEN 'ca_b'
          WHEN cl.TenCaLam = 'Ca 1' THEN 'morning'
          WHEN cl.TenCaLam = 'Ca 2' THEN 'afternoon'
          WHEN cl.TenCaLam = 'Ca 3' THEN 'evening'
          WHEN cl.TenCaLam LIKE '%Sáng%' THEN 'morning'
          WHEN cl.TenCaLam LIKE '%Chiều%' THEN 'afternoon'
          WHEN cl.TenCaLam LIKE '%Tối%' THEN 'evening'
          ELSE 'ca_a'
        END AS shiftType,
        COALESCE(dkc.TrangThai, 'pending') AS status,
        DATE_FORMAT(COALESCE(dkc.NgayDangKy, NOW()), '%d/%m/%Y') AS registeredAt,
        dkc.GhiChu AS ghiChu,
        cl.GioBatDau AS gioBatDau,
        cl.GioKetThuc AS gioKetThuc,
        cl.SoTieng AS soTieng
      FROM dangky_ca dkc
      LEFT JOIN nhanvien nv ON dkc.MaNhanVien = nv.MaNhanVien
      LEFT JOIN calam cl ON dkc.MaCaLam = cl.MaCaLam
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += " AND dkc.NgayLam >= ?";
      params.push(startDate);
    }
    if (endDate) {
      sql += " AND dkc.NgayLam <= ?";
      params.push(endDate);
    }
    if (staffId) {
      const empId = await resolveEmployeeId(staffId);
      sql += " AND dkc.MaNhanVien = ?";
      params.push(empId);
    }
    if (status && status !== "all") {
      sql += " AND dkc.TrangThai = ?";
      params.push(status);
    }

    sql += " ORDER BY dkc.NgayLam ASC, cl.MaCaLam ASC, dkc.MaDangKy ASC";

    const [rows] = await db.query(sql, params);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách đăng ký ca từ database:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [POST] /api/shifts/registrations
 * Nhân viên gửi đăng ký ca làm mới hoặc Quản lý xếp ca trực tiếp vào Database
 */
exports.createShiftRegistration = async (req, res) => {
  try {
    await ensureShiftSchema();
    const body = req.body;
    const items = Array.isArray(body)
      ? body
      : Array.isArray(body.registrations)
      ? body.registrations
      : [body];

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Không có ca làm nào để đăng ký." });
    }

    const createdIds = [];
    for (const item of items) {
      const empId = await resolveEmployeeId(item.staffId || item.maNhanVien);
      const shiftId = item.maCaLam ? Number(item.maCaLam) : await resolveShiftId(item.shiftType || item.shiftId);
      const date = item.dateKey || item.ngayLam || item.date;
      const status = item.status || "pending";
      const ghiChu = item.ghiChu || item.note || null;
      const staffName = item.staffName || null;
      const role = item.role || item.position || item.chucVu || null;

      if (!date || !shiftId) continue;

      // Kiểm tra ràng buộc hợp đồng: Part-time không được đăng ký Full-time và Full-time không được đăng ký Part-time
      const [empRows] = await db.query(
        "SELECT LoaiNhanVien, ChucVu FROM nhanvien WHERE MaNhanVien = ?",
        [empId]
      );
      const [shiftRows] = await db.query(
        "SELECT TenCaLam, LoaiCa FROM calam WHERE MaCaLam = ?",
        [shiftId]
      );

      if (empRows.length > 0 && shiftRows.length > 0) {
        const empType = (empRows[0].LoaiNhanVien || "").toLowerCase();
        const shiftTypeStr = (shiftRows[0].LoaiCa || "").toLowerCase();
        const shiftName = shiftRows[0].TenCaLam;
        const isManagerOrAdmin =
          (empRows[0].ChucVu || "").toLowerCase().includes("quản lý") ||
          (empRows[0].ChucVu || "").toLowerCase().includes("admin") ||
          (role || "").toLowerCase().includes("quản lý") ||
          (role || "").toLowerCase().includes("admin");

        if (!isManagerOrAdmin) {
          if (
            empType.includes("part") &&
            (shiftTypeStr.includes("full") || shiftName === "Ca A" || shiftName === "Ca B")
          ) {
            return res.status(403).json({
              success: false,
              message: `Nhân viên Part-time không có quyền đăng ký ca làm Full-time (${shiftName})!`,
            });
          }
          if (
            empType.includes("full") &&
            (shiftTypeStr.includes("part") || ["Ca 1", "Ca 2", "Ca 3"].includes(shiftName))
          ) {
            return res.status(403).json({
              success: false,
              message: `Nhân viên Full-time không có quyền đăng ký ca làm Part-time (${shiftName})!`,
            });
          }
        }
      }

      // Kiểm tra xem đã đăng ký ca này vào ngày này chưa
      const [existing] = await db.query(
        "SELECT MaDangKy FROM dangky_ca WHERE MaNhanVien = ? AND NgayLam = ? AND MaCaLam = ?",
        [empId, date, shiftId]
      );

      if (existing.length > 0) {
        await db.query(
          "UPDATE dangky_ca SET TrangThai = ?, GhiChu = ?, TenNhanVien = COALESCE(?, TenNhanVien), ChucVu = COALESCE(?, ChucVu) WHERE MaDangKy = ?",
          [status, ghiChu, staffName, role, existing[0].MaDangKy]
        );
        createdIds.push(existing[0].MaDangKy);
      } else {
        const [insertRes] = await db.query(
          `INSERT INTO dangky_ca (MaNhanVien, MaCaLam, NgayLam, TrangThai, NgayDangKy, GhiChu, TenNhanVien, ChucVu)
           VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
          [empId, shiftId, date, status, ghiChu, staffName, role]
        );
        createdIds.push(insertRes.insertId);
      }
    }

    return res.json({
      success: true,
      message: `Đã lưu thành công ${createdIds.length} lượt đăng ký ca vào Database!`,
      ids: createdIds,
    });
  } catch (error) {
    console.error("Lỗi đăng ký ca làm:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [PUT] /api/shifts/registrations/:id/status
 * Quản lý Duyệt / Từ chối ca làm
 */
exports.updateRegistrationStatus = async (req, res) => {
  try {
    await ensureShiftSchema();
    const { id } = req.params;
    const { status, approverId } = req.body;

    if (!["approved", "rejected", "pending", "admin_approved"].includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ." });
    }

    const [result] = await db.query(
      `UPDATE dangky_ca 
       SET TrangThai = ?, 
           NguoiDuyet = ?, 
           NgayDuyet = NOW() 
       WHERE MaDangKy = ?`,
      [status, approverId || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lượt đăng ký ca." });
    }

    return res.json({
      success: true,
      message: `Cập nhật trạng thái ca làm thành "${status}" thành công!`,
    });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái ca:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [PUT] /api/shifts/registrations/approve-all
 * Duyệt đồng loạt các ca đang chờ
 */
exports.approveAllShifts = async (req, res) => {
  try {
    await ensureShiftSchema();
    const { dateKeys, approverId } = req.body;

    let sql = "UPDATE dangky_ca SET TrangThai = 'approved', NguoiDuyet = ?, NgayDuyet = NOW() WHERE TrangThai = 'pending'";
    const params = [approverId || null];

    if (Array.isArray(dateKeys) && dateKeys.length > 0) {
      sql += " AND DATE_FORMAT(NgayLam, '%Y-%m-%d') IN (?)";
      params.push(dateKeys);
    }

    const [result] = await db.query(sql, params);

    return res.json({
      success: true,
      message: `Đã duyệt đồng loạt ${result.affectedRows} ca làm việc đang chờ!`,
      affectedCount: result.affectedRows,
    });
  } catch (error) {
    console.error("Lỗi duyệt hàng loạt ca:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [PUT] /api/shifts/registrations/:id/reassign
 * Quản lý kéo thả hoặc chuyển nhân viên sang ca/ngày khác
 */
exports.reassignShift = async (req, res) => {
  try {
    await ensureShiftSchema();
    const { id } = req.params;
    const { targetDateKey, targetShiftType, targetMaCaLam, status } = req.body;

    const shiftId = targetMaCaLam ? Number(targetMaCaLam) : await resolveShiftId(targetShiftType);
    const newStatus = status || "approved";

    const [result] = await db.query(
      `UPDATE dangky_ca 
       SET NgayLam = ?, 
           MaCaLam = ?, 
           TrangThai = ?,
           NgayDuyet = NOW()
       WHERE MaDangKy = ?`,
      [targetDateKey, shiftId, newStatus, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lượt đăng ký ca." });
    }

    return res.json({
      success: true,
      message: "Chuyển ca làm cho nhân viên thành công!",
    });
  } catch (error) {
    console.error("Lỗi chuyển ca:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [DELETE] /api/shifts/registrations/:id
 * Hủy lượt đăng ký ca làm việc
 */
exports.deleteShiftRegistration = async (req, res) => {
  try {
    await ensureShiftSchema();
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM dangky_ca WHERE MaDangKy = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi cần hủy." });
    }

    return res.json({
      success: true,
      message: "Đã hủy ca làm việc thành công!",
    });
  } catch (error) {
    console.error("Lỗi xóa lượt đăng ký ca:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [POST] /api/shifts/registrations/reset-sample
 * Thiết lập lại dữ liệu đăng ký ca thực tế trong database
 */
exports.resetSampleRegistrations = async (req, res) => {
  try {
    await ensureShiftSchema();
    await db.query("TRUNCATE TABLE dangky_ca");
    await seedInitialDangKyCa(db);

    const [rows] = await db.query(`
      SELECT 
        dkc.MaDangKy AS id,
        dkc.MaDangKy AS registrationId,
        COALESCE(nv.MaNhanVienCode, CONCAT('NV', LPAD(dkc.MaNhanVien, 3, '0'))) AS staffId,
        dkc.MaNhanVien AS maNhanVien,
        COALESCE(nv.HoTen, 'Nhân viên') AS staffName,
        COALESCE(nv.ChucVu, 'Nhân viên') AS role,
        DATE_FORMAT(dkc.NgayLam, '%Y-%m-%d') AS dateKey,
        dkc.MaCaLam AS maCaLam,
        cl.TenCaLam AS tenCaLam,
        CASE 
          WHEN cl.TenCaLam = 'Ca 1' THEN 'morning'
          WHEN cl.TenCaLam = 'Ca 2' THEN 'afternoon'
          WHEN cl.TenCaLam = 'Ca 3' THEN 'evening'
          ELSE 'morning'
        END AS shiftType,
        dkc.TrangThai AS status,
        DATE_FORMAT(COALESCE(dkc.NgayDangKy, NOW()), '%d/%m/%Y') AS registeredAt
      FROM dangky_ca dkc
      LEFT JOIN nhanvien nv ON dkc.MaNhanVien = nv.MaNhanVien
      LEFT JOIN calam cl ON dkc.MaCaLam = cl.MaCaLam
      ORDER BY dkc.NgayLam ASC, cl.MaCaLam ASC
    `);

    return res.json({
      success: true,
      message: "Đã thiết lập lại dữ liệu ca đăng ký vào Database thành công!",
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi reset dữ liệu ca:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.ensureShiftSchema = ensureShiftSchema;
