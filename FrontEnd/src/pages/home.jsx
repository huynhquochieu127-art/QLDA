import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/home.css";
import {
  Clock,
  User,
  LogOut,
  DollarSign,
  Coffee,
  Users,
  Calendar,
  CheckSquare,
  ShoppingCart,
  Bot,
  BarChart2,
  FileText,
  Download,
  TestTube,
  Home as HomeIcon,
  Search,
  Bell,
  Settings,
  ShieldCheck,
  Package,
  CreditCard,
  Grid,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  // 1. LẤY THÔNG TIN VÀ CHUẨN HÓA ROLE TỪ STORAGE
  const userStr =
    sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = userStr
    ? JSON.parse(userStr)
    : { name: "Nguyễn Hải Hậu", role: "Admin" };

  // Chuẩn hóa role về dạng thường để so sánh (admin | manager/quanly | staff/nhanvien)
  const rawRole = (user.role || user.MaVaiTro || "staff")
    .toString()
    .toLowerCase();

  let currentRole = "staff"; // Mặc định là nhân viên
  if (rawRole.includes("admin") || rawRole === "1") {
    currentRole = "admin";
  } else if (
    rawRole.includes("quản lý") ||
    rawRole.includes("manager") ||
    rawRole === "2"
  ) {
    currentRole = "manager";
  } else {
    currentRole = "staff";
  }

  // Set tab mặc định: Nhân viên vào thẳng màn hình Bán hàng (POS), Admin/Quản lý vào Dashboard
  const [activeTab, setActiveTab] = useState(
    currentRole === "staff" ? "pos" : "dashboard",
  );

  // Đồng hồ thời gian thực
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString("vi-VN"),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("vi-VN"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. ĐỊNH NGHĨA DANH SÁCH MENU THEO QUYỀN
  const menuList = [
    {
      id: "dashboard",
      label: "Trang chủ / Dashboard",
      icon: <HomeIcon size={18} />,
      roles: ["admin", "manager"],
    },
    // Chức năng dành riêng cho Nhân viên (POS)
    {
      id: "pos",
      label: "Tạo đơn & Thanh toán (POS)",
      icon: <CreditCard size={18} />,
      roles: ["staff", "admin", "manager"],
    },
    {
      id: "tables",
      label: "Sơ đồ bàn",
      icon: <Grid size={18} />,
      roles: ["staff", "admin", "manager"],
    },
    // Chức năng Quản lý & Admin
    {
      id: "inventory",
      label: "Quản lý kho & Đồ uống",
      icon: <Package size={18} />,
      roles: ["manager", "admin"],
    },
    {
      id: "shifts_approval",
      label: "Duyệt ca làm & Chấm công",
      icon: <Calendar size={18} />,
      roles: ["manager", "admin"],
    },
    {
      id: "reports",
      label: "Báo cáo doanh thu",
      icon: <BarChart2 size={18} />,
      roles: ["manager", "admin"],
    },
    // Chức năng nâng cao dành riêng cho Admin
    {
      id: "hr",
      label: "Quản lý nhân sự & Phân quyền",
      icon: <Users size={18} />,
      roles: ["admin"],
    },
    {
      id: "settings",
      label: "Cấu hình hệ thống",
      icon: <Settings size={18} />,
      roles: ["admin"],
    },
    {
      id: "ai",
      label: "Gợi ý AI / ML",
      icon: <Bot size={18} />,
      roles: ["admin", "manager"],
    },
  ];

  // Lọc ra các menu mà Role hiện tại được phép xem
  const allowedMenus = menuList.filter((item) =>
    item.roles.includes(currentRole),
  );

  // Xử lý Đăng xuất
  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="home-container">
      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Coffee className="brand-icon" size={28} />
          <h2>QuanLyCF</h2>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-title">
            CHỨC NĂNG ({currentRole.toUpperCase()})
          </div>

          {allowedMenus.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} /> <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="main-content">
        {/* Header trên cùng */}
        <header className="main-header">
          <div className="search-bar">
            <Search size={18} />
            <input type="text" placeholder="Tìm kiếm nhanh..." />
          </div>

          <div className="header-right">
            <div className="clock-badge">
              <Clock size={16} />
              <span>{currentTime}</span>
            </div>

            <div className="user-profile">
              <User size={20} />
              <div className="user-info">
                <span className="user-name">
                  {user.name || user.TenNguoiDung || "Người dùng"}
                </span>
                <span className="user-role-badge">
                  {currentRole === "admin" && "👑 Admin (Toàn quyền)"}
                  {currentRole === "manager" && "💼 Quản lý"}
                  {currentRole === "staff" && "☕ Nhân viên (POS)"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ================= NỘI DUNG THEO ROLE ================= */}
        <div className="content-body">
          {/* 1. MÀN HÌNH BÁN HÀNG FOR STAFF */}
          {activeTab === "pos" && (
            <div className="pos-view">
              <h2>Màn hình Bán hàng & Thanh toán (POS)</h2>
              <p>
                Chức năng tạo đơn hàng, gọi món và xuất hóa đơn cho nhân viên.
              </p>
              {/* Thêm Component Order / Cart tại đây */}
            </div>
          )}

          {/* 2. MÀN HÌNH DASHBOARD FOR ADMIN & MANAGER */}
          {activeTab === "dashboard" && (
            <div className="dashboard-view">
              <div className="view-header">
                <h1>Tổng quan hệ thống</h1>
                <p>
                  Bảng điều khiển dành cho{" "}
                  {currentRole === "admin" ? "Admin" : "Quản lý"}
                </p>
              </div>

              {/* Thống kê doanh thu */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon revenue">
                    <DollarSign />
                  </div>
                  <div className="stat-info">
                    <span>Doanh thu hôm nay</span>
                    <h3>code</h3>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon orders">
                    <ShoppingCart />
                  </div>
                  <div className="stat-info">
                    <span>Tổng đơn hàng</span>
                    <h3>code</h3>
                  </div>
                </div>

                {currentRole === "admin" && (
                  <div className="stat-card">
                    <div className="stat-icon staff">
                      <Users />
                    </div>
                    <div className="stat-info">
                      <span>Nhân sự quản lý</span>
                      <h3>code</h3>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. CÁC TẠM THỜI CHO TAB KHÁC */}
          {!["pos", "dashboard"].includes(activeTab) && (
            <div className="tab-placeholder">
              <h2>Mô-đun: {activeTab.toUpperCase()}</h2>
              <p>
                Bạn đang truy cập với quyền: <strong>{currentRole}</strong>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
// push code cho role
