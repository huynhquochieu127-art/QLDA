const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Route kiểm tra kết nối API
app.get("/api/test", (req, res) => {
  res.json({ message: "Kết nối BackEnd Node.js thành công!" });
});

app.listen(PORT, () => {
  console.log(`🚀 BackEnd đang chạy tại: http://localhost:${PORT}`);
});
