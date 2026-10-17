import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Loader2, Save, AlertCircle, Eye, Pencil } from "lucide-react";
import "../../css/staff.css";
import { API_BASE, formatMoney, formatDateVN } from "../utils/staffWork";

const employeeCode = (emp) => emp.MaNhanVienCode || `NV${String(emp.MaNhanVien).padStart(3, "0")}`;

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: "1px dashed #e2e8f0" }}>
    <span style={{ color: "#64748b", fontSize: "0.86rem" }}>{label}</span>
    <strong style={{ color: "#0f172a", fontSize: "0.88rem", textAlign: "right" }}>{value || "-"}</strong>
  </div>
);

// QH-18: Xem chi tiết hồ sơ nhân viên
export function EmployeeDetailModal({ employee, onClose, onEdit }) {
  const [detail, setDetail] = useState(employee);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_BASE}/employees/${employee.MaNhanVien}`)
      .then((res) => res.data?.data && setDetail({ ...employee, ...res.data.data }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [employee]);

  const isPartTime = detail.LoaiNhanVien === "Part-time";
  const isLocked = Number(detail.TrangThaiHoatDong) === 0;
  const joinDate = detail.NgayVaoLamFormatted || detail.NgayVaoLam;

  return (
    <div className="sw-modal-overlay" onClick={onClose}>
      <div className="sw-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sw-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "#e0e7ff", color: "#4f46e5", padding: 8, borderRadius: 8, display: "flex" }}>
              <Eye size={18} />
            </div>
            <div>
              <h3>{detail.HoTen}</h3>
              <span className="sw-hint">
                {employeeCode(detail)} · {detail.ChucVu || "Nhân viên"}
              </span>
            </div>
          </div>
          <button type="button" className="sw-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="sw-modal-body">
          {loading && (
            <div className="sw-hint" style={{ marginBottom: 8 }}>
              <Loader2 size={13} className="spin-animation" style={{ verticalAlign: "-2px" }} /> Đang tải hồ sơ...
            </div>
          )}
          <InfoRow label="Email đăng nhập" value={detail.Email} />
          <InfoRow label="Số điện thoại" value={detail.SoDienThoai} />
          <InfoRow label="CCCD" value={detail.CCCD ? detail.CCCD.replace(/\d(?=\d{4})/g, "*") : ""} />
          <InfoRow label="Giới tính" value={detail.GioiTinh} />
          <InfoRow label="Địa chỉ" value={detail.DiaChi} />
          <InfoRow label="Vai trò hệ thống" value={detail.TenVaiTro} />
          <InfoRow label="Loại hợp đồng" value={isPartTime ? "Part-time (Lương giờ)" : "Full-time (Lương cứng)"} />
          <InfoRow
            label="Mức lương"
            value={Number(detail.Luong) > 0 ? `${formatMoney(detail.Luong)} / ${isPartTime ? "giờ" : "tháng"}` : "Chưa đặt"}
          />
          <InfoRow label="Ngày vào làm" value={joinDate ? formatDateVN(String(joinDate).slice(0, 10)) : ""} />
          <InfoRow label="Trạng thái làm việc" value={detail.TrangThai || "Đang làm việc"} />
          <InfoRow label="Tài khoản" value={isLocked ? "🔒 Đã khóa" : "✅ Đang hoạt động"} />
        </div>

        <div className="sw-modal-footer">
          <button type="button" className="sw-btn sw-btn-light" onClick={onClose}>
            Đóng
          </button>
          <button type="button" className="sw-btn sw-btn-primary" onClick={() => onEdit(detail)}>
            <Pencil size={15} /> Chỉnh sửa
          </button>
        </div>
      </div>
    </div>
  );
}

// QH-18: Chỉnh sửa thông tin nhân viên
export function EmployeeEditModal({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({
    hoTen: employee.HoTen || "",
    soDienThoai: employee.SoDienThoai || "",
    cccd: employee.CCCD || "",
    gioiTinh: employee.GioiTinh || "Nam",
    diaChi: employee.DiaChi || "",
    chucVu: employee.ChucVu || "Pha chế",
    maVaiTro: employee.MaVaiTro || 3,
    trangThai: employee.TrangThai || "Đang làm việc",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const validate = () => {
    const next = {};
    if (!form.hoTen.trim()) next.hoTen = "Họ tên không được để trống.";
    if (form.soDienThoai && !/^0\d{9}$/.test(form.soDienThoai.trim()))
      next.soDienThoai = "Số điện thoại phải gồm 10 số và bắt đầu bằng 0.";
    if (form.cccd && !/^\d{12}$/.test(form.cccd.trim())) next.cccd = "CCCD phải gồm đúng 12 chữ số.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await axios.put(`${API_BASE}/employees/${employee.MaNhanVien}`, {
        ...form,
        hoTen: form.hoTen.trim(),
        maVaiTro: Number(form.maVaiTro),
      });
      if (res.data?.success) onSaved(`Đã cập nhật thông tin nhân viên "${form.hoTen.trim()}".`);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Có lỗi xảy ra khi cập nhật. Vui lòng thử lại!");
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, input) => (
    <div className="sw-field">
      <label className="sw-label">{label}</label>
      {input}
      {errors[key] && <span className="sw-field-error">{errors[key]}</span>}
    </div>
  );

  return (
    <div className="sw-modal-overlay" onClick={onClose}>
      <form className="sw-modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} noValidate>
        <div className="sw-modal-header">
          <div>
            <h3>Chỉnh sửa nhân viên</h3>
            <span className="sw-hint">{employeeCode(employee)} · {employee.Email || ""}</span>
          </div>
          <button type="button" className="sw-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="sw-modal-body">
          {errorMsg && (
            <div className="sw-alert sw-alert-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {field(
            "hoTen",
            <>Họ và tên <span className="sw-required">*</span></>,
            <input className={`sw-input ${errors.hoTen ? "invalid" : ""}`} value={form.hoTen} onChange={(e) => setForm({ ...form, hoTen: e.target.value })} />
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field(
              "soDienThoai",
              "Số điện thoại",
              <input className={`sw-input ${errors.soDienThoai ? "invalid" : ""}`} inputMode="numeric" value={form.soDienThoai} onChange={(e) => setForm({ ...form, soDienThoai: e.target.value })} />
            )}
            {field(
              "cccd",
              "Số CCCD",
              <input className={`sw-input ${errors.cccd ? "invalid" : ""}`} inputMode="numeric" value={form.cccd} onChange={(e) => setForm({ ...form, cccd: e.target.value })} />
            )}
            {field(
              "gioiTinh",
              "Giới tính",
              <select className="sw-select" value={form.gioiTinh} onChange={(e) => setForm({ ...form, gioiTinh: e.target.value })}>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            )}
            {field(
              "chucVu",
              "Chức vụ tại quán",
              <select className="sw-select" value={form.chucVu} onChange={(e) => setForm({ ...form, chucVu: e.target.value })}>
                {["Pha chế", "Thu ngân", "Phục vụ", "Quản lý ca", "Bảo vệ"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            {field(
              "maVaiTro",
              "Vai trò hệ thống",
              <select className="sw-select" value={form.maVaiTro} onChange={(e) => setForm({ ...form, maVaiTro: e.target.value })}>
                <option value={3}>Nhân viên</option>
                <option value={2}>Quản lý</option>
                <option value={1}>Admin</option>
              </select>
            )}
            {field(
              "trangThai",
              "Trạng thái làm việc",
              <select className="sw-select" value={form.trangThai} onChange={(e) => setForm({ ...form, trangThai: e.target.value })}>
                <option value="Đang làm việc">Đang làm việc</option>
                <option value="Đã nghỉ việc">Đã nghỉ việc</option>
              </select>
            )}
          </div>

          {field(
            "diaChi",
            "Địa chỉ liên hệ",
            <input className="sw-input" value={form.diaChi} onChange={(e) => setForm({ ...form, diaChi: e.target.value })} />
          )}
        </div>

        <div className="sw-modal-footer">
          <button type="button" className="sw-btn sw-btn-light" onClick={onClose}>
            Hủy bỏ
          </button>
          <button type="submit" className="sw-btn sw-btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="spin-animation" /> : <Save size={16} />} Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  );
}
