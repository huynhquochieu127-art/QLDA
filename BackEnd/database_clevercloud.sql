-- ============================================================
-- HỆ THỐNG QUẢN LÝ QUÁN CAFE (DACNPM) - SCHEMA OPTIMIZED 2026
-- Thiết kế tối ưu: Chuẩn hóa quan hệ, Auto-Increment, Index tốc độ cao,
-- Đồng bộ 100% với BackEnd Controllers & FrontEnd React UI.
-- ============================================================


SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET NAMES utf8mb4;

-- ============================================================
-- 1. BẢNG VAI TRÒ (vaitro)
-- ============================================================
DROP TABLE IF EXISTS `vaitro`;
CREATE TABLE `vaitro` (
  `MaVaiTro` int NOT NULL,
  `TenVaiTro` varchar(30) NOT NULL,
  PRIMARY KEY (`MaVaiTro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `vaitro` (`MaVaiTro`, `TenVaiTro`) VALUES 
(1, 'Admin'),
(2, 'Quản lý'),
(3, 'Nhân viên');

-- ============================================================
-- 2. BẢNG TÀI KHOẢN (taikhoan)
-- Tối ưu: Thêm AUTO_INCREMENT, UNIQUE(Email), Default NgayTao & TrangThai
-- ============================================================
DROP TABLE IF EXISTS `taikhoan`;
CREATE TABLE `taikhoan` (
  `MaTaiKhoan` int NOT NULL AUTO_INCREMENT,
  `HoTen` varchar(100) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `MatKhau` varchar(255) NOT NULL,
  `SoDienThoai` varchar(20) DEFAULT NULL,
  `MaVaiTro` int DEFAULT 3,
  `TrangThaiHoatDong` tinyint DEFAULT 1,
  `NgayTao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaTaiKhoan`),
  UNIQUE KEY `idx_taikhoan_email` (`Email`),
  KEY `idx_taikhoan_vaitro` (`MaVaiTro`),
  CONSTRAINT `taikhoan_ibfk_1` FOREIGN KEY (`MaVaiTro`) REFERENCES `vaitro` (`MaVaiTro`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `taikhoan` (`MaTaiKhoan`, `HoTen`, `Email`, `MatKhau`, `SoDienThoai`, `MaVaiTro`, `TrangThaiHoatDong`, `NgayTao`) VALUES
(1, 'Đoàn Admin', 'admin@gmail.com', '123456', '0123456789', 1, 1, '2026-06-20 13:35:19'),
(2, 'Đỗ Văn Đoàn (Cựu NV)', 'doandoit0801@gmail.com', '$2b$10$ny3TRqmMv7sQIXhF/u.M0eXTQHz1m4zqV/g/Q0a1zi35tc.FJwfKS', '0813108114', 3, 0, '2026-06-21 08:00:00'),
(3, 'Đỗ Văn Đoàn', 'doan@gmail.com', '$2b$10$jrWmf1IiRNVCnbQbM5JQ1ObEf1ltqRJp.lECxwvK/hkR5KYa0qraq', '0813108114', 2, 1, '2026-06-22 09:00:00'),
(4, 'Đỗ Văn Đoàn', 'nv1@gmail.com', '$2b$10$.8hlNwpCW97ZYhLu8RrK8uOB4XuzNoQoEtSXGRSa2BB1JCd/W8lQa', '0813108114', 3, 1, '2026-06-23 10:00:00'),
(5, 'Vũ Hoàng Yến', 'nv2@gmail.com', '$2b$10$vPYxN5FWfjc16SFY5KZqZuz4KQEugZ8xQ8W45rbH8ANJtA9UNEPNa', '0987654321', 3, 1, '2026-06-24 11:00:00');

-- ============================================================
-- 3. BẢNG CHỨC VỤ (chucvu)
-- ============================================================
DROP TABLE IF EXISTS `chucvu`;
CREATE TABLE `chucvu` (
  `MaChucVu` int NOT NULL AUTO_INCREMENT,
  `TenChucVu` varchar(255) NOT NULL,
  `MoTa` text,
  PRIMARY KEY (`MaChucVu`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `chucvu` (`MaChucVu`, `TenChucVu`, `MoTa`) VALUES
(1, 'Thu ngân', 'Thu tiền tại quầy POS và in hóa đơn'),
(2, 'Phục vụ', 'Order món tại bàn và dọn dẹp bàn'),
(3, 'Pha chế', 'Pha chế đồ uống theo đơn hàng'),
(4, 'Quản lý', 'Quản lý lịch ca, duyệt chấm công, phiếu lương');

-- ============================================================
-- 4. BẢNG NHÂN VIÊN (nhanvien)
-- Tối ưu: AUTO_INCREMENT, UNIQUE(MaNhanVienCode), Thêm MaChucVu, CCCD, LoaiLuong, base_salary, GhiChu
-- ============================================================
DROP TABLE IF EXISTS `nhanvien`;
CREATE TABLE `nhanvien` (
  `MaNhanVien` int NOT NULL AUTO_INCREMENT,
  `MaTaiKhoan` int DEFAULT NULL,
  `MaNhanVienCode` varchar(20) DEFAULT NULL,
  `HoTen` varchar(100) NOT NULL,
  `GioiTinh` varchar(10) DEFAULT 'Nam',
  `SoDienThoai` varchar(20) DEFAULT NULL,
  `DiaChi` varchar(255) DEFAULT NULL,
  `MaChucVu` int DEFAULT NULL,
  `ChucVu` varchar(50) DEFAULT NULL,
  `LoaiNhanVien` varchar(50) DEFAULT 'Full-time',
  `LoaiLuong` varchar(20) DEFAULT 'MONTHLY',
  `Luong` decimal(18,2) DEFAULT '0.00',
  `base_salary` decimal(18,2) DEFAULT '0.00',
  `CCCD` varchar(20) DEFAULT NULL,
  `NgayVaoLam` date DEFAULT NULL,
  `TrangThai` varchar(30) DEFAULT 'Đang làm việc',
  `GhiChu` text,
  PRIMARY KEY (`MaNhanVien`),
  UNIQUE KEY `idx_nhanvien_code` (`MaNhanVienCode`),
  KEY `idx_nhanvien_taikhoan` (`MaTaiKhoan`),
  KEY `idx_nhanvien_chucvu` (`MaChucVu`),
  CONSTRAINT `nhanvien_ibfk_1` FOREIGN KEY (`MaTaiKhoan`) REFERENCES `taikhoan` (`MaTaiKhoan`) ON DELETE SET NULL,
  CONSTRAINT `nhanvien_ibfk_2` FOREIGN KEY (`MaChucVu`) REFERENCES `chucvu` (`MaChucVu`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `nhanvien` (`MaNhanVien`, `MaTaiKhoan`, `MaNhanVienCode`, `HoTen`, `GioiTinh`, `SoDienThoai`, `DiaChi`, `MaChucVu`, `ChucVu`, `LoaiNhanVien`, `LoaiLuong`, `Luong`, `base_salary`, `CCCD`, `NgayVaoLam`, `TrangThai`, `GhiChu`) VALUES
(2, 2, 'NV002', 'Đỗ Văn Đoàn (Cựu NV)', 'Nam', '0813108114', 'Hà Nội', 2, 'Phục vụ', 'Full-time', 'MONTHLY', 7000000.00, 7000000.00, '001200000002', '2025-01-15', 'Đã nghỉ việc', 'Đã thanh toán hết công nợ'),
(3, 3, 'NV003', 'Đỗ Văn Đoàn', 'Nam', '0813108114', 'Hà Nội', 4, 'Quản lý', 'Full-time', 'MONTHLY', 8000000.00, 8000000.00, '001200000003', '2025-02-01', 'Đang làm việc', 'Quản lý ca sáng/tối'),
(4, 4, 'NV004', 'Đỗ Văn Đoàn', 'Nam', '0813108114', 'TP.HCM', 1, 'Thu ngân', 'Full-time', 'MONTHLY', 8000000.00, 8000000.00, '001200000004', '2025-03-01', 'Đang làm việc', 'Thu ngân chính'),
(5, 5, 'NV005', 'Vũ Hoàng Yến', 'Nữ', '0987654321', 'Đà Nẵng', 3, 'Pha chế', 'Part-time', 'HOURLY', 30000.00, 30000.00, '001200000005', '2025-04-10', 'Đang làm việc', 'HOURLY');

-- ============================================================
-- 5. BẢNG CA LÀM (calam)
-- Tối ưu: Đủ các cột LoaiCa, SoTieng, TargetStaff theo chuẩn shiftController
-- ============================================================
DROP TABLE IF EXISTS `calam`;
CREATE TABLE `calam` (
  `MaCaLam` int NOT NULL AUTO_INCREMENT,
  `TenCaLam` varchar(100) NOT NULL,
  `GioBatDau` time NOT NULL,
  `GioKetThuc` time NOT NULL,
  `LoaiCa` varchar(30) DEFAULT 'Part-time',
  `SoTieng` decimal(4,2) DEFAULT '5.00',
  `TargetStaff` int DEFAULT 3,
  `MoTa` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`MaCaLam`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `calam` (`MaCaLam`, `TenCaLam`, `GioBatDau`, `GioKetThuc`, `LoaiCa`, `SoTieng`, `TargetStaff`, `MoTa`) VALUES
(1, 'Ca 1', '07:00:00', '12:00:00', 'Part-time', 5.00, 3, 'Ca 1 ngắn linh động cho sinh viên (Sáng, 07:00 - 12:00)'),
(2, 'Ca 2', '12:00:00', '17:00:00', 'Part-time', 5.00, 3, 'Ca 2 ngắn linh động cho sinh viên (Chiều, 12:00 - 17:00)'),
(3, 'Ca 3', '17:00:00', '22:30:00', 'Part-time', 5.50, 4, 'Ca 3 ngắn linh động cho sinh viên (Tối, 17:00 - 22:30)'),
(4, 'Ca A', '07:00:00', '15:00:00', 'Full-time', 8.00, 4, 'Ca A ca sáng 8 tiếng dành cho nhân viên Full-time và Quản lý (07:00 - 15:00)'),
(5, 'Ca B', '14:30:00', '22:30:00', 'Full-time', 8.00, 4, 'Ca B ca chiều/tối 8 tiếng dành cho nhân viên Full-time và Quản lý (14:30 - 22:30)');

-- ============================================================
-- 6. BẢNG BÀN CAFE (bancafe)
-- Tối ưu: AUTO_INCREMENT, sửa TrangThai từ varchar(3) thành varchar(30)
-- ============================================================
DROP TABLE IF EXISTS `bancafe`;
CREATE TABLE `bancafe` (
  `MaBan` int NOT NULL AUTO_INCREMENT,
  `TenBan` varchar(50) NOT NULL,
  `TrangThai` varchar(30) DEFAULT 'TRONG',
  `SoChoNgoi` int DEFAULT 4,
  `MaKhuVuc` int DEFAULT 1,
  PRIMARY KEY (`MaBan`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `bancafe` (`MaBan`, `TenBan`, `TrangThai`, `SoChoNgoi`, `MaKhuVuc`) VALUES
(1, 'T1', 'TRONG', 2, 1),
(2, 'T2', 'TRONG', 4, 1),
(3, 'T3', 'TRONG', 2, 1),
(4, 'T4', 'TRONG', 4, 1),
(5, 'T5', 'TRONG', 6, 2),
(6, 'T6', 'TRONG', 2, 2),
(7, 'T7', 'TRONG', 4, 2),
(8, 'T8', 'TRONG', 8, 2);

-- ============================================================
-- 7. BẢNG DANH MỤC (danhmuc)
-- Tối ưu: AUTO_INCREMENT
-- ============================================================
DROP TABLE IF EXISTS `danhmuc`;
CREATE TABLE `danhmuc` (
  `MaDanhMuc` int NOT NULL AUTO_INCREMENT,
  `TenDanhMuc` varchar(100) NOT NULL,
  `MoTa` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`MaDanhMuc`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `danhmuc` (`MaDanhMuc`, `TenDanhMuc`, `MoTa`) VALUES
(1, 'Coffee', 'Các loại cà phê truyền thống và máy pha Espresso'),
(2, 'Bakery', 'Bánh ngọt, bánh mì nướng và tráng miệng'),
(3, 'Food', 'Thức ăn nhẹ, bánh mì kẹp và đồ ăn nhanh');

-- ============================================================
-- 8. BẢNG SẢN PHẨM (sanpham)
-- Tối ưu: AUTO_INCREMENT, tách HinhAnh riêng, Index danh mục, On Delete SET NULL
-- ============================================================
DROP TABLE IF EXISTS `sanpham`;
CREATE TABLE `sanpham` (
  `MaSanPham` int NOT NULL AUTO_INCREMENT,
  `TenSanPham` varchar(100) NOT NULL,
  `Gia` decimal(18,2) NOT NULL DEFAULT '0.00',
  `MoTa` varchar(500) DEFAULT NULL,
  `HinhAnh` varchar(500) DEFAULT NULL,
  `CoBan` tinyint DEFAULT 1,
  `MaDanhMuc` int DEFAULT NULL,
  PRIMARY KEY (`MaSanPham`),
  KEY `idx_sanpham_danhmuc` (`MaDanhMuc`),
  CONSTRAINT `sanpham_ibfk_1` FOREIGN KEY (`MaDanhMuc`) REFERENCES `danhmuc` (`MaDanhMuc`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `sanpham` (`MaSanPham`, `TenSanPham`, `Gia`, `MoTa`, `HinhAnh`, `CoBan`, `MaDanhMuc`) VALUES
(1, 'Espresso', 35000.00, 'Espresso đậm đà thơm ngát', 'https://images.unsplash.com/photo-1593443320739-77f74939d0da?w=200', 1, 1),
(2, 'Cappuccino', 45000.00, 'Cappuccino bọt sữa béo mịn', 'https://images.unsplash.com/photo-1615486780246-76e6bb33e8b5?w=200', 1, 1),
(3, 'Latte', 48000.00, 'Cà phê sữa Latte ngọt dịu', 'https://images.unsplash.com/photo-1543233604-3baca4d35513?w=200', 1, 1),
(4, 'Americano', 38000.00, 'Americano thanh nhẹ mát lạnh', 'https://images.unsplash.com/photo-1511426420268-4cfdd3763b77?w=200', 1, 1),
(5, 'Mocha', 52000.00, 'Mocha vị chocolate quyến rũ', 'https://images.unsplash.com/photo-1489866492941-15d60bdaa7e0?w=200', 1, 1),
(6, 'Croissant', 32000.00, 'Bánh sừng bò bơ Pháp giòn xốp', 'https://images.unsplash.com/photo-1571157577110-493b325fdd3d?w=200', 1, 2),
(7, 'Muffin', 35000.00, 'Bánh nướng Muffin việt quất', 'https://images.unsplash.com/photo-1751151856149-5ebf1d21586a?w=200', 1, 2),
(8, 'Brownie', 40000.00, 'Bánh Socola Brownie đậm đà', 'https://images.unsplash.com/photo-1737700088850-d0b53f9d39ec?w=200', 1, 2),
(9, 'Club Sandwich', 75000.00, 'Sandwich kẹp thịt nguội và trứng', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200', 1, 3),
(10, 'Panini', 68000.00, 'Bánh kẹp nướng nóng phô mai', 'https://images.unsplash.com/photo-1627443831818-d7a8d5e18239?w=200', 1, 3),
(11, 'Banh Mi Thit', 45000.00, 'Bánh mì thịt pate truyền thống', 'https://images.unsplash.com/photo-1662991054703-a15d787d559e?w=200', 1, 3);

-- ============================================================
-- 9. BẢNG KHÁCH HÀNG (khachhang)
-- Tối ưu: AUTO_INCREMENT, bổ sung NgaySinh, DiemTichLuy, NgayTao
-- ============================================================
DROP TABLE IF EXISTS `khachhang`;
CREATE TABLE `khachhang` (
  `MaKhachHang` int NOT NULL AUTO_INCREMENT,
  `HoTen` varchar(100) NOT NULL,
  `SoDienThoai` varchar(20) DEFAULT NULL,
  `NgaySinh` date DEFAULT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `DiemTichLuy` int DEFAULT 0,
  `NgayTao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaKhachHang`),
  UNIQUE KEY `idx_khachhang_sdt` (`SoDienThoai`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `khachhang` (`MaKhachHang`, `HoTen`, `SoDienThoai`, `NgaySinh`, `Email`, `DiemTichLuy`, `NgayTao`) VALUES
(1, 'Khách hàng lẻ', '0813108114', '1995-06-15', 'khachle@gmail.com', 22, '2026-06-20 10:00:00'),
(2, 'Nguyễn Văn A', '0912345678', '1998-09-20', 'nguyenvana@gmail.com', 50, '2026-06-21 14:30:00');

-- ============================================================
-- 10. BẢNG ĐƠN HÀNG (donhang)
-- Tối ưu: AUTO_INCREMENT, Default NgayDat CURRENT_TIMESTAMP,
-- Index Range Scan NgayDat & Covering Composite Index phục vụ Dashboard Doanh thu
-- ============================================================
DROP TABLE IF EXISTS `donhang`;
CREATE TABLE `donhang` (
  `MaDonHang` int NOT NULL AUTO_INCREMENT,
  `MaBan` int DEFAULT NULL,
  `MaNhanVien` int DEFAULT NULL,
  `MaKhachHang` int DEFAULT NULL,
  `NgayDat` datetime DEFAULT CURRENT_TIMESTAMP,
  `TongTien` decimal(18,2) DEFAULT '0.00',
  `GiamGia` decimal(18,2) DEFAULT '0.00',
  `ThanhTien` decimal(18,2) DEFAULT '0.00',
  `PhuongThucThanhToan` varchar(30) DEFAULT 'cash',
  `TrangThai` varchar(50) DEFAULT 'Đã thanh toán',
  PRIMARY KEY (`MaDonHang`),
  KEY `idx_donhang_ban` (`MaBan`),
  KEY `idx_donhang_khachhang` (`MaKhachHang`),
  KEY `idx_donhang_nhanvien` (`MaNhanVien`),
  KEY `idx_donhang_ngaydat` (`NgayDat`),
  KEY `idx_donhang_ngaydat_trangthai` (`NgayDat`, `TrangThai`, `ThanhTien`),
  CONSTRAINT `donhang_ibfk_1` FOREIGN KEY (`MaBan`) REFERENCES `bancafe` (`MaBan`) ON DELETE SET NULL,
  CONSTRAINT `donhang_ibfk_2` FOREIGN KEY (`MaKhachHang`) REFERENCES `khachhang` (`MaKhachHang`) ON DELETE SET NULL,
  CONSTRAINT `donhang_ibfk_3` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNhanVien`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `donhang` (`MaDonHang`, `MaBan`, `MaNhanVien`, `MaKhachHang`, `NgayDat`, `TongTien`, `GiamGia`, `ThanhTien`, `PhuongThucThanhToan`, `TrangThai`) VALUES
(1, 1, 4, 1, '2026-06-23 13:14:25', 113000.00, 0.00, 113000.00, 'cash', 'Đã thanh toán'),
(2, 1, 4, 1, '2026-06-23 13:30:45', 113000.00, 0.00, 113000.00, 'cash', 'Đã thanh toán');

-- ============================================================
-- 11. BẢNG CHI TIẾT ĐƠN HÀNG (chitietdonhang)
-- Tối ưu: AUTO_INCREMENT, bổ sung cột TenMon khớp với controller POS
-- ============================================================
DROP TABLE IF EXISTS `chitietdonhang`;
CREATE TABLE `chitietdonhang` (
  `MaChiTietDonHang` int NOT NULL AUTO_INCREMENT,
  `MaDonHang` int NOT NULL,
  `MaSanPham` int DEFAULT NULL,
  `TenMon` varchar(100) DEFAULT NULL,
  `SoLuong` int NOT NULL DEFAULT 1,
  `DonGia` decimal(18,2) NOT NULL DEFAULT '0.00',
  `ThanhTien` decimal(18,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`MaChiTietDonHang`),
  KEY `idx_ctdh_donhang` (`MaDonHang`),
  KEY `idx_ctdh_sanpham` (`MaSanPham`),
  CONSTRAINT `chitietdonhang_ibfk_1` FOREIGN KEY (`MaDonHang`) REFERENCES `donhang` (`MaDonHang`) ON DELETE CASCADE,
  CONSTRAINT `chitietdonhang_ibfk_2` FOREIGN KEY (`MaSanPham`) REFERENCES `sanpham` (`MaSanPham`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `chitietdonhang` (`MaChiTietDonHang`, `MaDonHang`, `MaSanPham`, `TenMon`, `SoLuong`, `DonGia`, `ThanhTien`) VALUES
(1, 1, 11, 'Banh Mi Thit', 1, 45000.00, 45000.00),
(2, 1, 10, 'Panini', 1, 68000.00, 68000.00),
(3, 2, 11, 'Banh Mi Thit', 1, 45000.00, 45000.00),
(4, 2, 10, 'Panini', 1, 68000.00, 68000.00);

-- ============================================================
-- 12. BẢNG MÃ GIẢM GIÁ (mamgiamgia)
-- ============================================================
DROP TABLE IF EXISTS `mamgiamgia`;
CREATE TABLE `mamgiamgia` (
  `MaMG` int NOT NULL AUTO_INCREMENT,
  `MaCode` varchar(50) NOT NULL,
  `TenMG` varchar(100) DEFAULT NULL,
  `LoaiGiam` enum('percent','fixed') DEFAULT 'percent',
  `GiaTriGiam` decimal(10,2) NOT NULL,
  `GiaTriToiDa` decimal(10,2) DEFAULT NULL,
  `SoLanDung` int DEFAULT 0,
  `GioiHanDung` int DEFAULT NULL,
  `NgayBatDau` date DEFAULT (curdate()),
  `NgayHetHan` date DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT 1,
  `NgayTao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaMG`),
  UNIQUE KEY `idx_mamgiamgia_code` (`MaCode`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `mamgiamgia` (`MaMG`, `MaCode`, `TenMG`, `LoaiGiam`, `GiaTriGiam`, `GiaTriToiDa`, `SoLanDung`, `GioiHanDung`, `NgayBatDau`, `NgayHetHan`, `TrangThai`, `NgayTao`) VALUES
(1, 'WELCOME10', 'Chào mừng khách mới', 'percent', 10.00, NULL, 0, 100, '2026-06-24', '2026-07-24', 1, '2026-06-24 00:10:22'),
(2, 'GIAMGIA20K', 'Giảm 20,000đ cho bill từ 100K', 'fixed', 20000.00, NULL, 0, 50, '2026-06-24', '2026-07-08', 1, '2026-06-24 00:10:22'),
(3, 'SUMMER15', 'Summer Sale 15%', 'percent', 15.00, NULL, 0, NULL, '2026-06-24', '2026-08-23', 0, '2026-06-24 00:10:22');

-- ============================================================
-- 13. BẢNG GÓI ĐỒ UỐNG / NGUYÊN LIỆU (goidouong)
-- Tối ưu: AUTO_INCREMENT, ON DELETE CASCADE
-- ============================================================
DROP TABLE IF EXISTS `goidouong`;
CREATE TABLE `goidouong` (
  `MaGoi` int NOT NULL AUTO_INCREMENT,
  `MaNhaHang` int DEFAULT NULL,
  `MaSanPham` int DEFAULT NULL,
  `SoLuong` int DEFAULT 0,
  `LyDo` varchar(255) DEFAULT NULL,
  `GhiChu` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`MaGoi`),
  KEY `idx_goidouong_sanpham` (`MaSanPham`),
  CONSTRAINT `goidouong_ibfk_1` FOREIGN KEY (`MaSanPham`) REFERENCES `sanpham` (`MaSanPham`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 14. BẢNG CHẤM CÔNG (chamcong)
-- Tối ưu: Sửa TrangThai từ varchar(3) thành varchar(50) để tránh lỗi vỡ chuỗi tiếng Việt ('Hợp lệ', 'Đi trễ'), GhiChu text
-- ============================================================
DROP TABLE IF EXISTS `chamcong`;
CREATE TABLE `chamcong` (
  `MaChamCong` int NOT NULL AUTO_INCREMENT,
  `MaNhanVien` int NOT NULL,
  `MaCaLam` int DEFAULT NULL,
  `NgayLam` date NOT NULL,
  `GioCheckIn` datetime DEFAULT NULL,
  `GioCheckOut` datetime DEFAULT NULL,
  `SoGioLam` decimal(5,2) DEFAULT '0.00',
  `DiTre` int DEFAULT 0,
  `VeSom` int DEFAULT 0,
  `TrangThai` varchar(50) DEFAULT 'Hợp lệ',
  `GhiChu` text,
  PRIMARY KEY (`MaChamCong`),
  KEY `idx_chamcong_nhanvien` (`MaNhanVien`),
  KEY `idx_chamcong_calam` (`MaCaLam`),
  KEY `idx_chamcong_nv_ngay` (`MaNhanVien`, `NgayLam`),
  CONSTRAINT `chamcong_ibfk_1` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNhanVien`) ON DELETE CASCADE,
  CONSTRAINT `chamcong_ibfk_2` FOREIGN KEY (`MaCaLam`) REFERENCES `calam` (`MaCaLam`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 15. BẢNG ĐĂNG KÝ CA (dangky_ca)
-- Tối ưu: Đủ các cột NgayDangKy, NguoiDuyet, NgayDuyet, TenNhanVien, ChucVu & Index kép
-- ============================================================
DROP TABLE IF EXISTS `dangky_ca`;
CREATE TABLE `dangky_ca` (
  `MaDangKy` int NOT NULL AUTO_INCREMENT,
  `MaNhanVien` int NOT NULL,
  `MaCaLam` int NOT NULL,
  `NgayLam` date NOT NULL,
  `TrangThai` varchar(50) DEFAULT 'pending',
  `GhiChu` text,
  `NgayTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NgayDangKy` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiDuyet` int DEFAULT NULL,
  `NgayDuyet` datetime DEFAULT NULL,
  `TenNhanVien` varchar(100) DEFAULT NULL,
  `ChucVu` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`MaDangKy`),
  UNIQUE KEY `unique_registration` (`MaNhanVien`, `MaCaLam`, `NgayLam`),
  KEY `idx_dangky_calam` (`MaCaLam`),
  KEY `idx_dangky_nv_ngay` (`MaNhanVien`, `NgayLam`),
  KEY `idx_dangky_ngay_ca` (`NgayLam`, `MaCaLam`),
  CONSTRAINT `dangky_ca_ibfk_1` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNhanVien`) ON DELETE CASCADE,
  CONSTRAINT `dangky_ca_ibfk_2` FOREIGN KEY (`MaCaLam`) REFERENCES `calam` (`MaCaLam`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `dangky_ca` (`MaDangKy`, `MaNhanVien`, `MaCaLam`, `NgayLam`, `TrangThai`, `GhiChu`, `NgayTao`, `NgayDangKy`) VALUES
(33, 4, 2, '2026-06-25', 'admin_approved', '', '2026-06-24 10:34:18', '2026-06-24 10:34:18'),
(34, 4, 2, '2026-06-26', 'admin_approved', '', '2026-06-24 10:34:18', '2026-06-24 10:34:18'),
(35, 4, 1, '2026-06-28', 'admin_approved', '', '2026-06-24 10:34:18', '2026-06-24 10:34:18'),
(36, 3, 1, '2026-06-26', 'admin_approved', '', '2026-06-24 10:34:49', '2026-06-24 10:34:49'),
(37, 3, 2, '2026-06-27', 'admin_approved', '', '2026-06-24 10:34:49', '2026-06-24 10:34:49'),
(38, 4, 1, '2026-06-27', 'pending', '', '2026-06-24 11:59:00', '2026-06-24 11:59:00');

-- ============================================================
-- 16. BẢNG ĐƠN XIN NGHỈ (don_xin_nghi)
-- ============================================================
DROP TABLE IF EXISTS `don_xin_nghi`;
CREATE TABLE `don_xin_nghi` (
  `MaDon` int NOT NULL AUTO_INCREMENT,
  `MaNhanVien` int NOT NULL,
  `NgayNghi` date NOT NULL,
  `NgayNghiDen` date DEFAULT NULL,
  `LyDo` text NOT NULL,
  `LoaiNghi` enum('phep','om','viec_rieng','khac') DEFAULT 'phep',
  `TrangThai` enum('pending','approved','rejected') DEFAULT 'pending',
  `GhiChuQL` text COMMENT 'Ghi chú của quản lý khi duyệt/từ chối',
  `NgayTao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaDon`),
  KEY `idx_don_xin_nghi_nhanvien` (`MaNhanVien`),
  CONSTRAINT `don_xin_nghi_ibfk_1` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNhanVien`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `don_xin_nghi` (`MaDon`, `MaNhanVien`, `NgayNghi`, `NgayNghiDen`, `LyDo`, `LoaiNghi`, `TrangThai`, `GhiChuQL`, `NgayTao`) VALUES
(1, 3, '2026-06-25', '2026-06-25', 'Việc bận gia đình', 'viec_rieng', 'rejected', 'Đã từ chối do thiếu người trực ca', '2026-06-24 11:15:37');

-- ============================================================
-- 17. BẢNG BẢNG CÔNG THÁNG (bangcong_thang)
-- ============================================================
DROP TABLE IF EXISTS `bangcong_thang`;
CREATE TABLE `bangcong_thang` (
  `MaBangCong` int NOT NULL AUTO_INCREMENT,
  `MaNhanVien` int NOT NULL,
  `Thang` int NOT NULL,
  `Nam` int NOT NULL,
  `SoCong` decimal(5,2) DEFAULT '0.00',
  `SoGioLam` decimal(8,2) DEFAULT '0.00',
  `SoNgayNghi` int DEFAULT 0,
  `SoNgayTre` int DEFAULT 0,
  `GhiChuQL` text,
  `PhanHoiNV` text,
  `TrangThai` enum('draft','sent_to_emp','emp_replied','confirmed','submitted_to_admin') DEFAULT 'draft',
  `NgayGui` datetime DEFAULT NULL,
  `NgayXacNhan` datetime DEFAULT NULL,
  `NgayTao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaBangCong`),
  UNIQUE KEY `unique_monthly` (`MaNhanVien`, `Thang`, `Nam`),
  CONSTRAINT `bangcong_thang_ibfk_1` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNhanVien`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 18. BẢNG BẢNG LƯƠNG (bangluong)
-- Tối ưu CRITICAL: AUTO_INCREMENT, sửa TrangThai từ datetime thành VARCHAR(50),
-- bổ sung đầy đủ các cột tính lương chuẩn quy chế QH-28 & QH-29,
-- UNIQUE KEY (MaNhanVien, Thang, Nam)
-- ============================================================
DROP TABLE IF EXISTS `bangluong`;
CREATE TABLE `bangluong` (
  `MaBangLuong` int NOT NULL AUTO_INCREMENT,
  `MaNhanVien` int NOT NULL,
  `Thang` int NOT NULL,
  `Nam` int NOT NULL,
  `TongCaLam` int DEFAULT 0,
  `LuongCoBan` decimal(18,2) DEFAULT '0.00',
  `SoCong` decimal(5,2) DEFAULT '0.00',
  `SoGioLam` decimal(8,2) DEFAULT '0.00',
  `SoNgayNghiKhongPhep` int DEFAULT 0,
  `TienPhat` decimal(18,2) DEFAULT '0.00',
  `Thuong` decimal(18,2) DEFAULT '0.00',
  `KhauTru` decimal(18,2) DEFAULT '0.00',
  `TongLuong` decimal(18,2) DEFAULT '0.00',
  `TrangThai` varchar(50) DEFAULT 'Chờ duyệt',
  `GhiChu` text,
  `NgayThanhToan` datetime DEFAULT NULL,
  `NgayTao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaBangLuong`),
  UNIQUE KEY `unique_emp_month` (`MaNhanVien`, `Thang`, `Nam`),
  KEY `idx_bangluong_nhanvien` (`MaNhanVien`),
  CONSTRAINT `bangluong_ibfk_1` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNhanVien`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `bangluong` (`MaBangLuong`, `MaNhanVien`, `Thang`, `Nam`, `TongCaLam`, `LuongCoBan`, `SoCong`, `SoGioLam`, `SoNgayNghiKhongPhep`, `TienPhat`, `Thuong`, `KhauTru`, `TongLuong`, `TrangThai`, `GhiChu`, `NgayThanhToan`, `NgayTao`) VALUES
(1, 3, 10, 2026, 24, 8000000.00, 24.00, 192.00, 2, 615384.00, 0.00, 615384.00, 7384616.00, 'Đã duyệt', 'Full-time (QH-28): Lương cứng 8.000.000đ - (Nghỉ không phép: 2 ngày x 307.692đ) + Thưởng: 0đ = 7.384.616đ', NULL, '2026-10-29 08:00:00'),
(2, 4, 10, 2026, 23, 8000000.00, 23.00, 184.00, 3, 923076.00, 0.00, 923076.00, 7076924.00, 'Đã duyệt', 'Full-time (QH-28): Lương cứng 8.000.000đ - (Nghỉ không phép: 3 ngày x 307.692đ) + Thưởng: 0đ = 7.076.924đ', NULL, '2026-10-29 08:00:00'),
(3, 5, 10, 2026, 24, 30000.00, 24.00, 118.00, 0, 0.00, 0.00, 0.00, 3540000.00, 'Đã duyệt', 'Part-time (QH-29): 118 giờ làm thực tế x 30.000đ/giờ = 3.540.000đ', NULL, '2026-10-29 08:00:00');

-- ============================================================
-- 19. BẢNG BÁO CÁO (baocao)
-- Tối ưu: AUTO_INCREMENT, Default NgayTao CURRENT_TIMESTAMP
-- ============================================================
DROP TABLE IF EXISTS `baocao`;
CREATE TABLE `baocao` (
  `MaBaoCao` int NOT NULL AUTO_INCREMENT,
  `LoaiBaoCao` varchar(100) DEFAULT NULL,
  `Ngay` date DEFAULT NULL,
  `DoanhThu` decimal(18,2) DEFAULT '0.00',
  `MaTaiKhoan` int DEFAULT NULL,
  `NgayTao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaBaoCao`),
  KEY `idx_baocao_taikhoan` (`MaTaiKhoan`),
  CONSTRAINT `baocao_ibfk_1` FOREIGN KEY (`MaTaiKhoan`) REFERENCES `taikhoan` (`MaTaiKhoan`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 20. BẢNG CẤU HÌNH (cauhinh)
-- ============================================================
DROP TABLE IF EXISTS `cauhinh`;
CREATE TABLE `cauhinh` (
  `Khoa` varchar(50) NOT NULL,
  `GiaTri` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`Khoa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `cauhinh` (`Khoa`, `GiaTri`) VALUES
('published_week_2026-06-28', 'true'),
('published_week_2026-06-29', 'true');

-- ============================================================
-- 21. BẢNG LỊCH SỬ NHẬP XUẤT (lichsunhapxuat)
-- Tối ưu: AUTO_INCREMENT, Default NgayTao CURRENT_TIMESTAMP
-- ============================================================
DROP TABLE IF EXISTS `lichsunhapxuat`;
CREATE TABLE `lichsunhapxuat` (
  `MaLichSu` int NOT NULL AUTO_INCREMENT,
  `MaTaiKhoan` int DEFAULT NULL,
  `HanhDong` varchar(50) DEFAULT NULL,
  `NoiDung` varchar(255) DEFAULT NULL,
  `NgayTao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaLichSu`),
  KEY `idx_lichsunhapxuat_taikhoan` (`MaTaiKhoan`),
  CONSTRAINT `lichsunhapxuat_ibfk_1` FOREIGN KEY (`MaTaiKhoan`) REFERENCES `taikhoan` (`MaTaiKhoan`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 22. BẢNG NHẬT KÝ NHẬP XUẤT (nhatkynhapxuat)
-- Tối ưu: AUTO_INCREMENT, Default NgayThucHien CURRENT_TIMESTAMP
-- ============================================================
DROP TABLE IF EXISTS `nhatkynhapxuat`;
CREATE TABLE `nhatkynhapxuat` (
  `MaNhatKy` int NOT NULL AUTO_INCREMENT,
  `MaTaiKhoan` int DEFAULT NULL,
  `LoaiNhapXuat` varchar(15) DEFAULT NULL,
  `TenFile` varchar(255) DEFAULT NULL,
  `NgayThucHien` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaNhatKy`),
  KEY `idx_nhatkynhapxuat_taikhoan` (`MaTaiKhoan`),
  CONSTRAINT `nhatkynhapxuat_ibfk_1` FOREIGN KEY (`MaTaiKhoan`) REFERENCES `taikhoan` (`MaTaiKhoan`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 23. BẢNG PHÂN CA NHÂN VIÊN (phancanhanvien)
-- ============================================================
DROP TABLE IF EXISTS `phancanhanvien`;
CREATE TABLE `phancanhanvien` (
  `MaPhanCa` int NOT NULL AUTO_INCREMENT,
  `MaNhanVien` int NOT NULL,
  `MaCaLam` int NOT NULL,
  `NgayLam` date NOT NULL,
  `GioCheckOut` datetime DEFAULT NULL,
  `TrangThai` varchar(30) DEFAULT 'assigned',
  `GhiChu` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`MaPhanCa`),
  KEY `idx_phanca_nhanvien` (`MaNhanVien`),
  KEY `idx_phanca_calam` (`MaCaLam`),
  CONSTRAINT `phancanhanvien_ibfk_1` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNhanVien`) ON DELETE CASCADE,
  CONSTRAINT `phancanhanvien_ibfk_2` FOREIGN KEY (`MaCaLam`) REFERENCES `calam` (`MaCaLam`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 24. BẢNG THÔNG BÁO (thongbao)
-- Tối ưu CRITICAL: Bổ sung MaNhanVien, Link, DaXem phục vụ Notification Bell & thông báo phiếu lương
-- ============================================================
DROP TABLE IF EXISTS `thongbao`;
CREATE TABLE `thongbao` (
  `MaTB` int NOT NULL AUTO_INCREMENT,
  `TieuDe` varchar(255) NOT NULL,
  `NoiDung` text,
  `Loai` varchar(50) DEFAULT 'info',
  `MaNhanVien` int DEFAULT NULL,
  `Link` varchar(255) DEFAULT NULL,
  `DaXem` tinyint(1) DEFAULT 0,
  `NgayTao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaTB`),
  KEY `idx_thongbao_nhanvien` (`MaNhanVien`),
  CONSTRAINT `thongbao_ibfk_1` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNhanVien`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `thongbao` (`MaTB`, `TieuDe`, `NoiDung`, `Loai`, `MaNhanVien`, `Link`, `DaXem`, `NgayTao`) VALUES
(1, 'Đăng ký ca làm việc', 'Quản lý đã mở bảng đăng ký ca cho tuần 22-06 - 28-06. Vui lòng vào đăng ký!', 'info', NULL, NULL, 1, '2026-06-24 01:33:03'),
(7, 'Đăng ký ca làm việc', 'Quản lý đã mở bảng đăng ký ca cho tuần 29-06 - 05-07. Vui lòng vào đăng ký!', 'info', NULL, NULL, 1, '2026-06-24 02:41:46'),
(8, 'Lịch làm việc đã chốt', 'Admin đã duyệt lịch làm việc cho tuần 22-06 - 28-06. Vui lòng kiểm tra lịch làm việc của bạn!', 'success', NULL, NULL, 1, '2026-06-24 10:28:03'),
(9, 'Phiếu lương Tháng 10/2026 đã sẵn sàng', 'Phiếu lương Tháng 10/2026 của bạn đã được duyệt và sẵn sàng để xem.', 'success', 3, '/payslip', 0, '2026-10-29 08:30:00'),
(10, 'Phiếu lương Tháng 10/2026 đã sẵn sàng', 'Phiếu lương Tháng 10/2026 của bạn đã được duyệt và sẵn sàng để xem.', 'success', 4, '/payslip', 0, '2026-10-29 08:30:00');

-- ============================================================
-- 25. BẢNG TRẠNG THÁI TUẦN (trangthai_tuan)
-- ============================================================
DROP TABLE IF EXISTS `trangthai_tuan`;
CREATE TABLE `trangthai_tuan` (
  `MaTuan` varchar(20) NOT NULL,
  `TrangThai` varchar(30) DEFAULT 'pending',
  `NgayCapNhat` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaTuan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- 26. BẢNG YÊU CẦU CHẤM CÔNG (yeucau_chamcong)
-- Tối ưu CRITICAL: Bổ sung MaCaLam, GhiChuQL;
-- Sửa khóa ngoại MaNhanVien liên kết đúng bảng nhanvien (thay vì taikhoan)
-- ============================================================
DROP TABLE IF EXISTS `yeucau_chamcong`;
CREATE TABLE `yeucau_chamcong` (
  `MaYeuCau` int NOT NULL AUTO_INCREMENT,
  `MaNhanVien` int NOT NULL,
  `MaCaLam` int DEFAULT NULL,
  `Ngay` date NOT NULL,
  `CaLam` varchar(100) DEFAULT NULL,
  `Loai` varchar(50) DEFAULT NULL,
  `ThoiGian` varchar(50) DEFAULT NULL,
  `LyDo` varchar(255) DEFAULT NULL,
  `TrangThai` varchar(20) DEFAULT 'pending',
  `GhiChuQL` text,
  `NgayTao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaYeuCau`),
  KEY `idx_yeucau_nhanvien` (`MaNhanVien`),
  KEY `idx_yeucau_calam` (`MaCaLam`),
  CONSTRAINT `yeucau_chamcong_ibfk_1` FOREIGN KEY (`MaNhanVien`) REFERENCES `nhanvien` (`MaNhanVien`) ON DELETE CASCADE,
  CONSTRAINT `yeucau_chamcong_ibfk_2` FOREIGN KEY (`MaCaLam`) REFERENCES `calam` (`MaCaLam`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `yeucau_chamcong` (`MaYeuCau`, `MaNhanVien`, `MaCaLam`, `Ngay`, `CaLam`, `Loai`, `ThoiGian`, `LyDo`, `TrangThai`, `GhiChuQL`, `NgayTao`) VALUES
(2, 3, 1, '2026-06-25', 'Ca 1', 'Bổ sung điểm danh', '07:00 - 12:00', 'Quên chấm công lúc vào ca', 'rejected', 'Không có xác nhận của ca trưởng', '2026-06-24 11:15:37');

-- ============================================================
-- 27. VIEWS TƯƠNG THÍCH (invoices & hoadon)
-- Phục vụ các module thống kê, Dashboard và POS
-- ============================================================
CREATE OR REPLACE VIEW invoices AS SELECT * FROM donhang;
CREATE OR REPLACE VIEW hoadon AS SELECT * FROM donhang;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- HOÀN TẤT SCHEMA TỐI ƯU CƠ SỞ DỮ LIỆU DACNPM
-- ============================================================
