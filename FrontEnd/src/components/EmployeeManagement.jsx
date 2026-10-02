import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  CreditCard,
  Mail,
  Shield,
  Briefcase,
  KeyRound,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  Info,
  UserCheck,
  UserX,
  Coffee,
} from "lucide-react";
import "../../css/employee.css";

// Dữ liệu nhân viên khởi tạo mẫu cho Demo Frontend
const INITIAL_EMPLOYEES = [
  {
    id: "NV001",
    fullName: "Nguyễn Hải Hậu",
    phone: "0912345678",
    cccd: "001200001234",
    email: "haihau.admin@coffee.vn",
    role: "admin",
    roleName: "Quản trị viên (Admin)",
    status: "active",
    statusName: "Đang làm việc",
    createdAt: "15/01/2026",
  },
  {
    id: "NV002",
    fullName: "Trần Minh Quang",
    phone: "0987654321",
    cccd: "079201004567",
    email: "quang.tm@coffee.vn",
    role: "manager",
    roleName: "Quản lý cửa hàng",
    status: "active",
    statusName: "Đang làm việc",
    createdAt: "20/02/2026",
  },
  {
    id: "NV003",
    fullName: "Lê Thị Thảo",
    phone: "0345678901",
    cccd: "048203009876",
    email: "thao.lt@gmail.com",
    role: "cashier",
    roleName: "Thu ngân (POS)",
    status: "active",
    statusName: "Đang làm việc",
    createdAt: "05/04/2026",
  },
  {
    id: "NV004",
    fullName: "Phạm Quốc Tuấn",
    phone: "0778899112",
    cccd: "031202008899",
    email: "",
    role: "barista",
    roleName: "Pha chế (Barista)",
    status: "probation",
    statusName: "Thử việc",
    createdAt: "12/09/2026",
  },
];

