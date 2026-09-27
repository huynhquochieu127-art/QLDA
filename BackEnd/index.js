const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

// 1. Cấu hình Middleware
app.use(cors()); // Cho phép React truy cập
app.use(express.json()); // Đọc dữ liệu JSON từ request body

// 2. Kết nối Database MySQL của bạn
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "12345", // Nhập mật khẩu MySQL của bạn nếu có
  database: "dacnpm", // Thay bằng tên Database thực tế của bạn
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Hàm hỗ trợ tự động tính Hạng thẻ dựa theo DiemTichLuy
const getRank = (points) => {
  if (points >= 500) return "Kim Cương";
  if (points >= 200) return "Vàng";
  if (points >= 50) return "Bạc";
  return "Đồng";
};

// -------------------------------------------------------------
// CÁC API KHÁCH HÀNG (DÙNG BẢNG `khachhang`)
// -------------------------------------------------------------

// [GET] Lấy danh sách khách hàng + Tìm kiếm SĐT / Tên + Phân trang
app.get("/api/customers", async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const searchParam = `%${search}%`;

    // 1. Đếm tổng số bản ghi
    const [countResult] = await db.query(
      "SELECT COUNT(*) as total FROM khachhang WHERE SoDienThoai LIKE ? OR HoTen LIKE ?",
      [searchParam, searchParam],
    );
    const totalItems = countResult[0].total;

    // 2. Lấy dữ liệu và map về các tên thuộc tính tiếng Anh cho React dễ dùng
    const [rows] = await db.query(
      `SELECT 
        MaKhachHang AS id, 
        HoTen AS name, 
        SoDienThoai AS phone, 
        DATE_FORMAT(NgaySinh, '%Y-%m-%d') AS dob, 
        Email AS email, 
        DiemTichLuy AS points 
       FROM khachhang 
       WHERE SoDienThoai LIKE ? OR HoTen LIKE ? 
       ORDER BY MaKhachHang DESC 
       LIMIT ? OFFSET ?`,
      [searchParam, searchParam, limit, offset],
    );

    // Tính toán hạng thẻ tự động cho từng khách hàng
    const formattedData = rows.map((item) => ({
      ...item,
      rank: getRank(item.points || 0),
    }));

    res.json({
      data: formattedData,
      totalPages: Math.ceil(totalItems / limit) || 1,
      currentPage: page,
    });
  } catch (err) {
    console.error("Lỗi MySQL GET:", err);
    res
      .status(500)
      .json({ message: "Lỗi truy vấn Database MySQL: " + err.message });
  }
});

// [POST] Thêm mới khách hàng
app.post("/api/customers", async (req, res) => {
  try {
    const { name, phone, dob, email } = req.body;

    if (!name || !phone) {
      return res
        .status(400)
        .json({ message: "Tên và Số điện thoại là bắt buộc!" });
    }

    const [result] = await db.query(
      "INSERT INTO khachhang (HoTen, SoDienThoai, NgaySinh, Email) VALUES (?, ?, ?, ?)",
      [name, phone, dob || null, email || null],
    );

    res.status(201).json({
      message: "Thêm khách hàng thành công!",
      id: result.insertId,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
      return res
        .status(400)
        .json({ message: "Số điện thoại này đã tồn tại trong hệ thống!" });
    }
    console.error("Lỗi MySQL POST:", err);
    res
      .status(500)
      .json({ message: "Không thể thêm khách hàng: " + err.message });
  }
});

// [PUT] Cập nhật thông tin khách hàng
app.put("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, dob, email } = req.body;

    await db.query(
      "UPDATE khachhang SET HoTen = ?, SoDienThoai = ?, NgaySinh = ?, Email = ? WHERE MaKhachHang = ?",
      [name, phone, dob || null, email || null, id],
    );

    res.json({ message: "Cập nhật khách hàng thành công!" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
      return res
        .status(400)
        .json({ message: "Số điện thoại này đã bị trùng!" });
    }
    res.status(500).json({ message: "Lỗi cập nhật: " + err.message });
  }
});

// [PATCH] Cộng / Trừ điểm tích lũy
app.patch("/api/customers/:id/points", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, points } = req.body;

    // Lấy điểm hiện tại
    const [rows] = await db.query(
      "SELECT DiemTichLuy FROM khachhang WHERE MaKhachHang = ?",
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng!" });
    }

    let currentPoints = rows[0].DiemTichLuy || 0;
    let newPoints =
      action === "add" ? currentPoints + points : currentPoints - points;
    if (newPoints < 0) newPoints = 0;

    await db.query(
      "UPDATE khachhang SET DiemTichLuy = ? WHERE MaKhachHang = ?",
      [newPoints, id],
    );

    res.json({ message: "Cập nhật điểm thành công!", newPoints });
  } catch (err) {
    res.status(500).json({ message: "Lỗi điểm tích lũy: " + err.message });
  }
});

// [DELETE] Xóa khách hàng
app.delete("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM khachhang WHERE MaKhachHang = ?", [id]);
    res.json({ message: "Xóa thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi xóa: " + err.message });
  }
});

// Chạy Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server BackEnd đang chạy tại: http://localhost:${PORT}`);
});
