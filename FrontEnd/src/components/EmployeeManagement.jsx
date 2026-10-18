import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import axios from "axios";
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  ShieldCheck,
  Copy,
  Check,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  Mail,
  CreditCard,
  Briefcase,
  Calendar,
  DollarSign,
  MapPin,
  X,
  Loader2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Lock,
  Unlock,
} from "lucide-react";
import { EmployeeDetailModal, EmployeeEditModal } from "./EmployeeActionModals";

const API_BASE = "http://localhost:5000/api";

const INITIAL_FORM = {
  hoTen: "",
  email: "",
  soDienThoai: "",
  cccd: "",
  gioiTinh: "Nam",
  diaChi: "",
  chucVu: "Pha chế",
  loaiNhanVien: "Full-time",
  ngayVaoLam: new Date().toISOString().split("T")[0],
  luong: "",
  maVaiTro: 3, // 3: Nhân viên, 2: Quản lý, 1: Admin
};

// Định dạng số tiền có dấu phẩy ngăn cách hàng nghìn (5000000 -> 5,000,000)
const formatMoney = (digits) =>
  digits ? Number(digits).toLocaleString("en-US") : "";

// Diễn giải số tiền bằng chữ để Admin dễ kiểm tra số 0 (5000000 -> 5 triệu)
const describeMoney = (amount) => {
  if (!amount) return "";
  if (amount >= 1000000) {
    return `≈ ${(amount / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} triệu đồng`;
  }
  if (amount >= 1000) {
    return `≈ ${(amount / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} nghìn đồng`;
  }
  return `${amount} đồng`;
};

// Khoảng lương hợp lý để cảnh báo khi Admin gõ thừa/thiếu số 0
const SALARY_RANGE = {
  "Full-time": { min: 1000000, max: 100000000, unit: "tháng" },
  "Part-time": { min: 10000, max: 200000, unit: "giờ" },
};

