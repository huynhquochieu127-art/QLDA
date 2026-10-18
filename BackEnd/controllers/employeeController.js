const bcrypt = require("bcrypt");
const db = require("../config/db");

/**
 * Tự động đồng bộ và đảm bảo bảng nhanvien có đủ các cột:
 * - CCCD (VARCHAR 20)
 * - ChucVu (VARCHAR 50)
 * - LoaiLuong (VARCHAR 20) ('HOURLY' hoặc 'MONTHLY')
 * - GhiChu (TEXT)
 */
let schemaEnsured = false;
async function ensureEmployeeSchema(conn) {
  if (schemaEnsured) return;
  const target = conn || db;
  const alterStatements = [
    "ALTER TABLE nhanvien ADD COLUMN CCCD VARCHAR(20) NULL",
    "ALTER TABLE nhanvien ADD COLUMN ChucVu VARCHAR(50) NULL",
    "ALTER TABLE nhanvien ADD COLUMN LoaiLuong VARCHAR(20) DEFAULT 'MONTHLY'",
    "ALTER TABLE nhanvien ADD COLUMN GhiChu TEXT NULL",
  ];
  for (const sql of alterStatements) {
    try {
      await target.query(sql);
    } catch (err) {
      if (err.errno !== 1060 && err.code !== "ER_DUP_FIELDNAME") {
        console.warn("Lưu ý migration cột nhanvien:", err.message);
      }
    }
  }
  // Đồng bộ giá trị LoaiLuong cho các bản ghi cũ nếu chưa có
  try {
    await target.query(
      "UPDATE nhanvien SET LoaiLuong = 'HOURLY', GhiChu = COALESCE(GhiChu, 'HOURLY') WHERE LoaiNhanVien = 'Part-time' AND (LoaiLuong IS NULL OR LoaiLuong != 'HOURLY')"
    );
    await target.query(
      "UPDATE nhanvien SET LoaiLuong = 'MONTHLY' WHERE LoaiNhanVien = 'Full-time' AND (LoaiLuong IS NULL OR LoaiLuong != 'MONTHLY')"
    );
  } catch (e) {}
  schemaEnsured = true;
}
// Chạy kiểm tra khởi tạo schema
ensureEmployeeSchema();

/**
 * Helper: Tạo mã nhân viên tự động NV001, NV002,...
 */
async function generateEmployeeCode(connection) {
  const [rows] = await connection.query(
    "SELECT MaNhanVien, MaNhanVienCode FROM nhanvien ORDER BY MaNhanVien DESC LIMIT 1"
  );
  if (rows.length === 0) {
    return "NV001";
  }

  // Thử trích xuất số từ MaNhanVienCode hiện tại (ví dụ: NV009 -> 9)
  const lastCode = rows[0].MaNhanVienCode;
  const match = lastCode ? lastCode.match(/\d+/) : null;
  const nextNum = match ? parseInt(match[0], 10) + 1 : rows[0].MaNhanVien + 1;
  return `NV${String(nextNum).padStart(3, "0")}`;
}

/**
 * [POST] /api/employees (hoặc /api/users)
 * Nhận toàn bộ dữ liệu từ Form gửi xuống và lưu vào bảng Users/Employees (taikhoan & nhanvien)
 * Nếu nhân viên là "Part-time": Lưu mức lương cơ bản theo giờ vào CSDL và ghi chú loại lương là HOURLY.
 */
