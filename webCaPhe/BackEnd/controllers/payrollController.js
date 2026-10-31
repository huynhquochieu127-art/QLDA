const db = require("../config/db");

const STANDARD_WORK_DAYS = 26; // Ngày công chuẩn Full-time
const LATE_PENALTY = 20000; // Phạt 20.000đ / lần đi trễ
const INSURANCE_RATE = 0.105; // 10.5% BHXH, BHYT, BHTN

let payrollSchemaEnsured = false;
async function ensurePayrollSchema(conn) {
  if (payrollSchemaEnsured) return;
  const dbConn = conn || db;
  try {
    const colsToAdd = [
      { name: "LuongCoBan", type: "DECIMAL(18,2) DEFAULT 0.00" },
      { name: "SoCong", type: "DECIMAL(5,2) DEFAULT 0.00" },
      { name: "SoGioLam", type: "DECIMAL(8,2) DEFAULT 0.00" },
      { name: "SoNgayNghiKhongPhep", type: "INT DEFAULT 0" },
      { name: "TienPhat", type: "DECIMAL(18,2) DEFAULT 0.00" },
      { name: "GhiChu", type: "TEXT" },
      { name: "NgayThanhToan", type: "DATETIME NULL" },
    ];

    for (const col of colsToAdd) {
      const [res] = await dbConn.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bangluong' AND COLUMN_NAME = ?",
        [col.name]
      );
      if (res.length === 0) {
        await dbConn.query(`ALTER TABLE bangluong ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to bangluong`);
      }
    }

    // Ensure MaBangLuong has AUTO_INCREMENT
    const [mbCols] = await dbConn.query("SHOW COLUMNS FROM bangluong LIKE 'MaBangLuong'");
    if (mbCols.length > 0 && !mbCols[0].Extra?.toLowerCase().includes("auto_increment")) {
      await dbConn.query("ALTER TABLE bangluong MODIFY COLUMN MaBangLuong INT AUTO_INCREMENT");
      console.log("Updated MaBangLuong to AUTO_INCREMENT");
    }

    // Ensure TrangThai is VARCHAR, not DATETIME
    const [ttCols] = await dbConn.query("SHOW COLUMNS FROM bangluong LIKE 'TrangThai'");
    if (ttCols.length > 0 && ttCols[0].Type?.toLowerCase().includes("datetime")) {
      await dbConn.query("ALTER TABLE bangluong MODIFY COLUMN TrangThai VARCHAR(50) DEFAULT 'Chờ duyệt'");
      console.log("Updated TrangThai column to VARCHAR(50)");
    }

    const [indexes] = await dbConn.query(
      "SHOW INDEX FROM bangluong WHERE Key_name = 'unique_emp_month'"
    );
    if (indexes.length === 0) {
      await dbConn.query("ALTER TABLE bangluong ADD UNIQUE KEY unique_emp_month (MaNhanVien, Thang, Nam)");
      console.log("Added unique_emp_month key to bangluong");
    }

    payrollSchemaEnsured = true;
  } catch (err) {
    console.error("ensurePayrollSchema error:", err.message);
  }
}

ensurePayrollSchema();
exports.ensurePayrollSchema = ensurePayrollSchema;

/**
 * Hàm lõi tính lương nội bộ
 * Quy tắc tính lương:
 * - Part-time: ổng lương = (Số giờ làm × Lương/giờ) - (Số lần trễ × 20.000đ) + Thưởng
 * - Full-time: Tổng lương = Tổng lương = Lương cứng - (Nghỉ không phép × Lương ngày) - (Số lần trễ × 20.000đ) + Thưởng chuyên cần
 * @param {number} thang
 * @param {number} nam
 * @param {object} options
 */
