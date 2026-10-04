// controllers/employeeController.js
const getEmployees = async (req, res) => {
  try {
    const { keyword, role, status } = req.query;

    let sql = `
      SELECT 
        nv.MaNhanVien AS id,
        nv.MaNhanVienCode AS code,
        nv.HoTen AS name,
        nv.SoDienThoai AS phone,
        nv.TrangThai AS status,
        IFNULL(cv.TenChucVu, 'Chưa phân công') AS role
      FROM nhanvien nv
      LEFT JOIN chucvu cv ON nv.MaChucVu = cv.MaChucVu
      WHERE 1=1
    `;
    const params = [];

    // Lọc theo từ khóa (Nếu không nhập thì bỏ qua)
    if (keyword && keyword !== "undefined" && keyword.trim() !== "") {
      sql += ` AND (nv.HoTen LIKE ? OR nv.SoDienThoai LIKE ?)`;
      const searchTerm = `%${keyword.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    // Lọc theo Chức vụ (Chỉ lọc khi giá trị khác 'all')
    if (role && role !== "all" && role !== "undefined" && role.trim() !== "") {
      sql += ` AND cv.TenChucVu = ?`;
      params.push(role.trim());
    }

    // Lọc theo Trạng thái (Chỉ lọc khi giá trị khác 'all')
    if (
      status &&
      status !== "all" &&
      status !== "undefined" &&
      status.trim() !== ""
    ) {
      sql += ` AND nv.TrangThai = ?`;
      params.push(status.trim());
    }

    sql += ` ORDER BY nv.MaNhanVien DESC`;

    const [rows] = await db.execute(sql, params);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách nhân viên:", error);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};
