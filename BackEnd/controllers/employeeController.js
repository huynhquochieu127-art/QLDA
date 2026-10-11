const bcrypt = require("bcrypt");
const db = require("../config/db");

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
 * Bảo mật: Tự động tạo mật khẩu mặc định (6 số cuối CCCD hoặc Cafe@123) và mã hóa Bcrypt trước khi lưu.
 * Trả về thông tin bàn giao cho Admin.
 */
exports.createEmployee = async (req, res) => {
  const connection = await db.getConnection();
  try {
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
    } = req.body;

    // Chuẩn hóa dữ liệu đầu vào từ Form linh hoạt
    const finalHoTen = (hoTen || name || fullName || "").trim();
    const finalEmail = (email || "").trim().toLowerCase();
    const finalPhone = (soDienThoai || phone || "").trim();
    const finalCCCD = (cccd || cmnd || citizenId || "").toString().trim();
    const finalGender = gioiTinh || gender || "Nam";
    const finalAddress = (diaChi || address || "").trim();
    const finalPosition = (chucVu || position || "Nhân viên").trim();
    // Phân loại hợp đồng: Full-time (Lương cứng) hoặc Part-time (Lương theo giờ)
    const rawEmp = (loaiNhanVien || employeeType || "Full-time").toString().trim();
    const finalEmpType = rawEmp.toLowerCase().includes("part") ? "Part-time" : "Full-time";
    const finalSalary = luong !== undefined ? Number(luong) : (salary !== undefined ? Number(salary) : 0);

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
    // Ưu tiên:
    // - Nếu có nhập password riêng từ form thì dùng
    // - Nếu có CCCD (từ 6 số trở lên): lấy 6 số cuối CCCD
    // - Mặc định hệ thống: "Cafe@123"
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

    // 3. Mã hóa mật khẩu bằng BCRYPT (Bảo mật theo yêu cầu)
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

    // 4.4. Thêm vào bảng nhanvien (Employees)
    const [empResult] = await connection.query(
      `INSERT INTO nhanvien (
        MaTaiKhoan, MaNhanVienCode, HoTen, GioiTinh, SoDienThoai, CCCD,
        DiaChi, ChucVu, LoaiNhanVien, NgayVaoLam, Luong, TrangThai
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        loaiHopDong:
          finalEmpType === "Full-time"
            ? "Full-time (Toàn thời gian - Nhận lương cứng)"
            : "Part-time (Bán thời gian - Nhận lương theo giờ)",
        hinhThucLuong:
          finalEmpType === "Full-time"
            ? "Lương cứng theo tháng"
            : "Lương theo giờ",
        mucLuong: finalSalary,
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
        vaiTro: tenVaiTro,
        maVaiTro: finalRoleId,
        luong: finalSalary,
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
 * Lấy danh sách nhân viên kèm thông tin tài khoản và phân quyền
 */
exports.getAllEmployees = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const searchParam = `%${search}%`;

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total 
       FROM nhanvien nv
       LEFT JOIN taikhoan tk ON nv.MaTaiKhoan = tk.MaTaiKhoan
       WHERE nv.HoTen LIKE ? OR nv.SoDienThoai LIKE ? OR nv.MaNhanVienCode LIKE ? OR tk.Email LIKE ?`,
      [searchParam, searchParam, searchParam, searchParam]
    );

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
        DATE_FORMAT(nv.NgayVaoLam, '%Y-%m-%d') as NgayVaoLam,
        nv.Luong,
        nv.TrangThai,
        tk.MaTaiKhoan,
        tk.Email,
        tk.MaVaiTro,
        tk.TrangThaiHoatDong,
        vt.TenVaiTro
       FROM nhanvien nv
       LEFT JOIN taikhoan tk ON nv.MaTaiKhoan = tk.MaTaiKhoan
       LEFT JOIN vaitro vt ON tk.MaVaiTro = vt.MaVaiTro
       WHERE nv.HoTen LIKE ? OR nv.SoDienThoai LIKE ? OR nv.MaNhanVienCode LIKE ? OR tk.Email LIKE ?
       ORDER BY nv.MaNhanVien DESC
       LIMIT ? OFFSET ?`,
      [searchParam, searchParam, searchParam, searchParam, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      totalPages: Math.ceil(countResult[0].total / limit) || 1,
      currentPage: page,
      totalItems: countResult[0].total,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách nhân viên:", error);
    res.status(500).json({
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
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT 
        nv.*,
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
 * Cập nhật thông tin nhân viên
 */
exports.updateEmployee = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const {
      hoTen,
      soDienThoai,
      cccd,
      gioiTinh,
      diaChi,
      chucVu,
      loaiNhanVien,
      ngayVaoLam,
      luong,
      trangThai,
      maVaiTro,
      trangThaiHoatDong,
    } = req.body;

    await connection.beginTransaction();

    const [empRows] = await connection.query(
      "SELECT MaTaiKhoan FROM nhanvien WHERE MaNhanVien = ?",
      [id]
    );

    if (empRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên để cập nhật!",
      });
    }

    const maTaiKhoan = empRows[0].MaTaiKhoan;

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
        loaiNhanVien || null,
        ngayVaoLam ? new Date(ngayVaoLam) : null,
        luong !== undefined ? Number(luong) : null,
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
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
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