exports.createEmployee = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await ensureEmployeeSchema(connection);

    const {
      hoTen,
      name,
      fullName,
      email,
      soDienThoai,
      phone,
      cccd,
      cmnd,
      citizenId,
      gioiTinh,
      gender,
      diaChi,
      address,
      chucVu,
      position,
      loaiNhanVien,
      employeeType,
      ngayVaoLam,
      startDate,
      luong,
      salary,
      maVaiTro,
      roleId,
      role,
      password,
      loaiLuong,
      ghiChu,
    } = req.body;

    // Chuẩn hóa dữ liệu đầu vào từ Form linh hoạt
    const finalHoTen = (hoTen || name || fullName || "").trim();
    const finalEmail = (email || "").trim().toLowerCase();
    const finalPhone = (soDienThoai || phone || "").trim();
    const finalCCCD = (cccd || cmnd || citizenId || "").toString().trim();
    const finalGender = gioiTinh || gender || "Nam";
    const finalAddress = (diaChi || address || "").trim();
    const finalPosition = (chucVu || position || "Nhân viên").trim();

    // Phân loại hợp đồng: Full-time (Lương cứng) hoặc Part-time (Lương theo giờ HOURLY)
    const rawEmp = (loaiNhanVien || employeeType || "Full-time").toString().trim();
    const isPartTime =
      rawEmp.toLowerCase().includes("part") ||
      (loaiLuong && String(loaiLuong).toUpperCase() === "HOURLY");
    const finalEmpType = isPartTime ? "Part-time" : "Full-time";
    const finalLoaiLuong = isPartTime ? "HOURLY" : "MONTHLY";

    const rawSalary = luong !== undefined ? luong : salary;
    const finalSalary =
      rawSalary !== undefined && rawSalary !== null && rawSalary !== ""
        ? Number(String(rawSalary).replace(/[^\d.]/g, ""))
        : 0;

    // Yêu cầu: Ghi chú loại lương là HOURLY
    const finalGhiChu = ghiChu ? String(ghiChu).trim() : (isPartTime ? "HOURLY" : "MONTHLY");

    // Xác định vai trò (Mặc định 3 = Nhân viên, 2 = Quản lý, 1 = Admin)
    let finalRoleId = 3;
    const rawRole = maVaiTro || roleId || role;
    if (rawRole) {
      const lower = rawRole.toString().toLowerCase();
      if (lower === "1" || lower.includes("admin")) {
        finalRoleId = 1;
      } else if (lower === "2" || lower.includes("quản lý") || lower.includes("manager")) {
        finalRoleId = 2;
      } else {
        finalRoleId = 3;
      }
    }

    // 1. Kiểm tra các trường bắt buộc
    if (!finalHoTen) {
      return res.status(400).json({
        success: false,
        message: "Họ và tên nhân viên là bắt buộc!",
      });
    }

    if (!finalEmail) {
      return res.status(400).json({
        success: false,
        message: "Email là bắt buộc để tạo tài khoản đăng nhập!",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(finalEmail)) {
      return res.status(400).json({
        success: false,
        message: "Định dạng email không hợp lệ!",
      });
    }

    // 2. Tự động tạo MẬT KHẨU MẶC ĐỊNH
    let defaultPassword = "";
    let passwordSource = "";

    const digitsOnlyCCCD = finalCCCD.replace(/\D/g, "");
    if (password && password.trim().length > 0) {
      defaultPassword = password.trim();
      passwordSource = "Mật khẩu do Admin chỉ định";
    } else if (digitsOnlyCCCD.length >= 6) {
      defaultPassword = digitsOnlyCCCD.slice(-6);
      passwordSource = "6 số cuối CCCD";
    } else {
      defaultPassword = "Cafe@123";
      passwordSource = "Mật khẩu mặc định hệ thống (Cafe@123)";
    }

    // 3. Mã hóa mật khẩu bằng BCRYPT
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    // 4. Bắt đầu Transaction MySQL để lưu đồng bộ cả Users (taikhoan) & Employees (nhanvien)
    await connection.beginTransaction();

    // 4.1. Kiểm tra trùng Email trong bảng taikhoan
    const [existingAccount] = await connection.query(
      "SELECT MaTaiKhoan FROM taikhoan WHERE Email = ?",
      [finalEmail]
    );
    if (existingAccount.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Email này đã được sử dụng cho một tài khoản khác!",
      });
    }

    // 4.2. Thêm vào bảng taikhoan (Users)
    const [accResult] = await connection.query(
      `INSERT INTO taikhoan (HoTen, Email, MatKhau, SoDienThoai, MaVaiTro, TrangThaiHoatDong, NgayTao)
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [finalHoTen, finalEmail, hashedPassword, finalPhone || null, finalRoleId]
    );
    const maTaiKhoan = accResult.insertId;

    // 4.3. Sinh mã nhân viên tự động (NV001, NV002,...)
    const maNhanVienCode = await generateEmployeeCode(connection);

    // 4.4. Thêm vào bảng nhanvien (Employees) kèm loại lương HOURLY / MONTHLY và ghi chú
    const [empResult] = await connection.query(
      `INSERT INTO nhanvien (
        MaTaiKhoan, MaNhanVienCode, HoTen, GioiTinh, SoDienThoai, CCCD,
        DiaChi, ChucVu, LoaiNhanVien, LoaiLuong, GhiChu, NgayVaoLam, Luong, TrangThai
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        maTaiKhoan,
        maNhanVienCode,
        finalHoTen,
        finalGender,
        finalPhone || null,
        finalCCCD || null,
        finalAddress || null,
        finalPosition,
        finalEmpType,
        finalLoaiLuong,
        finalGhiChu,
        ngayVaoLam ? new Date(ngayVaoLam) : new Date(),
        finalSalary,
        "Đang làm việc",
      ]
    );
    const maNhanVien = empResult.insertId;

    // Lấy tên vai trò từ bảng vaitro
    const [roleRows] = await connection.query(
      "SELECT TenVaiTro FROM vaitro WHERE MaVaiTro = ?",
      [finalRoleId]
    );
    const tenVaiTro = roleRows.length > 0 ? roleRows[0].TenVaiTro : "Nhân viên";

    // 4.5. Xác nhận thành công (Commit Transaction)
    await connection.commit();

    // 5. Trả về thông báo thành công & Thông tin bàn giao tài khoản cho Admin
    return res.status(201).json({
      success: true,
      message: "Tạo tài khoản và hồ sơ nhân viên thành công!",
      handoverInfo: {
        maNhanVienCode,
        hoTen: finalHoTen,
        email: finalEmail,
        matKhauMacDinh: defaultPassword,
        quyTacTaoMatKhau: passwordSource,
        vaiTro: tenVaiTro,
        chucVu: finalPosition,
        loaiNhanVien: finalEmpType,
        loaiLuong: finalLoaiLuong,
        ghiChu: finalGhiChu,
        loaiHopDong:
          finalEmpType === "Full-time"
            ? "Full-time (Toàn thời gian - Nhận lương cứng)"
            : "Part-time (Bán thời gian - Nhận lương theo giờ)",
        hinhThucLuong:
          finalEmpType === "Full-time"
            ? "Lương cứng theo tháng"
            : "Lương cơ bản theo giờ (HOURLY)",
        mucLuong: finalSalary,
        donViLuong: isPartTime ? "VNĐ/giờ" : "VNĐ/tháng",
        congThucTinhLuong:
          finalEmpType === "Full-time"
            ? "Lương thực nhận = Lương cứng hàng tháng + Phụ cấp/Thưởng - Khấu trừ"
            : "Lương thực nhận = (Tổng giờ làm thực tế x Lương/giờ) + Thưởng - Khấu trừ",
        huongDan:
          "Admin hãy bàn giao Email và Mật khẩu mặc định này cho nhân viên mới. Nhắc nhở nhân viên đổi mật khẩu ngay sau lần đầu đăng nhập.",
      },
      data: {
        maNhanVien,
        maTaiKhoan,
        maNhanVienCode,
        hoTen: finalHoTen,
        email: finalEmail,
        soDienThoai: finalPhone,
        cccd: finalCCCD,
        gioiTinh: finalGender,
        diaChi: finalAddress,
        chucVu: finalPosition,
        loaiNhanVien: finalEmpType,
        loaiLuong: finalLoaiLuong,
        ghiChu: finalGhiChu,
        vaiTro: tenVaiTro,
        maVaiTro: finalRoleId,
        luong: finalSalary,
        donVi: isPartTime ? "VNĐ/giờ" : "VNĐ/tháng",
        trangThai: "Đang làm việc",
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Lỗi tạo nhân viên:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi tạo nhân viên: " + error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * [GET] /api/employees
 * Lấy danh sách nhân viên có hỗ trợ:
 *  - Phân trang  : ?page=1&limit=10  (mặc định 10 nhân viên/trang)
 *  - Tìm kiếm   : ?search=<từ_khóa>
 *  - Sắp xếp    : ?sortBy=name|startDate  &  ?sortOrder=asc|desc
 *      + sortBy=name      → Sắp xếp theo Tên (A-Z / Z-A)
 *      + sortBy=startDate → Sắp xếp theo Ngày vào làm (Mới nhất / Cũ nhất)
 */
exports.getAllEmployees = async (req, res) => {
  try {
    await ensureEmployeeSchema();

    // ── 1. Tham số Tìm kiếm ─────────────────────────────────────────────────
    const search = req.query.search || "";
    const searchParam = `%${search}%`;

    // ── 2. Tham số Phân trang ────────────────────────────────────────────────
    // Giá trị mặc định: page=1, limit=10 (tránh trả về toàn bộ dữ liệu)
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    // ── 3. Tham số Sắp xếp ──────────────────────────────────────────────────
    // Dùng whitelist để tránh SQL Injection (KHÔNG bao giờ nhúng thẳng input vào query)
    const SORT_COLUMN_MAP = {
      name:      "nv.HoTen",       // Sắp theo Tên
      startDate: "nv.NgayVaoLam",  // Sắp theo Ngày vào làm
      id:        "nv.MaNhanVien",  // Sắp theo Mã NV (mặc định)
    };
    const SORT_ORDER_ALLOWED = ["ASC", "DESC"];

    const sortByRaw    = (req.query.sortBy    || "id").toLowerCase();
    const sortOrderRaw = (req.query.sortOrder || "desc").toUpperCase();

    // Nếu giá trị không hợp lệ → dùng mặc định (an toàn)
    const sortColumn = SORT_COLUMN_MAP[sortByRaw]    || SORT_COLUMN_MAP["id"];
    const sortOrder  = SORT_ORDER_ALLOWED.includes(sortOrderRaw) ? sortOrderRaw : "DESC";

    // ── 4. Đếm tổng bản ghi (phục vụ tính totalPages) ───────────────────────
    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total
       FROM nhanvien nv
       LEFT JOIN taikhoan tk ON nv.MaTaiKhoan = tk.MaTaiKhoan
       WHERE nv.HoTen         LIKE ?
          OR nv.SoDienThoai   LIKE ?
          OR nv.MaNhanVienCode LIKE ?
          OR tk.Email         LIKE ?`,
      [searchParam, searchParam, searchParam, searchParam]
    );
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    // ── 5. Truy vấn dữ liệu có phân trang & sắp xếp ─────────────────────────
    // sortColumn và sortOrder đã được validate qua whitelist ở trên → an toàn
    const [rows] = await db.query(
      `SELECT
          nv.MaNhanVien,
          nv.MaNhanVienCode,
          nv.HoTen,
          nv.GioiTinh,
          nv.SoDienThoai,
          nv.CCCD,
          nv.DiaChi,
          nv.ChucVu,
          nv.LoaiNhanVien,
          COALESCE(nv.LoaiLuong, IF(nv.LoaiNhanVien = 'Part-time', 'HOURLY', 'MONTHLY')) AS LoaiLuong,
          COALESCE(nv.GhiChu, IF(nv.LoaiNhanVien = 'Part-time', 'HOURLY', '')) AS GhiChu,
          DATE_FORMAT(nv.NgayVaoLam, '%Y-%m-%d') AS NgayVaoLam,
          nv.Luong,
          nv.TrangThai,
          tk.MaTaiKhoan,
          tk.Email,
          tk.MaVaiTro,
          tk.TrangThaiHoatDong,
          vt.TenVaiTro
       FROM nhanvien nv
       LEFT JOIN taikhoan tk ON nv.MaTaiKhoan = tk.MaTaiKhoan
       LEFT JOIN vaitro   vt ON tk.MaVaiTro   = vt.MaVaiTro
       WHERE nv.HoTen         LIKE ?
          OR nv.SoDienThoai   LIKE ?
          OR nv.MaNhanVienCode LIKE ?
          OR tk.Email         LIKE ?
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [searchParam, searchParam, searchParam, searchParam, limit, offset]
    );

    // ── 6. Trả về kết quả ────────────────────────────────────────────────────
    return res.json({
      success: true,
      pagination: {
        currentPage: page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      sorting: {
        sortBy:    sortByRaw,
        sortOrder: sortOrder.toLowerCase(),
      },
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách nhân viên:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi cơ sở dữ liệu: " + error.message,
    });
  }
};

/**
 * [GET] /api/employees/:id
 * Lấy chi tiết một nhân viên
 */
exports.getEmployeeById = async (req, res) => {
  try {
    await ensureEmployeeSchema();
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT 
        nv.*,
        COALESCE(nv.LoaiLuong, IF(nv.LoaiNhanVien = 'Part-time', 'HOURLY', 'MONTHLY')) AS LoaiLuong,
        COALESCE(nv.GhiChu, IF(nv.LoaiNhanVien = 'Part-time', 'HOURLY', '')) AS GhiChu,
        DATE_FORMAT(nv.NgayVaoLam, '%Y-%m-%d') as NgayVaoLamFormatted,
        tk.Email,
        tk.MaVaiTro,
        tk.TrangThaiHoatDong,
        vt.TenVaiTro
       FROM nhanvien nv
       LEFT JOIN taikhoan tk ON nv.MaTaiKhoan = tk.MaTaiKhoan
       LEFT JOIN vaitro vt ON tk.MaVaiTro = vt.MaVaiTro
       WHERE nv.MaNhanVien = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên!",
      });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [PUT] /api/employees/:id
 * Cập nhật thông tin nhân viên (Bao gồm số tiền lương và ghi chú loại lương HOURLY nếu là Part-time)
 */
exports.updateEmployee = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await ensureEmployeeSchema(connection);
    const { id } = req.params;
    const {
      hoTen,
      soDienThoai,
      cccd,
      gioiTinh,
      diaChi,
      chucVu,
      loaiNhanVien,
      loaiLuong,
      ghiChu,
      ngayVaoLam,
      luong,
      salary,
      trangThai,
      maVaiTro,
      trangThaiHoatDong,
    } = req.body;

    await connection.beginTransaction();

    const [empRows] = await connection.query(
      "SELECT MaTaiKhoan, LoaiNhanVien, LoaiLuong, GhiChu FROM nhanvien WHERE MaNhanVien = ?",
      [id]
    );

    if (empRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên để cập nhật!",
      });
    }

    const currentEmp = empRows[0];
    const maTaiKhoan = currentEmp.MaTaiKhoan;

    // Xác định loại nhân viên và loại lương
    let finalLoaiNhanVien = loaiNhanVien !== undefined ? loaiNhanVien : currentEmp.LoaiNhanVien;
    let isPartTime = false;
    if (finalLoaiNhanVien) {
      isPartTime = finalLoaiNhanVien.toLowerCase().includes("part");
      finalLoaiNhanVien = isPartTime ? "Part-time" : "Full-time";
    }

    let finalLoaiLuong = loaiLuong;
    if (!finalLoaiLuong) {
      if (loaiNhanVien !== undefined) {
        finalLoaiLuong = isPartTime ? "HOURLY" : "MONTHLY";
      } else {
        finalLoaiLuong = currentEmp.LoaiLuong || (isPartTime ? "HOURLY" : "MONTHLY");
      }
    } else {
      if (finalLoaiLuong.toUpperCase() === "HOURLY") {
        isPartTime = true;
        finalLoaiNhanVien = "Part-time";
        finalLoaiLuong = "HOURLY";
      }
    }

    // Yêu cầu: Ghi chú loại lương là HOURLY nếu là Part-time
    let finalGhiChu = ghiChu;
    if (finalGhiChu === undefined) {
      if (isPartTime) {
        finalGhiChu = "HOURLY";
      } else if (loaiNhanVien !== undefined) {
        finalGhiChu = "MONTHLY";
      }
    }

    const rawSalary = luong !== undefined ? luong : salary;
    const parsedSalary =
      rawSalary !== undefined && rawSalary !== null && rawSalary !== ""
        ? Number(String(rawSalary).replace(/[^\d.]/g, ""))
        : null;

    // Cập nhật bảng nhanvien
    await connection.query(
      `UPDATE nhanvien SET 
        HoTen = COALESCE(?, HoTen),
        SoDienThoai = COALESCE(?, SoDienThoai),
        CCCD = COALESCE(?, CCCD),
        GioiTinh = COALESCE(?, GioiTinh),
        DiaChi = COALESCE(?, DiaChi),
        ChucVu = COALESCE(?, ChucVu),
        LoaiNhanVien = COALESCE(?, LoaiNhanVien),
        LoaiLuong = COALESCE(?, LoaiLuong),
        GhiChu = COALESCE(?, GhiChu),
        NgayVaoLam = COALESCE(?, NgayVaoLam),
        Luong = COALESCE(?, Luong),
        TrangThai = COALESCE(?, TrangThai)
       WHERE MaNhanVien = ?`,
      [
        hoTen || null,
        soDienThoai || null,
        cccd || null,
        gioiTinh || null,
        diaChi || null,
        chucVu || null,
        finalLoaiNhanVien || null,
        finalLoaiLuong || null,
        finalGhiChu !== undefined ? finalGhiChu : null,
        ngayVaoLam ? new Date(ngayVaoLam) : null,
        parsedSalary,
        trangThai || null,
        id,
      ]
    );

    // Cập nhật bảng taikhoan nếu có MaTaiKhoan
    if (maTaiKhoan) {
      await connection.query(
        `UPDATE taikhoan SET 
          HoTen = COALESCE(?, HoTen),
          SoDienThoai = COALESCE(?, SoDienThoai),
          MaVaiTro = COALESCE(?, MaVaiTro),
          TrangThaiHoatDong = COALESCE(?, TrangThaiHoatDong)
         WHERE MaTaiKhoan = ?`,
        [
          hoTen || null,
          soDienThoai || null,
          maVaiTro !== undefined ? Number(maVaiTro) : null,
          trangThaiHoatDong !== undefined ? Number(trangThaiHoatDong) : null,
          maTaiKhoan,
        ]
      );
    }

    await connection.commit();
    res.json({
      success: true,
      message: "Cập nhật thông tin nhân viên thành công!",
      data: {
        maNhanVien: Number(id),
        loaiNhanVien: finalLoaiNhanVien,
        loaiLuong: finalLoaiLuong,
        ghiChu: finalGhiChu,
        luong: parsedSalary,
        donVi: isPartTime ? "VNĐ/giờ" : "VNĐ/tháng",
      },
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

/**
 * [PUT / PATCH] /api/employees/:id/salary
 * API nhận số tiền lương và cập nhật vào CSDL, ghi chú loại lương là HOURLY (hoặc MONTHLY)
 */
exports.updateEmployeeSalary = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await ensureEmployeeSchema(connection);
    const { id } = req.params;
    const { luong, salary, amount, loaiNhanVien, loaiLuong, ghiChu } = req.body;

    const rawSalary = luong !== undefined ? luong : (salary !== undefined ? salary : amount);
    if (rawSalary === undefined || rawSalary === null || rawSalary === "") {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập số tiền lương!",
      });
    }

    const finalSalary = Number(String(rawSalary).replace(/[^\d.]/g, ""));
    if (isNaN(finalSalary) || finalSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Số tiền lương không hợp lệ!",
      });
    }

    const [empRows] = await connection.query(
      "SELECT MaNhanVien, HoTen, LoaiNhanVien FROM nhanvien WHERE MaNhanVien = ?",
      [id]
    );

    if (empRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên!",
      });
    }

    const currentEmp = empRows[0];
    const targetType = loaiNhanVien || currentEmp.LoaiNhanVien || "Full-time";
    const isPartTime =
      targetType.toLowerCase().includes("part") ||
      (loaiLuong && String(loaiLuong).toUpperCase() === "HOURLY");

    const finalLoaiNhanVien = isPartTime ? "Part-time" : "Full-time";
    const finalLoaiLuong = isPartTime ? "HOURLY" : "MONTHLY";
    // Yêu cầu: Ghi chú loại lương là HOURLY khi là Part-time
    const finalGhiChu = ghiChu ? String(ghiChu).trim() : (isPartTime ? "HOURLY" : "MONTHLY");

    await connection.query(
      `UPDATE nhanvien SET 
        Luong = ?, 
        LoaiNhanVien = ?, 
        LoaiLuong = ?, 
        GhiChu = ? 
       WHERE MaNhanVien = ?`,
      [finalSalary, finalLoaiNhanVien, finalLoaiLuong, finalGhiChu, id]
    );

    return res.json({
      success: true,
      message: `Cập nhật mức lương cho ${currentEmp.HoTen} thành công! Loại lương: ${finalLoaiLuong}`,
      data: {
        maNhanVien: Number(id),
        hoTen: currentEmp.HoTen,
        luong: finalSalary,
        loaiNhanVien: finalLoaiNhanVien,
        loaiLuong: finalLoaiLuong,
        ghiChu: finalGhiChu,
        donVi: isPartTime ? "VNĐ/giờ" : "VNĐ/tháng",
      },
    });
  } catch (error) {
    console.error("Lỗi cập nhật lương:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi cập nhật lương: " + error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * [DELETE] /api/employees/:id
 * Xóa hoặc khóa tài khoản nhân viên
 */
exports.deleteEmployee = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    await connection.beginTransaction();

    const [empRows] = await connection.query(
      "SELECT MaTaiKhoan FROM nhanvien WHERE MaNhanVien = ?",
      [id]
    );

    if (empRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên!",
      });
    }

    const maTaiKhoan = empRows[0].MaTaiKhoan;

    // Xóa nhân viên
    await connection.query("DELETE FROM nhanvien WHERE MaNhanVien = ?", [id]);

    // Xóa tài khoản tương ứng nếu có
    if (maTaiKhoan) {
      await connection.query("DELETE FROM taikhoan WHERE MaTaiKhoan = ?", [
        maTaiKhoan,
      ]);
    }

    await connection.commit();
    res.json({ success: true, message: "Xóa nhân viên thành công!" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

/**
 * [GET] /api/roles
 * Lấy danh sách vai trò hệ thống
 */
exports.getRoles = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM vaitro ORDER BY MaVaiTro ASC");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.ensureEmployeeSchema = ensureEmployeeSchema;
