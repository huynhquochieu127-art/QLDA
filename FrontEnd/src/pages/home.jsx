import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/home.css";
import PosOrder from "../components/PosOrder";
import TableManagement from "../components/TableManagement";
import CategoryManagement from "../components/CategoryManagement";
import ProductManagement from "../components/ProductManagement";
import OrderManagement from "../components/OrderManagement";
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
  Plus,
  Trash2,
  Edit,
  Award,
  Phone,
  Star,
  ChevronLeft,
  ChevronRight,
  X,
  PlusCircle,
  MinusCircle,
  Cake,
  Gift,
  Loader2,
  Bot,
  FileText,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  // 1. THÔNG TIN NGƯỜI DÙNG & VAI TRÒ
  const userStr =
    sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = userStr
    ? JSON.parse(userStr)
    : { name: "Nguyễn Hải Hậu", role: "Admin" };
  const rawRole = (user.role || user.MaVaiTro || "staff")
    .toString()
    .toLowerCase();

  let currentRole = "staff";
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

  const [activeTab, setActiveTab] = useState(
    currentRole === "staff" ? "pos" : "dashboard",
  );

  // Bàn đang được chọn để tạo đơn tại POS
  const [selectedPosTable, setSelectedPosTable] = useState("Bàn 01");

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

  // Hàm xử lý Đăng xuất triệt để
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  // 2. QUẢN LÝ DỮ LIỆU MYSQL KHÁCH HÀNG
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Modal Controls
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [pointsModalCustomer, setPointsModalCustomer] = useState(null);

  // Form State
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    dob: "",
    email: "",
  });
  const [pointDelta, setPointDelta] = useState("");

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 5;

  const API_URL = "http://localhost:5000/api/customers";

  // Gọi API lấy dữ liệu từ MySQL
  const fetchCustomersFromMySQL = async (searchQuery = "", page = 1) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch(
        `${API_URL}?search=${encodeURIComponent(searchQuery)}&page=${page}&limit=${itemsPerPage}`,
      );

      if (!response.ok) {
        throw new Error("Không thể kết nối đến máy chủ MySQL!");
      }

      const result = await response.json();
      setCustomers(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error("Lỗi kết nối API:", err);
      setErrorMessage(err.message || "Lỗi tải dữ liệu khách hàng từ MySQL.");
    } finally {
      setLoading(false);
    }
  };

  // Debounce tìm kiếm SĐT (tránh spam query xuống MySQL)
  useEffect(() => {
    if (activeTab === "customers") {
      const timer = setTimeout(() => {
        fetchCustomersFromMySQL(customerSearch, currentPage);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [customerSearch, currentPage, activeTab]);

  // Kiểm tra sinh nhật hôm nay
  const isBirthdayToday = (dobString) => {
    if (!dobString) return false;
    const today = new Date();
    const dob = new Date(dobString);
    return (
      today.getDate() === dob.getDate() && today.getMonth() === dob.getMonth()
    );
  };

  // Xử lý Thêm / Sửa khách hàng vào MySQL
  const handleSaveCustomer = async (e) => {
    e.preventDefault();

    try {
      const isEditing = Boolean(editingCustomer);
      const url = isEditing ? `${API_URL}/${editingCustomer.id}` : API_URL;
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Server Backend chưa bật hoặc đường dẫn API bị sai (Server trả về HTML)!",
        );
      }

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || "Thao tác thất bại!");
      }

      alert(isEditing ? "Cập nhật thành công!" : "Thêm thành công!");
      setShowAddModal(false);
      setEditingCustomer(null);
      fetchCustomersFromMySQL(customerSearch, currentPage);
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  // Xóa khách hàng khỏi MySQL
  const handleDeleteCustomer = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa khách hàng này khỏi MySQL?"))
      return;

    try {
      const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Xóa thất bại!");

      alert("Xóa thành công!");
      fetchCustomersFromMySQL(customerSearch, currentPage);
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  // Tích / Trừ điểm trên MySQL
  const handleUpdatePoints = async (action) => {
    const amount = parseInt(pointDelta, 10);
    if (isNaN(amount) || amount <= 0) {
      alert("Nhập số điểm hợp lệ lớn hơn 0!");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/${pointsModalCustomer.id}/points`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, points: amount }),
        },
      );

      if (!response.ok) throw new Error("Lỗi cập nhật điểm!");

      setPointsModalCustomer(null);
      setPointDelta("");
      fetchCustomersFromMySQL(customerSearch, currentPage);
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  // Danh mục Menu (Đã bổ sung Quản lý Hóa đơn & Đơn hàng)
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
      roles: ["staff", "admin", "manager"],
    },
    {
      id: "orders",
      label: "Quản lý Hóa đơn & Đơn hàng",
      icon: <FileText size={18} />,
      roles: ["staff", "admin", "manager"],
    },
    {
      id: "tables",
      label: "Sơ đồ bàn",
      icon: <Grid size={18} />,
      roles: ["staff", "admin", "manager"],
    },
    {
      id: "customers",
      label: "Quản lý khách hàng",
      icon: <UserCheck size={18} />,
      roles: ["staff", "admin", "manager"],
    },
    {
      id: "categories",
      label: "Quản lý Danh mục",
      icon: <Grid size={18} />,
      roles: ["manager", "admin"],
    },
    {
      id: "inventory",
      label: "Quản lý Đồ Uống & Thực Đơn",
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
            QUẢN LÝ ({currentRole.toUpperCase()})
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

        {/* NÚT ĐĂNG XUẤT */}
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
                <span className="user-name">{user.name || "Người dùng"}</span>
                <span className="user-role-badge">
                  {currentRole.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="content-body">
          {/* TAB 1: POS */}
          {activeTab === "pos" && (
            <PosOrder
              selectedTableProp={selectedPosTable}
              onNavigateToTables={() => setActiveTab("tables")}
            />
          )}

          {/* TAB QUẢN LÝ HÓA ĐƠN & ĐƠN HÀNG */}
          {activeTab === "orders" && <OrderManagement />}

          {/* TAB SƠ ĐỒ BÀN */}
          {activeTab === "tables" && (
            <TableManagement
              currentRole={currentRole}
              onSelectTableForPos={(tableName) => {
                setSelectedPosTable(tableName);
                setActiveTab("pos");
              }}
            />
          )}

          {/* TAB QUẢN LÝ DANH MỤC */}
          {activeTab === "categories" && (
            <CategoryManagement currentRole={currentRole} />
          )}

          {/* TAB QUẢN LÝ ĐỒ UỐNG */}
          {activeTab === "inventory" && (
            <ProductManagement currentRole={currentRole} />
          )}

          {/* TAB QUẢN LÝ KHÁCH HÀNG */}
          {activeTab === "customers" && (
            <div className="customers-view">
              <div className="page-header">
                <div>
                  <h2 className="page-title">
                    Quản lý Khách Hàng (MySQL Database)
                  </h2>
                  <p className="page-subtitle">
                    Dữ liệu được lưu trữ trực tiếp trên MySQL - Tra cứu SĐT cực
                    nhanh
                  </p>
                </div>
                <button
                  className="btn-add-customer"
                  onClick={() => {
                    setEditingCustomer(null);
                    setCustomerForm({
                      name: "",
                      phone: "",
                      dob: "",
                      email: "",
                    });
                    setShowAddModal(true);
                  }}
                >
                  <Plus size={18} /> Thêm khách hàng MySQL
                </button>
              </div>

              {/* BỘ TÌM KIẾM */}
              <div className="search-container">
                <div className="search-input-wrapper">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Nhập SĐT hoặc Tên cần tra cứu từ MySQL..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="customer-search-input"
                  />
                  {loading && <Loader2 size={18} className="spinner-icon" />}
                </div>
              </div>

              {errorMessage && (
                <div className="error-banner">{errorMessage}</div>
              )}

              {/* BẢNG DỮ LIỆU MYSQL */}
              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tên khách hàng</th>
                      <th>Số điện thoại</th>
                      <th>Ngày sinh</th>
                      <th>Hạng thẻ</th>
                      <th>Điểm tích lũy</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="loading-cell">
                          <Loader2 size={24} className="spinner" />
                          <span>Đang truy vấn dữ liệu từ MySQL...</span>
                        </td>
                      </tr>
                    ) : customers.length > 0 ? (
                      customers.map((item) => {
                        const isBday = isBirthdayToday(item.dob);
                        return (
                          <tr
                            key={item.id}
                            className={isBday ? "row-birthday" : ""}
                          >
                            <td>
                              <strong>#{item.id}</strong>
                            </td>
                            <td>
                              <div className="customer-name-wrapper">
                                <span>{item.name}</span>
                                {isBday && (
                                  <span className="birthday-tag">
                                    <Gift size={12} /> Sinh nhật
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="cell-flex phone-highlight">
                                <Phone size={14} className="icon-muted" />
                                <strong>{item.phone}</strong>
                              </span>
                            </td>
                            <td>
                              <span className="cell-flex">
                                <Cake size={14} className="icon-muted" />
                                {item.dob
                                  ? new Date(item.dob).toLocaleDateString(
                                      "vi-VN",
                                    )
                                  : "Chưa nhập"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`rank-badge rank-${(item.rank || "Đồng").toLowerCase()}`}
                              >
                                <Star size={12} className="inline-star" />
                                {item.rank || "Đồng"}
                              </span>
                            </td>
                            <td className="points-cell">
                              {item.points || 0} pts
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  title="Tích/Trừ điểm"
                                  onClick={() => setPointsModalCustomer(item)}
                                  className="action-btn btn-award"
                                >
                                  <Award size={16} />
                                </button>
                                <button
                                  title="Chỉnh sửa"
                                  onClick={() => {
                                    setEditingCustomer(item);
                                    setCustomerForm({
                                      name: item.name || "",
                                      phone: item.phone || "",
                                      dob: item.dob || "",
                                      email: item.email || "",
                                    });
                                    setShowAddModal(true);
                                  }}
                                  className="action-btn btn-edit"
                                >
                                  <Edit size={16} />
                                </button>
                                {(currentRole === "admin" ||
                                  currentRole === "manager") && (
                                  <button
                                    title="Xóa khỏi MySQL"
                                    onClick={() =>
                                      handleDeleteCustomer(item.id)
                                    }
                                    className="action-btn btn-delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="empty-table-cell">
                          Không tìm thấy khách hàng nào trong database MySQL!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* PHÂN TRANG */}
                {totalPages > 1 && (
                  <div className="pagination-bar">
                    <span className="pagination-info">
                      Trang {currentPage} / {totalPages}
                    </span>
                    <div className="pagination-buttons">
                      <button
                        disabled={currentPage === 1}
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        className="page-btn"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                        className="page-btn"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* MODAL THÊM / SỬA KHÁCH HÀNG */}
              {showAddModal && (
                <div className="modal-overlay">
                  <div className="modal-container">
                    <div className="modal-header">
                      <h3>
                        {editingCustomer
                          ? "Chỉnh sửa Khách hàng"
                          : "Thêm mới vào MySQL"}
                      </h3>
                      <button
                        onClick={() => setShowAddModal(false)}
                        className="btn-close-modal"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <form onSubmit={handleSaveCustomer}>
                      <div className="form-group">
                        <label>Tên khách hàng (*)</label>
                        <input
                          type="text"
                          value={customerForm.name}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Số điện thoại (*){" "}
                          <small className="text-muted">
                            (Duy nhất trong MySQL)
                          </small>
                        </label>
                        <input
                          type="tel"
                          value={customerForm.phone}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              phone: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Ngày sinh</label>
                        <input
                          type="date"
                          value={customerForm.dob}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              dob: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          value={customerForm.email}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="modal-actions">
                        <button
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          className="btn-cancel"
                        >
                          Hủy
                        </button>
                        <button type="submit" className="btn-save">
                          {editingCustomer ? "Cập nhật MySQL" : "Lưu vào MySQL"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* MODAL TÍCH ĐIỂM */}
              {pointsModalCustomer && (
                <div className="modal-overlay">
                  <div className="modal-container modal-small">
                    <div className="modal-header">
                      <h3>Cập nhật điểm trong MySQL</h3>
                      <button
                        onClick={() => setPointsModalCustomer(null)}
                        className="btn-close-modal"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <p className="points-modal-desc">
                      Khách hàng: <strong>{pointsModalCustomer.name}</strong> (
                      {pointsModalCustomer.points || 0} pts)
                    </p>
                    <div className="form-group">
                      <label>Số điểm điều chỉnh</label>
                      <input
                        type="number"
                        placeholder="Nhập số điểm..."
                        value={pointDelta}
                        onChange={(e) => setPointDelta(e.target.value)}
                      />
                    </div>
                    <div className="points-action-grid">
                      <button
                        onClick={() => handleUpdatePoints("add")}
                        className="btn-points-add"
                      >
                        <PlusCircle size={16} /> Cộng điểm
                      </button>
                      <button
                        onClick={() => handleUpdatePoints("subtract")}
                        className="btn-points-subtract"
                      >
                        <MinusCircle size={16} /> Trừ điểm
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB PLACEHOLDER DÀNH CHO CÁC PHÂN HỆ KHÁC */}
          {activeTab !== "pos" &&
            activeTab !== "orders" &&
            activeTab !== "customers" &&
            activeTab !== "categories" &&
            activeTab !== "inventory" &&
            activeTab !== "tables" && (
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
