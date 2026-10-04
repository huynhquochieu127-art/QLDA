// controllers/employeeController.js hoặc route tương ứng
const getEmployees = async (req, res) => {
  try {
    const { keyword, role, status } = req.query;

    let sql = `SELECT id, name, phone, email, role, status, created_at FROM employees WHERE 1=1`;
    const params = [];

    // 1. Lọc theo từ khóa (Tên hoặc Số điện thoại)
    if (keyword && keyword.trim() !== "") {
      sql += ` AND (name LIKE ? OR phone LIKE ?)`;
      const searchTerm = `%${keyword.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    // 2. Lọc theo Chức vụ
    if (role && role !== "all") {
      sql += ` AND role = ?`;
      params.push(role);
    }

    // 3. Lọc theo Trạng thái làm việc
    if (status && status !== "all") {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY id DESC`;

    const [rows] = await db.execute(sql, params); // Hoặc db.query tùy theo thư viện mysql2 bạn dùng

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách nhân viên:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ" });
  }
};
