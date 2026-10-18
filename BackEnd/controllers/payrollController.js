const db = require("../config/db");

const STANDARD_WORK_DAYS = 26; // Ngày công chuẩn Full-time
const LATE_PENALTY = 20000; // Phạt 20.000đ / lần đi trễ
const INSURANCE_RATE = 0.105; // 10.5% BHXH, BHYT, BHTN

/**
 * Hàm lõi tính lương nội bộ
 * @param {number} thang
 * @param {number} nam
 */
async function runPayrollCalculationInternal(thang, nam) {
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

  if (total === 0 || lockedCount < total) {
    throw new Error(
      `Không thể tính lương! Bảng công tháng ${thang}/${nam} chưa được Quản lý chốt sổ (Task QH-55). API chỉ bắt đầu chạy tính lương khi nhận được tín hiệu "Đã chốt sổ" từ phân hệ Bảng công đẩy sang.`
    );
  }

  // 2. Lấy dữ liệu bảng công đã chốt kèm thông tin lương nhân viên
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
      nv.HoTen,
      nv.LoaiNhanVien,
      nv.Luong,
      COALESCE(cv.TenChucVu, nv.ChucVu, 'Nhân viên') AS ChucVu
     FROM bangcong_thang bc
     JOIN nhanvien nv ON bc.MaNhanVien = nv.MaNhanVien
     LEFT JOIN chucvu cv ON nv.MaChucVu = cv.MaChucVu
     WHERE bc.Thang = ? AND bc.Nam = ?`,
    [thang, nam]
  );

  const results = [];

  for (const row of timesheets) {
    const isPartTime = row.LoaiNhanVien === "Part-time";
    const baseSalary = Number(row.Luong) > 0 ? Number(row.Luong) : isPartTime ? 25000 : 6500000;
    const soCong = Number(row.SoCong) || 0;
    const soGioLam = Number(row.SoGioLam) || 0;
    const soNgayTre = Number(row.SoNgayTre) || 0;
    const soNgayNghi = Number(row.SoNgayNghi) || 0;

    let luongChinh = 0;
    let baoHiem = 0;
    let phatTre = soNgayTre * LATE_PENALTY;
    let thuong = 300000; // Thưởng chuyên cần/doanh thu chuẩn

    if (isPartTime) {
      luongChinh = Math.round(soGioLam * baseSalary);
      baoHiem = 0;
      if (soNgayTre === 0 && soGioLam >= 80) thuong = 400000;
    } else {
      const dailyRate = baseSalary / STANDARD_WORK_DAYS;
      luongChinh = Math.round(soCong * dailyRate);
      baoHiem = Math.round(baseSalary * INSURANCE_RATE);
      if (soNgayTre === 0 && soNgayNghi === 0) thuong = 500000;
    }

    const khauTru = phatTre + baoHiem;
    const tongLuong = Math.max(0, Math.round(luongChinh + thuong - khauTru));
    const tongCaLam = Math.round(soCong) || Math.round(soGioLam / 5) || 0;
    const ghiChu = `Tính tự động từ bảng công đã chốt: Lương chính ${luongChinh.toLocaleString('vi-VN')}đ, Thưởng ${thuong.toLocaleString('vi-VN')}đ, Khấu trừ ${khauTru.toLocaleString('vi-VN')}đ (Trễ: ${phatTre.toLocaleString('vi-VN')}đ, BH: ${baoHiem.toLocaleString('vi-VN')}đ)`;

    // Lưu vào bảng bangluong (có UNIQUE KEY trên MaNhanVien, Thang, Nam)
    await db.query(
      `INSERT INTO bangluong 
       (MaNhanVien, Thang, Nam, TongCaLam, Thuong, KhauTru, TongLuong, TrangThai, LuongCoBan, SoCong, SoGioLam, GhiChu)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Chờ duyệt', ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       TongCaLam = VALUES(TongCaLam),
       Thuong = VALUES(Thuong),
       KhauTru = VALUES(KhauTru),
       TongLuong = VALUES(TongLuong),
       LuongCoBan = VALUES(LuongCoBan),
       SoCong = VALUES(SoCong),
       SoGioLam = VALUES(SoGioLam),
       GhiChu = VALUES(GhiChu)`,
      [
        row.MaNhanVien,
        thang,
        nam,
        tongCaLam,
        thuong,
        khauTru,
        tongLuong,
        baseSalary,
        soCong,
        soGioLam,
        ghiChu,
      ]
    );

    results.push({
      maNhanVien: row.MaNhanVien,
      maNhanVienCode: row.MaNhanVienCode,
      hoTen: row.HoTen,
      chucVu: row.ChucVu,
      loaiNhanVien: row.LoaiNhanVien,
      luongCoBan: baseSalary,
      soCong,
      soGioLam,
      soNgayTre,
      luongChinh,
      thuong,
      khauTru,
      phatTre,
      baoHiem,
      tongLuong,
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
    const { thang, nam } = req.body;
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

    // NẾU CHƯA NHẬN ĐƯỢC TÍN HIỆU "ĐÃ CHỐT SỔ":
    if (total === 0 || lockedCount < total) {
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

    // 2. KHI ĐÃ CÓ TÍN HIỆU "ĐÃ CHỐT SỔ": TIẾN HÀNH TÍNH TOÁN LƯƠNG
    const calculatedRows = await runPayrollCalculationInternal(thang, nam);

    return res.json({
      success: true,
      message: `✅ TÍNH LƯƠNG THÀNH CÔNG! Đã nhận được tín hiệu "Đã chốt sổ" từ Quản lý (QH-55) và tính toán hoàn tất bảng lương tháng ${thang}/${nam} cho ${calculatedRows.length} nhân viên.`,
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
        nv.HoTen,
        COALESCE(cv.TenChucVu, nv.ChucVu, 'Nhân viên') AS ChucVu,
        nv.LoaiNhanVien,
        bl.Thang,
        bl.Nam,
        bl.TongCaLam,
        bl.LuongCoBan,
        bl.SoCong,
        bl.SoGioLam,
        bl.Thuong,
        bl.KhauTru,
        bl.TongLuong,
        bl.TrangThai,
        bl.GhiChu,
        DATE_FORMAT(bl.NgayThanhToan, '%d/%m/%Y %H:%i') AS NgayThanhToan,
        DATE_FORMAT(bl.NgayTao, '%d/%m/%Y %H:%i') AS NgayTao
       FROM bangluong bl
       JOIN nhanvien nv ON bl.MaNhanVien = nv.MaNhanVien
       LEFT JOIN chucvu cv ON nv.MaChucVu = cv.MaChucVu
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

    return res.json({
      success: true,
      message: `Đã cập nhật trạng thái phiếu lương thành [${trangThai}]!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. [POST] /api/bangluong/approve-all - ADMIN DUYỆT TOÀN BỘ BẢNG LƯƠNG THÁNG
exports.approveAllPayroll = async (req, res) => {
  try {
    const { thang, nam } = req.body;
    if (!thang || !nam) {
      return res.status(400).json({ success: false, message: "Thiếu tháng/năm!" });
    }

    const [result] = await db.query(
      `UPDATE bangluong 
       SET TrangThai = 'Đã duyệt'
       WHERE Thang = ? AND Nam = ? AND TrangThai = 'Chờ duyệt'`,
      [thang, nam]
    );

    return res.json({
      success: true,
      message: `Đã phê duyệt bảng lương tháng ${thang}/${nam} cho ${result.affectedRows} nhân viên!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. [GET] /api/bangluong/my - NHÂN VIÊN XEM PHIẾU LƯƠNG THẬT CỦA MÌNH (QH-59)
exports.getMyPayslip = async (req, res) => {
  try {
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
        nv.HoTen,
        nv.LoaiNhanVien,
        COALESCE(cv.TenChucVu, nv.ChucVu, 'Nhân viên') AS ChucVu,
        bc.SoNgayTre,
        bc.SoNgayNghi
       FROM bangluong bl
       JOIN nhanvien nv ON bl.MaNhanVien = nv.MaNhanVien
       LEFT JOIN chucvu cv ON nv.MaChucVu = cv.MaChucVu
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
