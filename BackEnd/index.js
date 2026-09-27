const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// Lấy Secret Key từ .env hoặc fallback
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const jwt = require("jsonwebtoken");

// Kết nối MySQL Database
console.log("DB_PASSWORD from env is:", process.env.DB_PASSWORD);
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "12345", // Hardcode 12345 để dự phòng nếu .env lỗi
  database: process.env.DB_NAME || "dacnpm", // Hardcode dacnpm để dự phòng
  waitForConnections: true,
  connectionLimit: 10,
});

// ==========================================
// 0. API AUTH (ĐĂNG NHẬP)
// ==========================================
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // TODO: Truy vấn database thực tế ở đây (ví dụ bảng taikhoan hoặc nhanvien)
    // Tạm thời hardcode admin để bạn có thể test đăng nhập được luôn:
    if (email === "admin@gmail.com" && password === "123456") {
      const user = { id: 1, email: "admin@gmail.com", role: "admin", name: "Admin" };
      const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });

      return res.json({
        success: true,
        message: "Đăng nhập thành công!",
        user: user,
        accessToken: accessToken
      });
    }

    return res.status(401).json({ success: false, message: "Sai email hoặc mật khẩu!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server: " + error.message });
  }
});

// Hàm tính Rank tự động
const getRank = (points) => {
  if (points >= 500) return "Kim Cương";
  if (points >= 200) return "Vàng";
  if (points >= 50) return "Bạc";
  return "Đồng";
};

// ==========================================
// 1. API KHÁCH HÀNG
// ==========================================

// [GET] Tìm kiếm + Lấy danh sách Khách hàng
app.get("/api/customers", async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const searchParam = `%${search}%`;

    const [countResult] = await db.query(
      "SELECT COUNT(*) as total FROM khachhang WHERE SoDienThoai LIKE ? OR HoTen LIKE ?",
      [searchParam, searchParam],
    );

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
       ORDER BY MaKhachHang DESC LIMIT ? OFFSET ?`,
      [searchParam, searchParam, limit, offset],
    );

    const dataWithRank = rows.map((item) => ({
      ...item,
      rank: getRank(item.points || 0),
    }));

    res.json({
      data: dataWithRank,
      totalPages: Math.ceil(countResult[0].total / limit) || 1,
      currentPage: page,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// [POST] Thêm mới/Tạo nhanh khách hàng
app.post("/api/customers", async (req, res) => {
  try {
    const { name, phone, dob, email } = req.body;
    if (!name || !phone) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập Tên và Số điện thoại!" });
    }

    const [result] = await db.query(
      "INSERT INTO khachhang (HoTen, SoDienThoai, NgaySinh, Email) VALUES (?, ?, ?, ?)",
      [name, phone, dob || null, email || null],
    );

    res
      .status(201)
      .json({ message: "Tạo khách hàng thành công!", id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
      return res.status(400).json({ message: "Số điện thoại này đã tồn tại!" });
    }
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// ==========================================
// 2. API ĐƠN HÀNG (POS)
// ==========================================

// [POST] Tạo Đơn Hàng & Tích điểm tự động
app.post("/api/orders", async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { customerId, items, totalAmount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Giỏ hàng trống!" });
    }

    // 1. Tạo đơn hàng
    const [orderResult] = await connection.query(
      "INSERT INTO donhang (MaKhachHang, TongTien, ThanhTien, PhuongThucTT) VALUES (?, ?, ?, ?)",
      [
        customerId || null,
        totalAmount,
        totalAmount,
        paymentMethod || "TIEN_MAT",
      ],
    );

    const orderId = orderResult.insertId;

    // 2. Tạo chi tiết đơn hàng
    for (const item of items) {
      await connection.query(
        "INSERT INTO chitietdonhang (MaDonHang, TenMon, DonGia, SoLuong, ThanhTien) VALUES (?, ?, ?, ?, ?)",
        [
          orderId,
          item.name,
          item.price,
          item.quantity,
          item.price * item.quantity,
        ],
      );
    }

    // 3. Tích điểm tự động cho khách hàng (10.000 VNĐ = 1 điểm)
    if (customerId) {
      const pointsEarned = Math.floor(totalAmount / 10000);
      if (pointsEarned > 0) {
        await connection.query(
          "UPDATE khachhang SET DiemTichLuy = DiemTichLuy + ? WHERE MaKhachHang = ?",
          [pointsEarned, customerId],
        );
      }
    }

    await connection.commit();
    res.status(201).json({ message: "Thanh toán thành công!", orderId });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: "Lỗi thanh toán: " + err.message });
  } finally {
    connection.release();
  }
});

// ==========================================
// 3. API DANH MỤC (CATEGORIES)
// ==========================================

// [GET] Lấy danh sách Danh mục
app.get("/api/categories", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM danhmuc ORDER BY MaDanhMuc DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// [POST] Thêm mới Danh mục
app.post("/api/categories", async (req, res) => {
  try {
    const { tenDanhMuc } = req.body;
    if (!tenDanhMuc) {
      return res.status(400).json({ message: "Vui lòng nhập tên danh mục!" });
    }
    const [result] = await db.query(
      "INSERT INTO danhmuc (TenDanhMuc) VALUES (?)",
      [tenDanhMuc]
    );
    res.status(201).json({ message: "Thêm danh mục thành công!", id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// [PUT] Sửa/Cập nhật Danh mục
app.put("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { tenDanhMuc } = req.body;
    if (!tenDanhMuc) {
      return res.status(400).json({ message: "Vui lòng nhập tên danh mục!" });
    }
    const [result] = await db.query(
      "UPDATE danhmuc SET TenDanhMuc = ? WHERE MaDanhMuc = ?",
      [tenDanhMuc, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy danh mục!" });
    }
    res.json({ message: "Cập nhật danh mục thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// [DELETE] Xóa Danh mục (Cảnh báo nếu có đồ uống)
app.delete("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra xem danh mục có đang chứa đồ uống (sản phẩm) nào không
    // Giả sử bảng đồ uống là `sanpham` và có khóa ngoại `MaDanhMuc`
    const [products] = await db.query(
      "SELECT COUNT(*) as count FROM sanpham WHERE MaDanhMuc = ?",
      [id]
    );

    if (products[0].count > 0) {
      return res.status(400).json({ 
        message: "Cảnh báo: Không thể xóa! Danh mục này đang chứa đồ uống bên trong." 
      });
    }

    const [result] = await db.query("DELETE FROM danhmuc WHERE MaDanhMuc = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy danh mục để xóa!" });
    }
    
    res.json({ message: "Xóa danh mục thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server BackEnd đang chạy tại: http://localhost:${PORT}`);
});
