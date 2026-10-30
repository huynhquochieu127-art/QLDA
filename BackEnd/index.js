const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const http = require("http"); // Cần để Socket.IO gắn vào
const { Server } = require("socket.io"); // Socket.IO
const cors = require("cors");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const employeeRoutes = require("./routes/employeeRoutes");
const leaveRequestRoutes = require("./routes/leaveRequestRoutes");
const { ensurePointsLogTable, awardPointsOnPayment } = require("./services/pointsService");

const app = express();
const httpServer = http.createServer(app); // Tạo HTTP Server từ Express

// ── Cấu hình Socket.IO ────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
});

io.on("connection", (socket) => {
  console.log(`🔌 Client kết nối: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`❌ Client ngắt kết nối: ${socket.id}`);
  });
});
// ─────────────────────────────────────────────────────────────────────────────

app.set("io", io);

app.use(cors());
app.use(express.json());
app.use("/api", employeeRoutes);
app.use("/api/leave-requests", leaveRequestRoutes);
app.use("/api/don-xin-nghi", leaveRequestRoutes);

const timekeepingRoutes = require("./routes/timekeeping");
app.use("/api", timekeepingRoutes);

const timesheetRoutes = require("./routes/timesheetRoutes");
app.use("/api", timesheetRoutes);

const payrollRoutes = require("./routes/payrollRoutes");
app.use("/api", payrollRoutes);

const shiftRoutes = require("./routes/shiftRoutes");
app.use("/api", shiftRoutes);

const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api", notificationRoutes);

const orderRoutes = require("./routes/orderRoutes");
app.use("/api", orderRoutes);

const discountRoutes = require("./routes/discountRoutes");
app.use("/api", discountRoutes);

const revenueRoutes = require("./routes/revenueRoutes");
app.use("/api/reports", revenueRoutes);


// Khởi chạy tiến trình chạy ngầm tổng hợp Bảng công nháp ngày cuối tháng
const { startMonthlyTimesheetJob } = require("./jobs/monthlyTimesheetJob");
startMonthlyTimesheetJob();


// Lấy Secret Key từ .env hoặc fallback
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

// Kết nối MySQL Database (Tối ưu connection pool cho Clever Cloud max 5 connections)
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "12345",
  database: process.env.DB_NAME || "dacnpm",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  waitForConnections: true,
  connectionLimit: 2,
  maxIdle: 1,
  idleTimeout: 10000,
  queueLimit: 0,
});

const employeeController = require("./controllers/employeeController");
if (employeeController.ensureEmployeeSchema) {
  employeeController.ensureEmployeeSchema(db);
}

// Khởi tạo bảng lịch sử điểm tích lũy (sau khi db pool sẵn sàng)
ensurePointsLogTable(db);

// ==========================================
// 0. API AUTH (ĐĂNG NHẬP / ĐĂNG XUẤT)
// ==========================================

// [POST] Đăng nhập
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ email và mật khẩu!",
      });
    }

    // 1. Kiểm tra tài khoản test tĩnh (nếu có)
    if (email === "admin@gmail.com" && password === "123456") {
      const user = {
        id: 1,
        email: "admin@gmail.com",
        role: "admin",
        name: "Admin",
      };
      const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: "24h" });

      return res.json({
        success: true,
        message: "Đăng nhập thành công!",
        user: user,
        accessToken: accessToken,
      });
    }

    // 2. Tra cứu tài khoản trong cơ sở dữ liệu MySQL (bảng taikhoan + vaitro + nhanvien)
    const [users] = await db.query(
      `SELECT tk.*, vt.TenVaiTro, nv.MaNhanVien, nv.MaNhanVienCode, nv.ChucVu, nv.LoaiNhanVien
       FROM taikhoan tk
       LEFT JOIN vaitro vt ON tk.MaVaiTro = vt.MaVaiTro
       LEFT JOIN nhanvien nv ON tk.MaTaiKhoan = nv.MaTaiKhoan
       WHERE tk.Email = ?`,
      [email.trim()]
    );

    if (users.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Sai email hoặc mật khẩu!" });
    }

    const userRecord = users[0];

    // Kiểm tra trạng thái hoạt động của tài khoản
    if (userRecord.TrangThaiHoatDong === 0) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản này đã bị khóa hoặc ngừng hoạt động!",
      });
    }

    // So khớp mật khẩu: hỗ trợ Bcrypt hash ($2b$, $2a$) hoặc plaintext cũ
    let isMatch = false;
    if (userRecord.MatKhau && userRecord.MatKhau.startsWith("$2")) {
      isMatch = await bcrypt.compare(password, userRecord.MatKhau);
    } else {
      isMatch = password === userRecord.MatKhau;
    }

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Sai email hoặc mật khẩu!" });
    }

    // Tạo JWT token
    const userPayload = {
      id: userRecord.MaTaiKhoan,
      maNhanVien: userRecord.MaNhanVien,
      maNhanVienCode: userRecord.MaNhanVienCode,
      email: userRecord.Email,
      name: userRecord.HoTen,
      role: userRecord.TenVaiTro || "Nhân viên",
      maVaiTro: userRecord.MaVaiTro,
      chucVu: userRecord.ChucVu,
      loaiNhanVien: userRecord.LoaiNhanVien || "Part-time",
    };

    const accessToken = jwt.sign(userPayload, JWT_SECRET, {
      expiresIn: "24h",
    });

    return res.json({
      success: true,
      message: "Đăng nhập thành công!",
      user: userPayload,
      accessToken: accessToken,
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
});

// [POST] Đăng xuất
app.post("/api/logout", (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Đăng xuất thành công!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi đăng xuất: " + error.message,
    });
  }
});

// Hàm tính Rank tự động dựa vào điểm tích lũy
const getRank = (points) => {
  if (points >= 500) return "Kim Cương";
  if (points >= 200) return "Vàng";
  if (points >= 50) return "Bạc";
  return "Đồng";
};

// ==========================================
// 1. API KHÁCH HÀNG (CUSTOMERS)
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

// [POST] Thêm mới khách hàng
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

// [PUT] Cập nhật thông tin khách hàng
app.put("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, dob, email } = req.body;

    if (!name || !phone) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập Tên và Số điện thoại!" });
    }

    const [result] = await db.query(
      "UPDATE khachhang SET HoTen = ?, SoDienThoai = ?, NgaySinh = ?, Email = ? WHERE MaKhachHang = ?",
      [name, phone, dob || null, email || null, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng!" });
    }

    res.json({ message: "Cập nhật khách hàng thành công!" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
      return res.status(400).json({ message: "Số điện thoại đã tồn tại!" });
    }
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// [DELETE] Xóa khách hàng
app.delete("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      "DELETE FROM khachhang WHERE MaKhachHang = ?",
      [id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy khách hàng để xóa!" });
    }

    res.json({ message: "Xóa khách hàng thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// [PATCH] Cộng / Trừ điểm tích lũy khách hàng
app.patch("/api/customers/:id/points", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, points } = req.body;

    const amount = parseInt(points, 10);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Số điểm phải lớn hơn 0!" });
    }

    const operator = action === "add" ? "+" : "-";
    const [result] = await db.query(
      `UPDATE khachhang SET DiemTichLuy = GREATEST(0, DiemTichLuy ${operator} ?) WHERE MaKhachHang = ?`,
      [amount, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng!" });
    }

    res.json({ message: "Cập nhật điểm thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// [GET] Lịch sử tích điểm của 1 khách hàng
// GET /api/customers/:id/points-history
app.get("/api/customers/:id/points-history", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const [rows] = await db.query(
      `SELECT 
         ld.MaLichSu,
         ld.MaDonHang,
         ld.SoDiemCong,
         ld.SoTienQuyDoi,
         ld.DiemTruocKhi,
         ld.DiemSauKhi,
         ld.GhiChu,
         DATE_FORMAT(ld.NgayTao, '%d/%m/%Y %H:%i:%s') AS ThoiGian
       FROM lichsu_diem ld
       WHERE ld.MaKhachHang = ?
       ORDER BY ld.NgayTao DESC
       LIMIT ?`,
      [id, limit]
    );

    const [khach] = await db.query(
      "SELECT HoTen, DiemTichLuy FROM khachhang WHERE MaKhachHang = ?",
      [id]
    );

    if (khach.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng!" });
    }

    res.json({
      khachHang: khach[0],
      tongLuotTich: rows.length,
      lichSu: rows,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// ==========================================
// 2. API ĐƠN HÀNG (POS & PHA CHẾ)
// ==========================================

// [GET] Lấy danh sách tất cả đơn hàng
app.get("/api/orders", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM donhang ORDER BY MaDonHang DESC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// [POST] Tạo Đơn Hàng mới (Mặc định TrangThai: 'Mới tạo') & Tích điểm
app.post("/api/orders", async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { customerId, items, totalAmount, paymentMethod, tableId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Giỏ hàng trống!" });
    }

    // 1. Tạo đơn hàng với TrangThai mặc định là 'Mới tạo'
    const [orderResult] = await connection.query(
      "INSERT INTO donhang (MaBan, MaKhachHang, TongTien, ThanhTien, PhuongThucThanhToan, TrangThai) VALUES (?, ?, ?, ?, ?, ?)",
      [
        tableId || null,
        customerId || null,
        totalAmount,
        totalAmount,
        paymentMethod || "cash",
        "Mới tạo",
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

    // 3. Không tích điểm tại đây — điểm sẽ được cộng TỰ ĐỘNG
    //    khi đơn hàng chuyển sang trạng thái "Đã thanh toán"
    //    (xem hook tại PATCH /api/orders/:id/status bên dưới)

    await connection.commit();
    res.status(201).json({ message: "Tạo đơn hàng thành công!", orderId });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: "Lỗi tạo đơn hàng: " + err.message });
  } finally {
    connection.release();
  }
});

// [PATCH] Cập nhật trạng thái Vòng đời Đơn hàng (Pha chế / Thu ngân)
// ⚡ HOOK: Khi status = "Đã thanh toán" → tự động cộng điểm tích lũy cho khách
app.patch("/api/orders/:id/status", async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "Mới tạo",
      "Đang pha chế",
      "Hoàn thành",
      "Đã thanh toán",
      "Đã hủy",
    ];

    if (!validStatuses.includes(status)) {
      await connection.rollback();
      return res.status(400).json({ message: "Trạng thái không hợp lệ!" });
    }

    // 1. Lấy trạng thái hiện tại để kiểm tra trước khi đổi
    const [current] = await connection.query(
      "SELECT TrangThai FROM donhang WHERE MaDonHang = ? FOR UPDATE",
      [id]
    );

    if (current.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
    }

    const trangThaiCu = current[0].TrangThai;

    // 2. Cập nhật trạng thái đơn hàng
    await connection.query(
      "UPDATE donhang SET TrangThai = ? WHERE MaDonHang = ?",
      [status, id]
    );

    // 3. ⚡ HOOK TÍCH ĐIỂM — chạy ngầm khi đơn chuyển sang "Đã thanh toán"
    //    Điều kiện: trạng thái MỚI là "Đã thanh toán" VÀ trạng thái CŨ chưa phải vậy
    //    (tránh cộng điểm 2 lần nếu re-patch cùng trạng thái)
    let pointsResult = null;
    const PAID_STATUSES = ["Đã thanh toán", "DA_THANH_TOAN", "paid", "completed"];
    const isNewlyPaid = PAID_STATUSES.includes(status) && !PAID_STATUSES.includes(trangThaiCu);

    if (isNewlyPaid) {
      // awardPointsOnPayment tự bảo vệ idempotency qua bảng lichsu_diem
      pointsResult = await awardPointsOnPayment(connection, parseInt(id, 10));
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công!",
      orderId: id,
      status: status,
      // Trả về kết quả tích điểm để FE hiển thị thông báo (nếu muốn)
      pointsAwarded: pointsResult
        ? {
            diem: pointsResult.pointsEarned,
            tongDiem: pointsResult.diemSauKhi,
            thongBao: `Khách hàng được cộng +${pointsResult.pointsEarned} điểm tích lũy!`,
          }
        : null,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Lỗi cập nhật trạng thái đơn hàng:", err.message);
    res.status(500).json({ message: "Lỗi máy chủ: " + err.message });
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
    const [rows] = await db.query(
      "SELECT * FROM danhmuc ORDER BY MaDanhMuc DESC",
    );
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
      [tenDanhMuc],
    );
    res
      .status(201)
      .json({ message: "Thêm danh mục thành công!", id: result.insertId });
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
      [tenDanhMuc, id],
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

    const [products] = await db.query(
      "SELECT COUNT(*) as count FROM sanpham WHERE MaDanhMuc = ?",
      [id],
    );

    if (products[0].count > 0) {
      return res.status(400).json({
        message:
          "Cảnh báo: Không thể xóa! Danh mục này đang chứa đồ uống bên trong.",
      });
    }

    const [result] = await db.query("DELETE FROM danhmuc WHERE MaDanhMuc = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy danh mục để xóa!" });
    }

    res.json({ message: "Xóa danh mục thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// ==========================================
// 4. API SẢN PHẨM / ĐỒ UỐNG (PRODUCTS)
// ==========================================

// [GET] Lấy danh sách đồ uống
app.get("/api/products", async (req, res) => {
  try {
    const { maDanhMuc } = req.query;
    let sql = `
      SELECT 
        sp.MaSanPham, sp.TenSanPham, sp.Gia, sp.MoTa, sp.CoBan,
        sp.MaDanhMuc, dm.TenDanhMuc
      FROM sanpham sp
      LEFT JOIN danhmuc dm ON sp.MaDanhMuc = dm.MaDanhMuc
    `;
    const params = [];
    if (maDanhMuc) {
      sql += " WHERE sp.MaDanhMuc = ?";
      params.push(maDanhMuc);
    }
    sql += " ORDER BY sp.MaSanPham DESC";
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// [GET] Lấy chi tiết 1 sản phẩm
app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT sp.*, dm.TenDanhMuc 
       FROM sanpham sp 
       LEFT JOIN danhmuc dm ON sp.MaDanhMuc = dm.MaDanhMuc
       WHERE sp.MaSanPham = ?`,
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// [POST] Thêm mới sản phẩm/đồ uống
app.post("/api/products", async (req, res) => {
  try {
    const { tenSanPham, gia, moTa, coBan, maDanhMuc } = req.body;
    if (!tenSanPham || gia === undefined) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập Tên và Giá sản phẩm!" });
    }
    const [result] = await db.query(
      "INSERT INTO sanpham (TenSanPham, Gia, MoTa, CoBan, MaDanhMuc) VALUES (?, ?, ?, ?, ?)",
      [tenSanPham, gia, moTa || null, coBan ? 1 : 0, maDanhMuc || null],
    );
    res
      .status(201)
      .json({ message: "Thêm sản phẩm thành công!", id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// [PUT] Cập nhật sản phẩm
app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { tenSanPham, gia, moTa, coBan, maDanhMuc } = req.body;
    if (!tenSanPham || gia === undefined) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập Tên và Giá sản phẩm!" });
    }
    const [result] = await db.query(
      "UPDATE sanpham SET TenSanPham = ?, Gia = ?, MoTa = ?, CoBan = ?, MaDanhMuc = ? WHERE MaSanPham = ?",
      [tenSanPham, gia, moTa || null, coBan ? 1 : 0, maDanhMuc || null, id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
    }
    res.json({ message: "Cập nhật sản phẩm thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// [DELETE] Xóa sản phẩm
app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("DELETE FROM sanpham WHERE MaSanPham = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy sản phẩm để xóa!" });
    }
    res.json({ message: "Xóa sản phẩm thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi MySQL: " + err.message });
  }
});

// ==========================================
// 6. API QUẢN LÝ NHÂN SỰ (EMPLOYEES - QH-17, QH-19)
// ==========================================

// Tự động kiểm tra/tạo bảng nhanvien nếu chưa có trong MySQL
const initEmployeeTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS nhanvien (
        MaNhanVien INT AUTO_INCREMENT PRIMARY KEY,
        HoTen VARCHAR(100) NOT NULL,
        SoDienThoai VARCHAR(20) NOT NULL UNIQUE,
        CCCD VARCHAR(20) NOT NULL,
        Email VARCHAR(100),
        VaiTro VARCHAR(50) DEFAULT 'cashier',
        TrangThai VARCHAR(20) DEFAULT 'active',
        MatKhau VARCHAR(255) DEFAULT '123456',
        GhiChu TEXT,
        NgayTao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.warn(
      "Chưa thể khởi tạo bảng nhanvien (MySQL có thể chưa kết nối):",
      err.message,
    );
  }
};
initEmployeeTable();
// ==========================================
// 6. API QUẢN LÝ NHÂN SỰ (Dùng chính xác Database dacnpm)
// ==========================================

// [GET] Lấy danh sách nhân sự (Truy vấn chuẩn LEFT JOIN chucvu)
app.get("/api/employees", async (req, res) => {
  try {
    const search = req.query.search || req.query.keyword || "";
    const role = req.query.role || "all";
    const status = req.query.status || "all";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let whereClauses = ["1=1"];
    let params = [];

    // Tìm kiếm theo Họ tên hoặc Số điện thoại
    if (search && search.trim() !== "" && search !== "undefined") {
      whereClauses.push(
        "(nv.HoTen LIKE ? OR nv.SoDienThoai LIKE ? OR nv.MaNhanVienCode LIKE ?)",
      );
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    // Lọc theo Chức vụ
    if (role !== "all" && role !== "undefined" && role !== "Tất cả chức vụ") {
      whereClauses.push("cv.TenChucVu = ?");
      params.push(role);
    }

    // Lọc theo Trạng thái
    if (
      status !== "all" &&
      status !== "undefined" &&
      status !== "Tất cả trạng thái"
    ) {
      whereClauses.push("nv.TrangThai = ?");
      params.push(status);
    }

    const whereSQL = whereClauses.join(" AND ");

    // Lấy tổng số dòng để phân trang
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total 
       FROM nhanvien nv 
       LEFT JOIN chucvu cv ON nv.MaChucVu = cv.MaChucVu 
       WHERE ${whereSQL}`,
      params,
    );

    // Truy vấn chính xác cấu trúc DB dacnpm
    const [rows] = await db.query(
      `SELECT 
        nv.MaNhanVien AS rawId,
        nv.MaNhanVienCode AS code,
        nv.HoTen AS name,
        nv.HoTen AS fullName,
        nv.SoDienThoai AS phone,
        nv.TrangThai AS status,
        IFNULL(cv.TenChucVu, 'Chưa phân công') AS role,
        IFNULL(cv.TenChucVu, 'Chưa phân công') AS roleName,
        tk.Email AS email
       FROM nhanvien nv
       LEFT JOIN chucvu cv ON nv.MaChucVu = cv.MaChucVu
       LEFT JOIN taikhoan tk ON nv.MaTaiKhoan = tk.MaTaiKhoan
       WHERE ${whereSQL}
       ORDER BY nv.MaNhanVien ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    // Format dữ liệu khớp với cả React Tailwind cũ lẫn mới
    const formattedData = rows.map((emp) => ({
      ...emp,
      id: emp.code || `NV${String(emp.rawId).padStart(3, "0")}`,
      statusName: emp.status || "Đang làm việc",
    }));

    res.json({
      success: true,
      data: formattedData,
      total: countResult[0]?.total || 0,
      totalPages: Math.ceil((countResult[0]?.total || 0) / limit) || 1,
      currentPage: page,
    });
  } catch (err) {
    console.error("Lỗi MySQL Employee:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi truy vấn MySQL: " + err.message });
  }
});

// [GET] Chi tiết nhân viên
app.get("/api/employees/:id", async (req, res) => {
  try {
    const rawId = req.params.id.replace("NV", "");
    const [rows] = await db.query(
      "SELECT MaNhanVien as id, HoTen as fullName, SoDienThoai as phone, CCCD as cccd, Email as email, VaiTro as role, TrangThai as status, GhiChu as note, DATE_FORMAT(NgayTao, '%d/%m/%Y') as createdAt FROM nhanvien WHERE MaNhanVien = ?",
      [rawId],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên!" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi MySQL: " + err.message });
  }
});

// [POST] Thêm mới nhân viên vào MySQL
app.post("/api/employees", async (req, res) => {
  try {
    const { fullName, phone, cccd, email, role, status, note, password } =
      req.body;

    if (!fullName || !phone || !cccd) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Vui lòng nhập đủ Họ tên, SĐT và CCCD!",
        });
    }

    const [result] = await db.query(
      `INSERT INTO nhanvien (HoTen, SoDienThoai, CCCD, Email, VaiTro, TrangThai, MatKhau, GhiChu) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName.trim(),
        phone.trim(),
        cccd.trim(),
        email ? email.trim() : null,
        role || "cashier",
        status || "active",
        password || "123456",
        note ? note.trim() : null,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Thêm nhân viên thành công!",
      id: `NV${String(result.insertId).padStart(3, "0")}`,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Số điện thoại này đã được đăng ký!",
        });
    }
    res
      .status(500)
      .json({ success: false, message: "Lỗi MySQL: " + err.message });
  }
});

// [PATCH] Cập nhật trạng thái nhân viên (Khóa / Mở khóa)
app.patch("/api/employees/:id/status", async (req, res) => {
  try {
    const rawId = req.params.id.replace("NV", "");
    const { status } = req.body;

    const [result] = await db.query(
      "UPDATE nhanvien SET TrangThai = ? WHERE MaNhanVien = ?",
      [status, rawId],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên!" });
    }

    res.json({ success: true, message: "Cập nhật trạng thái thành công!" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi MySQL: " + err.message });
  }
});

// [DELETE] Xóa nhân viên khỏi MySQL
app.delete("/api/employees/:id", async (req, res) => {
  try {
    const rawId = req.params.id.replace("NV", "");
    const [result] = await db.query(
      "DELETE FROM nhanvien WHERE MaNhanVien = ?",
      [rawId],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên!" });
    }

    res.json({ success: true, message: "Xóa nhân viên thành công!" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi MySQL: " + err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server BackEnd đang chạy tại: http://localhost:${PORT}`);
});
