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
import CustomerManagement from "../components/CustomerManagement";
import TimekeepingManagement from "../components/TimekeepingManagement";
import LeaveRequestManagement from "../components/LeaveRequestManagement";
import AiInsightsManagement from "../components/AiInsightsManagement";
import ShiftApprovalManagement from "../components/ShiftApprovalManagement";
import EmployeeCheckIn from "../components/EmployeeCheckIn";
import ShiftRegistration from "../components/ShiftRegistration";
import MyLeaveRequests from "../components/MyLeaveRequests";
import MyTimesheet from "../components/MyTimesheet";
import Payslip from "../components/Payslip";
import RevenueReport from "../components/RevenueReport";
import WorkingStaffPanel from "../components/WorkingStaffPanel";
import PayrollManagement from "../components/PayrollManagement";
import PartTimeShiftConfig from "../components/PartTimeShiftConfig";
import FullTimeShiftConfig from "../components/FullTimeShiftConfig";
import FullTimeShiftRegistration from "../components/FullTimeShiftRegistration";
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
  ClipboardCheck,
  Receipt,
  LogIn,
  Wallet,
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

  // 2. XÁC ĐỊNH LOẠI HỢP ĐỒNG: FULL-TIME HAY PART-TIME
  const rawContract = (
    user.loaiNhanVien ||
    user.LoaiNhanVien ||
    user.contractType ||
    ""
  ).toString().toLowerCase();

  // Nhân viên Part-time
  const isPartTimeStaff = rawContract.includes("part");
  // Nhân viên Full-time / Quản lý
  const isFullTimeStaff =
    rawContract.includes("full") ||
    rawRole.includes("quản lý") ||
    rawRole.includes("manager") ||
    rawRole.includes("admin") ||
    currentRole === "admin" ||
    currentRole === "manager";

  const getDefaultTab = (role) => {
    switch (role) {
      case "barista":
      case "waiter":
      case "cashier":
        return "my_checkin"; // Trang chủ nhân viên: nút Check-in / Check-out (QH-47)
      default:
        return "dashboard";
    }
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab(currentRole));
  const [settingsSubTab, setSettingsSubTab] = useState("fulltime");
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
      id: "my_checkin",
      label: "Chấm công hôm nay",
      icon: <LogIn size={18} />,
      roles: ["manager", "cashier", "barista", "waiter"],
    },
    {
      id: "my_shifts_fulltime",
      label: "Đăng ký ca làm (Full-time)",
      icon: <Calendar size={18} />,
      roles: ["admin", "manager", "cashier", "barista", "waiter"],
      condition: currentRole === "admin" || !isPartTimeStaff,
    },
    {
      id: "my_shifts_parttime",
      label: "Đăng ký ca làm (Part-time)",
      icon: <Clock size={18} />,
      roles: ["admin", "manager", "cashier", "barista", "waiter"],
      condition: currentRole === "admin" || isPartTimeStaff,
    },
    {
      id: "my_timesheet",
      label: "Bảng công của tôi",
      icon: <ClipboardCheck size={18} />,
      roles: ["manager", "cashier", "barista", "waiter"],
    },
    {
      id: "my_payslip",
      label: "Phiếu lương",
      icon: <Receipt size={18} />,
      roles: ["manager", "cashier", "barista", "waiter"],
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
      id: "payroll",
      label: "Bảng lương & Quyết toán",
      icon: <Wallet size={18} />,
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
      roles: ["admin", "manager"],
    },
    {
      id: "ai",
      label: "Gợi ý AI / ML",
      icon: <Bot size={18} />,
      roles: ["admin", "manager"],
    },
  ];

  const allowedMenus = menuList.filter((item) => {
    if (!item.roles.includes(currentRole)) return false;
    if (typeof item.condition === "boolean" && !item.condition) return false;
    return true;
  });

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

          {activeTab === "leave_requests" &&
            (["admin", "manager"].includes(currentRole) ? (
              <LeaveRequestManagement
                currentRole={currentRole}
                onNavigateTab={setActiveTab}
              />
            ) : (
              <MyLeaveRequests />
            ))}

          {activeTab === "my_checkin" && <EmployeeCheckIn />}

          {activeTab === "my_shifts_fulltime" && <FullTimeShiftRegistration />}

          {activeTab === "my_shifts_parttime" && <ShiftRegistration />}

          {activeTab === "my_shifts" && (
            isPartTimeStaff ? <ShiftRegistration /> : <FullTimeShiftRegistration />
          )}

          {activeTab === "my_timesheet" && <MyTimesheet />}

          {activeTab === "my_payslip" && <Payslip />}

          {activeTab === "dashboard" && <WorkingStaffPanel />}

          {activeTab === "reports" && <RevenueReport />}

          {activeTab === "ai" && <AiInsightsManagement />}

          {activeTab === "hr" && (
            <EmployeeManagement currentRole={currentRole} />
          )}

          {activeTab === "payroll" && <PayrollManagement />}

          {activeTab === "shifts_approval" && (
            <ShiftApprovalManagement currentRole={currentRole} />
          )}

          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div
                style={{
                  display: "inline-flex",
                  gap: "0.5rem",
                  background: "#f1f5f9",
                  padding: "6px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  width: "fit-content",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSettingsSubTab("fulltime")}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    backgroundColor:
                      settingsSubTab === "fulltime" ? "#2563eb" : "transparent",
                    color: settingsSubTab === "fulltime" ? "#ffffff" : "#475569",
                    boxShadow:
                      settingsSubTab === "fulltime"
                        ? "0 2px 4px rgba(37, 99, 235, 0.25)"
                        : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  👔 2 Ca Chính (Full-time & Quản lý: Ca A, Ca B)
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubTab("parttime")}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    backgroundColor:
                      settingsSubTab === "parttime" ? "#2563eb" : "transparent",
                    color: settingsSubTab === "parttime" ? "#ffffff" : "#475569",
                    boxShadow:
                      settingsSubTab === "parttime"
                        ? "0 2px 4px rgba(37, 99, 235, 0.25)"
                        : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  🎓 3 Ca Ngắn (Part-time / Sinh viên: Ca 1, Ca 2, Ca 3)
                </button>
              </div>

              {settingsSubTab === "fulltime" ? (
                <FullTimeShiftConfig />
              ) : (
                <PartTimeShiftConfig />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
