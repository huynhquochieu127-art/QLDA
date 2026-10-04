<<<<<<< HEAD
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Search, Filter, RotateCcw } from "lucide-react";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // State quản lý bộ lọc
  const [filters, setFilters] = useState({
    keyword: "",
    role: "all",
    status: "all",
  });

  // Hàm gọi API lấy danh sách nhân viên
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/employees", {
        params: {
          keyword: filters.keyword,
          role: filters.role,
          status: filters.status,
        },
      });
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách nhân viên:", error);
    } finally {
      setLoading(false);
    }
  };

  // Tự động gọi lại API khi thay đổi bộ lọc (Sử dụng debounce cho keyword nếu cần)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 300); // Trễ 300ms để tránh spam API khi gõ phím

    return () => clearTimeout(timer);
  }, [filters]);

  // Thay đổi giá trị các ô input/select
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset bộ lọc
  const handleResetFilters = () => {
    setFilters({
      keyword: "",
      role: "all",
      status: "all",
    });
  };

  return (
    <div className="employee-container p-4">
      {/* KHU VỰC BỘ LỌC VÀ TÌM KIẾM */}
      <div className="filter-bar flex flex-wrap gap-3 mb-4 items-center bg-white p-3 rounded-lg shadow-sm">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            name="keyword"
            value={filters.keyword}
            onChange={handleFilterChange}
            placeholder="Tìm theo tên hoặc số điện thoại..."
            className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Chức vụ */}
        <div className="w-44">
          <select
            name="role"
            value={filters.role}
            onChange={handleFilterChange}
            className="w-full py-2 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả chức vụ</option>
            <option value="manager">Quản lý</option>
            <option value="cashier">Thu ngân</option>
            <option value="barista">Pha chế</option>
            <option value="waiter">Phục vụ</option>
          </select>
        </div>

        {/* Filter Trạng thái */}
        <div className="w-44">
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="w-full py-2 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang làm việc</option>
            <option value="inactive">Đã nghỉ việc</option>
          </select>
        </div>

        {/* Nút Reset bộ lọc */}
        <button
          onClick={handleResetFilters}
          className="flex items-center gap-1 px-3 py-2 border rounded-md hover:bg-gray-100 text-gray-600"
          title="Đặt lại bộ lọc"
        >
          <RotateCcw size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* BẢNG DANH SÁCH NHÂN VIÊN */}
      <div className="table-wrapper bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 font-semibold">STT</th>
              <th className="p-3 font-semibold">Họ và tên</th>
              <th className="p-3 font-semibold">Số điện thoại</th>
              <th className="p-3 font-semibold">Chức vụ</th>
              <th className="p-3 font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center p-4">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : employees.length > 0 ? (
              employees.map((emp, index) => (
                <tr key={emp.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3 font-medium">{emp.name}</td>
                  <td className="p-3">{emp.phone}</td>
                  <td className="p-3">
                    <span className="capitalize px-2 py-1 bg-blue-50 text-blue-600 rounded text-sm">
                      {emp.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        emp.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {emp.status === "active" ? "Đang làm" : "Đã nghỉ"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center p-4 text-gray-500">
                  Không tìm thấy nhân viên nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeManagement;
=======
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
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
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  RotateCcw,
  RefreshCw,
  DollarSign,
  Coins,
  History,
  TrendingUp,
  Calendar,
  Sparkles,
  FileEdit,
} from "lucide-react";
import "../../css/employee.css";

// ========================================================
// HÀM TIỆN ÍCH: ĐỌC SỐ TIỀN THÀNH CHỮ TIẾNG VIỆT (QH-27)
// Giúp Admin dễ nhìn, tránh gõ nhầm số 0 (vd: 5,000,000 -> Năm triệu đồng)
// ========================================================
function convertNumberToVietnameseWords(num) {
  if (!num || isNaN(num) || num <= 0) return "";
  const defaultNumbers = [
    "không",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];

  function readGroupThree(a, b, c, readZeroHundred = true) {
    let str = "";
    if (a !== 0 || readZeroHundred) {
      str += defaultNumbers[a] + " trăm ";
    }
    if (b === 0 && c === 0) return str;
    if (b === 0 && c !== 0) {
      str += "lẻ " + defaultNumbers[c];
      return str;
    }
    if (b === 1) {
      str += "mười ";
    } else {
      str += defaultNumbers[b] + " mươi ";
    }
    if (c === 1) {
      str += b <= 1 ? "một" : "mốt";
    } else if (c === 5) {
      str += "lăm";
    } else if (c !== 0) {
      str += defaultNumbers[c];
    }
    return str;
  }

  const s = Math.round(num).toString();
  const groups = [];
  for (let i = s.length; i > 0; i -= 3) {
    groups.unshift(s.slice(Math.max(0, i - 3), i));
  }

  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"];
  let res = "";

  for (let i = 0; i < groups.length; i++) {
    const g = parseInt(groups[i], 10);
    if (g === 0) continue;
    const pad = groups[i].padStart(3, "0");
    const a = parseInt(pad[0], 10);
    const b = parseInt(pad[1], 10);
    const c = parseInt(pad[2], 10);

    const isFirst = i === 0;
    const text = readGroupThree(a, b, c, !isFirst);
    const unit = units[groups.length - 1 - i];
    res += text.trim() + " " + unit + " ";
  }

  res = res.trim();
  if (!res) return "";
  return res.charAt(0).toUpperCase() + res.slice(1) + " đồng";
}

// Định dạng số có dấu phẩy ngăn cách hàng nghìn (ví dụ: 5000000 -> "5,000,000")
function formatCurrencyString(rawStr) {
  if (!rawStr) return "";
  const numericOnly = rawStr.toString().replace(/\D/g, "");
  if (!numericOnly) return "";
  return numericOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Chuyển chuỗi định dạng phẩy về số nguyên
function parseFormattedToNumber(formattedStr) {
  if (!formattedStr) return 0;
  return Number(formattedStr.toString().replace(/\D/g, "")) || 0;
}

// Dữ liệu nhân viên khởi tạo mẫu cho Demo Frontend & Fallback khi chưa có MySQL
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
    note: "Quản lý toàn bộ hệ thống quán",
    // Dữ liệu mức lương (QH-27)
    salaryType: "monthly",
    baseSalary: 12000000,
    allowance: 1500000,
    salaryEffectiveDate: "01/01/2026",
    salaryHistory: [
      {
        id: "SAL-01",
        changeDate: "01/01/2026",
        oldSalary: 10000000,
        newSalary: 12000000,
        salaryType: "monthly",
        allowance: 1500000,
        reason: "Điều chỉnh lương đầu năm 2026",
        changedBy: "Hội đồng quản trị",
      },
    ],
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
    note: "Phụ trách ca sáng và kho nguyên liệu",
    salaryType: "monthly",
    baseSalary: 8500000,
    allowance: 1000000,
    salaryEffectiveDate: "01/03/2026",
    salaryHistory: [
      {
        id: "SAL-02",
        changeDate: "01/03/2026",
        oldSalary: 7500000,
        newSalary: 8500000,
        salaryType: "monthly",
        allowance: 1000000,
        reason: "Tăng lương chính thức sau thử việc",
        changedBy: "Admin",
      },
    ],
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
    note: "Chuyên thu ngân quầy chính",
    salaryType: "hourly",
    baseSalary: 28000,
    allowance: 300000,
    salaryEffectiveDate: "15/04/2026",
    salaryHistory: [
      {
        id: "SAL-03",
        changeDate: "15/04/2026",
        oldSalary: 25000,
        newSalary: 28000,
        salaryType: "hourly",
        allowance: 300000,
        reason: "Đạt chỉ tiêu chuyên cần & thu ngân xuất sắc",
        changedBy: "Admin",
      },
    ],
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
    note: "Học việc pha chế ca chiều",
    salaryType: "hourly",
    baseSalary: 23000,
    allowance: 0,
    salaryEffectiveDate: "12/09/2026",
    salaryHistory: [],
  },
  {
    id: "NV005",
    fullName: "Vũ Hoàng Yến",
    phone: "0934112233",
    cccd: "025204001122",
    email: "hoangyen@coffee.vn",
    role: "cashier",
    roleName: "Thu ngân (POS)",
    status: "active",
    statusName: "Đang làm việc",
    createdAt: "18/08/2026",
    note: "Ca tối thứ 2 đến thứ 6",
    salaryType: "hourly",
    baseSalary: 26000,
    allowance: 200000,
    salaryEffectiveDate: "01/09/2026",
    salaryHistory: [],
  },
  {
    id: "NV006",
    fullName: "Đỗ Đăng Khoa",
    phone: "0908776655",
    cccd: "001202003344",
    email: "khoa.dd@gmail.com",
    role: "barista",
    roleName: "Pha chế (Barista)",
    status: "inactive",
    statusName: "Tạm nghỉ",
    createdAt: "10/03/2026",
    note: "Đang bảo lưu việc học",
    salaryType: "hourly",
    baseSalary: 25000,
    allowance: 0,
    salaryEffectiveDate: "10/03/2026",
    salaryHistory: [],
  },
];

export default function EmployeeManagement({ currentRole = "admin" }) {
  // Lấy danh sách nhân viên từ localStorage
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

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Sắp xếp
  const [sortField, setSortField] = useState("id");
  const [sortOrder, setSortOrder] = useState("asc");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null); // Modal Xem chi tiết hồ sơ
  const [profileActiveTab, setProfileActiveTab] = useState("info"); // 'info' | 'salary'

  // ========================================================
  // STATE THIẾT LẬP MỨC LƯƠNG CHO ADMIN (QH-27)
  // ========================================================
  const [salaryModalEmployee, setSalaryModalEmployee] = useState(null);
  const [salaryForm, setSalaryForm] = useState({
    salaryType: "hourly",
    baseSalaryFormatted: "",
    allowanceFormatted: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: "Điều chỉnh lương định kỳ",
  });

  // Form State Thêm nhân viên mới
  const initialFormState = {
    fullName: "",
    phone: "",
    cccd: "",
    email: "",
    role: "cashier",
    status: "active",
    password: "Password@123",
    note: "",
    salaryType: "hourly",
    baseSalaryFormatted: "25,000",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [successBanner, setSuccessBanner] = useState("");

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
  // LOGIC THIẾT LẬP MỨC LƯƠNG (QH-27)
  // ========================================================
  const handleOpenSalaryModal = (emp) => {
    setSalaryModalEmployee(emp);
    const isHourly = (emp.salaryType || "hourly") === "hourly";
    const currentBase = emp.baseSalary || (isHourly ? 25000 : 6000000);
    const currentAllow = emp.allowance || 0;

    setSalaryForm({
      salaryType: emp.salaryType || "hourly",
      baseSalaryFormatted: formatCurrencyString(currentBase.toString()),
      allowanceFormatted: currentAllow > 0 ? formatCurrencyString(currentAllow.toString()) : "",
      effectiveDate: new Date().toISOString().slice(0, 10),
      reason: "Điều chỉnh lương theo năng lực",
    });
  };

  const handleCloseSalaryModal = () => {
    setSalaryModalEmployee(null);
  };

  // Cập nhật ô tiền có ngăn cách hàng nghìn tự động
  const handleSalaryAmountChange = (e) => {
    const rawVal = e.target.value;
    const formatted = formatCurrencyString(rawVal);
    setSalaryForm((prev) => ({
      ...prev,
      baseSalaryFormatted: formatted,
    }));
  };

  const handleAllowanceChange = (e) => {
    const rawVal = e.target.value;
    const formatted = formatCurrencyString(rawVal);
    setSalaryForm((prev) => ({
      ...prev,
      allowanceFormatted: formatted,
    }));
  };

  // Nút chọn nhanh số tiền (Quick Presets)
  const handleSelectQuickSalary = (amount) => {
    setSalaryForm((prev) => ({
      ...prev,
      baseSalaryFormatted: formatCurrencyString(amount.toString()),
    }));
  };

  // Lưu thiết lập mức lương mới
  const handleSaveSalary = (e) => {
    e.preventDefault();
    if (!salaryModalEmployee) return;

    const numericBase = parseFormattedToNumber(salaryForm.baseSalaryFormatted);
    const numericAllowance = parseFormattedToNumber(salaryForm.allowanceFormatted);

    if (numericBase <= 0) {
      alert("Vui lòng nhập mức lương hợp lệ lớn hơn 0!");
      return;
    }

    const oldSalary = salaryModalEmployee.baseSalary || 0;
    const newSalaryRecord = {
      id: `SAL-${Date.now()}`,
      changeDate: new Date(salaryForm.effectiveDate).toLocaleDateString("vi-VN"),
      oldSalary: oldSalary,
      newSalary: numericBase,
      salaryType: salaryForm.salaryType,
      allowance: numericAllowance,
      reason: salaryForm.reason || "Cập nhật mức lương",
      changedBy: "Admin",
    };

    const updatedEmployees = employees.map((emp) => {
      if (emp.id === salaryModalEmployee.id) {
        const history = emp.salaryHistory ? [newSalaryRecord, ...emp.salaryHistory] : [newSalaryRecord];
        return {
          ...emp,
          salaryType: salaryForm.salaryType,
          baseSalary: numericBase,
          allowance: numericAllowance,
          salaryEffectiveDate: new Date(salaryForm.effectiveDate).toLocaleDateString("vi-VN"),
          salaryHistory: history,
        };
      }
      return emp;
    });

    setEmployees(updatedEmployees);

    // Nếu đang mở xem profile thì cập nhật profile luôn
    if (viewingProfile && viewingProfile.id === salaryModalEmployee.id) {
      setViewingProfile((prev) => ({
        ...prev,
        salaryType: salaryForm.salaryType,
        baseSalary: numericBase,
        allowance: numericAllowance,
        salaryEffectiveDate: new Date(salaryForm.effectiveDate).toLocaleDateString("vi-VN"),
        salaryHistory: [newSalaryRecord, ...(prev.salaryHistory || [])],
      }));
    }

    const unitStr = salaryForm.salaryType === "hourly" ? "VNĐ/giờ" : "VNĐ/tháng";
    setSuccessBanner(
      `Đã thiết lập mức lương mới cho nhân viên "${salaryModalEmployee.fullName}": ${formatCurrencyString(
        numericBase.toString()
      )} ${unitStr} (Hiệu lực từ ${new Date(salaryForm.effectiveDate).toLocaleDateString("vi-VN")})`
    );

    handleCloseSalaryModal();
  };

  // ========================================================
  // VALIDATION FORM LOGIC THÊM NHÂN VIÊN (QH-22)
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
          const phoneRegex = /^(0[2|3|5|7|8|9])[0-9]{8}$/;
          if (!phoneRegex.test(cleanPhone)) {
            error = "Số điện thoại không hợp lệ (Phải gồm 10 chữ số, bắt đầu bằng số 0)!";
          } else {
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
          const cccdRegex = /^[0-9]{12}$/;
          if (!cccdRegex.test(cleanCccd)) {
            error = "Số CCCD phải gồm đúng 12 chữ số hợp lệ!";
          }
        }
        break;

      case "email":
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

  // Submit Thêm / Cập nhật nhân viên
  const handleSubmit = async (e) => {
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
      const newIdNumber = employees.length + 1;
      const newEmployee = {
        id: `NV${String(newIdNumber).padStart(3, "0")}`,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        cccd: formData.cccd.trim(),
        email: formData.email.trim(),
        role: formData.role,
        roleName: roleMap[formData.role] || "Nhân viên",
        status: formData.status,
        statusName: statusMap[formData.status] || "Đang làm việc",
        createdAt: new Date().toLocaleDateString("vi-VN"),
        note: formData.note.trim(),
        salaryType: "hourly",
        baseSalary: 25000,
        allowance: 0,
        salaryEffectiveDate: new Date().toLocaleDateString("vi-VN"),
        salaryHistory: [],
      };

      setEmployees([newEmployee, ...employees]);
      setSuccessBanner(
        `Thêm nhân viên mới "${newEmployee.fullName}" thành công! Tên đăng nhập: ${newEmployee.phone}`
      );
    }

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

  const handleResetPassword = (emp) => {
    if (
      window.confirm(
        `Cấp lại mật khẩu mặc định (Password@123) cho nhân viên "${emp.fullName}" (Tên đăng nhập: ${emp.phone})?`
      )
    ) {
      setSuccessBanner(
        `Đã đặt lại mật khẩu mặc định "Password@123" cho tài khoản ${emp.phone}.`
      );
    }
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}" (Mã: ${id}) khỏi hệ thống?`)) {
      setEmployees(employees.filter((emp) => emp.id !== id));
      setSuccessBanner(`Đã xóa nhân viên "${name}" khỏi danh sách.`);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Mã NV",
      "Họ và tên",
      "Số điện thoại (Username)",
      "CCCD",
      "Email",
      "Chức vụ",
      "Hình thức lương",
      "Mức lương cơ bản (VNĐ)",
      "Phụ cấp (VNĐ)",
      "Trạng thái",
      "Ngày tạo",
    ];
    const rows = employees.map((e) => [
      e.id,
      `"${e.fullName}"`,
      `"${e.phone}"`,
      `"${e.cccd}"`,
      `"${e.email || ""}"`,
      `"${e.roleName}"`,
      `"${e.salaryType === "hourly" ? "Theo giờ" : "Cố định tháng"}"`,
      e.baseSalary || 0,
      e.allowance || 0,
      `"${e.statusName}"`,
      `"${e.createdAt}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Danh_sach_nhan_su_va_luong_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredEmployees = employees
    .filter((emp) => {
      const matchSearch =
        emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.phone.includes(searchTerm) ||
        emp.cccd.includes(searchTerm) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRole = roleFilter === "all" || emp.role === roleFilter;
      const matchStatus = statusFilter === "all" || emp.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    })
    .sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedEmployees = filteredEmployees.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.status === "active").length;
  const cashierCount = employees.filter((e) => e.role === "cashier").length;
  const managerCount = employees.filter(
    (e) => e.role === "manager" || e.role === "admin"
  ).length;

  // Tính số tiền dạng số thuần từ form lương
  const currentFormBaseSalaryNum = parseFormattedToNumber(
    salaryForm.baseSalaryFormatted
  );
  const wordsOfBaseSalary = convertNumberToVietnameseWords(
    currentFormBaseSalaryNum
  );

  return (
    <div className="employee-container">
      {/* Banner thông báo */}
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

      {/* THỐNG KÊ NHANH (KPI CARDS) */}
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

      {/* THANH CÔNG CỤ: TÌM KIẾM, LỌC, XUẤT CSV, THÊM MỚI */}
      <div className="employee-toolbar">
        <div className="toolbar-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo Họ tên, SĐT (Tên đăng nhập), CCCD, Email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="toolbar-filters">
          <select
            className="filter-select"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Tất cả chức vụ</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="manager">Quản lý cửa hàng</option>
            <option value="cashier">Thu ngân (POS)</option>
            <option value="barista">Pha chế (Barista)</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang làm việc</option>
            <option value="probation">Thử việc</option>
            <option value="inactive">Tạm nghỉ</option>
          </select>

          <button
            className="btn-export-csv"
            onClick={handleExportCSV}
            title="Xuất dữ liệu Excel"
          >
            <Download size={16} />
            <span>Xuất Excel</span>
          </button>

          <button className="btn-primary-add" onClick={handleOpenAddModal}>
            <UserPlus size={18} />
            <span>Thêm nhân viên mới</span>
          </button>
        </div>
      </div>

      {/* BẢNG QUẢN LÝ DANH SÁCH NHÂN SỰ & MỨC LƯƠNG */}
      <div className="employee-table-wrapper">
        <table className="employee-table">
          <thead>
            <tr>
              <th className="sortable-th" onClick={() => handleSort("id")}>
                <div className="th-content">
                  Mã NV <ArrowUpDown size={13} />
                </div>
              </th>
              <th className="sortable-th" onClick={() => handleSort("fullName")}>
                <div className="th-content">
                  Họ và tên nhân viên <ArrowUpDown size={13} />
                </div>
              </th>
              <th>SĐT (Tên đăng nhập)</th>
              <th>Căn cước công dân</th>
              <th>Chức vụ</th>
              <th>Mức lương hiện tại</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: "right" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {displayedEmployees.length === 0 ? (
              <tr>
                <td
                  colSpan="8"
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#6b7280",
                  }}
                >
                  <Users
                    size={36}
                    style={{ margin: "0 auto 10px", opacity: 0.4 }}
                  />
                  <p>Không tìm thấy nhân viên nào phù hợp!</p>
                </td>
              </tr>
            ) : (
              displayedEmployees.map((emp) => {
                const isHourly = (emp.salaryType || "hourly") === "hourly";
                const baseSal = emp.baseSalary || (isHourly ? 25000 : 6000000);

                return (
                  <tr key={emp.id}>
                    <td>
                      <strong
                        style={{ color: "#2563eb", fontFamily: "monospace" }}
                      >
                        {emp.id}
                      </strong>
                    </td>
                    <td>
                      <div className="emp-name-cell">
                        <div className="emp-avatar">
                          {emp.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="emp-details">
                          <span
                            className="emp-name"
                            style={{ cursor: "pointer", color: "#0f172a" }}
                            onClick={() => {
                              setViewingProfile(emp);
                              setProfileActiveTab("info");
                            }}
                            title="Xem chi tiết hồ sơ"
                          >
                            {emp.fullName}
                          </span>
                          <span className="emp-email">
                            {emp.email ? (
                              emp.email
                            ) : (
                              <em style={{ color: "#9ca3af" }}>Chưa có email</em>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="login-tag" title="Tài khoản đăng nhập POS">
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
                    {/* CỘT MỨC LƯƠNG HIỆN TẠI (QH-27) */}
                    <td>
                      <div className="badge-salary">
                        <span className="salary-amount-highlight">
                          {formatCurrencyString(baseSal.toString())}{" "}
                          {isHourly ? "đ/h" : "đ/tháng"}
                        </span>
                        {emp.allowance > 0 && (
                          <span className="salary-sub-text">
                            + {formatCurrencyString(emp.allowance.toString())} đ phụ cấp
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge-status ${emp.status}`}>
                        <span className="badge-status-dot"></span>
                        {emp.statusName}
                      </span>
                    </td>
                    <td>
                      <div
                        className="emp-actions"
                        style={{ justifyContent: "flex-end" }}
                      >
                        {/* NÚT THIẾT LẬP MỨC LƯƠNG (QH-27) */}
                        <button
                          className="btn-icon-action"
                          title="Thiết lập mức lương cho nhân viên"
                          style={{
                            color: "#047857",
                            background: "#ecfdf5",
                            borderColor: "#a7f3d0",
                          }}
                          onClick={() => handleOpenSalaryModal(emp)}
                        >
                          <Coins size={15} />
                        </button>

                        {/* Xem chi tiết */}
                        <button
                          className="btn-icon-action"
                          title="Xem chi tiết hồ sơ & lương"
                          onClick={() => {
                            setViewingProfile(emp);
                            setProfileActiveTab("info");
                          }}
                        >
                          <Eye size={15} color="#2563eb" />
                        </button>

                        {/* Khóa / Kích hoạt tài khoản */}
                        <button
                          className="btn-icon-action"
                          title={
                            emp.status === "active"
                              ? "Khóa tài khoản"
                              : "Mở khóa tài khoản"
                          }
                          onClick={() => handleToggleStatus(emp.id)}
                        >
                          {emp.status === "active" ? (
                            <Unlock size={15} color="#16a34a" />
                          ) : (
                            <Lock size={15} color="#dc2626" />
                          )}
                        </button>

                        {/* Đặt lại mật khẩu */}
                        <button
                          className="btn-icon-action"
                          title="Cấp lại mật khẩu mặc định"
                          onClick={() => handleResetPassword(emp)}
                        >
                          <RotateCcw size={15} color="#d97706" />
                        </button>

                        {/* Chỉnh sửa */}
                        <button
                          className="btn-icon-action"
                          title="Chỉnh sửa thông tin"
                          onClick={() => handleOpenEditModal(emp)}
                        >
                          <Edit2 size={15} />
                        </button>

                        {/* Xóa */}
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
                );
              })
            )}
          </tbody>
        </table>

        {/* THANH PHÂN TRANG */}
        <div className="emp-pagination-bar">
          <div className="emp-pagination-info">
            Hiển thị{" "}
            <strong>
              {totalItems === 0 ? 0 : startIndex + 1} -{" "}
              {Math.min(startIndex + itemsPerPage, totalItems)}
            </strong>{" "}
            trong tổng số <strong>{totalItems}</strong> nhân viên
          </div>

          <div className="emp-pagination-controls">
            <span style={{ fontSize: 13, color: "#64748b", marginRight: 6 }}>
              Số hàng:
            </span>
            <select
              className="emp-per-page-select"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5 hàng</option>
              <option value={10}>10 hàng</option>
              <option value={20}>20 hàng</option>
            </select>

            <button
              className="emp-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Trang trước"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`emp-page-btn ${
                  currentPage === page ? "active" : ""
                }`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              className="emp-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="Trang tiếp"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          MODAL THIẾT LẬP MỨC LƯƠNG CHO ADMIN (QH-27)
          ======================================================== */}
      {salaryModalEmployee && (
        <div
          className="emp-modal-overlay"
          onClick={handleCloseSalaryModal}
        >
          <div
            className="emp-modal-content salary-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="emp-modal-header">
              <div className="emp-modal-title">
                <div
                  className="emp-modal-icon-badge"
                  style={{ background: "#ecfdf5", color: "#047857" }}
                >
                  <Coins size={22} />
                </div>
                <div>
                  <h3>Thiết lập mức lương cho Admin</h3>
                  <p>
                    Điều chỉnh chế độ đãi ngộ & lương cho:{" "}
                    <strong>{salaryModalEmployee.fullName}</strong> ({salaryModalEmployee.id})
                  </p>
                </div>
              </div>
              <button
                className="emp-modal-close"
                onClick={handleCloseSalaryModal}
                title="Đóng modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSalary}>
              <div className="emp-modal-body">
                {/* Khối hiển thị thông tin Lương hiện tại đang áp dụng */}
                <div className="salary-current-box">
                  <div className="salary-current-info">
                    <h5>Mức lương hiện tại đang áp dụng</h5>
                    <div className="current-salary-val">
                      {formatCurrencyString(
                        (salaryModalEmployee.baseSalary || 0).toString()
                      )}{" "}
                      {salaryModalEmployee.salaryType === "monthly"
                        ? "VNĐ / tháng"
                        : "VNĐ / giờ"}
                    </div>
                    <div className="current-salary-date">
                      Áp dụng từ:{" "}
                      <strong>
                        {salaryModalEmployee.salaryEffectiveDate || "Chưa xác định"}
                      </strong>
                      {salaryModalEmployee.allowance > 0 &&
                        ` | Phụ cấp: ${formatCurrencyString(
                          salaryModalEmployee.allowance.toString()
                        )} VNĐ`}
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#dcfce7",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#166534",
                      }}
                    >
                      {salaryModalEmployee.roleName}
                    </span>
                  </div>
                </div>

                {/* Chọn loại hình lương */}
                <div className="emp-form-group full-width">
                  <label className="emp-form-label">
                    <span>Hình thức trả lương</span>
                  </label>
                  <div className="salary-type-tabs">
                    <label
                      className={`salary-type-card ${
                        salaryForm.salaryType === "hourly" ? "active" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="salaryType"
                        value="hourly"
                        checked={salaryForm.salaryType === "hourly"}
                        onChange={() => {
                          setSalaryForm((prev) => ({
                            ...prev,
                            salaryType: "hourly",
                            baseSalaryFormatted: formatCurrencyString(
                              (prev.salaryType === "hourly"
                                ? parseFormattedToNumber(prev.baseSalaryFormatted) || 28000
                                : 28000
                              ).toString()
                            ),
                          }));
                        }}
                      />
                      <div className="salary-type-label">
                        <strong>Lương theo giờ (Part-time)</strong>
                        <span>Tính theo số giờ làm việc thực tế tại quầy</span>
                      </div>
                    </label>

                    <label
                      className={`salary-type-card ${
                        salaryForm.salaryType === "monthly" ? "active" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="salaryType"
                        value="monthly"
                        checked={salaryForm.salaryType === "monthly"}
                        onChange={() => {
                          setSalaryForm((prev) => ({
                            ...prev,
                            salaryType: "monthly",
                            baseSalaryFormatted: formatCurrencyString(
                              (prev.salaryType === "monthly"
                                ? parseFormattedToNumber(prev.baseSalaryFormatted) || 7500000
                                : 7500000
                              ).toString()
                            ),
                          }));
                        }}
                      />
                      <div className="salary-type-label">
                        <strong>Lương cứng cố định (Full-time)</strong>
                        <span>Lương khoán cố định theo tháng</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* FORM NHẬP LIỆU SỐ TIỀN CÓ ĐỊNH DẠNG NGĂN CÁCH HÀNG NGHÌN (QH-27) */}
                <div className="emp-form-group full-width">
                  <label className="emp-form-label" htmlFor="baseSalaryInput">
                    <span>
                      Mức lương cơ bản mới <span className="required-mark">*</span>
                    </span>
                    <span className="optional-mark" style={{ color: "#047857", fontWeight: 600 }}>
                      {salaryForm.salaryType === "hourly" ? "(VNĐ / Giờ)" : "(VNĐ / Tháng)"}
                    </span>
                  </label>

                  <div className="salary-input-box-wrapper">
                    <span className="currency-icon">₫</span>
                    <input
                      id="baseSalaryInput"
                      type="text"
                      className="salary-currency-input"
                      placeholder={
                        salaryForm.salaryType === "hourly"
                          ? "Ví dụ: 28,000"
                          : "Ví dụ: 5,000,000"
                      }
                      value={salaryForm.baseSalaryFormatted}
                      onChange={handleSalaryAmountChange}
                      required
                    />
                    <span className="currency-unit-badge">
                      {salaryForm.salaryType === "hourly" ? "VNĐ / giờ" : "VNĐ / tháng"}
                    </span>
                  </div>

                  {/* DÒNG ĐỌC SỐ TIỀN THÀNH CHỮ TIẾNG VIỆT ĐỂ TRÁNH GÕ NHẦM SỐ 0 */}
                  {wordsOfBaseSalary && (
                    <div className="money-in-words-box">
                      <Sparkles size={14} color="#059669" />
                      <span>
                        <strong>Bằng chữ:</strong> {wordsOfBaseSalary}
                      </span>
                    </div>
                  )}

                  {/* NÚT CHỌN NHANH SỐ TIỀN PHỔ BIẾN (PRESETS) */}
                  <div className="quick-salary-presets">
                    <span>Mức gợi ý:</span>
                    {salaryForm.salaryType === "hourly" ? (
                      <>
                        <button
                          type="button"
                          className="btn-preset-val"
                          onClick={() => handleSelectQuickSalary(22000)}
                        >
                          22,000 đ
                        </button>
                        <button
                          type="button"
                          className="btn-preset-val"
                          onClick={() => handleSelectQuickSalary(25000)}
                        >
                          25,000 đ
                        </button>
                        <button
                          type="button"
                          className="btn-preset-val"
                          onClick={() => handleSelectQuickSalary(28000)}
                        >
                          28,000 đ
                        </button>
                        <button
                          type="button"
                          className="btn-preset-val"
                          onClick={() => handleSelectQuickSalary(30000)}
                        >
                          30,000 đ
                        </button>
                        <button
                          type="button"
                          className="btn-preset-val"
                          onClick={() => handleSelectQuickSalary(35000)}
                        >
                          35,000 đ
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn-preset-val"
                          onClick={() => handleSelectQuickSalary(5000000)}
                        >
                          5,000,000 đ
                        </button>
                        <button
                          type="button"
                          className="btn-preset-val"
                          onClick={() => handleSelectQuickSalary(6500000)}
                        >
                          6,500,000 đ
                        </button>
                        <button
                          type="button"
                          className="btn-preset-val"
                          onClick={() => handleSelectQuickSalary(8000000)}
                        >
                          8,000,000 đ
                        </button>
                        <button
                          type="button"
                          className="btn-preset-val"
                          onClick={() => handleSelectQuickSalary(10000000)}
                        >
                          10,000,000 đ
                        </button>
                        <button
                          type="button"
                          className="btn-preset-val"
                          onClick={() => handleSelectQuickSalary(12000000)}
                        >
                          12,000,000 đ
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="emp-form-grid">
                  {/* Ô NHẬP PHỤ CẤP */}
                  <div className="emp-form-group">
                    <label className="emp-form-label" htmlFor="allowanceInput">
                      <span>Phụ cấp hàng tháng</span>
                      <span className="optional-mark">(Tùy chọn)</span>
                    </label>
                    <div className="salary-input-box-wrapper">
                      <span className="currency-icon" style={{ fontSize: 14 }}>₫</span>
                      <input
                        id="allowanceInput"
                        type="text"
                        className="emp-input"
                        style={{ paddingLeft: 34, fontWeight: 600, fontFamily: "monospace" }}
                        placeholder="Ví dụ: 500,000"
                        value={salaryForm.allowanceFormatted}
                        onChange={handleAllowanceChange}
                      />
                    </div>
                    {salaryForm.allowanceFormatted && (
                      <span style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                        {convertNumberToVietnameseWords(
                          parseFormattedToNumber(salaryForm.allowanceFormatted)
                        )}
                      </span>
                    )}
                  </div>

                  {/* NGÀY HIỆU LỰC */}
                  <div className="emp-form-group">
                    <label className="emp-form-label" htmlFor="effectiveDate">
                      <span>Ngày bắt đầu áp dụng</span>
                    </label>
                    <input
                      id="effectiveDate"
                      type="date"
                      className="emp-input"
                      value={salaryForm.effectiveDate}
                      onChange={(e) =>
                        setSalaryForm({
                          ...salaryForm,
                          effectiveDate: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  {/* LÝ DO ĐIỀU CHỈNH */}
                  <div className="emp-form-group full-width">
                    <label className="emp-form-label" htmlFor="salaryReason">
                      <span>Lý do / Căn cứ điều chỉnh lương</span>
                    </label>
                    <input
                      id="salaryReason"
                      type="text"
                      className="emp-input"
                      placeholder="Ví dụ: Tăng lương định kỳ 6 tháng, Tăng sau thử việc..."
                      value={salaryForm.reason}
                      onChange={(e) =>
                        setSalaryForm({
                          ...salaryForm,
                          reason: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="emp-modal-footer">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={handleCloseSalaryModal}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-submit-save"
                  style={{ background: "#059669" }}
                >
                  <Coins size={16} />
                  <span>Xác nhận & Lưu mức lương</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL XEM CHI TIẾT HỒ SƠ NHÂN VIÊN & TAB LƯƠNG (QH-27)
          ======================================================== */}
      {viewingProfile && (
        <div
          className="emp-modal-overlay"
          onClick={() => setViewingProfile(null)}
        >
          <div
            className="emp-modal-content profile-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Banner top */}
            <div className="profile-top-banner">
              <div className="profile-avatar-large">
                {viewingProfile.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="profile-title-text">
                <h3>{viewingProfile.fullName}</h3>
                <span className="profile-id-badge">
                  Mã NV: {viewingProfile.id}
                </span>
              </div>
              <button
                className="emp-modal-close"
                style={{ marginLeft: "auto", color: "#ffffff" }}
                onClick={() => setViewingProfile(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* TAB CHUYỂN ĐỔI BÊN TRONG CHI TIẾT NHÂN VIÊN (QH-27) */}
            <div className="profile-modal-tabs">
              <button
                className={`profile-tab-item ${
                  profileActiveTab === "info" ? "active" : ""
                }`}
                onClick={() => setProfileActiveTab("info")}
              >
                <FileText size={15} />
                <span>Hồ sơ nhân sự</span>
              </button>
              <button
                className={`profile-tab-item ${
                  profileActiveTab === "salary" ? "active" : ""
                }`}
                onClick={() => setProfileActiveTab("salary")}
              >
                <Coins size={15} />
                <span>Mức lương & Đãi ngộ (QH-27)</span>
              </button>
            </div>

            {/* TAB 1: THÔNG TIN HỒ SƠ CƠ BẢN */}
            {profileActiveTab === "info" && (
              <div className="profile-info-grid">
                <div className="profile-info-item">
                  <span className="profile-info-label">
                    Số điện thoại (Username)
                  </span>
                  <span className="profile-info-value phone">
                    {viewingProfile.phone}
                  </span>
                </div>

                <div className="profile-info-item">
                  <span className="profile-info-label">
                    Căn cước công dân (CCCD)
                  </span>
                  <span className="profile-info-value mono">
                    {viewingProfile.cccd}
                  </span>
                </div>

                <div className="profile-info-item">
                  <span className="profile-info-label">Email liên hệ</span>
                  <span className="profile-info-value">
                    {viewingProfile.email || "Chưa cập nhật email"}
                  </span>
                </div>

                <div className="profile-info-item">
                  <span className="profile-info-label">Chức vụ & Quyền hạn</span>
                  <span className="profile-info-value">
                    <span className={`badge-role ${viewingProfile.role}`}>
                      {viewingProfile.roleName}
                    </span>
                  </span>
                </div>

                <div className="profile-info-item">
                  <span className="profile-info-label">Trạng thái hồ sơ</span>
                  <span className="profile-info-value">
                    <span className={`badge-status ${viewingProfile.status}`}>
                      <span className="badge-status-dot"></span>
                      {viewingProfile.statusName}
                    </span>
                  </span>
                </div>

                <div className="profile-info-item">
                  <span className="profile-info-label">
                    Ngày tham gia hệ thống
                  </span>
                  <span className="profile-info-value">
                    {viewingProfile.createdAt || "Chưa xác định"}
                  </span>
                </div>

                {viewingProfile.note && (
                  <div className="profile-info-item full-col">
                    <span className="profile-info-label">Ghi chú quản lý</span>
                    <div className="profile-note-box">
                      {viewingProfile.note}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: THÔNG TIN LƯƠNG & LỊCH SỬ ĐÃI NGỘ (QH-27) */}
            {profileActiveTab === "salary" && (
              <div style={{ padding: "20px" }}>
                {/* Khung lương hiện tại */}
                <div className="salary-current-box" style={{ margin: 0 }}>
                  <div className="salary-current-info">
                    <h5>Mức lương hiện tại</h5>
                    <div className="current-salary-val">
                      {formatCurrencyString(
                        (viewingProfile.baseSalary || 25000).toString()
                      )}{" "}
                      {viewingProfile.salaryType === "monthly"
                        ? "VNĐ / tháng"
                        : "VNĐ / giờ"}
                    </div>
                    <div className="current-salary-date">
                      Áp dụng từ:{" "}
                      <strong>
                        {viewingProfile.salaryEffectiveDate || "Chưa xác định"}
                      </strong>
                      {viewingProfile.allowance > 0 &&
                        ` | Phụ cấp: ${formatCurrencyString(
                          viewingProfile.allowance.toString()
                        )} VNĐ`}
                    </div>
                  </div>

                  <button
                    className="btn-primary-add"
                    style={{ background: "#059669", fontSize: 13 }}
                    onClick={() => {
                      const emp = viewingProfile;
                      setViewingProfile(null);
                      handleOpenSalaryModal(emp);
                    }}
                  >
                    <Coins size={15} /> Thiết lập lại lương
                  </button>
                </div>

                {/* Bảng lịch sử điều chỉnh mức lương */}
                <div style={{ marginTop: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#1e293b",
                    }}
                  >
                    <History size={16} color="#64748b" />
                    <span>Lịch sử các lần điều chỉnh lương</span>
                  </div>

                  {(!viewingProfile.salaryHistory ||
                    viewingProfile.salaryHistory.length === 0) ? (
                    <p
                      style={{
                        fontSize: 13,
                        color: "#94a3b8",
                        fontStyle: "italic",
                        marginTop: 10,
                      }}
                    >
                      Chưa có lịch sử điều chỉnh mức lương nào trước đây.
                    </p>
                  ) : (
                    <table className="salary-history-table">
                      <thead>
                        <tr>
                          <th>Ngày áp dụng</th>
                          <th>Mức lương</th>
                          <th>Hình thức</th>
                          <th>Lý do điều chỉnh</th>
                          <th>Người duyệt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingProfile.salaryHistory.map((hist) => (
                          <tr key={hist.id}>
                            <td>
                              <strong>{hist.changeDate}</strong>
                            </td>
                            <td>
                              <span style={{ color: "#047857", fontWeight: 700 }}>
                                {formatCurrencyString(hist.newSalary.toString())}{" "}
                                VNĐ
                              </span>
                            </td>
                            <td>
                              {hist.salaryType === "hourly"
                                ? "Lương giờ"
                                : "Lương tháng"}
                            </td>
                            <td>{hist.reason}</td>
                            <td>
                              <span style={{ fontSize: 11, color: "#64748b" }}>
                                {hist.changedBy}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            <div className="emp-modal-footer">
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => setViewingProfile(null)}
              >
                Đóng
              </button>
              {profileActiveTab === "info" && (
                <button
                  type="button"
                  className="btn-submit-save"
                  onClick={() => {
                    const emp = viewingProfile;
                    setViewingProfile(null);
                    handleOpenEditModal(emp);
                  }}
                >
                  <Edit2 size={15} />
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL FORM THÊM / SỬA NHÂN VIÊN MỚI (QH-22)
          ======================================================== */}
      {showAddModal && (
        <div className="emp-modal-overlay" onClick={handleCloseModal}>
          <div
            className="emp-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
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
                      : "Điền thông tin cơ bản để tạo hồ sơ & tài khoản đăng nhập"}
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

            <form onSubmit={handleSubmit} noValidate>
              <div className="emp-modal-body">
                {Object.keys(errors).some((k) => errors[k]) && (
                  <div className="form-banner-error">
                    <AlertCircle
                      size={18}
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <div>
                      <strong>Vui lòng kiểm tra lại thông tin:</strong>
                      <div style={{ marginTop: 2 }}>
                        Một số trường thông tin bắt buộc bị thiếu hoặc sai định dạng.
                      </div>
                    </div>
                  </div>
                )}

                <div className="emp-form-grid">
                  {/* HỌ TÊN */}
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

                  {/* SĐT / TÊN ĐĂNG NHẬP */}
                  <div className="emp-form-group">
                    <label className="emp-form-label" htmlFor="phone">
                      <span>
                        Số điện thoại <span className="required-mark">*</span>
                      </span>
                      <span
                        className="optional-mark"
                        style={{ color: "#2563eb", fontWeight: 600 }}
                      >
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

                  {/* CCCD */}
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

                  {/* EMAIL */}
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

                  {/* CHỨC VỤ */}
                  <div className="emp-form-group">
                    <label className="emp-form-label" htmlFor="role">
                      <span>Chức vụ & Phân quyền</span>
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

                  {/* TRẠNG THÁI */}
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
                          <strong>
                            {formData.phone
                              ? formData.phone
                              : "(Nhập số điện thoại)"}
                          </strong>
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
                  <span>
                    {editingEmployee ? "Lưu thay đổi" : "Tạo nhân viên"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
>>>>>>> f5159fe8cca057cf3a6e45e8128a1c669b9259fa