async function runPayrollCalculationInternal(thang, nam, options = {}) {
  const force = options.force === true;

  // 1. KIỂM TRA TÍN HIỆU "ĐÃ CHỐT SỔ" TỪ PHÂN HỆ BẢNG CÔNG (TASK QH-55)
  const [timesheetStats] = await db.query(
    `SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN TrangThai = 'submitted_to_admin' THEN 1 ELSE 0 END) AS lockedCount
     FROM bangcong_thang 
     WHERE Thang = ? AND Nam = ?`,
    [thang, nam]
  );

  const total = timesheetStats[0]?.total || 0;
  const lockedCount = timesheetStats[0]?.lockedCount || 0;

  if (total === 0) {
    throw new Error(
      `Chưa có dữ liệu bảng công tháng ${thang}/${nam}! Vui lòng yêu cầu Quản lý xuất bảng công nháp và chốt sổ trước khi tính lương.`
    );
  }

  if (!force && lockedCount < total) {
    throw new Error(
      `Không thể tính lương! Bảng công tháng ${thang}/${nam} chưa được Quản lý chốt sổ (Task QH-55). API chỉ bắt đầu chạy tính lương khi nhận được tín hiệu "Đã chốt sổ" từ phân hệ Bảng công đẩy sang.`
    );
  }

  // 2. Lấy dữ liệu bảng công kèm thông tin lương nhân viên
  const [timesheets] = await db.query(
    `SELECT 
      bc.MaBangCong,
      bc.MaNhanVien,
      bc.Thang,
      bc.Nam,
      bc.SoCong,
      bc.SoGioLam,
      bc.SoNgayNghi,
      bc.SoNgayTre,
      bc.GhiChuQL,
      nv.MaNhanVienCode,
      COALESCE(tk.HoTen, nv.HoTen) AS HoTen,
      nv.LoaiNhanVien,
      nv.Luong,
      COALESCE(nv.ChucVu, 'Nhân viên') AS ChucVu
     FROM bangcong_thang bc
     JOIN nhanvien nv ON bc.MaNhanVien = nv.MaNhanVien
     LEFT JOIN taikhoan tk ON nv.MaTaiKhoan = tk.MaTaiKhoan
     WHERE bc.Thang = ? AND bc.Nam = ?`,
    [thang, nam]
  );

  const results = [];

  for (const row of timesheets) {
    const isPartTime = (row.LoaiNhanVien || "").toLowerCase().includes("part");
    const rawLuong = Number(row.Luong) || 0;
    const soCong = Number(row.SoCong) || 0;
    const soGioLam = Number(row.SoGioLam) || 0;
    const soNgayTre = Number(row.SoNgayTre) || 0;
    const soNgayNghi = Number(row.SoNgayNghi) || Math.max(0, STANDARD_WORK_DAYS - Math.round(soCong));

    let luongCoBan = 0;
    let soNgayNghiKhongPhep = 0;
    let mucPhatMoiNgay = 0;
    let tienPhat = 0;
    let thuong = 0;
    let khauTru = 0;
    let tongLuong = 0;
    let ghiChu = "";

    if (isPartTime) {
      // =========================================================================
      // 1. PART-TIME: Tổng lương = Số giờ làm thực tế x Mức lương theo giờ (QH-29)
      // =========================================================================
      const mucLuongGio = rawLuong > 0 ? rawLuong : 30000; // Mức lương theo giờ (VNĐ/h)
      luongCoBan = mucLuongGio;
      const tienPhatTre = soNgayTre * LATE_PENALTY;
      tienPhat = tienPhatTre;
      khauTru = tienPhat;
      tongLuong = Math.max(0, Math.round(soGioLam * mucLuongGio) - tienPhat);
      thuong = soGioLam >= 120 ? 300000 : 0; // Thưởng chuyên cần vượt giờ nếu có
      soNgayNghiKhongPhep = 0;

      ghiChu = `Part-time (QH-29): ${soGioLam} giờ làm thực tế x ${mucLuongGio.toLocaleString('vi-VN')}đ/giờ` +
        (soNgayTre > 0 ? ` - (Phạt đi trễ: ${soNgayTre} lần x ${LATE_PENALTY.toLocaleString('vi-VN')}đ)` : "") +
        (thuong > 0 ? ` + Thưởng vượt giờ ${thuong.toLocaleString('vi-VN')}đ` : "") +
        ` = ${(tongLuong + thuong).toLocaleString('vi-VN')}đ`;

      if (thuong > 0) {
        tongLuong += thuong;
      }
    } else {
      // =========================================================================
      // 2. FULL-TIME: Tổng lương = Lương cứng (QH-28) - (Số ngày nghỉ không phép x Phạt) - (Số lần trễ x Phạt) + Thưởng (nếu có)
      // =========================================================================
      const luongCung = rawLuong >= 1000000 ? rawLuong : 8000000; // Lương cứng Full-time
      luongCoBan = luongCung;

      // Tra cứu số ngày nghỉ có phép từ bảng đơn xin nghỉ phép đã được duyệt
      const [leaveRows] = await db.query(
        `SELECT COUNT(*) AS soNgayCoPhep 
         FROM don_xin_nghi 
         WHERE MaNhanVien = ? 
           AND MONTH(NgayNghi) = ? 
           AND YEAR(NgayNghi) = ? 
           AND (TrangThai = 'approved' OR TrangThai = 'Đã duyệt')`,
        [row.MaNhanVien, thang, nam]
      );

      const soNgayCoPhep = Number(leaveRows[0]?.soNgayCoPhep || 0);
      soNgayNghiKhongPhep = Math.max(0, soNgayNghi - soNgayCoPhep);

      // Mức phạt cho 1 ngày nghỉ không phép: Lương 1 ngày công (Lương cứng / 26)
      mucPhatMoiNgay = Math.round(luongCung / STANDARD_WORK_DAYS);
      const tienPhatNghi = soNgayNghiKhongPhep * mucPhatMoiNgay;
      const tienPhatTre = soNgayTre * LATE_PENALTY;
      tienPhat = tienPhatNghi + tienPhatTre;

      // Thưởng chuyên cần & hiệu suất (nếu có)
      if (soNgayNghiKhongPhep === 0 && soNgayTre === 0) {
        thuong = 500000; // Thưởng tối đa nếu đi làm đủ, không trễ, không nghỉ không phép
      } else if (soNgayNghiKhongPhep === 0) {
        thuong = 300000;
      } else if (soNgayNghiKhongPhep === 1) {
        thuong = 150000;
      } else {
        thuong = 0; // Nghỉ từ 2 ngày không phép trở lên: không có thưởng
      }

      khauTru = tienPhat;
      tongLuong = Math.max(0, Math.round(luongCung - tienPhat + thuong));

      const chiTietPhat = [];
      if (soNgayNghiKhongPhep > 0) chiTietPhat.push(`Nghỉ KP: ${soNgayNghiKhongPhep} ngày x ${mucPhatMoiNgay.toLocaleString('vi-VN')}đ`);
      if (soNgayTre > 0) chiTietPhat.push(`Đi trễ: ${soNgayTre} lần x ${LATE_PENALTY.toLocaleString('vi-VN')}đ`);
      const phatText = chiTietPhat.length > 0 ? ` - (${chiTietPhat.join(" + ")})` : "";

      ghiChu = `Full-time (QH-28): Lương cứng ${luongCung.toLocaleString('vi-VN')}đ${phatText} + Thưởng: ${thuong.toLocaleString('vi-VN')}đ = ${tongLuong.toLocaleString('vi-VN')}đ`;
    }

    const tongCaLam = Math.round(soCong) || Math.round(soGioLam / 5) || 0;

    // Lưu vào bảng bangluong (có UNIQUE KEY trên MaNhanVien, Thang, Nam)
    await db.query(
      `INSERT INTO bangluong 
       (MaNhanVien, Thang, Nam, TongCaLam, Thuong, KhauTru, TongLuong, TrangThai, LuongCoBan, SoCong, SoGioLam, SoNgayNghiKhongPhep, TienPhat, GhiChu)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Chờ duyệt', ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       TongCaLam = VALUES(TongCaLam),
       Thuong = VALUES(Thuong),
       KhauTru = VALUES(KhauTru),
       TongLuong = VALUES(TongLuong),
       LuongCoBan = VALUES(LuongCoBan),
       SoCong = VALUES(SoCong),
       SoGioLam = VALUES(SoGioLam),
       SoNgayNghiKhongPhep = VALUES(SoNgayNghiKhongPhep),
       TienPhat = VALUES(TienPhat),
       GhiChu = VALUES(GhiChu)`,
      [
        row.MaNhanVien,
        thang,
        nam,
        tongCaLam,
        thuong,
        khauTru,
        tongLuong,
        luongCoBan,
        soCong,
        soGioLam,
        soNgayNghiKhongPhep,
        tienPhat,
        ghiChu,
      ]
    );

    results.push({
      maNhanVien: row.MaNhanVien,
      maNhanVienCode: row.MaNhanVienCode,
      hoTen: row.HoTen,
      chucVu: row.ChucVu,
      loaiNhanVien: row.LoaiNhanVien,
      luongCoBan,
      soCong,
      soGioLam,
      soNgayTre,
      soNgayNghiKhongPhep,
      tienPhat,
      mucPhatMoiNgay,
      thuong,
      khauTru,
      tongLuong,
      ghiChu,
      trangThai: "Chờ duyệt",
    });
  }

  return results;
}

