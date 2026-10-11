const db = require("../config/db");

// [GET] Lấy danh sách các đơn xin nghỉ (Kèm kiểm tra cảnh báo trùng ca xếp QH-40)
exports.getAllLeaveRequests = async (req, res) => {
  try {
    const { status, search, employeeId } = req.query;

    let whereConditions = ["1=1"];
    let params = [];

    // Lọc theo trạng thái đơn (pending, approved, rejected, all)
    if (status && status !== "all" && status !== "tat_ca") {
      whereConditions.push("dxn.TrangThai = ?");
      params.push(status);
    }

    // Lọc theo nhân viên cụ thể
    if (employeeId) {
      whereConditions.push("(dxn.MaNhanVien = ? OR nv.MaNhanVienCode = ?)");
      params.push(employeeId, employeeId);
    }

    // Tìm kiếm theo tên nhân viên, mã nhân viên hoặc lý do
    if (search && search.trim() !== "") {
      const keyword = `%${search.trim()}%`;
      whereConditions.push(
        "(nv.HoTen LIKE ? OR nv.MaNhanVienCode LIKE ? OR dxn.LyDo LIKE ?)"
      );
      params.push(keyword, keyword, keyword);
    }

    const whereSql = whereConditions.join(" AND ");

    // Truy vấn danh sách đơn xin nghỉ kèm thông tin nhân viên
    const query = `
      SELECT 
        dxn.MaDon,
        dxn.MaNhanVien,
        DATE_FORMAT(dxn.NgayNghi, '%Y-%m-%d') AS NgayNghi,
        DATE_FORMAT(dxn.NgayNghiDen, '%Y-%m-%d') AS NgayNghiDen,
        dxn.LyDo,
        dxn.LoaiNghi,
        dxn.TrangThai,
        dxn.GhiChuQL,
        dxn.NgayTao,
        nv.MaNhanVienCode,
        nv.HoTen AS TenNhanVien,
        nv.SoDienThoai,
        nv.ChucVu
      FROM don_xin_nghi dxn
      LEFT JOIN nhanvien nv ON dxn.MaNhanVien = nv.MaNhanVien
      WHERE ${whereSql}
      ORDER BY 
        CASE WHEN dxn.TrangThai = 'pending' THEN 0 ELSE 1 END,
        dxn.NgayTao DESC,
        dxn.MaDon DESC
    `;

    const [requests] = await db.query(query, params);

    // Tính năng nâng cao: Kiểm tra từng đơn xem có trùng với ca đã xếp trước đó (QH-40) hay không
    // Tra cứu trong bảng dangky_ca nơi TrangThai IN ('admin_approved', 'approved')
    const enrichedRequests = await Promise.all(
      requests.map(async (item) => {
        try {
          const [assignedShifts] = await db.query(
            `SELECT 
              dkc.MaDangKy,
              dkc.MaCaLam,
              DATE_FORMAT(dkc.NgayLam, '%Y-%m-%d') AS NgayLam,
              dkc.TrangThai AS TrangThaiCa,
              cl.TenCaLam,
              TIME_FORMAT(cl.GioBatDau, '%H:%i') AS GioBatDau,
              TIME_FORMAT(cl.GioKetThuc, '%H:%i') AS GioKetThuc,
              cl.MoTa
            FROM dangky_ca dkc
            LEFT JOIN calam cl ON dkc.MaCaLam = cl.MaCaLam
            WHERE dkc.MaNhanVien = ? 
              AND DATE(dkc.NgayLam) = DATE(?)
              AND (dkc.TrangThai = 'admin_approved' OR dkc.TrangThai = 'approved')`,
            [item.MaNhanVien, item.NgayNghi]
          );

          const hasAssignedShift = assignedShifts.length > 0;
          let shiftInfoText = "";
          let shiftDetails = null;

          if (hasAssignedShift) {
            shiftDetails = assignedShifts[0];
            const timeRange =
              shiftDetails.GioBatDau && shiftDetails.GioKetThuc
                ? `${shiftDetails.GioBatDau} - ${shiftDetails.GioKetThuc}`
                : "";
            shiftInfoText = `${shiftDetails.TenCaLam || "Ca làm"}${
              timeRange ? ` (${timeRange})` : ""
            }`;
          }

          return {
            ...item,
            hasAssignedShift,
            assignedShift: shiftDetails,
            assignedShiftText: shiftInfoText,
            shiftWarning: hasAssignedShift
              ? `Đã xếp ${shiftInfoText}! Cần người làm thay thế.`
              : null,
          };
        } catch (subErr) {
          console.error("Lỗi kiểm tra ca làm trùng:", subErr);
          return {
            ...item,
            hasAssignedShift: false,
            assignedShift: null,
            assignedShiftText: "",
            shiftWarning: null,
          };
        }
      })
    );

    // Thống kê nhanh
    const [counts] = await db.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN TrangThai = 'pending' THEN 1 ELSE 0 END) AS pendingCount,
        SUM(CASE WHEN TrangThai = 'approved' THEN 1 ELSE 0 END) AS approvedCount,
        SUM(CASE WHEN TrangThai = 'rejected' THEN 1 ELSE 0 END) AS rejectedCount
      FROM don_xin_nghi
    `);

    res.json({
      success: true,
      message: "Lấy danh sách đơn xin nghỉ thành công!",
      data: enrichedRequests,
      summary: {
        total: counts[0]?.total || 0,
        pending: counts[0]?.pendingCount || 0,
        approved: counts[0]?.approvedCount || 0,
        rejected: counts[0]?.rejectedCount || 0,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách đơn xin nghỉ:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách đơn xin nghỉ: " + error.message,
    });
  }
};

// [PATCH / PUT] Cập nhật trạng thái đơn xin nghỉ (từ Pending sang Approved hoặc Rejected)
exports.updateLeaveRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, ghiChuQL, reason } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu mã đơn xin nghỉ (id)!",
      });
    }

    const normalizedStatus = (status || "").toLowerCase().trim();
    if (!["approved", "rejected", "pending"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "Trạng thái không hợp lệ! Chỉ chấp nhận: 'approved', 'rejected' hoặc 'pending'.",
      });
    }

    // Kiểm tra đơn có tồn tại không
    const [existing] = await db.query(
      "SELECT * FROM don_xin_nghi WHERE MaDon = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy đơn xin nghỉ với mã ${id}!`,
      });
    }

    const noteToSave = ghiChuQL !== undefined ? ghiChuQL : (reason || "");

    // Cập nhật trạng thái và ghi chú của quản lý
    await db.query(
      `UPDATE don_xin_nghi 
       SET TrangThai = ?, GhiChuQL = ? 
       WHERE MaDon = ?`,
      [normalizedStatus, noteToSave, id]
    );

    // Lấy lại thông tin chi tiết sau khi cập nhật
    const [updatedRow] = await db.query(
      `SELECT 
        dxn.MaDon,
        dxn.MaNhanVien,
        DATE_FORMAT(dxn.NgayNghi, '%Y-%m-%d') AS NgayNghi,
        dxn.LyDo,
        dxn.LoaiNghi,
        dxn.TrangThai,
        dxn.GhiChuQL,
        dxn.NgayTao,
        nv.MaNhanVienCode,
        nv.HoTen AS TenNhanVien,
        nv.ChucVu
       FROM don_xin_nghi dxn
       LEFT JOIN nhanvien nv ON dxn.MaNhanVien = nv.MaNhanVien
       WHERE dxn.MaDon = ?`,
      [id]
    );

    res.json({
      success: true,
      message:
        normalizedStatus === "approved"
          ? "Đã phê duyệt đơn xin nghỉ thành công!"
          : normalizedStatus === "rejected"
          ? "Đã từ chối đơn xin nghỉ thành công!"
          : "Đã cập nhật trạng thái đơn thành công!",
      data: updatedRow[0] || null,
    });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái đơn xin nghỉ:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi cập nhật đơn xin nghỉ: " + error.message,
    });
  }
};

