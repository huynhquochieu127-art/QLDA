import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Sun,
  Sunset,
  Moon,
  Users,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import { API_BASE } from "../utils/staffWork";

// Helper: tính số giờ giữa 2 mốc thời gian HH:mm
export function calculateHours(start, end) {
  try {
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    let startMins = startH * 60 + (startM || 0);
    let endMins = endH * 60 + (endM || 0);
    if (endMins < startMins) endMins += 24 * 60;
    const diff = (endMins - startMins) / 60;
    return Math.round(diff * 10) / 10;
  } catch (e) {
    return 5;
  }
}

const DEFAULT_SHIFTS = [
  {
    tenCaLam: "Ca 1",
    label: "Ca Sáng",
    gioBatDau: "07:00",
    gioKetThuc: "12:00",
    targetStaff: 3,
    moTa: "Ca 1 ngắn linh động cho sinh viên (Sáng)",
    icon: <Sun size={20} color="#f59e0b" />,
    color: "#fef3c7",
    textColor: "#b45309",
    borderColor: "#fde68a",
  },
  {
    tenCaLam: "Ca 2",
    label: "Ca Chiều",
    gioBatDau: "12:00",
    gioKetThuc: "17:00",
    targetStaff: 3,
    moTa: "Ca 2 ngắn linh động cho sinh viên (Chiều)",
    icon: <Sunset size={20} color="#3b82f6" />,
    color: "#eff6ff",
    textColor: "#1d4ed8",
    borderColor: "#bfdbfe",
  },
  {
    tenCaLam: "Ca 3",
    label: "Ca Tối",
    gioBatDau: "17:00",
    gioKetThuc: "22:30",
    targetStaff: 4,
    moTa: "Ca 3 ngắn linh động cho sinh viên (Tối)",
    icon: <Moon size={20} color="#8b5cf6" />,
    color: "#f5f3ff",
    textColor: "#6d28d9",
    borderColor: "#ddd6fe",
  },
];

