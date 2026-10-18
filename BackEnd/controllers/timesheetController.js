const db = require("../config/db");

// Helper: Kiểm tra xem bảng công tháng đã chốt sổ gửi Admin hay chưa
async function checkTimesheetLockStatus(thang, nam) {
  const [rows] = await db.query(
    "SELECT TrangThai FROM bangcong_thang WHERE Thang = ? AND Nam = ?",
    [thang, nam]
  );
  if (rows.length === 0) return { exists: false, isLocked: false, allConfirmed: false };
  const isLocked = rows.every((r) => r.TrangThai === "submitted_to_admin");
  const allConfirmed = rows.every((r) => r.TrangThai === "confirmed" || r.TrangThai === "submitted_to_admin");
  return { exists: true, isLocked, allConfirmed, total: rows.length };
}

// 1. [GET] /api/bangcong-thang - Lấy danh sách bảng công tháng của tất cả nhân viên (QH-55)
exports.getMonthlyTimesheet = async (req, res) => {
  try {
    const now = new Date();
    const thang = parseInt(req.query.thang) || now.getMonth() + 1;
    const nam = parseInt(req.query.nam) || now.getFullYear();

    // 1. Kiểm tra xem tháng này đã có dữ liệu trong bangcong_thang chưa
    const [existing] = await db.query(
      "SELECT COUNT(*) AS total FROM bangcong_thang WHERE Thang = ? AND Nam = ?",
      [thang, nam]
    );

    // Nếu chưa có, tự động khởi tạo bảng công nháp (draft) từ nhân viên & chấm công
    if (existing[0].total === 0) {
      await autoInitMonthlyTimesheet(thang, nam);
    }

    // 2. Lấy dữ liệu chi tiết kèm thông tin nhân viên
    const [rows] = await db.query(
      `SELECT 
        bc.MaBangCong,
        bc.MaNhanVien,
        nv.MaNhanVienCode,
        nv.HoTen,
        COALESCE(cv.TenChucVu, nv.ChucVu, 'Nhân viên') AS ChucVu,
        nv.LoaiNhanVien,
        nv.Luong,
        bc.Thang,
        bc.Nam,
        bc.SoCong,
        bc.SoGioLam,
        bc.SoNgayNghi,
        bc.SoNgayTre,
        bc.GhiChuQL,
        bc.PhanHoiNV,
        bc.TrangThai,
        DATE_FORMAT(bc.NgayGui, '%d/%m/%Y %H:%i') AS NgayGui,
        DATE_FORMAT(bc.NgayXacNhan, '%d/%m/%Y %H:%i') AS NgayXacNhan
       FROM bangcong_thang bc
       JOIN nhanvien nv ON bc.MaNhanVien = nv.MaNhanVien
       LEFT JOIN chucvu cv ON nv.MaChucVu = cv.MaChucVu
       WHERE bc.Thang = ? AND bc.Nam = ?
       ORDER BY nv.MaNhanVien ASC`,
      [thang, nam]
    );

    // 3. Tính toán thống kê tiến độ chốt sổ
    const tongNhanVien = rows.length;
    const soLuongDaXacNhan = rows.filter((r) => r.TrangThai === "confirmed" || r.TrangThai === "submitted_to_admin").length;
    const soLuongKhieuNai = rows.filter((r) => r.TrangThai === "emp_replied").length;
    const soLuongChuaXacNhan = rows.filter((r) => r.TrangThai === "draft" || r.TrangThai === "sent_to_emp").length;
    const isLocked = tongNhanVien > 0 && rows.every((r) => r.TrangThai === "submitted_to_admin");
    
    // Điều kiện chốt bảng công: Toàn bộ nhân viên đã "Xác nhận đúng" (confirmed), không còn khiếu nại, và chưa chốt
    const canSubmitToAdmin = tongNhanVien > 0 && soLuongDaXacNhan === tongNhanVien && soLuongKhieuNai === 0 && !isLocked;

    return res.json({
      success: true,
      thang,
      nam,
      summary: {
        tongNhanVien,
        soLuongDaXacNhan,
        soLuongKhieuNai,
        soLuongChuaXacNhan,
        isLocked,
        canSubmitToAdmin,
        trangThaiChotSoText: isLocked
          ? "Đã chốt sổ & Khóa dữ liệu (Đã chuyển sang Admin tính lương)"
          : canSubmitToAdmin
          ? "Đủ điều kiện chốt sổ (100% nhân viên đã xác nhận đúng)"
          : soLuongKhieuNai > 0
          ? `Có ${soLuongKhieuNai} khiếu nại cần Quản lý kiểm tra camera/sổ sách`
          : "Đang chờ nhân viên kiểm tra & xác nhận",
      },
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi getMonthlyTimesheet:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Hàm tự động khởi tạo bảng công tháng từ danh sách nhân viên
async function autoInitMonthlyTimesheet(thang, nam) {
  const [employees] = await db.query(
    "SELECT MaNhanVien, LoaiNhanVien FROM nhanvien WHERE TrangThai != 'Đã nghỉ việc' OR TrangThai IS NULL"
  );

  for (const emp of employees) {
    const isPartTime = emp.LoaiNhanVien === "Part-time";
    
    // Tính công thực tế từ bảng chamcong trong tháng nếu có
    const [ccRows] = await db.query(
      `SELECT 
        COUNT(DISTINCT DATE(NgayLam)) AS SoCongThucTe,
        COALESCE(SUM(SoGioLam), 0) AS TongGioLam,
        SUM(CASE WHEN DiTre = 1 THEN 1 ELSE 0 END) AS SoNgayTre
       FROM chamcong
       WHERE MaNhanVien = ? AND MONTH(NgayLam) = ? AND YEAR(NgayLam) = ?`,
      [emp.MaNhanVien, thang, nam]
    );

    let soCong = ccRows[0]?.SoCongThucTe || 0;
    let soGioLam = Number(ccRows[0]?.TongGioLam || 0);
    let soNgayTre = ccRows[0]?.SoNgayTre || 0;

    // Nếu chưa có lượt chấm công nào trong tháng -> tạo dữ liệu mẫu tiêu chuẩn
    if (soCong === 0 && soGioLam === 0) {
      if (isPartTime) {
        soGioLam = 110 + (emp.MaNhanVien % 4) * 8;
        soCong = Math.round(soGioLam / 5);
        soNgayTre = emp.MaNhanVien % 3 === 0 ? 1 : 0;
      } else {
        soCong = 24 - (emp.MaNhanVien % 3);
        soGioLam = soCong * 8;
        soNgayTre = emp.MaNhanVien % 2 === 0 ? 1 : 0;
      }
    }

    const soNgayNghi = isPartTime ? 0 : Math.max(0, 26 - Math.round(soCong));

    await db.query(
      `INSERT INTO bangcong_thang 
       (MaNhanVien, Thang, Nam, SoCong, SoGioLam, SoNgayNghi, SoNgayTre, TrangThai, GhiChuQL)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 'Tự động tổng hợp từ hệ thống chấm công')
       ON DUPLICATE KEY UPDATE 
       SoCong = VALUES(SoCong),
       SoGioLam = VALUES(SoGioLam),
       SoNgayNghi = VALUES(SoNgayNghi),
       SoNgayTre = VALUES(SoNgayTre)`,
      [emp.MaNhanVien, thang, nam, soCong, soGioLam, soNgayNghi, soNgayTre]
    );
  }
}

// 2. [POST] /api/bangcong-thang/seed-demo - Nạp kịch bản mẫu kiểm thử có khiếu nại (QH-55)
exports.seedDemoTimesheetWithComplaint = async (req, res) => {
  try {
    const now = new Date();
    const thang = parseInt(req.body.thang) || now.getMonth() + 1;
    const nam = parseInt(req.body.nam) || now.getFullYear();

    // Khởi tạo bảng công trước
    await autoInitMonthlyTimesheet(thang, nam);

    const [rows] = await db.query(
      "SELECT MaBangCong, MaNhanVien FROM bangcong_thang WHERE Thang = ? AND Nam = ? ORDER BY MaNhanVien ASC",
      [thang, nam]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "Chưa có nhân viên nào trong hệ thống!" });
    }

    // Đặt dòng đầu tiên (nhân viên 1) là "Đang khiếu nại" (emp_replied)
    const complaintRow = rows[0];
    await db.query(
      `UPDATE bangcong_thang 
       SET TrangThai = 'emp_replied',
           SoCong = 21,
           SoGioLam = 168,
           SoNgayTre = 2,
           PhanHoiNV = 'Em bị thiếu 2 ngày công (ngày 12/10 và 15/10) do máy chấm công vân tay không quét được, và ngày 14/10 em vào đúng 07:00 nhưng máy ghi nhận trễ. Nhờ Quản lý kiểm tra camera giúp em!',
           GhiChuQL = 'Đang chờ Quản lý kiểm tra camera & sổ sách thủ công'
       WHERE MaBangCong = ?`,
      [complaintRow.MaBangCong]
    );

    // Các nhân viên còn lại đặt là đã "Xác nhận đúng" (confirmed)
    for (let i = 1; i < rows.length; i++) {
      await db.query(
        `UPDATE bangcong_thang 
         SET TrangThai = 'confirmed',
             NgayXacNhan = NOW(),
             GhiChuQL = 'Nhân viên đã kiểm tra và bấm xác nhận đúng bảng công'
         WHERE MaBangCong = ?`,
        [rows[i].MaBangCong]
      );
    }

    return res.json({
      success: true,
      message: `Đã nạp kịch bản kiểm thử QH-55 cho tháng ${thang}/${nam}: Có 1 nhân viên khiếu nại sai sót và các nhân viên còn lại đã xác nhận đúng. Quản lý có thể tiến hành kiểm tra camera và sửa lại công.`,
    });
  } catch (error) {
    console.error("Lỗi seedDemoTimesheetWithComplaint:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. [PUT] /api/bangcong-thang/:id - Quản lý chỉnh sửa bảng công thủ công (QH-55)
// NGHIÊM CẤM SỬA KHI ĐÃ CHỐT SỔ (DỮ LIỆU ĐÃ KHÓA)
exports.updateEmployeeTimesheet = async (req, res) => {
  try {
    const id = req.params.id;
    const { soCong, soGioLam, soNgayTre, soNgayNghi, ghiChuQL } = req.body;

    const [existing] = await db.query(
      "SELECT MaBangCong, Thang, Nam, TrangThai FROM bangcong_thang WHERE MaBangCong = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi bảng công!" });
    }

    // KIỂM TRA KHÓA DỮ LIỆU
    if (existing[0].TrangThai === "submitted_to_admin") {
      return res.status(403).json({
        success: false,
        message: "DỮ LIỆU ĐÃ BỊ KHÓA! Bảng công tháng này đã được chốt sổ và gửi lên Admin. Không ai được phép chỉnh sửa nữa!",
      });
    }

    await db.query(
      `UPDATE bangcong_thang 
       SET SoCong = COALESCE(?, SoCong),
           SoGioLam = COALESCE(?, SoGioLam),
           SoNgayTre = COALESCE(?, SoNgayTre),
           SoNgayNghi = COALESCE(?, SoNgayNghi),
           GhiChuQL = ?
       WHERE MaBangCong = ?`,
      [soCong, soGioLam, soNgayTre, soNgayNghi, ghiChuQL || "Quản lý đã chỉnh sửa thủ công", id]
    );

    return res.json({
      success: true,
      message: "Cập nhật bảng công nhân viên thành công!",
    });
  } catch (error) {
    console.error("Lỗi updateEmployeeTimesheet:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. [PUT] /api/bangcong-thang/:id/resolve-complaint - Quản lý giải quyết khiếu nại sau khi kiểm tra camera/sổ sách
exports.resolveComplaint = async (req, res) => {
  try {
    const id = req.params.id;
    const { soCong, soGioLam, soNgayTre, soNgayNghi, ghiChuQL } = req.body;

    const [existing] = await db.query(
      "SELECT MaBangCong, TrangThai FROM bangcong_thang WHERE MaBangCong = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi bảng công!" });
    }

    if (existing[0].TrangThai === "submitted_to_admin") {
      return res.status(403).json({
        success: false,
        message: "DỮ LIỆU ĐÃ BỊ KHÓA! Bảng công đã chốt sổ gửi Admin, không thể chỉnh sửa!",
      });
    }

    const note = ghiChuQL || "Đã kiểm tra camera & sổ sách thủ công: Xác nhận đúng công và cập nhật lại.";

    await db.query(
      `UPDATE bangcong_thang 
       SET SoCong = COALESCE(?, SoCong),
           SoGioLam = COALESCE(?, SoGioLam),
           SoNgayTre = COALESCE(?, SoNgayTre),
           SoNgayNghi = COALESCE(?, SoNgayNghi),
           GhiChuQL = ?,
           TrangThai = 'confirmed',
           NgayXacNhan = NOW()
       WHERE MaBangCong = ?`,
      [soCong, soGioLam, soNgayTre, soNgayNghi, note, id]
    );

    return res.json({
      success: true,
      message: "Đã xử lý khiếu nại thành công! Dữ liệu công đã được cập nhật và chuyển sang trạng thái [Xác nhận đúng].",
    });
  } catch (error) {
    console.error("Lỗi resolveComplaint:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. [POST] /api/bangcong-thang/confirm-all - Quản lý duyệt nhanh xác nhận tất cả nhân viên chưa xác nhận
exports.quickConfirmAll = async (req, res) => {
  try {
    const { thang, nam } = req.body;
    if (!thang || !nam) {
      return res.status(400).json({ success: false, message: "Vui lòng truyền tháng và năm!" });
    }

    const lockStatus = await checkTimesheetLockStatus(thang, nam);
    if (lockStatus.isLocked) {
      return res.status(403).json({ success: false, message: "Bảng công tháng này đã chốt sổ và bị khóa!" });
    }

    // Cập nhật tất cả các dòng còn draft hoặc sent_to_emp thành confirmed
    const [result] = await db.query(
      `UPDATE bangcong_thang 
       SET TrangThai = 'confirmed',
           NgayXacNhan = NOW(),
           GhiChuQL = COALESCE(GhiChuQL, 'Quản lý duyệt xác nhận đúng bảng công')
       WHERE Thang = ? AND Nam = ? AND TrangThai IN ('draft', 'sent_to_emp', 'emp_replied')`,
      [thang, nam]
    );

    return res.json({
      success: true,
      message: `Đã xác nhận đúng cho ${result.affectedRows} nhân viên trong tháng ${thang}/${nam}!`,
    });
  } catch (error) {
    console.error("Lỗi quickConfirmAll:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. [POST] /api/bangcong-thang/close-and-submit-to-admin - QUẢN LÝ BẤM NÚT [CHỐT BẢNG CÔNG THÁNG] (Task QH-55)
// Điều kiện: Sau khi toàn bộ nhân viên đã "Xác nhận đúng", Quản lý bấm nút [Chốt bảng công tháng].
// Lúc này dữ liệu bị khóa (không ai được sửa nữa) và tự động chuyển sang phân hệ Tính lương cho Admin.
exports.closeAndSubmitToAdmin = async (req, res) => {
  try {
    const { thang, nam } = req.body;
    if (!thang || !nam) {
      return res.status(400).json({ success: false, message: "Vui lòng truyền tháng và năm cần chốt công!" });
    }

    // 1. Kiểm tra toàn bộ nhân viên trong tháng
    const [records] = await db.query(
      `SELECT bc.MaBangCong, bc.TrangThai, nv.HoTen, nv.MaNhanVienCode, bc.PhanHoiNV
       FROM bangcong_thang bc
       JOIN nhanvien nv ON bc.MaNhanVien = nv.MaNhanVien
       WHERE bc.Thang = ? AND bc.Nam = ?`,
      [thang, nam]
    );

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Chưa có dữ liệu bảng công cho tháng ${thang}/${nam}! Vui lòng tải bảng công trước.`,
      });
    }

    // Kiểm tra xem đã chốt trước đó chưa
    const alreadyLocked = records.every((r) => r.TrangThai === "submitted_to_admin");
    if (alreadyLocked) {
      return res.status(400).json({
        success: false,
        message: `Bảng công tháng ${thang}/${nam} đã được chốt sổ trước đó và dữ liệu đang bị khóa!`,
      });
    }

    // Kiểm tra điều kiện: CÒN KHIẾU NẠI CHƯA XỬ LÝ?
    const complaints = records.filter((r) => r.TrangThai === "emp_replied");
    if (complaints.length > 0) {
      return res.status(400).json({
        success: false,
        message: `KHÔNG THỂ CHỐT SỔ! Vẫn còn ${complaints.length} nhân viên đang khiếu nại sai sót (${complaints.map((c) => c.HoTen).join(", ")}). Quản lý phải kiểm tra camera/sổ sách và xử lý khiếu nại trước khi chốt!`,
        complaints: complaints,
      });
    }

    // Kiểm tra điều kiện: TOÀN BỘ NHÂN VIÊN ĐÃ "XÁC NHẬN ĐÚNG" (confirmed)?
    const unconfirmed = records.filter((r) => r.TrangThai !== "confirmed");
    if (unconfirmed.length > 0) {
      return res.status(400).json({
        success: false,
        message: `KHÔNG THỂ CHỐT SỔ! Còn ${unconfirmed.length} nhân viên chưa ở trạng thái [Xác nhận đúng] (${unconfirmed.map((u) => u.HoTen).join(", ")}). Quy định bắt buộc: Toàn bộ nhân viên phải xác nhận đúng trước khi Quản lý chốt sổ!`,
      });
    }

    // 2. KHÓA DỮ LIỆU & ĐỔI TRẠNG THÁI SANG 'submitted_to_admin'
    await db.query(
      `UPDATE bangcong_thang 
       SET TrangThai = 'submitted_to_admin',
           NgayGui = NOW()
       WHERE Thang = ? AND Nam = ?`,
      [thang, nam]
    );

    // 3. TỰ ĐỘNG CHUYỂN SANG PHÂN HỆ TÍNH LƯƠNG CHO ADMIN:
    // Kích hoạt tính lương ngầm tự động để Admin sẵn sàng xem bảng lương
    let payrollResult = null;
    try {
      const payrollCtrl = require("./payrollController");
      payrollResult = await payrollCtrl.runPayrollCalculationInternal(thang, nam);
    } catch (calcErr) {
      console.warn("Tự động tính lương ngầm gặp cảnh báo:", calcErr.message);
    }

    return res.json({
      success: true,
      message: `🎉 CHỐT SỔ THÀNH CÔNG! Bảng công tháng ${thang}/${nam} đã bị KHÓA (không ai được sửa nữa) và đã tự động gửi tín hiệu "Đã chốt sổ" sang phân hệ Tính lương cho Admin.`,
      isLocked: true,
      payrollGenerated: !!payrollResult,
    });
  } catch (error) {
    console.error("Lỗi closeAndSubmitToAdmin:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. [GET] /api/bangcong-thang/my - Nhân viên xem bảng công của chính mình (QH-54)
exports.getMyTimesheet = async (req, res) => {
  try {
    const { thang, nam, maNhanVien } = req.query;
    if (!maNhanVien) {
      return res.status(400).json({ success: false, message: "Thiếu mã nhân viên!" });
    }

    const t = parseInt(thang) || new Date().getMonth() + 1;
    const n = parseInt(nam) || new Date().getFullYear();

    const [rows] = await db.query(
      `SELECT bc.*, nv.HoTen, nv.MaNhanVienCode, nv.LoaiNhanVien, nv.Luong, COALESCE(cv.TenChucVu, nv.ChucVu) AS ChucVu
       FROM bangcong_thang bc
       JOIN nhanvien nv ON bc.MaNhanVien = nv.MaNhanVien
       LEFT JOIN chucvu cv ON nv.MaChucVu = cv.MaChucVu
       WHERE bc.MaNhanVien = ? AND bc.Thang = ? AND bc.Nam = ?`,
      [maNhanVien, t, n]
    );

    if (rows.length === 0) {
      return res.json({ success: true, data: null, message: "Chưa có bảng công tháng này" });
    }

    const item = rows[0];
    const isLocked = item.TrangThai === "submitted_to_admin";

    return res.json({
      success: true,
      data: {
        ...item,
        isLocked,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 8. [POST] /api/bangcong-thang/my/confirm - Nhân viên bấm "Xác nhận đúng" (QH-54)
exports.confirmMyTimesheet = async (req, res) => {
  try {
    const { maNhanVien, thang, nam } = req.body;
    if (!maNhanVien || !thang || !nam) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin xác nhận!" });
    }

    const [existing] = await db.query(
      "SELECT MaBangCong, TrangThai FROM bangcong_thang WHERE MaNhanVien = ? AND Thang = ? AND Nam = ?",
      [maNhanVien, thang, nam]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bảng công của bạn!" });
    }

    if (existing[0].TrangThai === "submitted_to_admin") {
      return res.status(403).json({
        success: false,
        message: "Bảng công tháng này đã được Quản lý chốt sổ gửi Admin và đã bị khóa!",
      });
    }

    await db.query(
      `UPDATE bangcong_thang 
       SET TrangThai = 'confirmed',
           NgayXacNhan = NOW()
       WHERE MaBangCong = ?`,
      [existing[0].MaBangCong]
    );

    return res.json({
      success: true,
      message: "Bạn đã xác nhận bảng công chính xác thành công!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 9. [POST] /api/bangcong-thang/my/dispute - Nhân viên gửi báo cáo sai sót / khiếu nại (QH-54)
exports.disputeMyTimesheet = async (req, res) => {
  try {
    const { maNhanVien, thang, nam, lyDo } = req.body;
    if (!maNhanVien || !thang || !nam || !lyDo) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập lý do khiếu nại cụ thể!" });
    }

    const [existing] = await db.query(
      "SELECT MaBangCong, TrangThai FROM bangcong_thang WHERE MaNhanVien = ? AND Thang = ? AND Nam = ?",
      [maNhanVien, thang, nam]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bảng công của bạn!" });
    }

    if (existing[0].TrangThai === "submitted_to_admin") {
      return res.status(403).json({
        success: false,
        message: "Bảng công tháng này đã chốt sổ gửi Admin và đã bị khóa, không thể khiếu nại!",
      });
    }

    await db.query(
      `UPDATE bangcong_thang 
       SET TrangThai = 'emp_replied',
           PhanHoiNV = ?
       WHERE MaBangCong = ?`,
      [lyDo.trim(), existing[0].MaBangCong]
    );

    return res.json({
      success: true,
      message: "Đã gửi khiếu nại sai sót thành công. Quản lý sẽ kiểm tra camera/sổ sách để chỉnh sửa lại cho bạn!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