// [POST] Tạo đơn xin nghỉ phép mới (nhân viên hoặc quản lý tạo)
exports.createLeaveRequest = async (req, res) => {
  try {
    const {
      maNhanVien,
      employeeId,
      ngayNghi,
      ngayNghiDen,
      lyDo,
      loaiNghi = "phep",
    } = req.body;

    const empId = maNhanVien || employeeId;
    if (!empId || !ngayNghi || !lyDo) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ: Mã nhân viên, Ngày xin nghỉ và Lý do!",
      });
    }

    // Chuyển đổi mã NV nếu truyền vào dạng code "NV003"
    let resolvedEmployeeId = empId;
    if (typeof empId === "string" && empId.startsWith("NV")) {
      const [empRows] = await db.query(
        "SELECT MaNhanVien FROM nhanvien WHERE MaNhanVienCode = ? LIMIT 1",
        [empId]
      );
      if (empRows.length > 0) {
        resolvedEmployeeId = empRows[0].MaNhanVien;
      }
    }

    const [insertResult] = await db.query(
      `INSERT INTO don_xin_nghi 
       (MaNhanVien, NgayNghi, NgayNghiDen, LyDo, LoaiNghi, TrangThai, GhiChuQL, NgayTao)
       VALUES (?, ?, ?, ?, ?, 'pending', '', NOW())`,
      [
        resolvedEmployeeId,
        ngayNghi,
        ngayNghiDen || ngayNghi,
        lyDo.trim(),
        loaiNghi,
      ]
    );

    // Kiểm tra xem ngày nghỉ có trùng ca đã xếp không để trả về cảnh báo trước
    const [assignedShifts] = await db.query(
      `SELECT cl.TenCaLam, cl.GioBatDau, cl.GioKetThuc
       FROM dangky_ca dkc
       LEFT JOIN calam cl ON dkc.MaCaLam = cl.MaCaLam
       WHERE dkc.MaNhanVien = ? 
         AND DATE(dkc.NgayLam) = DATE(?)
         AND (dkc.TrangThai = 'admin_approved' OR dkc.TrangThai = 'approved')`,
      [resolvedEmployeeId, ngayNghi]
    );

    const hasShift = assignedShifts.length > 0;

    res.status(201).json({
      success: true,
      message: "Gửi đơn xin nghỉ phép thành công! Đơn đang chờ Quản lý duyệt.",
      data: {
        maDon: insertResult.insertId,
        maNhanVien: resolvedEmployeeId,
        ngayNghi,
        lyDo,
        trangThai: "pending",
        hasAssignedShift: hasShift,
        warning: hasShift
          ? `Lưu ý: Nhân viên đã có ca làm (${assignedShifts[0]?.TenCaLam}) vào ngày này!`
          : null,
      },
    });
  } catch (error) {
    console.error("Lỗi tạo đơn xin nghỉ:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi tạo đơn xin nghỉ: " + error.message,
    });
  }
};

// [DELETE] Xóa đơn xin nghỉ phép
exports.deleteLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.query(
      "SELECT * FROM don_xin_nghi WHERE MaDon = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy đơn xin nghỉ với mã ${id}!`,
      });
    }

    await db.query("DELETE FROM don_xin_nghi WHERE MaDon = ?", [id]);

    res.json({
      success: true,
      message: "Đã xóa đơn xin nghỉ thành công!",
    });
  } catch (error) {
    console.error("Lỗi xóa đơn xin nghỉ:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa đơn xin nghỉ: " + error.message,
    });
  }
};
