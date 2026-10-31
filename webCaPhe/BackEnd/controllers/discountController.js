const db = require("../config/db");

// Đảm bảo schema bảng mamgiamgia có cột DiemToiThieu và DonHangToiThieu
const ensureDiscountSchema = async () => {
  try {
    const [cols] = await db.query("DESCRIBE mamgiamgia");
    const colNames = cols.map((c) => c.Field);
    if (!colNames.includes("DiemToiThieu")) {
      await db.query(
        "ALTER TABLE mamgiamgia ADD COLUMN DiemToiThieu INT NOT NULL DEFAULT 0 AFTER GiaTriToiDa"
      );
      console.log("✅ Đã tự động thêm cột DiemToiThieu vào bảng mamgiamgia");
    }
    if (!colNames.includes("DonHangToiThieu")) {
      await db.query(
        "ALTER TABLE mamgiamgia ADD COLUMN DonHangToiThieu DECIMAL(10,2) DEFAULT 0.00 AFTER DiemToiThieu"
      );
      console.log("✅ Đã tự động thêm cột DonHangToiThieu vào bảng mamgiamgia");
    }
  } catch (err) {
    console.warn("Lỗi kiểm tra schema mamgiamgia:", err.message);
  }
};
ensureDiscountSchema();

// [GET] /api/discounts - Lấy danh sách tất cả mã giảm giá
exports.getAllDiscounts = async (req, res) => {
  try {
    const { search, status, type } = req.query;
    let sql = "SELECT * FROM mamgiamgia WHERE 1=1";
    const params = [];

    if (search) {
      sql += " AND (MaCode LIKE ? OR TenMG LIKE ?)";
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (status !== undefined && status !== "all" && status !== "") {
      sql += " AND TrangThai = ?";
      params.push(status === "1" || status === 1 || status === "true" ? 1 : 0);
    }

    if (type && type !== "all") {
      sql += " AND LoaiGiam = ?";
      params.push(type);
    }

    sql += " ORDER BY MaMG DESC";
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi truy vấn cơ sở dữ liệu: " + err.message });
  }
};

// [GET] /api/discounts/:id - Chi tiết 1 mã giảm giá
exports.getDiscountById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM mamgiamgia WHERE MaMG = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy mã giảm giá!" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Lỗi: " + err.message });
  }
};

