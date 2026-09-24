require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt"); // 1. Import bcrypt

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Cấu hình kết nối MySQL Pool
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "dacnpm",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Lỗi kết nối MySQL:", err.message);
  } else {
    console.log("✅ Đã kết nối MySQL thành công!");
    connection.release();
  }
});

// API xử lý đăng nhập
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ Email và Mật khẩu!",
    });
  }

  // 2. Chỉ truy vấn theo Email
  const sql = "SELECT * FROM taikhoan WHERE Email = ?";

  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Lỗi truy vấn MySQL:", err.message);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ!",
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng!",
      });
    }

    const user = results[0];

    try {
      // 3. Kiểm tra xem mật khẩu trong DB có dạng hash bcrypt ($2b$) hay chuỗi thường
      let isMatch = false;
      
      if (user.MatKhau && user.MatKhau.startsWith("$2b$")) {
        // So sánh bằng bcrypt nếu mật khẩu đã mã hóa
        isMatch = await bcrypt.compare(password, user.MatKhau);
      } else {
        // So sánh trực tiếp nếu mật khẩu trong DB là chuỗi thường (ví dụ: '123456')
        isMatch = (password === user.MatKhau);
      }

      if (isMatch) {
        delete user.MatKhau; // Ẩn mật khẩu trước khi gửi về client

        return res.json({
          success: true,
          message: "Đăng nhập thành công!",
          user: user,
        });
      } else {
        return res.status(401).json({
          success: false,
          message: "Email hoặc mật khẩu không đúng!",
        });
      }
    } catch (error) {
      console.error("Lỗi xác thực mật khẩu:", error);
      return res.status(500).json({ success: false, message: "Lỗi xử lý mật khẩu!" });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server BackEnd đang chạy tại: http://localhost:${PORT}`);
});