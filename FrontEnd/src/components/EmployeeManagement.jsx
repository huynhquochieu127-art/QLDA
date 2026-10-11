import React, { useState, useEffect } from "react";
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
} from "lucide-react";

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

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roles, setRoles] = useState([]);

  // Modal thêm nhân viên
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal Bàn giao tài khoản sau khi tạo thành công
  const [handoverData, setHandoverData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  // Lấy danh sách nhân viên
  const fetchEmployees = async (searchTerm = "") => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/employees`, {
        params: { search: searchTerm, limit: 50 },
      });
      if (res.data && res.data.data) {
        setEmployees(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách nhân viên:", err);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEmployees(search);
  };

  // Submit Form tạo nhân viên
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const payload = {
        ...form,
        luong: form.luong ? Number(form.luong) : 0,
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

        // Tải lại danh sách nhân viên
        fetchEmployees(search);
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

      {/* SEARCH BAR */}
      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          maxWidth: "480px",
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
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
          }}
        >
          Tìm kiếm
        </button>
      </form>

      {/* DANH SÁCH BẢNG NHÂN VIÊN */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "10px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflow: "hidden",
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
              <th style={{ padding: "12px 16px" }}>Loại NV</th>
              <th style={{ padding: "12px 16px" }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                  <Loader2 size={24} className="spin-animation" style={{ margin: "0 auto" }} />
                  <p style={{ margin: "8px 0 0" }}>Đang tải danh sách nhân sự...</p>
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
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
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1e293b" }}>
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
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>
                    {emp.LoaiNhanVien || "Full-time"}
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

                {/* Loại nhân viên */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Hình thức làm việc
                  </label>
                  <select
                    value={form.loaiNhanVien}
                    onChange={(e) => setForm({ ...form, loaiNhanVien: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                    }}
                  >
                    <option value="Full-time">Toàn thời gian (Full-time)</option>
                    <option value="Part-time">Bán thời gian (Part-time)</option>
                  </select>
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

                {/* Mức lương */}
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Mức lương (VNĐ)
                  </label>
                  <input
                    type="number"
                    placeholder="Ví dụ: 6000000"
                    value={form.luong}
                    onChange={(e) => setForm({ ...form, luong: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                    }}
                  />
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
