import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/home.css";

// Import các sub-components
import PosOrder from "../components/PosOrder";
import TableManagement from "../components/TableManagement";
import CategoryManagement from "../components/CategoryManagement";
import ProductManagement from "../components/ProductManagement";
import OrderManagement from "../components/OrderManagement";
import EmployeeManagement from "../components/EmployeeManagement";
import ShiftApprovalManagement from "../components/ShiftApprovalManagement";
import CustomerManagement from "../components/CustomerManagement";
import TimekeepingManagement from "../components/TimekeepingManagement";
import LeaveRequestManagement from "../components/LeaveRequestManagement";
import AiInsightsManagement from "../components/AiInsightsManagement";

// Lucide Icons
import {
  Clock,
  User,
  LogOut,
  Coffee,
  Users,
  Calendar,
  BarChart2,
  Home as HomeIcon,
  Search,
  Settings,
  Package,
  CreditCard,
  Grid,
  UserCheck,
  Bot,
  FileText,
  CheckSquare,
  FileSpreadsheet,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  // 1. THÔNG TIN NGƯỜI DÙNG & PHÂN QUYỀN VAI TRÒ
  const userStr =
    sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = userStr
    ? JSON.parse(userStr)
    : { name: "Nguyễn Hải Hậu", role: "Admin" };

  const rawRole = (user.role || user.MaVaiTro || "cashier")
    .toString()
    .toLowerCase();

  let currentRole = "cashier";
  if (rawRole.includes("admin") || rawRole === "1") {
    currentRole = "admin";
  } else if (
    rawRole.includes("quản lý") ||
    rawRole.includes("manager") ||
    rawRole === "2"
  ) {
    currentRole = "manager";
  } else if (
    rawRole.includes("pha chế") ||
    rawRole.includes("barista") ||
    rawRole === "3"
  ) {
    currentRole = "barista";
  } else if (
    rawRole.includes("phục vụ") ||
    rawRole.includes("waiter") ||
    rawRole === "4"
  ) {
    currentRole = "waiter";
  }

  const getDefaultTab = (role) => {
    switch (role) {
      case "barista":
        return "inventory";
      case "waiter":
        return "tables";
      case "cashier":
        return "pos";
      default:
        return "dashboard";
    }
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab(currentRole));
  const [selectedPosTable, setSelectedPosTable] = useState("Bàn 01");
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString("vi-VN"),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("vi-VN"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  const menuList = [
    {
      id: "dashboard",
      label: "Trang chủ / Dashboard",
      icon: <HomeIcon size={18} />,
      roles: ["admin", "manager"],
    },
    {
      id: "pos",
      label: "Tạo đơn & Thanh toán (POS)",
      icon: <CreditCard size={18} />,
      roles: ["admin", "manager", "cashier"],
    },
    {
      id: "orders",
      label: "Quản lý Hóa đơn & Đơn hàng",
      icon: <FileText size={18} />,
      roles: ["admin", "manager", "cashier"],
    },
    {
      id: "tables",
      label: "Sơ đồ bàn & Gọi món",
      icon: <Grid size={18} />,
      roles: ["admin", "manager", "cashier", "waiter"],
    },
    {
      id: "customers",
      label: "Quản lý khách hàng",
      icon: <UserCheck size={18} />,
      roles: ["admin", "manager", "cashier"],
    },
    {
      id: "categories",
      label: "Quản lý Danh mục",
      icon: <Grid size={18} />,
      roles: ["admin", "manager"],
    },
    {
      id: "inventory",
      label: "Quản lý Đồ Uống & Thực Đơn",
      icon: <Package size={18} />,
      roles: ["admin", "manager", "barista"],
    },
    {
      id: "timekeeping",
      label: "Điểm danh & Chấm công",
      icon: <CheckSquare size={18} />,
      roles: ["admin", "manager", "cashier", "barista", "waiter"],
    },
    {
      id: "leave_requests",
      label: "Đơn xin nghỉ phép",
      icon: <FileSpreadsheet size={18} />,
      roles: ["admin", "manager", "cashier", "barista", "waiter"],
    },
    {
      id: "shifts_approval",
      label: "Duyệt ca làm & Lịch trình",
      icon: <Calendar size={18} />,
      roles: ["admin", "manager"],
    },
    {
      id: "reports",
      label: "Báo cáo doanh thu",
      icon: <BarChart2 size={18} />,
      roles: ["admin", "manager"],
    },
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

  const allowedMenus = menuList.filter((item) =>
    item.roles.includes(currentRole),
  );

  const getRoleDisplayName = (role) => {
    const rolesMap = {
      admin: "ADMIN QUẢN TRỊ",
      manager: "QUẢN LÝ CỬA HÀNG",
      cashier: "THU NGÂN",
      barista: "PHA CHẾ / BẾP",
      waiter: "NHÂN VIÊN PHỤC VỤ",
    };
    return rolesMap[role] || role.toUpperCase();
  };

  return (
    <div className="home-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Coffee className="brand-icon" size={28} />
          <h2>QuanLyCF</h2>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-title">
            QUẢN LÝ ({getRoleDisplayName(currentRole)})
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

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="main-header">
          <div className="search-bar">
            <Search size={18} />
            <input type="text" placeholder="Tìm kiếm hệ thống..." />
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
                  {user.name || "Nguyễn Hải Hậu"}
                </span>
                <span className="user-role-badge">
                  {getRoleDisplayName(currentRole)}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="content-body">
          {activeTab === "pos" && (
            <PosOrder
              selectedTableProp={selectedPosTable}
              onNavigateToTables={() => setActiveTab("tables")}
            />
          )}

          {activeTab === "orders" && <OrderManagement />}

          {activeTab === "tables" && (
            <TableManagement
              currentRole={currentRole}
              onSelectTableForPos={(tableName) => {
                setSelectedPosTable(tableName);
                setActiveTab("pos");
              }}
            />
          )}

          {activeTab === "categories" && (
            <CategoryManagement currentRole={currentRole} />
          )}

          {activeTab === "inventory" && (
            <ProductManagement currentRole={currentRole} />
          )}

          {activeTab === "customers" && (
            <CustomerManagement currentRole={currentRole} />
          )}

          {activeTab === "timekeeping" && <TimekeepingManagement />}

          {activeTab === "leave_requests" && <LeaveRequestManagement />}

          {activeTab === "ai" && <AiInsightsManagement />}

          {activeTab === "hr" && (
            <EmployeeManagement currentRole={currentRole} />
          )}

          {activeTab === "shifts_approval" && (
            <ShiftApprovalManagement currentRole={currentRole} />
          )}

          {/* PLACEHOLDER DÀNH CHO CÁC TAB CHƯA CÓ TRANG */}
          {["dashboard", "reports", "settings"].includes(activeTab) && (
            <div className="tab-placeholder">
              <Coffee size={28} className="placeholder-icon" />
              <h2>
                Phân hệ: {menuList.find((m) => m.id === activeTab)?.label}
              </h2>
              <p>Sẵn sàng kết nối MySQL cho phân hệ này.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