// [POST] /api/discounts - Tạo mới chiến dịch mã giảm giá (kèm ràng buộc Mốc điểm)
exports.createDiscount = async (req, res) => {
  try {
    const {
      maCode,
      tenMG,
      loaiGiam = "percent",
      giaTriGiam,
      giaTriToiDa,
      diemToiThieu = 0,
      donHangToiThieu = 0,
      gioiHanDung,
      ngayBatDau,
      ngayHetHan,
      trangThai = 1,
    } = req.body;

    if (!maCode || !tenMG || giaTriGiam === undefined || giaTriGiam === "") {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ Mã code, Tên chiến dịch và Giá trị giảm!",
      });
    }

    const cleanCode = maCode.trim().toUpperCase();

    // Kiểm tra trùng mã code
    const [existing] = await db.query(
      "SELECT MaMG FROM mamgiamgia WHERE UPPER(MaCode) = ?",
      [cleanCode]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        message: `Mã code "${cleanCode}" đã tồn tại! Vui lòng chọn mã khác.`,
      });
    }

    const numGiaTriGiam = Number(giaTriGiam);
    if (numGiaTriGiam <= 0) {
      return res.status(400).json({ message: "Giá trị giảm phải lớn hơn 0!" });
    }

    if (loaiGiam === "percent" && numGiaTriGiam > 100) {
      return res.status(400).json({ message: "Giảm theo phần trăm không được vượt quá 100%!" });
    }

    const numDiemToiThieu = Math.max(0, parseInt(diemToiThieu, 10) || 0);

    const [result] = await db.query(
      `INSERT INTO mamgiamgia (
        MaCode, TenMG, LoaiGiam, GiaTriGiam, GiaTriToiDa, 
        DiemToiThieu, DonHangToiThieu, SoLanDung, GioiHanDung, 
        NgayBatDau, NgayHetHan, TrangThai
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [
        cleanCode,
        tenMG.trim(),
        loaiGiam === "fixed" ? "fixed" : "percent",
        numGiaTriGiam,
        giaTriToiDa ? Number(giaTriToiDa) : null,
        numDiemToiThieu,
        donHangToiThieu ? Number(donHangToiThieu) : 0,
        gioiHanDung ? parseInt(gioiHanDung, 10) : null,
        ngayBatDau || null,
        ngayHetHan || null,
        trangThai ? 1 : 0,
      ]
    );

    res.status(201).json({
      success: true,
      message: `Tạo chiến dịch mã giảm giá "${cleanCode}" thành công!`,
      id: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi lưu mã giảm giá: " + err.message });
  }
};

// [PUT] /api/discounts/:id - Cập nhật chiến dịch mã giảm giá
exports.updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      maCode,
      tenMG,
      loaiGiam,
      giaTriGiam,
      giaTriToiDa,
      diemToiThieu = 0,
      donHangToiThieu = 0,
      gioiHanDung,
      ngayBatDau,
      ngayHetHan,
      trangThai,
    } = req.body;

    if (!maCode || !tenMG || giaTriGiam === undefined || giaTriGiam === "") {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ Mã code, Tên chiến dịch và Giá trị giảm!",
      });
    }

    const cleanCode = maCode.trim().toUpperCase();

    // Kiểm tra trùng mã với các mã khác
    const [existing] = await db.query(
      "SELECT MaMG FROM mamgiamgia WHERE UPPER(MaCode) = ? AND MaMG != ?",
      [cleanCode, id]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        message: `Mã code "${cleanCode}" đã được sử dụng ở chiến dịch khác!`,
      });
    }

    const numGiaTriGiam = Number(giaTriGiam);
    const numDiemToiThieu = Math.max(0, parseInt(diemToiThieu, 10) || 0);

    const [result] = await db.query(
      `UPDATE mamgiamgia SET 
        MaCode = ?, TenMG = ?, LoaiGiam = ?, GiaTriGiam = ?, GiaTriToiDa = ?, 
        DiemToiThieu = ?, DonHangToiThieu = ?, GioiHanDung = ?, 
        NgayBatDau = ?, NgayHetHan = ?, TrangThai = ?
       WHERE MaMG = ?`,
      [
        cleanCode,
        tenMG.trim(),
        loaiGiam === "fixed" ? "fixed" : "percent",
        numGiaTriGiam,
        giaTriToiDa ? Number(giaTriToiDa) : null,
        numDiemToiThieu,
        donHangToiThieu ? Number(donHangToiThieu) : 0,
        gioiHanDung ? parseInt(gioiHanDung, 10) : null,
        ngayBatDau || null,
        ngayHetHan || null,
        trangThai ? 1 : 0,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy mã giảm giá!" });
    }

    res.json({
      success: true,
      message: `Cập nhật mã giảm giá "${cleanCode}" thành công!`,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi cập nhật: " + err.message });
  }
};

// [PATCH] /api/discounts/:id/status - Bật / Tắt trạng thái mã giảm giá
exports.toggleDiscountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const rawVal = req.body.trangThai !== undefined ? req.body.trangThai : req.body.status;
    if (rawVal === undefined) {
      return res.status(400).json({ message: "Thiếu trường trangThai" });
    }

    const isActive = rawVal === 1 || rawVal === "1" || rawVal === true || rawVal === "true" ? 1 : 0;
    const [result] = await db.query("UPDATE mamgiamgia SET TrangThai = ? WHERE MaMG = ?", [
      isActive,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy mã giảm giá!" });
    }

    res.json({
      success: true,
      message: `Đã ${isActive ? "kích hoạt" : "tạm dừng"} mã giảm giá!`,
      trangThai: isActive,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi: " + err.message });
  }
};

// [DELETE] /api/discounts/:id - Xóa mã giảm giá
exports.deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("DELETE FROM mamgiamgia WHERE MaMG = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy mã để xóa!" });
    }
    res.json({ success: true, message: "Đã xóa mã giảm giá thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xóa mã giảm giá: " + err.message });
  }
};

// Helper định dạng Date -> 'YYYY-MM-DD' theo giờ địa phương (tránh lệch timezone UTC)
function formatDateLocal(d) {
  if (!d) return null;
  if (typeof d === "string") return d.slice(0, 10);
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// [POST] /api/discounts/validate - Kiểm tra hợp lệ khi áp dụng mã (Kiểm tra nghiêm ngặt MỐC ĐIỂM)
exports.validateDiscount = async (req, res) => {
  try {
    const rawCode = req.body.maCode || req.body.maGiamGia || req.body.code || "";
    const rawSubtotal = req.body.subtotal ?? req.body.tongTien ?? req.body.total ?? 0;
    const rawCustomerId = req.body.customerId ?? req.body.maKhachHang ?? null;
    let currentPoints = parseInt(req.body.customerPoints ?? req.body.points ?? 0, 10) || 0;

    if (!rawCode || !String(rawCode).trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập mã giảm giá!" });
    }

    const cleanCode = String(rawCode).trim().toUpperCase();
    const cleanWithoutPercent = cleanCode.replace(/%/g, "");

    // Tự động truy vấn số điểm tích lũy của khách hàng nếu chưa truyền
    if (currentPoints === 0 && rawCustomerId) {
      try {
        const [custRows] = await db.query(
          "SELECT DiemTichLuy FROM khachhang WHERE MaKhachHang = ?",
          [rawCustomerId]
        );
        if (custRows.length > 0) {
          currentPoints = parseInt(custRows[0].DiemTichLuy, 10) || 0;
        }
      } catch (_) {}
    }

    // 1. Tìm mã trong database (hỗ trợ cả có % hoặc không có %)
    const [rows] = await db.query(
      `SELECT * FROM mamgiamgia 
       WHERE UPPER(MaCode) = ? 
          OR UPPER(MaCode) = ? 
          OR UPPER(REPLACE(MaCode, '%', '')) = ?`,
      [cleanCode, cleanCode + "%", cleanWithoutPercent]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Mã giảm giá "${cleanCode}" không tồn tại trên hệ thống!`,
      });
    }

    const discount = rows[0];

    // 2. Kiểm tra trạng thái hoạt động
    if (Number(discount.TrangThai) !== 1) {
      return res.status(400).json({
        success: false,
        message: `Mã giảm giá "${discount.MaCode}" đang tạm ngưng hoạt động!`,
      });
    }

    const todayStr = formatDateLocal(new Date());

    // 3. Kiểm tra ngày bắt đầu
    if (discount.NgayBatDau) {
      const startStr = formatDateLocal(discount.NgayBatDau);
      if (startStr && todayStr < startStr) {
        return res.status(400).json({
          success: false,
          message: `Mã giảm giá "${discount.MaCode}" chỉ bắt đầu áp dụng từ ngày ${startStr}!`,
        });
      }
    }

    // 4. Kiểm tra ngày hết hạn
    if (discount.NgayHetHan) {
      const endStr = formatDateLocal(discount.NgayHetHan);
      if (endStr && todayStr > endStr) {
        return res.status(400).json({
          success: false,
          message: `Mã giảm giá "${discount.MaCode}" đã hết hạn vào ngày ${endStr}!`,
        });
      }
    }

    // 5. Kiểm tra giới hạn lượt dùng
    if (discount.GioiHanDung !== null && Number(discount.SoLanDung) >= Number(discount.GioiHanDung)) {
      return res.status(400).json({
        success: false,
        message: `Mã giảm giá "${discount.MaCode}" đã hết lượt sử dụng (${discount.GioiHanDung} lượt)!`,
      });
    }

    // 6. Kiểm tra đơn hàng tối thiểu
    const numSubtotal = Number(rawSubtotal) || 0;
    const minOrder = Number(discount.DonHangToiThieu) || 0;
    if (minOrder > 0 && numSubtotal < minOrder) {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng tối thiểu ${minOrder.toLocaleString("vi-VN")}đ mới được dùng mã này (Hiện tại: ${numSubtotal.toLocaleString("vi-VN")}đ)!`,
      });
    }

    // 7. ⭐ KIỂM TRA RÀNG BUỘC "MỐC ĐIỂM" (BẮT BUỘC THEO YÊU CẦU ĐỀ BÀI)
    const minPoints = parseInt(discount.DiemToiThieu, 10) || 0;

    if (minPoints > 0) {
      if (currentPoints < minPoints) {
        return res.status(400).json({
          success: false,
          message: `Khách hàng phải có tối thiểu ${minPoints} điểm mới được phép dùng mã "${discount.MaCode}" (Khách hiện có: ${currentPoints} điểm).`,
          requiredPoints: minPoints,
          currentPoints: currentPoints,
        });
      }
    }

    // 8. Tính toán số tiền được giảm
    let discountAmount = 0;
    if (discount.LoaiGiam === "percent") {
      discountAmount = Math.round(numSubtotal * (Number(discount.GiaTriGiam) / 100));
      if (discount.GiaTriToiDa && discountAmount > Number(discount.GiaTriToiDa)) {
        discountAmount = Number(discount.GiaTriToiDa);
      }
    } else {
      discountAmount = Math.min(Number(discount.GiaTriGiam), numSubtotal);
    }

    const discountInfo = {
      id: discount.MaMG,
      code: discount.MaCode,
      name: discount.TenMG,
      type: discount.LoaiGiam,
      value: Number(discount.GiaTriGiam),
      maxAmount: discount.GiaTriToiDa ? Number(discount.GiaTriToiDa) : null,
      minPoints: minPoints,
      minOrder: minOrder,
      discountAmount: discountAmount,
      amount: discountAmount,
    };

    res.json({
      success: true,
      valid: true,
      message: `Áp dụng thành công mã "${discount.MaCode}"! Giảm ${discountAmount.toLocaleString("vi-VN")}đ.`,
      discount: discountInfo,
      data: {
        soTienGiam: discountAmount,
        giamGia: discountAmount,
        discountAmount: discountAmount,
        amount: discountAmount,
        maGiamGia: discount.MaCode,
        code: discount.MaCode,
        tenKhuyenMai: discount.TenMG,
        moTa: discount.TenMG,
        diemDaTru: minPoints,
        diemSuDung: minPoints,
        minPoints: minPoints,
      },
      soTienGiam: discountAmount,
      giamGia: discountAmount,
      discountAmount: discountAmount,
    });
  } catch (err) {
    console.error("Lỗi validate discount:", err);
    res.status(500).json({ success: false, message: "Lỗi kiểm tra mã: " + err.message });
  }
};
