import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  FileSpreadsheet,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
} from "lucide-react";
import "../../css/staff.css";
import {
  API_BASE,
  toDateKey,
  fromDateKey,
  formatDateVN,
  addDays,
  getCurrentUser,
} from "../utils/staffWork";

const LEAVE_TYPES = [
  { value: "phep", label: "Nghỉ phép định kỳ / Phép năm" },
  { value: "om", label: "Nghỉ ốm / Khám chữa bệnh" },
  { value: "viec_rieng", label: "Việc riêng gia đình" },
  { value: "khac", label: "Lý do khác" },
];

const STATUS_LABELS = {
  pending: { text: "Chờ duyệt", cls: "sw-badge-pending" },
  approved: { text: "Đã duyệt", cls: "sw-badge-approved" },
  rejected: { text: "Từ chối", cls: "sw-badge-rejected" },
};

const dayDiff = (fromKey, toKey) =>
  Math.round((fromDateKey(toKey) - fromDateKey(fromKey)) / (24 * 60 * 60 * 1000));

// QH-43: Form cho nhân viên nộp đơn xin nghỉ phép (gắn với nhân viên đang đăng nhập)
export default function MyLeaveRequests() {
  const user = useMemo(() => getCurrentUser(), []);
  const today = toDateKey(new Date());

  const emptyForm = {
    ngayBatDau: toDateKey(addDays(new Date(), 1)),
    ngayDiLamLai: toDateKey(addDays(new Date(), 2)),
    loaiNghi: "phep",
    lyDo: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMyRequests = async () => {
    if (!user.maNhanVien && !user.code) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/leave-requests`, {
        params: { employeeId: user.maNhanVien || user.code, status: "all" },
      });
      setRequests(res.data?.data || []);
    } catch (err) {
      console.error("Lỗi tải đơn xin nghỉ:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const soNgayNghi =
    form.ngayBatDau && form.ngayDiLamLai ? dayDiff(form.ngayBatDau, form.ngayDiLamLai) : 0;

  const validate = () => {
    const next = {};
    if (!form.ngayBatDau) next.ngayBatDau = "Vui lòng chọn ngày bắt đầu nghỉ.";
    else if (form.ngayBatDau < today) next.ngayBatDau = "Ngày bắt đầu nghỉ không được ở quá khứ.";
    if (!form.ngayDiLamLai) next.ngayDiLamLai = "Vui lòng chọn ngày đi làm lại.";
    else if (form.ngayBatDau && form.ngayDiLamLai <= form.ngayBatDau)
      next.ngayDiLamLai = "Ngày đi làm lại phải sau ngày bắt đầu nghỉ.";
    if (form.lyDo.trim().length < 5) next.lyDo = "Vui lòng nhập lý do xin nghỉ (tối thiểu 5 ký tự).";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Ngày nghỉ cuối cùng = ngày đi làm lại - 1
      const res = await axios.post(`${API_BASE}/leave-requests`, {
        maNhanVien: user.maNhanVien || user.code,
        ngayNghi: form.ngayBatDau,
        ngayNghiDen: toDateKey(addDays(fromDateKey(form.ngayDiLamLai), -1)),
        loaiNghi: form.loaiNghi,
        lyDo: form.lyDo.trim(),
      });
      if (res.data?.success !== false) {
        setNotice({ type: "success", text: "Đã gửi đơn xin nghỉ. Đơn đang ở trạng thái Chờ duyệt." });
        setForm(emptyForm);
        setErrors({});
        fetchMyRequests();
      }
    } catch (err) {
      setNotice({
        type: "error",
        text: err.response?.data?.message || "Không gửi được đơn xin nghỉ. Vui lòng thử lại!",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const hasEmployeeId = Boolean(user.maNhanVien || user.code);

  return (
    <div className="sw-page">
      <div className="sw-page-header">
        <div>
          <h2 className="sw-page-title">
            <FileSpreadsheet size={24} color="#6366f1" /> Đơn xin nghỉ phép
          </h2>
          <p className="sw-page-sub">
            Người gửi: <strong>{user.name}</strong>
            {user.code ? ` · ${user.code}` : ""}
          </p>
        </div>
      </div>

      {notice && (
        <div className={`sw-alert sw-alert-${notice.type}`}>
          {notice.type === "success" ? (
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          ) : (
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
          )}
          <span>{notice.text}</span>
          <button className="sw-alert-close" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {!hasEmployeeId && (
        <div className="sw-alert sw-alert-warning">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>
            Tài khoản đăng nhập nhanh (demo) không gắn với mã nhân viên nên không gửi được đơn. Vui lòng
            đăng nhập bằng tài khoản nhân viên thật.
          </span>
        </div>
      )}

      <div className="sw-grid-2">
        {/* FORM NỘP ĐƠN */}
        <form className="sw-card" onSubmit={handleSubmit} noValidate>
          <h3 className="sw-card-title">Tạo đơn mới</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="sw-field">
              <label className="sw-label">
                Ngày bắt đầu nghỉ <span className="sw-required">*</span>
              </label>
              <input
                type="date"
                className={`sw-input ${errors.ngayBatDau ? "invalid" : ""}`}
                min={today}
                value={form.ngayBatDau}
                onChange={(e) => setForm({ ...form, ngayBatDau: e.target.value })}
              />
              {errors.ngayBatDau && <span className="sw-field-error">{errors.ngayBatDau}</span>}
            </div>

            <div className="sw-field">
              <label className="sw-label">
                Ngày đi làm lại <span className="sw-required">*</span>
              </label>
              <input
                type="date"
                className={`sw-input ${errors.ngayDiLamLai ? "invalid" : ""}`}
                min={form.ngayBatDau || today}
                value={form.ngayDiLamLai}
                onChange={(e) => setForm({ ...form, ngayDiLamLai: e.target.value })}
              />
              {errors.ngayDiLamLai && <span className="sw-field-error">{errors.ngayDiLamLai}</span>}
            </div>
          </div>

          {soNgayNghi > 0 && (
            <div className="sw-alert sw-alert-info" style={{ marginTop: -4 }}>
              <span>
                Tổng số ngày nghỉ: <strong>{soNgayNghi} ngày</strong> (từ{" "}
                {formatDateVN(form.ngayBatDau)} đến hết{" "}
                {formatDateVN(toDateKey(addDays(fromDateKey(form.ngayDiLamLai), -1)))})
              </span>
            </div>
          )}

          <div className="sw-field">
            <label className="sw-label">Loại nghỉ</label>
            <select
              className="sw-select"
              value={form.loaiNghi}
              onChange={(e) => setForm({ ...form, loaiNghi: e.target.value })}
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sw-field">
            <label className="sw-label">
              Lý do xin nghỉ <span className="sw-required">*</span>
            </label>
            <textarea
              className={`sw-textarea ${errors.lyDo ? "invalid" : ""}`}
              placeholder="Ví dụ: Em xin nghỉ để về quê dự đám cưới người thân..."
              value={form.lyDo}
              onChange={(e) => setForm({ ...form, lyDo: e.target.value })}
            />
            {errors.lyDo && <span className="sw-field-error">{errors.lyDo}</span>}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              className="sw-btn sw-btn-light"
              onClick={() => {
                setForm(emptyForm);
                setErrors({});
              }}
            >
              Nhập lại
            </button>
            <button
              type="submit"
              className="sw-btn sw-btn-primary"
              disabled={submitting || !hasEmployeeId}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin-animation" /> Đang gửi...
                </>
              ) : (
                <>
                  <Send size={16} /> Gửi đơn
                </>
              )}
            </button>
          </div>
        </form>

        {/* DANH SÁCH ĐƠN CỦA TÔI */}
        <div className="sw-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="sw-card-title">Đơn đã gửi</h3>
            <button className="sw-btn sw-btn-light" onClick={fetchMyRequests} title="Làm mới">
              <RotateCcw size={14} />
            </button>
          </div>

          {loading ? (
            <div className="sw-empty">
              <Loader2 size={20} className="spin-animation" />
            </div>
          ) : requests.length === 0 ? (
            <div className="sw-empty">Bạn chưa gửi đơn xin nghỉ nào.</div>
          ) : (
            <div className="sw-table-wrap">
              <table className="sw-table">
                <thead>
                  <tr>
                    <th>Thời gian nghỉ</th>
                    <th>Lý do</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const status = STATUS_LABELS[r.TrangThai] || STATUS_LABELS.pending;
                    return (
                      <tr key={r.MaDon}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {formatDateVN(r.NgayNghi)}
                          {r.NgayNghiDen && r.NgayNghiDen !== r.NgayNghi
                            ? ` → ${formatDateVN(r.NgayNghiDen)}`
                            : ""}
                        </td>
                        <td>
                          {r.LyDo}
                          {r.GhiChuQL && <div className="sw-hint">QL: {r.GhiChuQL}</div>}
                        </td>
                        <td>
                          <span className={`sw-badge ${status.cls}`}>{status.text}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
