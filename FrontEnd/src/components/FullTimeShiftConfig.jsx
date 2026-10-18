import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Sun,
  Sunset,
  Users,
  RotateCcw,
  Sparkles,
  Info,
  ShieldCheck,
  Briefcase,
  X,
} from "lucide-react";
import { API_BASE } from "../utils/staffWork";

// Helper: tính số giờ giữa 2 mốc thời gian HH:mm
export function calculateHours(start, end) {
  try {
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    let startMins = startH * 60 + (startM || 0);
    let endMins = endH * 60 + (endM || 0);
    if (endMins < startMins) endMins += 24 * 60; // Qua đêm
    const diff = (endMins - startMins) / 60;
    return Math.round(diff * 10) / 10;
  } catch (e) {
    return 8;
  }
}

const DEFAULT_FULLTIME_SHIFTS = [
  {
    tenCaLam: "Ca A",
    label: "Ca Sáng Chính",
    gioBatDau: "07:00",
    gioKetThuc: "15:00",
    targetStaff: 4,
    moTa: "Ca A chuẩn sáng 8 tiếng dành cho nhân viên Full-time và Quản lý (07:00 - 15:00)",
    icon: <Sun size={22} color="#ea580c" />,
    color: "#fff7ed",
    textColor: "#c2410c",
    borderColor: "#fed7aa",
  },
  {
    tenCaLam: "Ca B",
    label: "Ca Chiều / Tối Chính",
    gioBatDau: "14:30",
    gioKetThuc: "22:30",
    targetStaff: 4,
    moTa: "Ca B chuẩn chiều/tối 8 tiếng dành cho nhân viên Full-time và Quản lý (14:30 - 22:30)",
    icon: <Sunset size={22} color="#4338ca" />,
    color: "#eef2ff",
    textColor: "#3730a3",
    borderColor: "#c7d2fe",
  },
];