export default function PartTimeShiftConfig({ onClose, isModal = false }) {
  const [shifts, setShifts] = useState(DEFAULT_SHIFTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Tải cấu hình 3 ca từ Database
  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE}/shifts/part-time`)
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const apiShifts = res.data.data;
          setShifts((prev) =>
            prev.map((defShift, idx) => {
              const matched =
                apiShifts.find((s) => s.tenCaLam === defShift.tenCaLam) ||
                apiShifts[idx];
              if (!matched) return defShift;
              return {
                ...defShift,
                gioBatDau: matched.gioBatDau ? matched.gioBatDau.slice(0, 5) : defShift.gioBatDau,
                gioKetThuc: matched.gioKetThuc ? matched.gioKetThuc.slice(0, 5) : defShift.gioKetThuc,
                targetStaff: matched.targetStaff || defShift.targetStaff,
                moTa: matched.moTa || defShift.moTa,
              };
            })
          );
        }
      })
      .catch((err) => {
        console.warn("Lưu ý khi tải cấu hình ca:", err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (index, field, value) => {
    setShifts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleResetDefault = () => {
    setShifts(DEFAULT_SHIFTS);
    setMessage("Đã nạp lại mốc giờ chuẩn mặc định (Ca 1: 07:00-12:00, Ca 2: 12:00-17:00, Ca 3: 17:00-22:30). Hãy bấm [Lưu cấu hình] để ghi vào Database.");
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        shifts: shifts.map((s) => {
          const soTieng = calculateHours(s.gioBatDau, s.gioKetThuc);
          return {
            tenCaLam: s.tenCaLam,
            gioBatDau: s.gioBatDau,
            gioKetThuc: s.gioKetThuc,
            soTieng,
            targetStaff: Number(s.targetStaff || 3),
            moTa: `${s.tenCaLam} ngắn linh động (${s.gioBatDau} - ${s.gioKetThuc}, ${soTieng} tiếng)`,
          };
        }),
      };

      const res = await axios.post(`${API_BASE}/shifts/config-part-time`, payload);

      if (res.data?.success) {
        setMessage("✅ Đã lưu thông tin cấu hình 3 ca ngắn (Ca 1, Ca 2, Ca 3) vào Database thành công!");
        // Đồng bộ vào localStorage để các màn hình offline/cache cùng nhận ngay lập tức
        try {
          localStorage.setItem("app_configured_part_time_shifts", JSON.stringify(payload.shifts));
        } catch (_) {}
      }
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu cấu hình ca vào Database: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div style={{ maxWidth: isModal ? "100%" : "880px", margin: isModal ? "0" : "0 auto" }}>
      {/* Tiêu đề & Giới thiệu */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              padding: "10px",
              backgroundColor: "#e0e7ff",
              color: "#4338ca",
              borderRadius: "10px",
              display: "flex",
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#1e293b" }}>
              Cấu hình 3 Ca Ngắn Linh Động (Part-time / Sinh viên)
            </h2>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.88rem" }}>
              Thiết lập khung giờ cho <strong>Ca 1, Ca 2, và Ca 3</strong> để sinh viên dễ dàng linh động lịch học.
            </p>
          </div>
        </div>

        {/* Lưu ý nghiệp vụ quan trọng */}
        <div
          style={{
            marginTop: 14,
            padding: "12px 16px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            fontSize: "0.85rem",
            color: "#166534",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Lưu ý nghiệp vụ:</strong> Những ca làm việc ngắn này{" "}
            <strong>chỉ hiển thị khi nhân viên Part-time vào hệ thống đăng ký lịch</strong>. Nhân viên Full-time hưởng
            chế độ lương cứng hàng tháng và làm theo giờ hành chính cố định.
          </div>
        </div>
      </div>

      {/* Thông báo thành công / lỗi */}
      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            backgroundColor: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            borderRadius: "8px",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: "8px",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Danh sách 3 Card cấu hình 3 Ca */}
      <form onSubmit={handleSave}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
          {shifts.map((shift, idx) => {
            const hours = calculateHours(shift.gioBatDau, shift.gioKetThuc);

            return (
              <div
                key={shift.tenCaLam}
                style={{
                  backgroundColor: "#fff",
                  border: `2px solid ${shift.borderColor}`,
                  borderRadius: "12px",
                  padding: "18px 20px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                  position: "relative",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Header Card Ca */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        padding: "6px 8px",
                        backgroundColor: shift.color,
                        borderRadius: "8px",
                        display: "flex",
                      }}
                    >
                      {shift.icon}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
                        {shift.tenCaLam}
                      </h4>
                      <span style={{ fontSize: "0.78rem", color: shift.textColor, fontWeight: 600 }}>
                        {shift.label}
                      </span>
                    </div>
                  </div>

                  {/* Huy hiệu số tiếng tự động tính */}
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "20px",
                      backgroundColor: shift.color,
                      color: shift.textColor,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                    }}
                  >
                    ⏱️ {hours} tiếng
                  </span>
                </div>

                {/* Giờ bắt đầu */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    Giờ bắt đầu:
                  </label>
                  <input
                    type="time"
                    required
                    value={shift.gioBatDau}
                    onChange={(e) => handleChange(idx, "gioBatDau", e.target.value)}
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
                </div>

                {/* Giờ kết thúc */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    Giờ kết thúc:
                  </label>
                  <input
                    type="time"
                    required
                    value={shift.gioKetThuc}
                    onChange={(e) => handleChange(idx, "gioKetThuc", e.target.value)}
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
                </div>

                {/* Số nhân viên cần tuyển / ca */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    Số nhân viên cần trong ca:
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Users size={16} color="#64748b" />
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={shift.targetStaff}
                      onChange={(e) => handleChange(idx, "targetStaff", e.target.value)}
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                      }}
                    />
                    <span style={{ fontSize: "0.82rem", color: "#64748b" }}>người</span>
                  </div>
                </div>

                {/* Tóm tắt trực quan */}
                <div
                  style={{
                    padding: "8px 10px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    color: "#64748b",
                    lineHeight: 1.4,
                  }}
                >
                  💡 Khung giờ: <strong>{shift.gioBatDau}</strong> đến <strong>{shift.gioKetThuc}</strong> ({hours} tiếng).
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions Button */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            type="button"
            onClick={handleResetDefault}
            style={{
              padding: "10px 18px",
              backgroundColor: "#f1f5f9",
              color: "#475569",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <RotateCcw size={16} /> Mặc định (07:00, 12:00, 17:00)
          </button>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                backgroundColor: "#fff",
                color: "#64748b",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Đóng
            </button>
          )}

          <button
            type="submit"
            disabled={saving || loading}
            style={{
              padding: "10px 24px",
              backgroundColor: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.3)",
            }}
          >
            <Save size={18} />
            {saving ? "Đang lưu vào CSDL..." : "Lưu cấu hình 3 ca vào Database"}
          </button>
        </div>
      </form>
    </div>
  );

  if (isModal) {
    return (
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 20,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#fff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "860px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "24px 28px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderRadius: "12px",
        padding: "24px 28px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {content}
    </div>
  );
}
