const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// 1. KẾT NỐI DATABASE MYSQL
const db = mysql.createPool({
  host: "localhost",
  user: "root", // Thay bằng user MySQL của bạn
  password: "", // Thay bằng mật khẩu MySQL của bạn
  database: "quanlycf", // Thay bằng tên database của bạn
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Hàm hỗ trợ tự động tính hạng thẻ dựa trên điểm
const calculateRank = (points) => {
  if (points >= 500) return "Kim Cương";
  if (points >= 200) return "Vàng";
  if (points >= 50) return "Bạc";
  return "Đồng";
};

// -------------------------------------------------------------
// 2. CÁC API CRUD KHÁCH HÀNG DÙNG MYSQL
// -------------------------------------------------------------

// [GET] Lấy danh sách + Tìm kiếm SĐT / Tên + Phân trang
app.get("/api/customers", async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const searchParam = `%${search}%`;

    // Lấy tổng số bản ghi phù hợp
    const [countResult] = await db.query(
      "SELECT COUNT(*) as total FROM customers WHERE phone LIKE ? OR name LIKE ?",
      [searchParam, searchParam],
    );
    const totalItems = countResult[0].total;

    // Lấy dữ liệu phân trang
    const [rows] = await db.query(
      `SELECT id, name, phone, DATE_FORMAT(dob, '%Y-%m-%d') as dob, email, points, rank_level as rank 
       FROM customers 
       WHERE phone LIKE ? OR name LIKE ? 
       ORDER BY id DESC 
       LIMIT ? OFFSET ?`,
      [searchParam, searchParam, limit, offset],
    );

    res.json({
      data: rows,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
      totalItems,
    });
  } catch (err) {
    console.error("Lỗi MySQL GET:", err);
    res.status(500).json({ message: "Lỗi truy vấn cơ sở dữ liệu MySQL!" });
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
      "INSERT INTO customers (name, phone, dob, email) VALUES (?, ?, ?, ?)",
      [name, phone, dob || null, email || null],
    );

    res.status(201).json({
      id: result.insertId,
      name,
      phone,
      dob,
      email,
      points: 0,
      rank: "Đồng",
    });
  } catch (err) {
    // Mã lỗi MySQL ER_DUP_ENTRY (mã 1062) khi trùng Số điện thoại UNIQUE
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
      return res
        .status(400)
        .json({ message: "Số điện thoại này đã tồn tại trong cơ sở dữ liệu!" });
    }
    console.error("Lỗi MySQL POST:", err);
    res.status(500).json({ message: "Không thể thêm khách hàng!" });
  }
});

// [PUT] Cập nhật thông tin khách hàng
app.put("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, dob, email } = req.body;

    await db.query(
      "UPDATE customers SET name = ?, phone = ?, dob = ?, email = ? WHERE id = ?",
      [name, phone, dob || null, email || null, id],
    );

    res.json({ message: "Cập nhật thông tin khách hàng thành công!" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
      return res
        .status(400)
        .json({ message: "Số điện thoại đã thuộc về khách hàng khác!" });
    }
    res.status(500).json({ message: "Lỗi khi cập nhật dữ liệu!" });
  }
});

// [PATCH] Tích điểm / Trừ điểm & Tự động nâng hạng
app.patch("/api/customers/:id/points", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, points } = req.body; // action: 'add' hoặc 'subtract'

    // Lấy điểm hiện tại
    const [rows] = await db.query("SELECT points FROM customers WHERE id = ?", [
      id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Khách hàng không tồn tại!" });
    }

    let currentPoints = rows[0].points || 0;
    let newPoints =
      action === "add" ? currentPoints + points : currentPoints - points;
    if (newPoints < 0) newPoints = 0;

    const newRank = calculateRank(newPoints);

    // Cập nhật điểm và hạng vào MySQL
    await db.query(
      "UPDATE customers SET points = ?, rank_level = ? WHERE id = ?",
      [newPoints, newRank, id],
    );

    res.json({ message: "Cập nhật điểm thành công!", newPoints, newRank });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi cập nhật điểm!" });
  }
});

// [DELETE] Xóa khách hàng
app.delete("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM customers WHERE id = ?", [id]);
    res.json({ message: "Xóa khách hàng khỏi MySQL thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Không thể xóa khách hàng!" });
  }
});

// Khởi chạy Server Backend
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server MySQL Backend đang chạy tại http://localhost:${PORT}`);
});
