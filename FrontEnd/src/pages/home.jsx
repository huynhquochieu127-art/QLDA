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
  Upload,
  TestTube,
  Home as HomeIcon,
  Search,
  Bell,
  PlusCircle,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  // Lấy thông tin người dùng từ storage
  const userStr =
    sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = userStr
    ? JSON.parse(userStr)
    : { name: "Nguyễn Hải Hậu", role: "Admin" };

  // Quản lý tab đang chọn
  const [activeTab, setActiveTab] = useState("dashboard");

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
          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <HomeIcon size={18} /> <span>Trang chủ / Dashboard</span>
          </button>

          <div className="nav-group-title">QUẢN LÝ DỰ ÁN</div>

          <button
            className={`nav-item ${activeTab === "hr" ? "active" : ""}`}
            onClick={() => setActiveTab("hr")}
          >
            <Users size={18} /> <span>Quản lý nhân sự</span>
          </button>

          <button
            className={`nav-item ${activeTab === "shifts" ? "active" : ""}`}
            onClick={() => setActiveTab("shifts")}
          >
            <Calendar size={18} /> <span>Quản lý ca làm</span>
          </button>

          <button
            className={`nav-item ${activeTab === "attendance" ? "active" : ""}`}
            onClick={() => setActiveTab("attendance")}
          >
            <CheckSquare size={18} /> <span>Chấm công</span>
          </button>

          <button
            className={`nav-item ${activeTab === "products" ? "active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            <Coffee size={18} /> <span>Quản lý đồ uống</span>
          </button>

          <button
            className={`nav-item ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <ShoppingCart size={18} /> <span>Quản lý bán hàng</span>
          </button>

          <div className="nav-group-title">NÂNG CAO & BÁO CÁO</div>

          <button
            className={`nav-item ${activeTab === "ai" ? "active" : ""}`}
            onClick={() => setActiveTab("ai")}
          >
            <Bot size={18} /> <span>AI / ML Gợi ý</span>
          </button>

          <button
            className={`nav-item ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            <BarChart2 size={18} /> <span>Thống kê & Báo cáo</span>
          </button>

          <button
            className={`nav-item ${activeTab === "data" ? "active" : ""}`}
            onClick={() => setActiveTab("data")}
          >
            <Download size={18} /> <span>Import / Export</span>
          </button>

          <button
            className={`nav-item ${activeTab === "testing" ? "active" : ""}`}
            onClick={() => setActiveTab("testing")}
          >
            <TestTube size={18} /> <span>Kiểm thử hệ thống</span>
          </button>
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
            <input type="text" placeholder="Tìm kiếm / Lọc dữ liệu..." />
          </div>

          <div className="header-right">
            <div className="clock-badge">
              <Clock size={16} />
              <span>{currentTime}</span>
            </div>

            <button className="icon-btn">
              <Bell size={18} />
            </button>

            <div className="user-profile">
              <User size={20} />
              <div className="user-info">
                <span className="user-name">
                  {user.name || user.TenNguoiDung || "Hải Hậu"}
                </span>
                <span className="user-role">
                  {user.role || "Quản trị viên"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Nội dung thay đổi theo Tab */}
        <div className="content-body">
          {activeTab === "dashboard" && (
            <div className="dashboard-view">
              <div className="view-header">
                <h1>Tổng quan hệ thống</h1>
                <p>Hệ thống Quản lý Quán Cà phê (QuanLyCF)</p>
              </div>

              {/* Các Thẻ Thống Kê Nhanh */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon revenue">
                    <DollarSign />
                  </div>
                  <div className="stat-info">
                    <span>Doanh thu hôm nay</span>
                    <h3>3,250,000 VNĐ</h3>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon orders">
                    <ShoppingCart />
                  </div>
                  <div className="stat-info">
                    <span>Đơn hàng</span>
                    <h3>54 đơn</h3>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon staff">
                    <Users />
                  </div>
                  <div className="stat-info">
                    <span>Nhân sự ca này</span>
                    <h3>6 / 12</h3>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon ai">
                    <Bot />
                  </div>
                  <div className="stat-info">
                    <span>Gợi ý AI bán chạy</span>
                    <h3>Cà phê Muối</h3>
                  </div>
                </div>
              </div>

              {/* Danh sách các Mô-đun Tính năng */}
              <div className="features-section">
                <h2>Danh mục tính năng hệ thống</h2>
                <div className="modules-grid">
                  {/* Quản lý Nhân sự */}
                  <div className="module-card">
                    <div className="card-header">
                      <Users className="icon" />
                      <h3>Quản lý Nhân sự</h3>
                    </div>
                    <ul>
                      <li>
                        <PlusCircle size={14} /> Thêm / Sửa / Xóa nhân viên
                      </li>
                      <li>
                        <Search size={14} /> Tìm kiếm & Lọc nhân sự
                      </li>
                    </ul>
                  </div>

                  {/* Quản lý Ca làm */}
                  <div className="module-card">
                    <div className="card-header">
                      <Calendar className="icon" />
                      <h3>Quản lý Ca làm</h3>
                    </div>
                    <ul>
                      <li>
                        <PlusCircle size={14} /> Tạo & Phân ca làm việc
                      </li>
                      <li>
                        <Calendar size={14} /> Xem lịch & Sửa/xóa ca
                      </li>
                    </ul>
                  </div>

                  {/* Chấm công */}
                  <div className="module-card">
                    <div className="card-header">
                      <CheckSquare className="icon" />
                      <h3>Chấm công</h3>
                    </div>
                    <ul>
                      <li>
                        <CheckSquare size={14} /> Check-in / Check-out
                      </li>
                      <li>
                        <Clock size={14} /> Thống kê đi trễ / về sớm
                      </li>
                    </ul>
                  </div>

                  {/* Quản lý Đồ uống */}
                  <div className="module-card">
                    <div className="card-header">
                      <Coffee className="icon" />
                      <h3>Quản lý Sản phẩm</h3>
                    </div>
                    <ul>
                      <li>
                        <PlusCircle size={14} /> CRUD Danh mục & Đồ uống
                      </li>
                      <li>
                        <Search size={14} /> Tìm kiếm & Lọc sản phẩm
                      </li>
                    </ul>
                  </div>

                  {/* Quản lý Bán hàng */}
                  <div className="module-card">
                    <div className="card-header">
                      <ShoppingCart className="icon" />
                      <h3>Quản lý Bán hàng</h3>
                    </div>
                    <ul>
                      <li>
                        <PlusCircle size={14} /> Tạo đơn & Quản lý trạng thái
                      </li>
                      <li>
                        <TrendingUp size={14} /> Theo dõi doanh thu thời gian
                        thực
                      </li>
                    </ul>
                  </div>

                  {/* AI / ML */}
                  <div className="module-card highlight">
                    <div className="card-header">
                      <Bot className="icon" />
                      <h3>Mô hình AI / ML</h3>
                    </div>
                    <ul>
                      <li>
                        <Bot size={14} /> Gợi ý đồ uống theo xu hướng
                      </li>
                      <li>
                        <TrendingUp size={14} /> Gợi ý dựa trên lịch sử mua hàng
                      </li>
                    </ul>
                  </div>

                  {/* Báo cáo & Xuất dữ liệu */}
                  <div className="module-card">
                    <div className="card-header">
                      <FileText className="icon" />
                      <h3>Báo cáo & Dữ liệu</h3>
                    </div>
                    <ul>
                      <li>
                        <FileSpreadsheet size={14} /> Xuất PDF / Xuất Excel
                      </li>
                      <li>
                        <Upload size={14} /> Import / Export dữ liệu
                      </li>
                    </ul>
                  </div>

                  {/* Kiểm thử */}
                  <div className="module-card">
                    <div className="card-header">
                      <TestTube className="icon" />
                      <h3>Kiểm thử Hệ thống</h3>
                    </div>
                    <ul>
                      <li>
                        <TestTube size={14} /> Test API & Luồng dữ liệu
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Các giao diện phụ khi nhấn Sidebar */}
          {activeTab !== "dashboard" && (
            <div className="tab-placeholder">
              <h2>Mô-đun: {activeTab.toUpperCase()}</h2>
              <p>
                Nội dung chi tiết cho trang này đang được kết nối với Backend
                API...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
