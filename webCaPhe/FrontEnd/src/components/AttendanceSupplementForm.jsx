import React, { useState } from "react";
import axios from "axios";
import { X, Send, Loader2, AlertCircle, Info } from "lucide-react";
import {
  API_BASE,
  SHIFTS,
  getShift,
  toDateKey,
  readLocal,
  writeLocal,
  STORAGE_KEYS,
} from "../utils/staffWork";

const REQUEST_TYPES = [
  "Quên check-in",
  "Quên check-out",
  "Quên cả check-in và check-out",
];

// QH-49: Form gửi yêu cầu bổ sung điểm danh khi nhân viên quên check-in
export default function AttendanceSupplementForm({ user, onClose, onSubmitted }) {
  const today = toDateKey(new Date());
  const [form, setForm] = useState({
    ngay: today,
    shiftType: SHIFTS[0].id,
    loai: REQUEST_TYPES[0],
    gioVao: SHIFTS[0].start,
    gioRa: SHIFTS[0].end,
    lyDo: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleShiftChange = (shiftType) => {
    const shift = getShift(shiftType);
    setForm({ ...form, shiftType, gioVao: shift.start, gioRa: shift.end });
  };

  const validate = () => {
    const next = {};
    if (!form.ngay) next.ngay = "Vui lòng chọn ngày làm việc bị quên điểm danh.";
    else if (form.ngay > today) next.ngay = "Không thể gửi yêu cầu cho ngày trong tương lai.";
    if (!form.gioVao || !form.gioRa) next.thoiGian = "Vui lòng nhập giờ vào và giờ ra thực tế.";
    else if (form.gioRa <= form.gioVao) next.thoiGian = "Giờ ra phải sau giờ vào.";
    if (form.lyDo.trim().length < 10) next.lyDo = "Vui lòng mô tả lý do rõ ràng (tối thiểu 10 ký tự).";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const shift = getShift(form.shiftType);
    const payload = {
      maNhanVien: user.maNhanVien,
      maNhanVienCode: user.code,
      ngay: form.ngay,
      caLam: shift.name,
      loai: form.loai,
      thoiGian: `${form.gioVao} - ${form.gioRa}`,
      lyDo: form.lyDo.trim(),
      trangThai: "pending",
    };

    setSubmitting(true);
    let synced = false;
    try {
      const res = await axios.post(`${API_BASE}/yeucau-chamcong`, payload);
      synced = Boolean(res.data && res.data.success);
    } catch (_) {
      // Backend chưa có API tiếp nhận -> lưu tạm trên máy, trạng thái vẫn là Chờ duyệt
      synced = false;
    }

    const record = {
      id: `YC-${Date.now()}`,
      staffId: user.staffId,
      staffName: user.name,
      ...payload,
      synced,
      ngayTao: new Date().toISOString(),
    };
    writeLocal(STORAGE_KEYS.attendanceRequests, [
      record,
      ...readLocal(STORAGE_KEYS.attendanceRequests),
    ]);

    setSubmitting(false);
    onSubmitted(record);
  };

  return (
    <div className="sw-modal-overlay" onClick={onClose}>
      <div className="sw-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sw-modal-header">
          <div>
            <h3>Yêu cầu bổ sung điểm danh</h3>
            <span className="sw-hint">
              {user.name}
              {user.code ? ` · ${user.code}` : ""}
            </span>
          </div>
          <button type="button" className="sw-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="sw-modal-body">
            <div className="sw-alert sw-alert-info">
              <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Yêu cầu sẽ được gửi tới Quản lý với trạng thái <strong>Chờ duyệt</strong>. Khi được
                duyệt, hệ thống tự ghi nhận công cho ca làm này.
              </span>
            </div>

            <div className="sw-field">
              <label className="sw-label">
                Ngày làm việc <span className="sw-required">*</span>
              </label>
              <input
                type="date"
                className={`sw-input ${errors.ngay ? "invalid" : ""}`}
                max={today}
                value={form.ngay}
                onChange={(e) => setForm({ ...form, ngay: e.target.value })}
              />
              {errors.ngay && <span className="sw-field-error">{errors.ngay}</span>}
            </div>

            <div className="sw-field">
              <label className="sw-label">
                Ca làm việc bị quên <span className="sw-required">*</span>
              </label>
              <select
                className="sw-select"
                value={form.shiftType}
                onChange={(e) => handleShiftChange(e.target.value)}
              >
                {SHIFTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.start} - {s.end})
                  </option>
                ))}
              </select>
            </div>

            <div className="sw-field">
              <label className="sw-label">Loại yêu cầu</label>
              <select
                className="sw-select"
                value={form.loai}
                onChange={(e) => setForm({ ...form, loai: e.target.value })}
              >
                {REQUEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="sw-field">
              <label className="sw-label">
                Giờ làm thực tế <span className="sw-required">*</span>
              </label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="time"
                  className={`sw-input ${errors.thoiGian ? "invalid" : ""}`}
                  value={form.gioVao}
                  onChange={(e) => setForm({ ...form, gioVao: e.target.value })}
                />
                <span style={{ color: "#94a3b8" }}>→</span>
                <input
                  type="time"
                  className={`sw-input ${errors.thoiGian ? "invalid" : ""}`}
                  value={form.gioRa}
                  onChange={(e) => setForm({ ...form, gioRa: e.target.value })}
                />
              </div>
              {errors.thoiGian ? (
                <span className="sw-field-error">{errors.thoiGian}</span>
              ) : (
                <span className="sw-hint">Mặc định theo giờ chuẩn của ca, sửa lại nếu khác thực tế.</span>
              )}
            </div>

            <div className="sw-field" style={{ marginBottom: 0 }}>
              <label className="sw-label">
                Lý do <span className="sw-required">*</span>
              </label>
              <textarea
                className={`sw-textarea ${errors.lyDo ? "invalid" : ""}`}
                placeholder="Ví dụ: Em quên bấm check-in lúc vào ca vì điện thoại hết pin, đã có mặt từ 07:00..."
                value={form.lyDo}
                onChange={(e) => setForm({ ...form, lyDo: e.target.value })}
              />
              {errors.lyDo && (
                <span className="sw-field-error">
                  <AlertCircle size={12} style={{ verticalAlign: "-2px" }} /> {errors.lyDo}
                </span>
              )}
            </div>
          </div>

          <div className="sw-modal-footer">
            <button type="button" className="sw-btn sw-btn-light" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="sw-btn sw-btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin-animation" /> Đang gửi...
                </>
              ) : (
                <>
                  <Send size={16} /> Gửi yêu cầu
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
