const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// Kết nối MySQL Database
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "", // Điền mật khẩu MySQL của bạn nếu có
  database: "quanlycf", // Tên database của bạn
  waitForConnections: true,
  connectionLimit: 10,
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

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server BackEnd đang chạy tại: http://localhost:${PORT}`);
});
