const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Cấu hình kết nối MySQL (Thay đổi thông tin cho đúng với máy bạn)
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // Mật khẩu MySQL của bạn
  database: "quanlycf", // Tên CSDL của bạn
});

db.connect((err) => {
  if (err) {
    console.error("Lỗi kết nối MySQL:", err);
  } else {
    console.log("Đã kết nối MySQL thành công!");
  }
});

// API xử lý đăng nhập
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
  db.query(sql, [username, password], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Lỗi server!" });
    }

    if (results.length > 0) {
      // Đăng nhập thành công
      res.json({
        success: true,
        message: "Đăng nhập thành công!",
        user: results[0],
      });
    } else {
      // Sai tài khoản hoặc mật khẩu
      res.json({
        success: false,
        message: "Tên đăng nhập hoặc mật khẩu không đúng!",
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server BackEnd đang chạy tại: http://localhost:${PORT}`);
});