export default function EmployeeManagement({ currentRole = "admin" }) {
  // Lấy danh sách nhân viên từ localStorage để giữ lại dữ liệu khi F5
  const [employees, setEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem("app_mock_employees");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_EMPLOYEES;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // State Modal Thêm nhân viên
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Form State
  const initialFormState = {
    fullName: "",
    phone: "",
    cccd: "",
    email: "",
    role: "cashier",
    status: "active",
    password: "Password@123",
    note: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [successBanner, setSuccessBanner] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const fullNameInputRef = useRef(null);

  // Lưu danh sách vào localStorage khi có thay đổi
  useEffect(() => {
    localStorage.setItem("app_mock_employees", JSON.stringify(employees));
  }, [employees]);

  // Focus ô đầu tiên khi mở modal
  useEffect(() => {
    if (showAddModal) {
      setTimeout(() => {
        fullNameInputRef.current?.focus();
      }, 150);
    }
  }, [showAddModal]);

  // ========================================================
  // VALIDATION LOGIC CHI TIẾT
  // ========================================================
  const validateField = (name, value, currentValues = formData) => {
    let error = "";

    switch (name) {
      case "fullName":
        if (!value || !value.trim()) {
          error = "Họ và tên là trường bắt buộc!";
        } else if (value.trim().length < 2) {
          error = "Họ và tên phải có ít nhất 2 ký tự!";
        }
        break;

      case "phone":
        if (!value || !value.trim()) {
          error = "Số điện thoại là bắt buộc (dùng làm Tên đăng nhập)!";
        } else {
          const cleanPhone = value.trim();
          // Định dạng số điện thoại Việt Nam: 10 chữ số, bắt đầu bằng 0 (03, 05, 07, 08, 09, v.v.)
          const phoneRegex = /^(0[2|3|5|7|8|9])[0-9]{8}$/;
          if (!phoneRegex.test(cleanPhone)) {
            error = "Số điện thoại không hợp lệ (Phải gồm 10 chữ số, bắt đầu bằng số 0)!";
          } else {
            // Kiểm tra trùng lặp SĐT trong danh sách nhân viên
            const isDuplicate = employees.some(
              (emp) =>
                emp.phone === cleanPhone &&
                (!editingEmployee || emp.id !== editingEmployee.id)
            );
            if (isDuplicate) {
              error = "Số điện thoại này đã được sử dụng làm tên đăng nhập của nhân viên khác!";
            }
          }
        }
        break;

      case "cccd":
        if (!value || !value.trim()) {
          error = "Căn cước công dân là trường bắt buộc!";
        } else {
          const cleanCccd = value.trim();
          // CCCD Việt Nam gồm đúng 12 chữ số
          const cccdRegex = /^[0-9]{12}$/;
          if (!cccdRegex.test(cleanCccd)) {
            error = "Số CCCD phải gồm đúng 12 chữ số hợp lệ!";
          }
        }
        break;

      case "email":
        // Email là trường tùy chọn (Optional). Nếu có nhập thì phải đúng định dạng
        if (value && value.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value.trim())) {
            error = "Định dạng email không hợp lệ (ví dụ: nhanvien@gmail.com)!";
          }
        }
        break;

      default:
        break;
    }

    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Real-time validation nếu trường này đã từng được chạm vào (touched)
      if (touched[name]) {
        const fieldError = validateField(name, value, next);
        setErrors((prevErr) => ({ ...prevErr, [name]: fieldError }));
      }
      return next;
    });
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldError = validateField(name, value, formData);
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  // Validate toàn bộ form trước khi Submit
  const validateAll = () => {
    const newErrors = {};
    const fieldsToValidate = ["fullName", "phone", "cccd", "email"];

    fieldsToValidate.forEach((field) => {
      const error = validateField(field, formData[field], formData);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    setTouched({
      fullName: true,
      phone: true,
      cccd: true,
      email: true,
    });

    return Object.keys(newErrors).length === 0;
  };

  // ========================================================
  // XỬ LÝ LƯU / THÊM MỚI NHÂN VIÊN
  // ========================================================
  const handleSubmit = (e) => {
    e.preventDefault();

    const isValid = validateAll();
    if (!isValid) return;

    const roleMap = {
      admin: "Quản trị viên (Admin)",
      manager: "Quản lý cửa hàng",
      cashier: "Thu ngân (POS)",
      barista: "Pha chế (Barista)",
    };

    const statusMap = {
      active: "Đang làm việc",
      probation: "Thử việc",
      inactive: "Tạm nghỉ",
    };

    if (editingEmployee) {
      // Cập nhật nhân viên cũ
      const updatedList = employees.map((emp) =>
        emp.id === editingEmployee.id
          ? {
              ...emp,
              fullName: formData.fullName.trim(),
              phone: formData.phone.trim(),
              cccd: formData.cccd.trim(),
              email: formData.email.trim(),
              role: formData.role,
              roleName: roleMap[formData.role] || "Nhân viên",
              status: formData.status,
              statusName: statusMap[formData.status] || "Đang làm việc",
              note: formData.note.trim(),
            }
          : emp
      );
      setEmployees(updatedList);
      setSuccessBanner(`Đã cập nhật thông tin nhân viên "${formData.fullName}" thành công!`);
    } else {
      // Thêm nhân viên mới
      const newIdNumber = employees.length + 1;
      const newEmployee = {
        id: `NV${String(newIdNumber).padStart(3, "0")}`,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(), // SĐT làm Username
        cccd: formData.cccd.trim(),
        email: formData.email.trim(),
        role: formData.role,
        roleName: roleMap[formData.role] || "Nhân viên",
        status: formData.status,
        statusName: statusMap[formData.status] || "Đang làm việc",
        createdAt: new Date().toLocaleDateString("vi-VN"),
        note: formData.note.trim(),
      };

      setEmployees([newEmployee, ...employees]);
      setSuccessBanner(
        `Thêm nhân viên mới "${newEmployee.fullName}" thành công! Tên đăng nhập: ${newEmployee.phone}`
      );
    }

    // Đóng Modal và Reset form
    handleCloseModal();
  };

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setFormData(initialFormState);
    setErrors({});
    setTouched({});
    setShowAddModal(true);
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      fullName: emp.fullName || "",
      phone: emp.phone || "",
      cccd: emp.cccd || "",
      email: emp.email || "",
      role: emp.role || "cashier",
      status: emp.status || "active",
      password: "••••••••",
      note: emp.note || "",
    });
    setErrors({});
    setTouched({});
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingEmployee(null);
    setFormData(initialFormState);
    setErrors({});
    setTouched({});
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Bạn có chắc muốn xóa nhân viên "${name}" (Mã: ${id})?`)) {
      setEmployees(employees.filter((emp) => emp.id !== id));
      setSuccessBanner(`Đã xóa nhân viên "${name}" khỏi hệ thống.`);
    }
  };

  const handleToggleStatus = (id) => {
    setEmployees(
      employees.map((emp) => {
        if (emp.id === id) {
          const newStatus = emp.status === "active" ? "inactive" : "active";
          return {
            ...emp,
            status: newStatus,
            statusName: newStatus === "active" ? "Đang làm việc" : "Tạm nghỉ",
          };
        }
        return emp;
      })
    );
  };

  // ========================================================
  // TÌM KIẾM VÀ LỌC DỮ LIỆU
  // ========================================================
  const filteredEmployees = employees.filter((emp) => {
    const matchSearch =
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone.includes(searchTerm) ||
      emp.cccd.includes(searchTerm) ||
      (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchRole = roleFilter === "all" || emp.role === roleFilter;
    const matchStatus = statusFilter === "all" || emp.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  // Đếm thống kê
  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.status === "active").length;
  const cashierCount = employees.filter((e) => e.role === "cashier").length;
  const managerCount = employees.filter(
    (e) => e.role === "manager" || e.role === "admin"
  ).length;

  return (
    <div className="employee-container">
      {/* Banner thông báo thành công */}
      {successBanner && (
        <div className="form-banner-success">
          <CheckCircle2 size={18} />
          <span>{successBanner}</span>
          <button
            onClick={() => setSuccessBanner("")}
            className="emp-modal-close"
            style={{ marginLeft: "auto" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Thống kê nhanh */}
      <div className="employee-stats-grid">
        <div className="employee-stat-card">
          <div className="employee-stat-info">
            <h4>Tổng nhân sự</h4>
            <div className="stat-number">{totalCount}</div>
          </div>
          <div className="employee-stat-icon blue">
            <Users size={24} />
          </div>
        </div>

        <div className="employee-stat-card">
          <div className="employee-stat-info">
            <h4>Đang làm việc</h4>
            <div className="stat-number">{activeCount}</div>
          </div>
          <div className="employee-stat-icon green">
            <UserCheck size={24} />
          </div>
        </div>

        <div className="employee-stat-card">
          <div className="employee-stat-info">
            <h4>Thu ngân (POS)</h4>
            <div className="stat-number">{cashierCount}</div>
          </div>
          <div className="employee-stat-icon purple">
            <Coffee size={24} />
          </div>
        </div>

        <div className="employee-stat-card">
          <div className="employee-stat-info">
            <h4>Quản lý & Admin</h4>
            <div className="stat-number">{managerCount}</div>
          </div>
          <div className="employee-stat-icon amber">
            <Shield size={24} />
          </div>
        </div>
      </div>

      {/* Thanh công cụ: Tìm kiếm, Bộ lọc & Nút Thêm mới */}
      <div className="employee-toolbar">
        <div className="toolbar-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo Họ tên, SĐT (Tên đăng nhập), CCCD..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar-filters">
          <select
            className="filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="manager">Quản lý cửa hàng</option>
            <option value="cashier">Thu ngân (POS)</option>
            <option value="barista">Pha chế (Barista)</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang làm việc</option>
            <option value="probation">Thử việc</option>
            <option value="inactive">Tạm nghỉ</option>
          </select>

          <button className="btn-primary-add" onClick={handleOpenAddModal}>
            <UserPlus size={18} />
            <span>Thêm nhân viên mới</span>
          </button>
        </div>
      </div>

      {/* Bảng danh sách nhân viên */}
      <div className="employee-table-wrapper">
        <table className="employee-table">
          <thead>
            <tr>
              <th>Mã NV</th>
              <th>Nhân viên</th>
              <th>SĐT (Tên đăng nhập)</th>
              <th>Căn cước công dân</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: "right" }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                  <Users size={36} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
                  <p>Không tìm thấy nhân viên nào phù hợp với bộ lọc!</p>
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <strong style={{ color: "#2563eb", fontFamily: "monospace" }}>
                      {emp.id}
                    </strong>
                  </td>
                  <td>
                    <div className="emp-name-cell">
                      <div className="emp-avatar">
                        {emp.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="emp-details">
                        <span className="emp-name">{emp.fullName}</span>
                        <span className="emp-email">
                          {emp.email ? emp.email : <em style={{ color: "#9ca3af" }}>Chưa có email</em>}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="login-tag" title="Tài khoản đăng nhập">
                      <Phone size={12} />
                      {emp.phone}
                    </span>
                  </td>
                  <td>
                    <span className="cccd-cell">{emp.cccd}</span>
                  </td>
                  <td>
                    <span className={`badge-role ${emp.role}`}>
                      {emp.roleName}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-status ${emp.status}`}>
                      <span className="badge-status-dot"></span>
                      {emp.statusName}
                    </span>
                  </td>
                  <td>
                    <div className="emp-actions" style={{ justifyContent: "flex-end" }}>
                      <button
                        className="btn-icon-action"
                        title={emp.status === "active" ? "Khóa tài khoản" : "Kích hoạt"}
                        onClick={() => handleToggleStatus(emp.id)}
                      >
                        {emp.status === "active" ? <Unlock size={15} color="#16a34a" /> : <Lock size={15} color="#dc2626" />}
                      </button>
                      <button
                        className="btn-icon-action"
                        title="Chỉnh sửa thông tin"
                        onClick={() => handleOpenEditModal(emp)}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="btn-icon-action delete"
                        title="Xóa nhân viên"
                        onClick={() => handleDelete(emp.id, emp.fullName)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================
          MODAL FORM THÊM / SỬA NHÂN VIÊN MỚI
          ======================================================== */}
      {showAddModal && (
        <div className="emp-modal-overlay" onClick={handleCloseModal}>
          <div
            className="emp-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="emp-modal-header">
              <div className="emp-modal-title">
                <div className="emp-modal-icon-badge">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3>
                    {editingEmployee
                      ? `Cập nhật nhân viên: ${editingEmployee.id}`
                      : "Thêm Nhân Viên Mới"}
                  </h3>
                  <p>
                    {editingEmployee
                      ? "Chỉnh sửa thông tin hồ sơ nhân viên trong hệ thống"
                      : "Điền thông tin cơ bản để tạo hồ sơ & tài khoản đăng nhập cho nhân viên"}
                  </p>
                </div>
              </div>
              <button
                className="emp-modal-close"
                onClick={handleCloseModal}
                title="Đóng modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="emp-modal-body">
                {/* Banner cảnh báo lỗi tổng quát nếu có trường chưa hợp lệ */}
                {Object.keys(errors).some((k) => errors[k]) && (
                  <div className="form-banner-error">
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Vui lòng kiểm tra lại thông tin:</strong>
                      <div style={{ marginTop: 2 }}>
                        Một số trường thông tin bắt buộc bị thiếu hoặc sai định dạng.
                      </div>
                    </div>
                  </div>
                )}

                <div className="emp-form-grid">
                  {/* TRƯỜNG 1: HỌ TÊN (BẮT BUỘC) */}
                  <div className="emp-form-group full-width">
                    <label className="emp-form-label" htmlFor="fullName">
                      <span>
                        Họ và tên nhân viên <span className="required-mark">*</span>
                      </span>
                    </label>
                    <div className="emp-input-wrapper">
                      <Users size={16} className="emp-input-icon" />
                      <input
                        ref={fullNameInputRef}
                        id="fullName"
                        name="fullName"
                        type="text"
                        placeholder="Ví dụ: Nguyễn Văn An"
                        className={`emp-input ${
                          touched.fullName && errors.fullName ? "is-invalid" : ""
                        }`}
                        value={formData.fullName}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                      />
                    </div>
                    {touched.fullName && errors.fullName && (
                      <div className="field-error-msg">
                        <AlertCircle size={13} /> {errors.fullName}
                      </div>
                    )}
                  </div>

                  {/* TRƯỜNG 2: SỐ ĐIỆN THOẠI / TÊN ĐĂNG NHẬP (BẮT BUỘC) */}
                  <div className="emp-form-group">
                    <label className="emp-form-label" htmlFor="phone">
                      <span>
                        Số điện thoại <span className="required-mark">*</span>
                      </span>
                      <span className="optional-mark" style={{ color: "#2563eb", fontWeight: 600 }}>
                        (Tên đăng nhập)
                      </span>
                    </label>
                    <div className="emp-input-wrapper">
                      <Phone size={16} className="emp-input-icon" />
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        maxLength={10}
                        placeholder="0912345678 (10 số)"
                        className={`emp-input ${
                          touched.phone && errors.phone ? "is-invalid" : ""
                        }`}
                        value={formData.phone}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                      />
                    </div>
                    {touched.phone && errors.phone ? (
                      <div className="field-error-msg">
                        <AlertCircle size={13} /> {errors.phone}
                      </div>
                    ) : (
                      <div className="field-hint-msg">
                        Dùng số điện thoại để nhân viên đăng nhập vào máy POS
                      </div>
                    )}
                  </div>

                  {/* TRƯỜNG 3: CĂN CƯỚC CÔNG DÂN (BẮT BUỘC) */}
                  <div className="emp-form-group">
                    <label className="emp-form-label" htmlFor="cccd">
                      <span>
                        Căn cước công dân (CCCD) <span className="required-mark">*</span>
                      </span>
                    </label>
                    <div className="emp-input-wrapper">
                      <CreditCard size={16} className="emp-input-icon" />
                      <input
                        id="cccd"
                        name="cccd"
                        type="text"
                        maxLength={12}
                        placeholder="12 chữ số theo CCCD"
                        className={`emp-input ${
                          touched.cccd && errors.cccd ? "is-invalid" : ""
                        }`}
                        value={formData.cccd}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                      />
                    </div>
                    {touched.cccd && errors.cccd && (
                      <div className="field-error-msg">
                        <AlertCircle size={13} /> {errors.cccd}
                      </div>
                    )}
                  </div>

                  {/* TRƯỜNG 4: EMAIL (TÙY CHỌN / OPTIONAL) */}
                  <div className="emp-form-group full-width">
                    <label className="emp-form-label" htmlFor="email">
                      <span>Email liên hệ</span>
                      <span className="optional-mark">(Tùy chọn)</span>
                    </label>
                    <div className="emp-input-wrapper">
                      <Mail size={16} className="emp-input-icon" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Ví dụ: nhanvien@coffee.vn (không bắt buộc)"
                        className={`emp-input ${
                          touched.email && errors.email ? "is-invalid" : ""
                        }`}
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                      />
                    </div>
                    {touched.email && errors.email && (
                      <div className="field-error-msg">
                        <AlertCircle size={13} /> {errors.email}
                      </div>
                    )}
                  </div>

                  {/* VAI TRÒ / CHỨC VỤ */}
                  <div className="emp-form-group">
                    <label className="emp-form-label" htmlFor="role">
                      <span>Vai trò & Phân quyền</span>
                    </label>
                    <div className="emp-input-wrapper">
                      <Briefcase size={16} className="emp-input-icon" />
                      <select
                        id="role"
                        name="role"
                        className="emp-input"
                        value={formData.role}
                        onChange={handleInputChange}
                      >
                        <option value="cashier">Thu ngân (POS) - Bán hàng</option>
                        <option value="barista">Pha chế (Barista) - Làm đồ uống</option>
                        <option value="manager">Quản lý ca / Cửa hàng</option>
                        <option value="admin">Quản trị viên (Toàn quyền)</option>
                      </select>
                    </div>
                  </div>

                  {/* TRẠNG THÁI LÀM VIỆC */}
                  <div className="emp-form-group">
                    <label className="emp-form-label" htmlFor="status">
                      <span>Trạng thái hồ sơ</span>
                    </label>
                    <div className="emp-input-wrapper">
                      <Shield size={16} className="emp-input-icon" />
                      <select
                        id="status"
                        name="status"
                        className="emp-input"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="active">Đang làm việc</option>
                        <option value="probation">Thử việc (Đào tạo)</option>
                        <option value="inactive">Tạm nghỉ / Đã nghỉ việc</option>
                      </select>
                    </div>
                  </div>

                  {/* BOX XEM TRƯỚC TÀI KHOẢN ĐĂNG NHẬP */}
                  <div className="emp-form-group full-width">
                    <div className="login-credential-box">
                      <div className="login-credential-box-title">
                        <KeyRound size={15} color="#2563eb" />
                        <span>Xem trước thông tin tài khoản đăng nhập POS</span>
                      </div>
                      <div className="login-credential-preview">
                        <span>
                          Tên đăng nhập:{" "}
                          <strong>{formData.phone ? formData.phone : "(Nhập số điện thoại)"}</strong>
                        </span>
                        <span>
                          Mật khẩu mặc định:{" "}
                          <strong>{formData.password || "Password@123"}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="emp-modal-footer">
                {!editingEmployee && (
                  <button
                    type="button"
                    className="btn-reset-form"
                    onClick={() => {
                      setFormData(initialFormState);
                      setErrors({});
                      setTouched({});
                    }}
                  >
                    Xóa trắng form
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={handleCloseModal}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="btn-submit-save">
                  <UserPlus size={16} />
                  <span>{editingEmployee ? "Lưu thay đổi" : "Tạo nhân viên"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