export default function FullTimeShiftConfig({ isModal = false, onClose = null }) {
  const [shifts, setShifts] = useState(DEFAULT_FULLTIME_SHIFTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Tải cấu hình 2 ca chính từ Database
  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE}/shifts/full-time`)
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const apiShifts = res.data.data;
          setShifts((prev) =>
            prev.map((defShift) => {
              const matched = apiShifts.find(
                (item) => item.tenCaLam.toLowerCase() === defShift.tenCaLam.toLowerCase()
              );
              if (matched) {
                return {
                  ...defShift,
                  gioBatDau: matched.gioBatDau,
                  gioKetThuc: matched.gioKetThuc,
                  targetStaff: matched.targetStaff || defShift.targetStaff,
                  moTa: matched.moTa || defShift.moTa,
                };
              }
              return defShift;
            })
          );
        }
      })
      .catch((err) => {
        console.warn("Chưa tải được cấu hình ca Full-time từ API, sử dụng mặc định:", err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (index, field, value) => {
    setShifts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setMessage(null);
    setError(null);
  };

  const handleResetDefaults = () => {
    if (window.confirm("Khôi phục khung giờ chuẩn mặc định (Ca A: 07:00-15:00, Ca B: 14:30-22:30)?")) {
      setShifts(DEFAULT_FULLTIME_SHIFTS);
      setMessage("Đã đặt lại khung giờ chuẩn. Hãy bấm 'Lưu cấu hình vào Database' để cập nhật.");
      setError(null);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    // Validate giờ bắt đầu và kết thúc
    for (const s of shifts) {
      if (!s.gioBatDau || !s.gioKetThuc) {
        setError(`Vui lòng nhập đầy đủ giờ bắt đầu và kết thúc cho ${s.tenCaLam}.`);
        setSaving(false);
        return;
      }
      const hrs = calculateHours(s.gioBatDau, s.gioKetThuc);
      if (hrs <= 0) {
        setError(`Thời lượng của ${s.tenCaLam} không hợp lệ.`);
        setSaving(false);
        return;
      }
    }

    try {
      const payload = shifts.map((s) => ({
        tenCaLam: s.tenCaLam,
        name: s.tenCaLam,
        gioBatDau: s.gioBatDau,
        gioKetThuc: s.gioKetThuc,
        soTieng: calculateHours(s.gioBatDau, s.gioKetThuc),
        targetStaff: parseInt(s.targetStaff, 10) || 4,
        loaiCa: "Full-time",
        moTa: s.moTa,
      }));

      const res = await axios.post(`${API_BASE}/shifts/config-full-time`, { shifts: payload });
      if (res.data?.success) {
        setMessage("Lưu cấu hình 2 ca chính (Full-time & Quản lý) vào Database thành công!");
      } else {
        setError(res.data?.message || "Lỗi khi lưu cấu hình vào hệ thống.");
      }
    } catch (err) {
      console.error("Lỗi lưu cấu hình 2 ca Full-time:", err);
      setError(err.response?.data?.message || "Lỗi kết nối máy chủ khi lưu cấu hình ca làm việc.");
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="pt-shift-config-wrap" style={{ maxWidth: 940, margin: "0 auto" }}>
      {/* HEADER SECTION */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d97706",
              }}
            >
              <Briefcase size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "#1e293b" }}>
                Thiết lập 2 ca làm việc chính (Full-time & Quản lý)
              </h2>
              <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.88rem" }}>
                Cấu hình giờ chuẩn cho <strong>Ca A</strong> (sáng) và <strong>Ca B</strong> (chiều/tối) - Chuẩn 8 tiếng/ngày, lưu trực tiếp vào CSDL MySQL.
              </p>
            </div>
          </div>
        </div>

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="sw-btn sw-btn-light"
            style={{ padding: "6px 10px", borderRadius: 8 }}
            title="Đóng modal"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* THÔNG BÁO NGHIỆP VỤ */}
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 8,
          padding: "12px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 20,
          color: "#166534",
        }}
      >
        <ShieldCheck size={20} style={{ flexShrink: 0, marginTop: 2, color: "#16a34a" }} />
        <div style={{ fontSize: "0.88rem", lineHeight: 1.5 }}>
          <strong>Lưu ý nghiệp vụ:</strong> Đây là 2 ca làm việc tiêu chuẩn dành riêng cho nhân viên ký hợp đồng <strong>Full-time</strong> và cấp <strong>Quản lý</strong>. Nhân viên Part-time (sinh viên) sẽ đăng ký lịch theo 3 ca ngắn linh động (Ca 1, Ca 2, Ca 3).
        </div>
      </div>

      {message && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 500,
          }}
        >
          <AlertCircle size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      {/* DANH SÁCH 2 CA FULL-TIME */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {shifts.map((shift, idx) => {
          const hours = calculateHours(shift.gioBatDau, shift.gioKetThuc);
          return (
            <div
              key={shift.tenCaLam}
              style={{
                background: "#ffffff",
                border: `1.5px solid ${shift.borderColor}`,
                borderRadius: 14,
                padding: 20,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                position: "relative",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${shift.borderColor}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: shift.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {shift.icon}
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.2rem",
                        fontWeight: 700,
                        color: "#1e293b",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {shift.tenCaLam}
                      <span
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: shift.color,
                          color: shift.textColor,
                        }}
                      >
                        {shift.label}
                      </span>
                    </h3>
                    <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 2 }}>
                      Áp dụng: Full-time & Quản lý
                    </div>
                  </div>
                </div>

                {/* Badge số tiếng */}
                <div
                  style={{
                    textAlign: "right",
                    background: shift.color,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1px solid ${shift.borderColor}`,
                  }}
                >
                  <div style={{ fontSize: "0.72rem", color: shift.textColor, fontWeight: 600 }}>
                    THỜI LƯỢNG
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: shift.textColor }}>
                    {hours} tiếng
                  </div>
                </div>
              </div>

              {/* Form Input khung giờ */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: 6,
                    }}
                  >
                    <Clock size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    Giờ bắt đầu:
                  </label>
                  <input
                    type="time"
                    value={shift.gioBatDau}
                    onChange={(e) => handleChange(idx, "gioBatDau", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1.5px solid #cbd5e1",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "#1e293b",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: 6,
                    }}
                  >
                    <Clock size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    Giờ kết thúc:
                  </label>
                  <input
                    type="time"
                    value={shift.gioKetThuc}
                    onChange={(e) => handleChange(idx, "gioKetThuc", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1.5px solid #cbd5e1",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "#1e293b",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Định mức nhân sự & Mô tả */}
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: 6,
                  }}
                >
                  <Users size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                  Định mức nhân sự cần thiết (người / ca):
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={shift.targetStaff}
                  onChange={(e) => handleChange(idx, "targetStaff", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.95rem",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: 6,
                  }}
                >
                  Ghi chú / Mô tả ca:
                </label>
                <input
                  type="text"
                  value={shift.moTa}
                  onChange={(e) => handleChange(idx, "moTa", e.target.value)}
                  placeholder="Ví dụ: Ca A 8 tiếng chuẩn sáng..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.88rem",
                    color: "#334155",
                    outline: "none",
                  }}
                />
              </div>

              {/* Thông tin tóm tắt */}
              <div
                style={{
                  marginTop: 14,
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "#f8fafc",
                  fontSize: "0.82rem",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  Khung giờ: <strong>{shift.gioBatDau} - {shift.gioKetThuc}</strong>
                </span>
                <span>
                  Công chuẩn: <strong style={{ color: "#2563eb" }}>{hours} tiếng</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid #e2e8f0",
          paddingTop: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={handleResetDefaults}
          className="sw-btn sw-btn-light"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.88rem" }}
          title="Đặt lại Ca A (07:00-15:00) và Ca B (14:30-22:30)"
        >
          <RotateCcw size={15} /> Khôi phục khung giờ chuẩn (8 tiếng)
        </button>

        <div style={{ display: "flex", gap: 10 }}>
          {isModal && onClose && (
            <button type="button" onClick={onClose} className="sw-btn sw-btn-light">
              Đóng
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="sw-btn sw-btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              fontWeight: 600,
            }}
          >
            <Save size={16} />
            {saving ? "Đang lưu CSDL..." : "Lưu cấu hình vào Database"}
          </button>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        className="shift-modal-overlay"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 16,
          backdropFilter: "blur(3px)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            maxWidth: 960,
            width: "100%",
            maxHeight: "92vh",
            overflowY: "auto",
            padding: 24,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return <div className="sw-card" style={{ padding: 24 }}>{content}</div>;
}
