import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/home.css";
import {
  Clock,
  User,
  LogOut,
  DollarSign,
  FileEdit,
  Bell,
  X,
  TrendingUp,
  Coffee,
} from "lucide-react";
import axios from "axios";

export default function Home() {
  const navigate = useNavigate();

  // Lấy thông tin người dùng từ SessionStorage
  const userStr = sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const userRole = user ? String(user.MaVaiTro || user.role || "2") : "2";

  // Đồng hồ thời gian thực
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString("vi-VN"),
  );
  const today = new Date();
  const dateFormatted = today.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const todayStr = today.toLocaleDateString("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("vi-VN"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // State Chấm công
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState("-");
  const [totalHours, setTotalHours] = useState("0.00");
  const [checkInTimestamp, setCheckInTimestamp] = useState(null);

  // State Modal
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // State Phiếu lương
  const [payslipMonth, setPayslipMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // State Yêu cầu nhân sự
  const [requestCategory, setRequestCategory] = useState("bosung");
  const [requestDate, setRequestDate] = useState(todayStr);
  const [requestReason, setRequestReason] = useState("");

  // State Thông báo
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // State Admin Stats
  const [adminStats] = useState({
    totalEmployees: 12,
    todayShifts: 8,
    pendingRequests: 3,
    revenueToday: 3550000,
  });

  // Tải dữ liệu ban đầu
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchTodayStatus = async () => {
      try {
        const res = await axios.get(
          `https://quanlynhansucf.onrender.com/api/timekeeping/today-status?employeeId=${user.MaTaiKhoan}`,
        );
        if (res.data?.success) {
          setIsCheckedIn(res.data.data.isCheckedIn);
          setCheckInTime(res.data.data.checkInTime || "-");
          if (res.data.data.checkInTimestamp) {
            setCheckInTimestamp(res.data.data.checkInTimestamp);
          }
        }
      } catch (err) {
        console.log("Sử dụng chế độ demo chấm công local");
      }
    };

    fetchTodayStatus();
  }, [user, navigate]);

  // Bộ đếm giờ làm việc
  useEffect(() => {
    let interval = null;
    if (isCheckedIn && checkInTimestamp) {
      interval = setInterval(() => {
        const diff = new Date() - new Date(checkInTimestamp);
        setTotalHours((diff / (1000 * 60 * 60)).toFixed(2));
      }, 60000);

      const diff = new Date() - new Date(checkInTimestamp);
      setTotalHours((diff / (1000 * 60 * 60)).toFixed(2));
    } else {
      setTotalHours("0.00");
    }
    return () => clearInterval(interval);
  }, [isCheckedIn, checkInTimestamp]);

  // Xử lý Check-in / Check-out
  const handleToggleCheckIn = () => {
    if (!isCheckedIn) {
      const timeStr = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setIsCheckedIn(true);
      setCheckInTime(timeStr);
      setCheckInTimestamp(new Date().getTime());
    } else {
      setIsCheckedIn(false);
      setCheckInTimestamp(null);
    }
  };

  // Xử lý Đăng xuất
  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  // Format Tiền tệ VND
  const formatVND = (amount) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);

  return (
    <div className="home-page">
      <div className="home-container">
        {/* 1. THANH HEADER TOPBAR */}
        <header className="home-header">
          <div className="header-brand">
            <div className="brand-icon-wrapper">
              <Coffee size={24} />
            </div>
            <div>
              <h1 className="brand-title">Quán Cà Phê - Trang Chủ</h1>
              <p className="brand-subtitle">
                Xin chào,{" "}
                <strong>
                  {user?.HoTen || user?.TenDangNhap || "Nhân viên"}
                </strong>{" "}
                | {dateFormatted} ({currentTime})
              </p>
            </div>
          </div>

          <div className="header-actions">
            {/* Nút Chuông thông báo */}
            <div className="notif-wrapper">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="btn btn-icon-only"
                aria-label="Thông báo"
              >
                <Bell size={20} />
              </button>

              {showNotifDropdown && (
                <div className="notif-dropdown">
                  <p className="notif-dropdown-title">Thông báo mới</p>
                  <p className="notif-dropdown-empty">
                    Không có thông báo mới nào.
                  </p>
                </div>
              )}
            </div>

            {/* Nút Hồ sơ cá nhân */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="btn btn-secondary"
            >
              <User size={16} style={{ color: "var(--amber-600)" }} />
              Hồ sơ
            </button>

            {/* Nút Đăng xuất */}
            <button onClick={handleLogout} className="btn btn-danger">
              <LogOut size={16} />
              Đăng xuất
            </button>
          </div>
        </header>

        {/* 2. KHU VỰC THẺ CHÍNH (CARDS GRID) */}
        <div className="cards-grid">
          {/* CHẤM CÔNG HÔM NAY */}
          <div className="card card-checkin">
            <div>
              <div className="checkin-header">
                <span className="checkin-tag">Ca làm việc hôm nay</span>
                <Clock size={22} style={{ opacity: 0.8 }} />
              </div>
              <p className="checkin-status">
                {isCheckedIn ? "Đang Trong Ca" : "Chưa Check-in"}
              </p>
              <p className="checkin-details">
                Giờ vào: <strong>{checkInTime}</strong> | Đã làm:{" "}
                <strong>{totalHours} giờ</strong>
              </p>
            </div>

            <button
              onClick={handleToggleCheckIn}
              className={`btn-checkin-toggle ${
                isCheckedIn ? "is-active" : "not-active"
              }`}
            >
              {isCheckedIn
                ? "KẾT THÚC CA (CHECK-OUT)"
                : "BẮT ĐẦU CA (CHECK-IN)"}
            </button>
          </div>

          {/* PHIẾU LƯƠNG CÁ NHÂN */}
          <div className="card">
            <div>
              <div className="card-header-info">
                <div className="card-icon-badge emerald">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="card-title">Phiếu Lương Cá Nhân</h3>
                  <p className="card-description">
                    Tra cứu bảng lương hàng tháng
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPayslipModal(true)}
              className="btn btn-emerald"
            >
              Xem chi tiết phiếu lương
            </button>
          </div>

          {/* YÊU CẦU NHÂN SỰ */}
          <div className="card">
            <div>
              <div className="card-header-info">
                <div className="card-icon-badge blue">
                  <FileEdit size={20} />
                </div>
                <div>
                  <h3 className="card-title">Yêu Cầu Nhân Sự</h3>
                  <p className="card-description">
                    Xin nghỉ, bổ sung công, đổi ca
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowRequestModal(true)}
              className="btn btn-blue"
            >
              Tạo đơn yêu cầu
            </button>
          </div>
        </div>

        {/* 3. KHU VỰC THỐNG KÊ QUẢN LÝ (CHO ADMIN) */}
        {userRole === "1" && (
          <div className="admin-section">
            <h2 className="admin-title">
              <TrendingUp size={18} style={{ color: "var(--amber-500)" }} />
              Thống kê quản lý quán Cà Phê
            </h2>
            <div className="stats-grid">
              <div className="stat-item">
                <p className="stat-label">Tổng nhân viên</p>
                <p className="stat-value">{adminStats.totalEmployees}</p>
              </div>
              <div className="stat-item">
                <p className="stat-label">Ca làm hôm nay</p>
                <p className="stat-value amber">{adminStats.todayShifts}</p>
              </div>
              <div className="stat-item">
                <p className="stat-label">Đơn chờ duyệt</p>
                <p className="stat-value blue">{adminStats.pendingRequests}</p>
              </div>
              <div className="stat-item">
                <p className="stat-label">Doanh thu dự kiến</p>
                <p className="stat-value emerald">
                  {formatVND(adminStats.revenueToday)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PHIẾU LƯƠNG */}
        {showPayslipModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button
                onClick={() => setShowPayslipModal(false)}
                className="modal-close-btn"
              >
                <X size={20} />
              </button>
              <h3 className="modal-title">Chi tiết phiếu lương</h3>
              <div className="form-group">
                <label className="form-label">Chọn tháng:</label>
                <input
                  type="month"
                  value={payslipMonth}
                  onChange={(e) => setPayslipMonth(e.target.value)}
                  className="form-input"
                  style={{ fontWeight: "bold" }}
                />
              </div>
              <div>
                <div className="detail-row">
                  <label>Lương cơ bản:</label>
                  <strong>{formatVND(4500000)}</strong>
                </div>
                <div className="detail-row">
                  <label>Thưởng / Phụ cấp ca:</label>
                  <strong style={{ color: "var(--emerald-600)" }}>
                    {formatVND(500000)}
                  </strong>
                </div>
                <div className="detail-row">
                  <label>Khấu trừ:</label>
                  <strong style={{ color: "var(--red-500)" }}>
                    {formatVND(0)}
                  </strong>
                </div>
                <div className="detail-row-highlight">
                  <span>Thực nhận:</span>
                  <span>{formatVND(5000000)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL YÊU CẦU */}
        {showRequestModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button
                onClick={() => setShowRequestModal(false)}
                className="modal-close-btn"
              >
                <X size={20} />
              </button>
              <h3 className="modal-title">Tạo đơn yêu cầu mới</h3>
              <div className="form-group">
                <label className="form-label">Loại yêu cầu</label>
                <select
                  value={requestCategory}
                  onChange={(e) => setRequestCategory(e.target.value)}
                  className="form-select"
                >
                  <option value="bosung">Bổ sung điểm danh</option>
                  <option value="xinnghi">Xin nghỉ ca làm</option>
                  <option value="doica">Xin đổi ca</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ngày áp dụng</label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Lý do</label>
                <textarea
                  rows="3"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Nhập lý do trình báo..."
                  className="form-textarea"
                />
              </div>
              <button
                onClick={() => {
                  alert("Đã gửi yêu cầu thành công!");
                  setShowRequestModal(false);
                }}
                className="btn btn-blue"
              >
                Gửi đơn
              </button>
            </div>
          </div>
        )}

        {/* MODAL HỒ SƠ CÁ NHÂN */}
        {showProfileModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 360 }}>
              <button
                onClick={() => setShowProfileModal(false)}
                className="modal-close-btn"
              >
                <X size={20} />
              </button>
              <h3 className="modal-title">Hồ sơ nhân viên</h3>
              <div>
                <div className="detail-row">
                  <label>Mã tài khoản:</label>
                  <strong>{user?.MaTaiKhoan || user?.id || "NV001"}</strong>
                </div>
                <div className="detail-row">
                  <label>Họ và tên:</label>
                  <strong>
                    {user?.HoTen || user?.TenDangNhap || "Chưa cập nhật"}
                  </strong>
                </div>
                <div className="detail-row">
                  <label>Chức vụ / Vai trò:</label>
                  <strong style={{ color: "var(--amber-600)" }}>
                    {userRole === "1" ? "Quản lý / Admin" : "Nhân viên quán"}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