// Ô nhập tiền: tự thêm dấu phẩy khi gõ và giữ nguyên vị trí con trỏ
function MoneyInput({ value, onChange, placeholder, autoFocus }) {
  const inputRef = useRef(null);
  const caretDigitsRef = useRef(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input || caretDigitsRef.current === null) return;
    // Đặt con trỏ sau đúng số chữ số đã có trước nó
    let digitsSeen = 0;
    let pos = 0;
    while (pos < input.value.length && digitsSeen < caretDigitsRef.current) {
      if (/\d/.test(input.value[pos])) digitsSeen++;
      pos++;
    }
    input.setSelectionRange(pos, pos);
    caretDigitsRef.current = null;
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    caretDigitsRef.current = raw.slice(0, caret).replace(/\D/g, "").length;
    const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
    onChange(digits);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={formatMoney(value)}
        onChange={handleChange}
        style={{
          width: "100%",
          padding: "11px 56px 11px 14px",
          borderRadius: "8px",
          border: "2px solid #6366f1",
          fontSize: "1.1rem",
          fontWeight: 700,
          color: "#1e293b",
          letterSpacing: "0.5px",
        }}
      />
      <span
        style={{
          position: "absolute",
          right: "14px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "#64748b",
          fontWeight: 600,
          fontSize: "0.9rem",
        }}
      >
        VNĐ
      </span>
    </div>
  );
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roles, setRoles] = useState([]);

  // ── Phân trang ──────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage]   = useState(1);
  const [limit]                          = useState(10); // Mặc định 10 NV/trang
  const [totalPages, setTotalPages]     = useState(1);
  const [totalItems, setTotalItems]     = useState(0);

  // ── Sắp xếp ─────────────────────────────────────────────────────────────────
  // sortBy: 'id' | 'name' | 'startDate'
  // sortOrder: 'asc' | 'desc'
  const [sortBy, setSortBy]         = useState("id");
  const [sortOrder, setSortOrder]   = useState("desc");

  // Modal thêm nhân viên
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal Bàn giao tài khoản sau khi tạo thành công
  const [handoverData, setHandoverData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  // Modal thiết lập mức lương
  const [salaryEmployee, setSalaryEmployee] = useState(null);
  const [salaryForm, setSalaryForm] = useState({ loaiNhanVien: "Full-time", luong: "" });
  const [savingSalary, setSavingSalary] = useState(false);
  const [salaryError, setSalaryError] = useState("");
  const [actionNotice, setActionNotice] = useState("");

  // Xem chi tiết / Chỉnh sửa nhân viên
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [editEmployee, setEditEmployee] = useState(null);

  /**
   * Lấy danh sách nhân viên với đầy đủ tham số:
   *   - search   : từ khoá tìm kiếm
   *   - page     : trang hiện tại
   *   - limit    : số bản ghi/trang (mặc định 10)
   *   - sortBy   : 'name' | 'startDate' | 'id'
   *   - sortOrder: 'asc' | 'desc'
   */
  const fetchEmployees = useCallback(async ({
    searchTerm = search,
    page       = currentPage,
    sortByVal  = sortBy,
    sortOrderVal = sortOrder,
  } = {}) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/employees`, {
        params: {
          search:    searchTerm,
          page,
          limit,
          sortBy:    sortByVal,
          sortOrder: sortOrderVal,
        },
      });
      if (res.data && res.data.data) {
        setEmployees(res.data.data);
        // Đọc metadata phân trang từ response
        const pg = res.data.pagination || {};
        setTotalPages(pg.totalPages  || 1);
        setTotalItems(pg.totalItems  || res.data.data.length);
        setCurrentPage(pg.currentPage || page);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách nhân viên:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, currentPage, sortBy, sortOrder, limit]);

  // Lấy danh sách vai trò
  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API_BASE}/roles`);
      if (res.data && res.data.data) {
        setRoles(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi lấy vai trò:", err);
    }
  };

  // Load lần đầu
  useEffect(() => {
    fetchEmployees({});
    fetchRoles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Khi sort thay đổi → reset về trang 1 và fetch lại
  const handleSortChange = (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
    fetchEmployees({ page: 1, sortByVal: newSortBy, sortOrderVal: newSortOrder });
  };

  // Khi chuyển trang
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    fetchEmployees({ page: newPage });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchEmployees({ searchTerm: search, page: 1 });
  };

  // Submit Form tạo nhân viên
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const isPart = form.loaiNhanVien === "Part-time";
      const cleanedSalary = form.luong
        ? Number(String(form.luong).replace(/\D/g, ""))
        : 0;
      const payload = {
        ...form,
        luong: cleanedSalary,
        loaiLuong: isPart ? "HOURLY" : "MONTHLY",
        ghiChu: isPart ? "HOURLY" : "MONTHLY",
        maVaiTro: Number(form.maVaiTro),
      };

      const res = await axios.post(`${API_BASE}/employees`, payload);

      if (res.data && res.data.success) {
        // Đóng modal tạo form
        setShowAddModal(false);
        setForm(INITIAL_FORM);

        // Mở modal bàn giao tài khoản với thông tin từ backend
        setHandoverData(res.data.handoverInfo);
        setCopied(false);

        // Tải lại danh sách nhân viên (về trang 1)
        setCurrentPage(1);
        fetchEmployees({ searchTerm: search, page: 1 });
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          "Có lỗi xảy ra khi tạo nhân viên. Vui lòng kiểm tra lại!"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal thiết lập mức lương cho nhân viên
  const handleOpenSalary = (emp) => {
    setSalaryEmployee(emp);
    setSalaryForm({
      loaiNhanVien: emp.LoaiNhanVien === "Part-time" ? "Part-time" : "Full-time",
      luong: emp.Luong && Number(emp.Luong) > 0 ? String(Math.round(Number(emp.Luong))) : "",
    });
    setSalaryError("");
  };

  // Lưu mức lương mới qua API cập nhật nhân viên (ghi chú loại lương HOURLY cho Part-time)
  const handleSaveSalary = async (e) => {
    e.preventDefault();
    const cleanedSalary = salaryForm.luong
      ? Number(String(salaryForm.luong).replace(/\D/g, ""))
      : 0;
    if (!cleanedSalary || cleanedSalary <= 0) {
      setSalaryError("Vui lòng nhập mức lương lớn hơn 0.");
      return;
    }
    setSalaryError("");
    setSavingSalary(true);
    try {
      const isPart = salaryForm.loaiNhanVien === "Part-time";
      const payload = {
        loaiNhanVien: salaryForm.loaiNhanVien,
        luong: cleanedSalary,
        loaiLuong: isPart ? "HOURLY" : "MONTHLY",
        ghiChu: isPart ? "HOURLY" : "MONTHLY",
      };
      const res = await axios.put(`${API_BASE}/employees/${salaryEmployee.MaNhanVien}`, payload);
      if (res.data && res.data.success) {
        setActionNotice(
          `Đã cập nhật mức lương cho "${salaryEmployee.HoTen}": ${formatMoney(String(cleanedSalary))} VNĐ / ${SALARY_RANGE[salaryForm.loaiNhanVien].unit} (${isPart ? "Loại lương: HOURLY" : "Lương tháng"}).`
        );
        setSalaryEmployee(null);
        fetchEmployees(search);
      }
    } catch (err) {
      setSalaryError(
        err.response?.data?.message || "Có lỗi xảy ra khi cập nhật mức lương. Vui lòng thử lại!"
      );
    } finally {
      setSavingSalary(false);
    }
  };

  // Khóa / Mở khóa tài khoản đăng nhập của nhân viên (QH-18)
  const handleToggleLock = async (emp) => {
    const isLocked = Number(emp.TrangThaiHoatDong) === 0;
    const action = isLocked ? "Mở khóa" : "Khóa";
    if (!window.confirm(`${action} tài khoản của nhân viên "${emp.HoTen}"?`)) return;
    try {
      const res = await axios.put(`${API_BASE}/employees/${emp.MaNhanVien}`, {
        trangThaiHoatDong: isLocked ? 1 : 0,
      });
      if (res.data && res.data.success) {
        setActionNotice(`Đã ${action.toLowerCase()} tài khoản của "${emp.HoTen}".`);
        fetchEmployees(search);
      }
    } catch (err) {
      alert(err.response?.data?.message || `Không thể ${action.toLowerCase()} tài khoản. Vui lòng thử lại!`);
    }
  };

  // Sao chép thông tin bàn giao vào Clipboard
  const handleCopyHandover = () => {
    if (!handoverData) return;
    const textToCopy = `📋 THÔNG TIN BÀN GIAO TÀI KHOẢN NHÂN VIÊN MỚI
------------------------------------
- Mã nhân viên: ${handoverData.maNhanVienCode}
- Họ và tên: ${handoverData.hoTen}
- Email đăng nhập: ${handoverData.email}
- Mật khẩu mặc định: ${handoverData.matKhauMacDinh}
- Quy tắc sinh mật khẩu: ${handoverData.quyTacTaoMatKhau}
- Vai trò: ${handoverData.vaiTro}
- Vị trí: ${handoverData.chucVu}
- Loại hợp đồng: ${handoverData.loaiHopDong || handoverData.loaiNhanVien}
- Cơ chế tính lương: ${handoverData.congThucTinhLuong || (handoverData.loaiNhanVien === "Part-time" ? "Lương theo giờ x Số giờ công thực tế" : "Lương cứng cố định hàng tháng")}
------------------------------------
* Lưu ý: Vui lòng đổi mật khẩu trong lần đăng nhập đầu tiên tại hệ thống Quán Cà Phê.`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="product-mgmt" style={{ padding: "20px" }}>
      {/* HEADER SECTION */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#2c3e50",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Users size={24} color="#6366f1" /> Quản lý Nhân sự & Bàn giao Tài khoản
          </h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            Quản lý hồ sơ nhân sự, tự động tạo mật khẩu bảo mật (Bcrypt) và bàn giao tài khoản.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg("");
            setShowAddModal(true);
          }}
          style={{
            backgroundColor: "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 18px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 8px rgba(79, 70, 229, 0.3)",
          }}
        >
          <UserPlus size={18} /> Thêm nhân viên mới
        </button>
      </div>

      {/* SEARCH BAR & SORT CONTROLS */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        {/* Ô tìm kiếm */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px", flex: 1, minWidth: "280px", maxWidth: "460px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={18}
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
            />
            <input
              type="text"
              placeholder="Tìm theo họ tên, SĐT, mã NV hoặc Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px 9px 38px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "9px 16px",
              backgroundColor: "#334155",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            Tìm kiếm
          </button>
        </form>

        {/* Điều khiển sắp xếp */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <ArrowUpDown size={16} color="#64748b" />
          <span style={{ fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>Sắp xếp:</span>

          {/* Chọn tiêu chí sắp xếp */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value, sortOrder)}
            style={{
              padding: "7px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              color: "#334155",
              cursor: "pointer",
              backgroundColor: "#fff",
            }}
          >
            <option value="id">Mặc định (Mã NV)</option>
            <option value="name">Tên nhân viên</option>
            <option value="startDate">Ngày vào làm</option>
          </select>

          {/* Chọn thứ tự sắp xếp */}
          <select
            value={sortOrder}
            onChange={(e) => handleSortChange(sortBy, e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              color: "#334155",
              cursor: "pointer",
              backgroundColor: "#fff",
            }}
          >
            {sortBy === "name" ? (
              <>
                <option value="asc">A → Z</option>
                <option value="desc">Z → A</option>
              </>
            ) : (
              <>
                <option value="desc">Mới nhất trước</option>
                <option value="asc">Cũ nhất trước</option>
              </>
            )}
          </select>
        </div>

        {/* Thông tin tổng số */}
        <span style={{ fontSize: "0.82rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
          Tổng: <strong style={{ color: "#475569" }}>{totalItems}</strong> nhân viên
        </span>
      </div>

      {/* THÔNG BÁO CẬP NHẬT LƯƠNG THÀNH CÔNG */}
      {actionNotice && (
        <div
          style={{
            marginBottom: "16px",
            padding: "10px 14px",
            backgroundColor: "#f0fdf4",
            color: "#166534",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle size={18} />
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice("")}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#166534" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* DANH SÁCH BẢNG NHÂN VIÊN */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "10px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            fontSize: "0.9rem",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                color: "#475569",
                fontWeight: 600,
              }}
            >
              <th style={{ padding: "12px 16px" }}>Mã NV</th>
              <th style={{ padding: "12px 16px" }}>Họ và tên</th>
              <th style={{ padding: "12px 16px" }}>Tài khoản (Email)</th>
              <th style={{ padding: "12px 16px" }}>Số điện thoại</th>
              <th style={{ padding: "12px 16px" }}>CCCD</th>
              <th style={{ padding: "12px 16px" }}>Chức vụ</th>
              <th style={{ padding: "12px 16px" }}>Vai trò</th>
              <th style={{ padding: "12px 16px" }}>Loại Hợp đồng & Lương</th>
              <th style={{ padding: "12px 16px" }}>Trạng thái</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                  <Loader2 size={24} className="spin-animation" style={{ margin: "0 auto" }} />
                  <p style={{ margin: "8px 0 0" }}>Đang tải danh sách nhân sự...</p>
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                  Không tìm thấy nhân viên nào phù hợp.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr
                  key={emp.MaNhanVien}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    transition: "background-color 0.2s",
                  }}
                >
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#4f46e5" }}>
                    {emp.MaNhanVienCode || `NV${String(emp.MaNhanVien).padStart(3, "0")}`}
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
                    {emp.HoTen}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Mail size={14} color="#94a3b8" />
                      <span>{emp.Email || "Chưa có"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569" }}>
                    {emp.SoDienThoai || "-"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>
                    {emp.CCCD ? emp.CCCD.replace(/\d(?=\d{4})/g, "*") : "-"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        backgroundColor: "#f0fdf4",
                        color: "#166534",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontWeight: 500,
                      }}
                    >
                      {emp.ChucVu || "Nhân viên"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        backgroundColor:
                          emp.MaVaiTro === 1
                            ? "#fef2f2"
                            : emp.MaVaiTro === 2
                            ? "#fffbeb"
                            : "#e0e7ff",
                        color:
                          emp.MaVaiTro === 1
                            ? "#991b1b"
                            : emp.MaVaiTro === 2
                            ? "#92400e"
                            : "#3730a3",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                      }}
                    >
                      {emp.TenVaiTro || (emp.MaVaiTro === 1 ? "Admin" : emp.MaVaiTro === 2 ? "Quản lý" : "Nhân viên")}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {emp.LoaiNhanVien === "Part-time" ? (
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            backgroundColor: "#fffbeb",
                            color: "#b45309",
                            borderRadius: "4px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            border: "1px solid #fde68a",
                          }}
                        >
                          Part-time (HOURLY)
                        </span>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "3px" }}>
                          {emp.Luong && Number(emp.Luong) > 0
                            ? `${Number(emp.Luong).toLocaleString("vi-VN")} đ / giờ`
                            : "Chưa đặt"}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            borderRadius: "4px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            border: "1px solid #bfdbfe",
                          }}
                        >
                          Full-time (Lương cứng)
                        </span>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "3px" }}>
                          {emp.Luong && Number(emp.Luong) > 0
                            ? `${Number(emp.Luong).toLocaleString("vi-VN")} đ / tháng`
                            : "Chưa đặt"}
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        color: emp.TrangThai === "Đã nghỉ việc" ? "#ef4444" : "#10b981",
                        fontWeight: 500,
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor:
                            emp.TrangThai === "Đã nghỉ việc" ? "#ef4444" : "#10b981",
                        }}
                      />
                      {emp.TrangThai || "Đang làm việc"}
                    </span>
                    {Number(emp.TrangThaiHoatDong) === 0 && (
                      <div style={{ fontSize: "0.75rem", color: "#b91c1c", marginTop: "3px", fontWeight: 600 }}>
                        🔒 Tài khoản bị khóa
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", gap: "6px", marginRight: "6px", verticalAlign: "middle" }}>
                      {[
                        { title: "Xem chi tiết", icon: <Eye size={15} />, color: "#334155", onClick: () => setDetailEmployee(emp) },
                        { title: "Chỉnh sửa", icon: <Pencil size={15} />, color: "#2563eb", onClick: () => setEditEmployee(emp) },
                        Number(emp.TrangThaiHoatDong) === 0
                          ? { title: "Mở khóa tài khoản", icon: <Unlock size={15} />, color: "#16a34a", onClick: () => handleToggleLock(emp) }
                          : { title: "Khóa tài khoản", icon: <Lock size={15} />, color: "#dc2626", onClick: () => handleToggleLock(emp) },
                      ].map((btn) => (
                        <button
                          key={btn.title}
                          type="button"
                          title={btn.title}
                          onClick={btn.onClick}
                          style={{
                            width: "32px",
                            height: "32px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            backgroundColor: "#fff",
                            color: btn.color,
                            cursor: "pointer",
                          }}
                        >
                          {btn.icon}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenSalary(emp)}
                      title="Thiết lập mức lương"
                      style={{
                        width: "32px",
                        height: "32px",
                        justifyContent: "center",
                        backgroundColor: "#eef2ff",
                        color: "#4338ca",
                        border: "1px solid #c7d2fe",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <DollarSign size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ── THANH PHÂN TRANG ─────────────────────────────────────── */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderTop: "1px solid #f1f5f9",
              backgroundColor: "#fafafa",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            {/* Thông tin trang */}
            <span style={{ fontSize: "0.83rem", color: "#64748b" }}>
              Trang <strong>{currentPage}</strong> / {totalPages}
              &nbsp;·&nbsp;
              Hiển thị {((currentPage - 1) * limit) + 1}–{Math.min(currentPage * limit, totalItems)} trong tổng {totalItems} nhân viên
            </span>

            {/* Nút điều hướng */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {/* Trang đầu */}
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                title="Trang đầu"
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: currentPage === 1 ? "#f8fafc" : "#fff",
                  color: currentPage === 1 ? "#cbd5e1" : "#475569",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
              >
                «
              </button>

              {/* Trang trước */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: currentPage === 1 ? "#f8fafc" : "#fff",
                  color: currentPage === 1 ? "#cbd5e1" : "#475569",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.85rem",
                }}
              >
                <ChevronLeft size={15} /> Trước
              </button>

              {/* Số trang (hiển thị tối đa 5 trang xung quanh trang hiện tại) */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - currentPage) <= 2)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    style={{
                      padding: "6px 11px",
                      borderRadius: "6px",
                      border: "1px solid",
                      borderColor: p === currentPage ? "#6366f1" : "#e2e8f0",
                      backgroundColor: p === currentPage ? "#6366f1" : "#fff",
                      color: p === currentPage ? "#fff" : "#475569",
                      fontWeight: p === currentPage ? 700 : 400,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      minWidth: "34px",
                    }}
                  >
                    {p}
                  </button>
                ))}

              {/* Trang sau */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: currentPage === totalPages ? "#f8fafc" : "#fff",
                  color: currentPage === totalPages ? "#cbd5e1" : "#475569",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.85rem",
                }}
              >
                Sau <ChevronRight size={15} />
              </button>

              {/* Trang cuối */}
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="Trang cuối"
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: currentPage === totalPages ? "#f8fafc" : "#fff",
                  color: currentPage === totalPages ? "#cbd5e1" : "#475569",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FORM THÊM NHÂN VIÊN MỚI */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    backgroundColor: "#e0e7ff",
                    color: "#4f46e5",
                    padding: "8px",
                    borderRadius: "8px",
                  }}
                >
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b", fontWeight: 700 }}>
                    Thêm nhân viên mới & Khởi tạo tài khoản
                  </h3>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Hệ thống sẽ tự sinh mật khẩu bảo mật (Bcrypt) cho nhân viên
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div
                style={{
                  margin: "16px 24px 0",
                  padding: "10px 14px",
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                  borderRadius: "6px",
                  fontSize: "0.88rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Họ tên */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Họ và tên nhân viên <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={form.hoTen}
                    onChange={(e) => setForm({ ...form, hoTen: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>

                {/* Email đăng nhập */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Email đăng nhập <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nhanvien@gmail.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>

                {/* Số điện thoại */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    placeholder="0912345678"
                    value={form.soDienThoai}
                    onChange={(e) => setForm({ ...form, soDienThoai: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>

                {/* Căn cước công dân (CCCD) */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Số CCCD / CMND
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập 12 số CCCD (Ví dụ: 079201123456)"
                    value={form.cccd}
                    onChange={(e) => setForm({ ...form, cccd: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                    }}
                  />
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "8px 12px",
                      backgroundColor: "#f0fdf4",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      color: "#166534",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <ShieldCheck size={16} color="#16a34a" />
                    <span>
                      <strong>Quy tắc bảo mật:</strong> Nếu nhập CCCD (≥ 6 số), mật khẩu mặc định tự động là{" "}
                      <strong>6 số cuối CCCD</strong>. Nếu để trống, mật khẩu mặc định là <strong>Cafe@123</strong>.
                      Mật khẩu được mã hóa an toàn bằng <strong>Bcrypt</strong>.
                    </span>
                  </div>
                </div>

                {/* Giới tính */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Giới tính
                  </label>
                  <select
                    value={form.gioiTinh}
                    onChange={(e) => setForm({ ...form, gioiTinh: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                    }}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {/* Vai trò (Phân quyền tài khoản) */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Vai trò hệ thống <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    value={form.maVaiTro}
                    onChange={(e) => setForm({ ...form, maVaiTro: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                    }}
                  >
                    <option value={3}>Nhân viên (Quyền bán hàng / POS / Pha chế)</option>
                    <option value={2}>Quản lý (Quyền duyệt ca, kho, báo cáo)</option>
                    <option value={1}>Admin (Toàn quyền quản trị)</option>
                  </select>
                </div>

                {/* Chức vụ */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Chức vụ tại quán
                  </label>
                  <select
                    value={form.chucVu}
                    onChange={(e) => setForm({ ...form, chucVu: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                    }}
                  >
                    <option value="Pha chế">Pha chế</option>
                    <option value="Thu ngân">Thu ngân</option>
                    <option value="Phục vụ">Phục vụ</option>
                    <option value="Quản lý ca">Quản lý ca</option>
                    <option value="Bảo vệ">Bảo vệ</option>
                  </select>
                </div>

                {/* LOẠI HỢP ĐỒNG (FULL-TIME HOẶC PART-TIME) */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                    Loại hợp đồng lao động <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    value={form.loaiNhanVien}
                    onChange={(e) => setForm({ ...form, loaiNhanVien: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "2px solid #6366f1",
                      backgroundColor: "#f5f3ff",
                      fontWeight: 600,
                      color: "#312e81",
                      fontSize: "0.92rem",
                      cursor: "pointer",
                    }}
                  >
                    <option value="Full-time">
                      Full-time (Toàn thời gian - Nhận lương cứng)
                    </option>
                    <option value="Part-time">
                      Part-time (Bán thời gian - Nhận lương theo giờ)
                    </option>
                  </select>

                  {/* HỘP THÔNG BÁO CÔNG THỨC TÍNH LƯƠNG CHO CÁC SPRINT SAU */}
                  {form.loaiNhanVien === "Full-time" ? (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "10px 14px",
                        backgroundColor: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        color: "#1e40af",
                        lineHeight: 1.5,
                      }}
                    >
                      💼 <strong>Quy tắc tính lương Full-time (Sprint sau):</strong> Nhân viên hưởng{" "}
                      <strong>lương cứng cố định hàng tháng</strong> dựa trên số ngày công tiêu chuẩn.
                      Công thức: <em>Lương nhận = Lương cứng + Phụ cấp/Thưởng - Khấu trừ</em>.
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "10px 14px",
                        backgroundColor: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        color: "#92400e",
                        lineHeight: 1.5,
                      }}
                    >
                      ⏰ <strong>Quy tắc tính lương Part-time (Sprint sau):</strong> Nhân viên hưởng{" "}
                      <strong>lương tính theo giờ công thực tế</strong>. Hệ thống sẽ lấy dữ liệu từ bảng chấm công / ca làm.
                      Công thức: <em>Lương nhận = (Tổng số giờ làm thực tế x Lương/giờ) + Thưởng - Khấu trừ</em>.
                    </div>
                  )}
                </div>

                {/* Ngày vào làm */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Ngày vào làm
                  </label>
                  <input
                    type="date"
                    value={form.ngayVaoLam}
                    onChange={(e) => setForm({ ...form, ngayVaoLam: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>

                {/* Mức lương (Tự động chuyển đổi theo loại nhân viên) */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                    {form.loaiNhanVien === "Part-time"
                      ? "Lương cơ bản theo giờ (VNĐ/giờ)"
                      : "Lương cơ bản (VNĐ/tháng)"}{" "}
                    <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={
                      form.loaiNhanVien === "Part-time"
                        ? "Ví dụ: 22,000 VNĐ/giờ"
                        : "Ví dụ: 6,500,000 VNĐ/tháng"
                    }
                    value={form.luong ? formatMoney(String(form.luong).replace(/\D/g, "")) : ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setForm({ ...form, luong: digits });
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "#1e293b",
                    }}
                  />
                  {/* Gợi ý chọn nhanh mức lương */}
                  {form.loaiNhanVien === "Part-time" ? (
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: "0.74rem", color: "#64748b" }}>Gợi ý lương giờ:</span>
                      {["22000", "25000", "30000"].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setForm({ ...form, luong: rate })}
                          style={{
                            border: "1px solid #cbd5e1",
                            background: String(form.luong) === rate ? "#e0e7ff" : "#f8fafc",
                            color: String(form.luong) === rate ? "#4338ca" : "#475569",
                            fontSize: "0.75rem",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          {Number(rate).toLocaleString("vi-VN")} đ/h
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: "0.74rem", color: "#64748b" }}>Gợi ý:</span>
                      {["6500000", "8000000", "10000000"].map((sal) => (
                        <button
                          key={sal}
                          type="button"
                          onClick={() => setForm({ ...form, luong: sal })}
                          style={{
                            border: "1px solid #cbd5e1",
                            background: String(form.luong) === sal ? "#e0e7ff" : "#f8fafc",
                            color: String(form.luong) === sal ? "#4338ca" : "#475569",
                            fontSize: "0.75rem",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          {formatMoney(sal)} đ
                        </button>
                      ))}
                    </div>
                  )}
                  <span style={{ display: "block", fontSize: "0.76rem", color: "#64748b", marginTop: "4px" }}>
                    {form.loaiNhanVien === "Part-time"
                      ? "Đơn giá lương cơ bản trả cho 1 giờ làm việc (Loại lương: HOURLY). Ví dụ: 22,000 VNĐ/giờ"
                      : "Mức lương cơ bản cố định mỗi tháng"}
                  </span>
                </div>

                {/* Địa chỉ */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Địa chỉ liên hệ
                  </label>
                  <input
                    type="text"
                    placeholder="Số nhà, tên đường, quận/huyện, tỉnh/thành..."
                    value={form.diaChi}
                    onChange={(e) => setForm({ ...form, diaChi: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>
              </div>

              {/* Actions Button */}
              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "16px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#fff",
                    color: "#475569",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#4f46e5",
                    color: "#fff",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="spin-animation" />
                      <span>Đang lưu & Mã hóa Bcrypt...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      <span>Lưu & Tự động tạo mật khẩu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4 & 5: XEM CHI TIẾT / CHỈNH SỬA NHÂN VIÊN (QH-18) */}
      {detailEmployee && (
        <EmployeeDetailModal
          employee={detailEmployee}
          onClose={() => setDetailEmployee(null)}
          onEdit={(emp) => {
            setDetailEmployee(null);
            setEditEmployee(emp);
          }}
        />
      )}
      {editEmployee && (
        <EmployeeEditModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSaved={(msg) => {
            setEditEmployee(null);
            setActionNotice(msg);
            fetchEmployees(search);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: THIẾT LẬP MỨC LƯƠNG CHO ADMIN (QH-27) */}
      {/* ========================================================================= */}
      {salaryEmployee && (() => {
        const range = SALARY_RANGE[salaryForm.loaiNhanVien];
        const amount = Number(salaryForm.luong || 0);
        const currentAmount = Number(salaryEmployee.Luong || 0);
        const currentIsPartTime = salaryEmployee.LoaiNhanVien === "Part-time";
        const outOfRange = amount > 0 && (amount < range.min || amount > range.max);

        return (
          <div
            onClick={() => setSalaryEmployee(null)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#fff",
                borderRadius: "12px",
                width: "100%",
                maxWidth: "520px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "18px 24px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#f8fafc",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ backgroundColor: "#e0e7ff", color: "#4f46e5", padding: "8px", borderRadius: "8px" }}>
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b", fontWeight: 700 }}>
                      Thiết lập mức lương
                    </h3>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      {salaryEmployee.HoTen} ·{" "}
                      {salaryEmployee.MaNhanVienCode || `NV${String(salaryEmployee.MaNhanVien).padStart(3, "0")}`} ·{" "}
                      {salaryEmployee.ChucVu || "Nhân viên"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSalaryEmployee(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px" }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveSalary} style={{ padding: "20px 24px" }}>
                {/* THÔNG TIN LƯƠNG HIỆN TẠI */}
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    marginBottom: "18px",
                  }}
                >
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "10px" }}>
                    Lương hiện tại
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Loại hợp đồng:</span>
                    <span style={{ fontWeight: 700, color: currentIsPartTime ? "#b45309" : "#1d4ed8", fontSize: "0.88rem" }}>
                      {currentIsPartTime ? "Part-time (Lương giờ)" : "Full-time (Lương cứng)"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Mức lương:</span>
                    <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "1rem" }}>
                      {currentAmount > 0
                        ? `${formatMoney(String(Math.round(currentAmount)))} VNĐ / ${currentIsPartTime ? "giờ" : "tháng"}`
                        : "Chưa đặt"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Ngày vào làm:</span>
                    <span style={{ fontWeight: 500, color: "#334155", fontSize: "0.85rem" }}>
                      {salaryEmployee.NgayVaoLam
                        ? new Date(salaryEmployee.NgayVaoLam).toLocaleDateString("vi-VN")
                        : "-"}
                    </span>
                  </div>
                </div>

                {/* Error Notification */}
                {salaryError && (
                  <div
                    style={{
                      marginBottom: "14px",
                      padding: "10px 14px",
                      backgroundColor: "#fef2f2",
                      color: "#b91c1c",
                      borderRadius: "6px",
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AlertCircle size={18} />
                    <span>{salaryError}</span>
                  </div>
                )}

                {/* Hình thức trả lương */}
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Hình thức trả lương <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={salaryForm.loaiNhanVien}
                  onChange={(e) => setSalaryForm({ ...salaryForm, loaiNhanVien: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    marginBottom: "16px",
                  }}
                >
                  <option value="Full-time">Full-time - Lương cứng theo tháng</option>
                  <option value="Part-time">Part-time - Lương theo giờ</option>
                </select>

                {/* Mức lương mới (định dạng hàng nghìn) */}
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  {salaryForm.loaiNhanVien === "Part-time"
                    ? "Lương cơ bản theo giờ (VNĐ/giờ)"
                    : "Lương cơ bản theo tháng (VNĐ/tháng)"}{" "}
                  <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <MoneyInput
                  autoFocus
                  value={salaryForm.luong}
                  onChange={(digits) => setSalaryForm({ ...salaryForm, luong: digits })}
                  placeholder={salaryForm.loaiNhanVien === "Part-time" ? "Ví dụ: 22,000 VNĐ/giờ" : "Ví dụ: 6,500,000"}
                />
                {/* Gợi ý chọn nhanh lương giờ Part-time */}
                {salaryForm.loaiNhanVien === "Part-time" && (
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Gợi ý lương giờ:</span>
                    {["22000", "25000", "30000"].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setSalaryForm({ ...salaryForm, luong: rate })}
                        style={{
                          border: "1px solid #cbd5e1",
                          background: String(salaryForm.luong) === rate ? "#e0e7ff" : "#f8fafc",
                          color: String(salaryForm.luong) === rate ? "#4338ca" : "#475569",
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        {Number(rate).toLocaleString("vi-VN")} VNĐ/giờ
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "0.8rem" }}>
                  <span style={{ color: "#4338ca", fontWeight: 600 }}>{describeMoney(amount)}</span>
                  <span style={{ color: "#94a3b8" }}>
                    Khoảng thường gặp: {formatMoney(String(range.min))} - {formatMoney(String(range.max))} / {range.unit}
                  </span>
                </div>

                {/* Cảnh báo gõ nhầm số 0 */}
                {outOfRange && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      color: "#92400e",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>
                      Mức lương <strong>{formatMoney(salaryForm.luong)} VNĐ / {range.unit}</strong>{" "}
                      {amount < range.min ? "thấp" : "cao"} bất thường. Vui lòng kiểm tra lại số 0.
                    </span>
                  </div>
                )}

                {/* Actions Button */}
                <div
                  style={{
                    marginTop: "24px",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "16px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSalaryEmployee(null)}
                    style={{
                      padding: "9px 16px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#fff",
                      color: "#475569",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={savingSalary}
                    style={{
                      padding: "9px 20px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: "#4f46e5",
                      color: "#fff",
                      cursor: savingSalary ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {savingSalary ? (
                      <>
                        <Loader2 size={16} className="spin-animation" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Lưu mức lương</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 2: THÔNG TIN BÀN GIAO TÀI KHOẢN CHO ADMIN */}
      {/* ========================================================================= */}
      {handoverData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            {/* Header Success */}
            <div
              style={{
                backgroundColor: "#10b981",
                color: "#fff",
                padding: "24px 20px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <CheckCircle size={36} color="#fff" />
              </div>
              <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700 }}>
                Tạo Nhân Viên & Tài Khoản Thành Công!
              </h3>
              <p style={{ margin: "6px 0 0", opacity: 0.9, fontSize: "0.88rem" }}>
                Admin hãy sao chép và bàn giao tài khoản này cho nhân viên mới.
              </p>
            </div>

            {/* Content Body */}
            <div style={{ padding: "24px" }}>
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  padding: "16px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Mã nhân viên:</span>
                  <span style={{ fontWeight: 700, color: "#4f46e5" }}>{handoverData.maNhanVienCode}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Họ và tên:</span>
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>{handoverData.hoTen}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Tên đăng nhập (Email):</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{handoverData.email}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Chức vụ & Vai trò:</span>
                  <span style={{ fontWeight: 500, color: "#334155" }}>
                    {handoverData.chucVu} ({handoverData.vaiTro})
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Loại hợp đồng:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: handoverData.loaiNhanVien === "Part-time" ? "#b45309" : "#1d4ed8",
                    }}
                  >
                    {handoverData.loaiHopDong || (handoverData.loaiNhanVien === "Part-time" ? "Part-time (Lương theo giờ)" : "Full-time (Lương cứng)")}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Cơ chế tính lương:</span>
                  <span style={{ fontWeight: 600, color: "#334155" }}>
                    {handoverData.hinhThucLuong || (handoverData.loaiNhanVien === "Part-time" ? "Lương cơ bản theo giờ (HOURLY)" : "Lương cứng theo tháng")}
                    {handoverData.mucLuong ? ` (${Number(handoverData.mucLuong).toLocaleString("vi-VN")} ${handoverData.loaiNhanVien === "Part-time" ? "VNĐ/giờ" : "đ/tháng"})` : ""}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    paddingTop: "12px",
                    borderTop: "1px dashed #cbd5e1",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ display: "block", color: "#64748b", fontSize: "0.8rem" }}>
                      Mật khẩu mặc định ({handoverData.quyTacTaoMatKhau}):
                    </span>
                    <span
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        letterSpacing: "1px",
                        color: "#dc2626",
                      }}
                    >
                      {showPassword ? handoverData.matKhauMacDinh : "••••••"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#64748b",
                      padding: "6px",
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {handoverData.congThucTinhLuong && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "8px 12px",
                      backgroundColor: "#f1f5f9",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      color: "#334155",
                      borderLeft: "3px solid #6366f1",
                    }}
                  >
                    📐 <strong>Quy tắc tính lương (Sprint sau):</strong> {handoverData.congThucTinhLuong}
                  </div>
                )}
              </div>

              {/* Ghi chú hướng dẫn an toàn */}
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "#475569",
                  backgroundColor: "#eff6ff",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  borderLeft: "4px solid #3b82f6",
                }}
              >
                🔒 Mật khẩu trên đã được mã hóa bằng chuẩn <strong>Bcrypt</strong> trong database. Nhắc nhở nhân viên đổi mật khẩu ngay sau lần đăng nhập đầu tiên.
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={handleCopyHandover}
                  style={{
                    flex: 1,
                    padding: "11px 16px",
                    backgroundColor: copied ? "#059669" : "#4f46e5",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                  }}
                >
                  {copied ? (
                    <>
                      <Check size={18} /> Đã sao chép vào Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy size={18} /> Sao chép thông tin bàn giao
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setHandoverData(null)}
                  style={{
                    padding: "11px 18px",
                    backgroundColor: "#f1f5f9",
                    color: "#334155",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