exports.runPayrollCalculationInternal = runPayrollCalculationInternal;

// 1. [POST] /api/bangluong/calculate - ADMIN BẮT ĐẦU CHẠY TÍNH LƯƠNG
// QUY TẮC CỐT LÕI: API CHỈ BẮT ĐẦU CHẠY KHI NHẬN ĐƯỢC TÍN HIỆU "ĐÃ CHỐT SỔ" TỪ PHÂN HỆ BẢNG CÔNG (TASK QH-55)
exports.calculatePayroll = async (req, res) => {
  try {
    await ensurePayrollSchema();
    const { thang, nam } = req.body;
    const force = req.body.force === true || req.query.force === "true";
    if (!thang || !nam) {
      return res.status(400).json({ success: false, message: "Vui lòng truyền tháng và năm cần tính lương!" });
    }

    // 1. KIỂM TRA TÍN HIỆU "ĐÃ CHỐT SỔ" TỪ PHÂN HỆ BẢNG CÔNG
    const [timesheetStats] = await db.query(
      `SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN TrangThai = 'submitted_to_admin' THEN 1 ELSE 0 END) AS lockedCount,
        SUM(CASE WHEN TrangThai = 'emp_replied' THEN 1 ELSE 0 END) AS complaintCount
       FROM bangcong_thang 
       WHERE Thang = ? AND Nam = ?`,
      [thang, nam]
    );

    const total = timesheetStats[0]?.total || 0;
    const lockedCount = timesheetStats[0]?.lockedCount || 0;
    const complaintCount = timesheetStats[0]?.complaintCount || 0;

    // NẾU CHƯA NHẬN ĐƯỢC TÍN HIỆU "ĐÃ CHỐT SỔ" VÀ KHÔNG BẬT FORCE:
    if (!force && (total === 0 || lockedCount < total)) {
      let detailMsg = `Bảng công tháng ${thang}/${nam} chưa được Quản lý chốt sổ (Task QH-55).`;
      if (total === 0) {
        detailMsg = `Chưa có bảng công tháng ${thang}/${nam}. Quản lý cần khởi tạo và chốt bảng công trước.`;
      } else if (complaintCount > 0) {
        detailMsg = `Bảng công tháng ${thang}/${nam} hiện có ${complaintCount} khiếu nại đang chờ Quản lý kiểm tra camera/sổ sách xử lý.`;
      } else {
        detailMsg = `Quản lý vẫn chưa bấm nút [Chốt bảng công tháng] gửi lên Admin.`;
      }

      return res.status(400).json({
        success: false,
        message: `🚫 KHÔNG THỂ TÍNH LƯƠNG! API chỉ bắt đầu chạy tính lương khi nhận được tín hiệu "Đã chốt sổ" từ phân hệ Bảng công (Task QH-55) đẩy sang.\n\nChi tiết: ${detailMsg}`,
        code: "TIMESHEET_NOT_LOCKED",
        canCalculate: false,
        timesheetStatus: {
          total,
          lockedCount,
          complaintCount,
          isLocked: false,
        },
      });
    }

    // 2. KHI ĐÃ CÓ TÍN HIỆU "ĐÃ CHỐT SỔ" HOẶC CHẠY CHẾ ĐỘ FORCE: TIẾN HÀNH TÍNH TOÁN LƯƠNG
    const calculatedRows = await runPayrollCalculationInternal(thang, nam, { force });

    return res.json({
      success: true,
      message: `✅ TÍNH LƯƠNG THÀNH CÔNG! Đã tính toán hoàn tất bảng lương tháng ${thang}/${nam} cho ${calculatedRows.length} nhân viên (Part-time: Giờ làm x Mức lương; Full-time: Lương cứng - Phạt nghỉ không phép + Thưởng).`,
      canCalculate: true,
      data: calculatedRows,
    });
  } catch (error) {
    console.error("Lỗi calculatePayroll:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. [GET] /api/bangluong - ADMIN XEM DANH SÁCH BẢNG LƯƠNG THÁNG
exports.getPayrollList = async (req, res) => {
  try {
    await ensurePayrollSchema();
    const now = new Date();
    const thang = parseInt(req.query.thang) || now.getMonth() + 1;
    const nam = parseInt(req.query.nam) || now.getFullYear();

    // Kiểm tra trạng thái chốt sổ từ bảng công
    const [timesheetStats] = await db.query(
      `SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN TrangThai = 'submitted_to_admin' THEN 1 ELSE 0 END) AS lockedCount,
        SUM(CASE WHEN TrangThai = 'emp_replied' THEN 1 ELSE 0 END) AS complaintCount
       FROM bangcong_thang 
       WHERE Thang = ? AND Nam = ?`,
      [thang, nam]
    );

    const total = timesheetStats[0]?.total || 0;
    const lockedCount = timesheetStats[0]?.lockedCount || 0;
    const complaintCount = timesheetStats[0]?.complaintCount || 0;
    const isTimesheetLocked = total > 0 && lockedCount === total;

    // Lấy bảng lương
    const [rows] = await db.query(
      `SELECT 
        bl.MaBangLuong,
        bl.MaNhanVien,
        nv.MaNhanVienCode,
        COALESCE(tk.HoTen, nv.HoTen) AS HoTen,
        COALESCE(nv.ChucVu, 'Nhân viên') AS ChucVu,
        nv.LoaiNhanVien,
        bl.Thang,
        bl.Nam,
        bl.TongCaLam,
        bl.LuongCoBan,
        bl.SoCong,
        bl.SoGioLam,
        bl.SoNgayNghiKhongPhep,
        bl.TienPhat,
        bl.Thuong,
        bl.KhauTru,
        bl.TongLuong,
        bl.TrangThai,
        bl.GhiChu,
        DATE_FORMAT(bl.NgayThanhToan, '%d/%m/%Y %H:%i') AS NgayThanhToan,
        DATE_FORMAT(bl.NgayTao, '%d/%m/%Y %H:%i') AS NgayTao
       FROM bangluong bl
       JOIN nhanvien nv ON bl.MaNhanVien = nv.MaNhanVien
       LEFT JOIN taikhoan tk ON nv.MaTaiKhoan = tk.MaTaiKhoan
       WHERE bl.Thang = ? AND bl.Nam = ?
       ORDER BY nv.MaNhanVien ASC`,
      [thang, nam]
    );

    const tongTienLuong = rows.reduce((s, r) => s + Number(r.TongLuong || 0), 0);
    const tongNhanVien = rows.length;

    return res.json({
      success: true,
      thang,
      nam,
      timesheetStatus: {
        total,
        lockedCount,
        complaintCount,
        isTimesheetLocked,
        text: isTimesheetLocked
          ? "Bảng công đã được Quản lý chốt sổ (QH-55). Đủ điều kiện tính lương."
          : total === 0
          ? "Chưa có bảng công tháng này."
          : `Bảng công chưa chốt sổ (Mới chốt ${lockedCount}/${total} NV, ${complaintCount} khiếu nại).`,
      },
      summary: {
        tongNhanVien,
        tongTienLuong,
        daDuyet: rows.filter((r) => r.TrangThai === "Đã duyệt" || r.TrangThai === "Đã thanh toán").length,
      },
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi getPayrollList:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Hook gửi thông báo phiếu lương hàng loạt đến từng nhân viên tương ứng
async function sendBulkPayrollNotifications(thang, nam, io) {
  try {
    const [records] = await db.query(
      `SELECT bl.MaBangLuong, bl.MaNhanVien, bl.TongLuong, bl.Thang, bl.Nam, nv.HoTen, nv.LoaiNhanVien
       FROM bangluong bl
       JOIN nhanvien nv ON bl.MaNhanVien = nv.MaNhanVien
       WHERE bl.Thang = ? AND bl.Nam = ?`,
      [thang, nam]
    );

    let sentCount = 0;
    for (const item of records) {
      const tieuDe = `🎉 Ting ting! Phiếu lương tháng này của bạn đã có`;
      const noiDung = `Chào ${item.HoTen}, Admin đã duyệt bảng lương tháng ${thang}/${nam}. Số tiền thực lĩnh của bạn là ${Number(item.TongLuong).toLocaleString("vi-VN")}đ. Vui lòng bấm vào đây để xem chi tiết Phiếu lương (QH-59).`;
      const link = `#my_payslip?thang=${thang}&nam=${nam}`;

      // Lưu thông báo vào CSDL
      const [insertRes] = await db.query(
        `INSERT INTO thongbao (TieuDe, NoiDung, Loai, MaNhanVien, Link, DaXem, NgayTao)
         VALUES (?, ?, 'payslip', ?, ?, 0, NOW())`,
        [tieuDe, noiDung, item.MaNhanVien, link]
      );

      // Bắn sự kiện realtime qua Socket.IO đến client
      if (io) {
        io.emit("new_notification", {
          maTB: insertRes.insertId,
          maNhanVien: item.MaNhanVien,
          hoTen: item.HoTen,
          tieuDe,
          noiDung,
          link,
          loai: "payslip",
          thang,
          nam,
          tongLuong: item.TongLuong,
          ngayTao: new Date(),
        });
      }
      sentCount++;
    }
    return sentCount;
  } catch (err) {
    console.error("Lỗi sendBulkPayrollNotifications hook:", err);
    return 0;
  }
}

exports.sendBulkPayrollNotifications = sendBulkPayrollNotifications;

// 3. [PUT] /api/bangluong/:id/approve - ADMIN PHÊ DUYỆT / XÁC NHẬN CHI TRẢ LƯƠNG
exports.approvePayrollItem = async (req, res) => {
  try {
    const id = req.params.id;
    const { trangThai = "Đã duyệt" } = req.body;

    const [result] = await db.query(
      `UPDATE bangluong 
       SET TrangThai = ?,
           NgayThanhToan = CASE WHEN ? = 'Đã thanh toán' THEN NOW() ELSE NgayThanhToan END
       WHERE MaBangLuong = ?`,
      [trangThai, trangThai, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi lương!" });
    }

    // Gửi thông báo cho nhân viên nếu duyệt
    if (trangThai === "Đã duyệt" || trangThai === "Đã thanh toán") {
      const [itemRows] = await db.query(
        `SELECT bl.MaBangLuong, bl.MaNhanVien, bl.TongLuong, bl.Thang, bl.Nam, nv.HoTen 
         FROM bangluong bl 
         JOIN nhanvien nv ON bl.MaNhanVien = nv.MaNhanVien 
         WHERE bl.MaBangLuong = ?`,
        [id]
      );
      if (itemRows.length > 0) {
        const item = itemRows[0];
        const io = req.app?.get("io");
        const tieuDe = `🎉 Ting ting! Phiếu lương tháng này của bạn đã có`;
        const noiDung = `Chào ${item.HoTen}, Admin đã duyệt phiếu lương tháng ${item.Thang}/${item.Nam}. Số tiền thực lĩnh của bạn là ${Number(item.TongLuong).toLocaleString("vi-VN")}đ. Bấm vào đây để xem chi tiết Phiếu lương!`;
        const link = `#my_payslip?thang=${item.Thang}&nam=${item.Nam}`;

        const [ins] = await db.query(
          `INSERT INTO thongbao (TieuDe, NoiDung, Loai, MaNhanVien, Link, DaXem, NgayTao)
           VALUES (?, ?, 'payslip', ?, ?, 0, NOW())`,
          [tieuDe, noiDung, item.MaNhanVien, link]
        );

        if (io) {
          io.emit("new_notification", {
            maTB: ins.insertId,
            maNhanVien: item.MaNhanVien,
            tieuDe,
            noiDung,
            link,
            loai: "payslip",
            thang: item.Thang,
            nam: item.Nam,
            tongLuong: item.TongLuong,
            ngayTao: new Date(),
          });
        }
      }
    }

    return res.json({
      success: true,
      message: `Đã cập nhật trạng thái phiếu lương thành [${trangThai}] và gửi thông báo đến nhân viên!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. [POST] /api/bangluong/approve-all - ADMIN DUYỆT TOÀN BỘ BẢNG LƯƠNG THÁNG & KÍCH HOẠT HOOK THÔNG BÁO HÀNG LOẠT
exports.approveAllPayroll = async (req, res) => {
  try {
    const { thang, nam } = req.body;
    if (!thang || !nam) {
      return res.status(400).json({ success: false, message: "Thiếu tháng/năm!" });
    }

    const [result] = await db.query(
      `UPDATE bangluong 
       SET TrangThai = 'Đã duyệt'
       WHERE Thang = ? AND Nam = ?`,
      [thang, nam]
    );

    // Kích hoạt luồng (Hook) gửi thông báo hàng loạt đến từng nhân viên
    const io = req.app?.get("io");
    const notifCount = await sendBulkPayrollNotifications(thang, nam, io);

    return res.json({
      success: true,
      message: `🎉 Đã phê duyệt toàn bộ bảng lương tháng ${thang}/${nam}! Hệ thống đã kích hoạt Hook gửi thông báo hàng loạt ("Ting ting! Phiếu lương tháng này của bạn đã có") đến ${notifCount} nhân viên.`,
      approvedCount: result.affectedRows,
      notifCount,
    });
  } catch (error) {
    console.error("Lỗi approveAllPayroll:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. [GET] /api/bangluong/my - NHÂN VIÊN XEM PHIẾU LƯƠNG THẬT CỦA MÌNH (QH-59)
exports.getMyPayslip = async (req, res) => {
  try {
    await ensurePayrollSchema();
    const { thang, nam, maNhanVien } = req.query;
    if (!maNhanVien) {
      return res.status(400).json({ success: false, message: "Thiếu mã nhân viên!" });
    }

    const t = parseInt(thang) || new Date().getMonth() + 1;
    const n = parseInt(nam) || new Date().getFullYear();

    const [rows] = await db.query(
      `SELECT 
        bl.*,
        nv.MaNhanVienCode,
        COALESCE(tk.HoTen, nv.HoTen) AS HoTen,
        nv.LoaiNhanVien,
        COALESCE(nv.ChucVu, 'Nhân viên') AS ChucVu,
        bc.SoNgayTre,
        bc.SoNgayNghi
       FROM bangluong bl
       JOIN nhanvien nv ON bl.MaNhanVien = nv.MaNhanVien
       LEFT JOIN taikhoan tk ON nv.MaTaiKhoan = tk.MaTaiKhoan
       LEFT JOIN bangcong_thang bc ON (bl.MaNhanVien = bc.MaNhanVien AND bl.Thang = bc.Thang AND bl.Nam = bc.Nam)
       WHERE bl.MaNhanVien = ? AND bl.Thang = ? AND bl.Nam = ?`,
      [maNhanVien, t, n]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: `Chưa có phiếu lương tháng ${t}/${n} (Đang chờ Quản lý chốt bảng công & Admin tính lương).`,
      });
    }

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
