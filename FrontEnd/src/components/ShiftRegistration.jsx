import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  X,
  Sun,
  Sunset,
  Moon,
  Info,
  Clock,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";
import "../../css/staff.css";
import {
  DAY_LABELS,
  toDateKey,
  getMonday,
  addDays,
  getCurrentUser,
  API_BASE,
} from "../utils/staffWork";

const SHIFT_ICONS = {
  morning: <Sun size={13} color="#d97706" />,
  afternoon: <Sunset size={13} color="#ea580c" />,
  evening: <Moon size={13} color="#4f46e5" />,
};

const STATUS_TEXT = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

// 3 ca ngắn tiêu chuẩn cho sinh viên / Part-time
const DEFAULT_PARTTIME_SHIFTS = [
  {
    id: "morning",
    name: "Ca 1",
    short: "Ca 1",
    label: "Ca 1 (Sáng)",
    start: "07:00",
    end: "12:00",
    soTieng: 5,
    targetStaff: 3,
    colorClass: "morning",
  },
  {
    id: "afternoon",
    name: "Ca 2",
    short: "Ca 2",
    label: "Ca 2 (Chiều)",
    start: "12:00",
    end: "17:00",
    soTieng: 5,
    targetStaff: 3,
    colorClass: "afternoon",
  },
  {
    id: "evening",
    name: "Ca 3",
    short: "Ca 3",
    label: "Ca 3 (Tối)",
    start: "17:00",
    end: "22:30",
    soTieng: 5.5,
    targetStaff: 4,
    colorClass: "evening",
  },
];

/**
 * Component dành RIÊNG cho Nhân viên Part-time (Sinh viên) đăng ký 3 ca ngắn linh động:
 * - Ca 1 (07:00 - 12:00, 5 tiếng)
 * - Ca 2 (12:00 - 17:00, 5 tiếng)
 * - Ca 3 (17:00 - 22:30, 5.5 tiếng)
 */
export default function ShiftRegistration() {
  const user = useMemo(() => getCurrentUser(), []);
  const thisMonday = useMemo(() => getMonday(new Date()), []);
  const [weekStart, setWeekStart] = useState(() => addDays(thisMonday, 7)); // Mặc định: tuần sau
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [selected, setSelected] = useState([]); // ["YYYY-MM-DD_morning", ...]
  const [notice, setNotice] = useState("");
  const [shiftsList, setShiftsList] = useState(DEFAULT_PARTTIME_SHIFTS);

  // Ràng buộc hợp đồng: Chỉ nhân viên Part-time mới có quyền đăng ký ca tại đây
  const isPartTime = useMemo(() => {
    const rawType = (
      user.loaiNhanVien ||
      user.position ||
      user.role ||
      ""
    ).toLowerCase();
    return (
      rawType.includes("part") ||
      (!rawType.includes("full") &&
        !rawType.includes("quản lý") &&
        !rawType.includes("manager") &&
        !rawType.includes("admin"))
    );
  }, [user]);

  // Tải cấu hình 3 ca Part-time từ Database
  useEffect(() => {
    axios
      .get(`${API_BASE}/shifts/part-time`)
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const apiShifts = res.data.data.map((s) => ({
            id: s.tenCaLam === "Ca 1" ? "morning" : s.tenCaLam === "Ca 2" ? "afternoon" : "evening",
            name: s.tenCaLam,
            short: s.tenCaLam,
            label: s.tenCaLam === "Ca 1" ? "Ca 1 (Sáng)" : s.tenCaLam === "Ca 2" ? "Ca 2 (Chiều)" : "Ca 3 (Tối)",
            start: s.gioBatDau,
            end: s.gioKetThuc,
            soTieng: s.soTieng || 5,
            targetStaff: s.targetStaff || 3,
            maCaLam: s.maCaLam,
            colorClass: s.tenCaLam === "Ca 1" ? "morning" : s.tenCaLam === "Ca 2" ? "afternoon" : "evening",
          }));
          setShiftsList(apiShifts);
        }
      })
      .catch((err) => {
        console.warn("Dùng danh sách ca Part-time mặc định:", err.message);
      });
  }, []);

  // Tải danh sách đăng ký ca từ CSDL MySQL (bảng dangky_ca)
  const fetchRegistrations = async () => {
    try {
      setLoadingRegs(true);
      const res = await axios.get(`${API_BASE}/shifts/registrations`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setRegistrations(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi tải đăng ký ca từ database:", err);
    } finally {
      setLoadingRegs(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [weekStart]);

  // Chỉ được đăng ký cho các tuần sau tuần hiện tại
  const isEditableWeek = weekStart > thisMonday;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      dateKey: toDateKey(date),
      label: DAY_LABELS[date.getDay()],
      dateText: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
    };
  });

  const weekKeys = weekDays.map((d) => d.dateKey);

  // Xác định ca làm của chính tài khoản đang đăng nhập
  const isMyRegistration = (r) => {
    if (!r) return false;
    if (user.staffId && r.staffId === user.staffId) return true;
    if (user.maNhanVien && String(r.maNhanVien) === String(user.maNhanVien)) return true;
    if (user.name && r.staffName && r.staffName.toLowerCase() === user.name.toLowerCase()) return true;
    return false;
  };

  // Ca Part-time của tôi trong tuần
  const myWeekRegs = registrations.filter(
    (r) =>
      isMyRegistration(r) &&
      weekKeys.includes(r.dateKey) &&
      (r.shiftType === "morning" ||
        r.shiftType === "afternoon" ||
        r.shiftType === "evening" ||
        ["Ca 1", "Ca 2", "Ca 3"].includes(r.tenCaLam) ||
        r.loaiCa === "Part-time")
  );

  const findMyReg = (dateKey, shift) =>
    myWeekRegs.find(
      (r) =>
        r.dateKey === dateKey &&
        (r.shiftType === shift.id ||
          (shift.maCaLam && r.maCaLam === shift.maCaLam) ||
          r.tenCaLam === shift.name)
    );

  const countInSlot = (dateKey, shift) =>
    registrations.filter(
      (r) =>
        r.dateKey === dateKey &&
        (r.shiftType === shift.id ||
          (shift.maCaLam && r.maCaLam === shift.maCaLam) ||
          r.tenCaLam === shift.name) &&
        r.status !== "rejected"
    ).length;

  // Click vào block ca: chọn/bỏ chọn, hoặc hủy ca đang chờ duyệt
  const handleClickShift = async (dateKey, shift) => {
    const existing = findMyReg(dateKey, shift);
    if (existing) {
      if (
        existing.status === "pending" &&
        window.confirm(`Hủy đăng ký ${shift.name} ngày ${dateKey.split("-").reverse().join("/")}?`)
      ) {
        try {
          await axios.delete(`${API_BASE}/shifts/registrations/${existing.id}`);
          setNotice(`Đã hủy đăng ký ${shift.name} ngày ${dateKey} trong CSDL.`);
          fetchRegistrations();
        } catch (err) {
          alert("Lỗi khi hủy đăng ký ca: " + (err.response?.data?.message || err.message));
        }
      }
      return;
    }
    // Nếu ca đã đủ người (hết chỗ), chặn ngay không cho chọn
    const count = countInSlot(dateKey, shift);
    const targetLimit = shift.targetStaff || 3;
    if (count >= targetLimit) {
      alert(`Ca làm việc ${shift.name} ngày ${dateKey} đã đủ người (${count}/${targetLimit} NV). Đã đầy / Hết chỗ, không thể đăng ký!`);
      return;
    }

    const key = `${dateKey}_${shift.id}`;
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  // Gửi các ca đã chọn để lưu vào bảng dangky_ca trong MySQL
  const handleSubmit = async () => {
    if (selected.length === 0) return;

    const payload = selected.map((key) => {
      const [dateKey, shiftType] = key.split("_");
      const matchedShift = shiftsList.find((s) => s.id === shiftType);
      return {
        staffId: user.staffId || user.maNhanVien || user.id,
        staffName: user.name,
        role: user.position || "Part-time",
        dateKey,
        shiftType, // "morning", "afternoon", "evening"
        maCaLam: matchedShift?.maCaLam,
        status: "pending",
      };
    });

    try {
      const res = await axios.post(`${API_BASE}/shifts/registrations`, {
        registrations: payload,
      });

      if (res.data?.success) {
        setSelected([]);
        setNotice(
          `Đã lưu ${payload.length} ca Part-time vào Database thành công cho tuần (${weekRangeText})! Quản lý sẽ thấy trong mục "Duyệt ca làm & Lịch trình" để phê duyệt.`
        );
        fetchRegistrations();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail
        ? `${err.response.data.message}: ${err.response.data.detail}`
        : err.response?.data?.message || err.message;
      alert("Lỗi khi gửi đăng ký ca: " + errorMsg);
    }
  };

  const weekRangeText = `${addDays(weekStart, 0).toLocaleDateString("vi-VN")} — ${addDays(
    weekStart,
    6
  ).toLocaleDateString("vi-VN")}`;

  const countByStatus = (status) => myWeekRegs.filter((r) => r.status === status).length;

  // CHẶN HOÀN TOÀN NHÂN VIÊN FULL-TIME / QUẢN LÝ
  if (!isPartTime) {
    return (
      <div className="sw-page">
        <div
          className="sw-card"
          style={{
            textAlign: "center",
            padding: "54px 24px",
            border: "2px dashed #fca5a5",
            background: "#fff5f5",
            borderRadius: 14,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <AlertTriangle size={32} color="#dc2626" />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#991b1b", margin: "0 0 8px 0" }}>
            Quyền truy cập bị từ chối: Dành riêng cho nhân viên Part-time
          </h3>
          <p style={{ maxWidth: 540, margin: "0 auto 16px", color: "#7f1d1d", fontSize: "0.92rem", lineHeight: 1.6 }}>
            Tài khoản của bạn được ghi nhận là hợp đồng <strong>Full-time / Quản lý</strong>.
            Theo quy định, nhân viên Full-time <strong>không có quyền đăng ký các ca ngắn Part-time (Ca 1, Ca 2, Ca 3)</strong>.
          </p>
          <div style={{ display: "inline-block", background: "#ffffff", padding: "8px 16px", borderRadius: 8, border: "1px solid #fecaca", fontSize: "0.85rem", color: "#991b1b" }}>
            Vui lòng vào mục <strong>"Đăng ký ca làm (Full-time)"</strong> trên thanh menu để đăng ký Ca A hoặc Ca B.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sw-page">
      {/* Header trang đăng ký Part-time */}
      <div className="sw-page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 className="sw-page-title" style={{ color: "#2563eb" }}>
              <GraduationCap size={26} color="#2563eb" /> Đăng ký ca làm Part-time
            </h2>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 999,
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
              }}
            >
              Dành riêng cho Sinh viên / Part-time
            </span>
          </div>
          <p className="sw-page-sub">
            Đăng ký 3 ca ngắn linh động: <strong>Ca 1 (07:00 - 12:00)</strong>,{" "}
            <strong>Ca 2 (12:00 - 17:00)</strong>, <strong>Ca 3 (17:00 - 22:30)</strong>. Bấm vào ca để chọn và gửi đăng ký.
          </p>
        </div>

        {/* Điều hướng tuần */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="sw-btn sw-btn-light"
            onClick={() => {
              setWeekStart(addDays(weekStart, -7));
              setSelected([]);
            }}
            disabled={weekStart.getTime() <= thisMonday.getTime()}
            title="Tuần trước"
          >
            <ChevronLeft size={16} />
          </button>
          <div style={{ textAlign: "center", minWidth: 155 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
              {weekStart.getTime() === thisMonday.getTime()
                ? "Tuần hiện tại"
                : weekStart.getTime() === addDays(thisMonday, 7).getTime()
                ? "Tuần sau"
                : "Tuần tới"}
            </div>
            <div className="sw-hint">{weekRangeText}</div>
          </div>
          <button
            className="sw-btn sw-btn-light"
            onClick={() => {
              setWeekStart(addDays(weekStart, 7));
              setSelected([]);
            }}
            disabled={weekStart >= addDays(thisMonday, 28)}
            title="Tuần sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Thông báo thao tác */}
      {notice && (
        <div className="sw-alert sw-alert-success">
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{notice}</span>
          <button className="sw-alert-close" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {!isEditableWeek && (
        <div className="sw-alert sw-alert-info">
          <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>Tuần hiện tại đã chốt lịch, bạn chỉ có thể xem. Hãy chuyển sang tuần sau để đăng ký ca mới.</span>
        </div>
      )}

      {/* Thống kê 3 ca ngắn */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {shiftsList.map((shift) => (
          <div
            key={shift.id}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "12px 16px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>
                {SHIFT_ICONS[shift.id]} {shift.label}
              </div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                {shift.soTieng}h
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 4 }}>
              Giờ làm: <strong>{shift.start} - {shift.end}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Thống kê ca của nhân viên Part-time */}
      <div className="sw-stats">
        <div className="sw-stat">
          <div className="sw-stat-label">Đang chọn</div>
          <div className="sw-stat-value" style={{ color: "#2563eb" }}>{selected.length} ca</div>
        </div>
        <div className="sw-stat">
          <div className="sw-stat-label">Chờ duyệt</div>
          <div className="sw-stat-value" style={{ color: "#d97706" }}>{countByStatus("pending")} ca</div>
        </div>
        <div className="sw-stat">
          <div className="sw-stat-label">Đã duyệt</div>
          <div className="sw-stat-value" style={{ color: "#16a34a" }}>{countByStatus("approved")} ca</div>
        </div>
        <div className="sw-stat">
          <div className="sw-stat-label">Bị từ chối</div>
          <div className="sw-stat-value" style={{ color: "#dc2626" }}>{countByStatus("rejected")} ca</div>
        </div>
      </div>

      {/* LƯỚI LỊCH ĐĂNG KÝ 3 CA PART-TIME */}
      <div className="sw-card" style={{ padding: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div style={{ fontSize: "0.9rem", color: "#1e40af", fontWeight: 700 }}>
            📅 Lịch đăng ký 3 ca ngắn tuần: {weekRangeText}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: "0.78rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#16a34a", background: "#f0fdf4", padding: "2px 6px", borderRadius: 4, border: "1px solid #bbf7d0" }}>
              ● Đã duyệt
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#d97706", background: "#fffbeb", padding: "2px 6px", borderRadius: 4, border: "1px solid #fde68a" }}>
              ● Chờ duyệt
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#2563eb", background: "#eff6ff", padding: "2px 6px", borderRadius: 4, border: "1px solid #bfdbfe" }}>
              ✓ Đang chọn
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#b91c1c", background: "#fee2e2", padding: "2px 6px", borderRadius: 4, border: "1px solid #fca5a5", fontWeight: 700 }}>
              🚫 Đã đầy / Hết chỗ
            </span>
          </div>
        </div>

        <div className="sw-table-wrap">
          <div className="reg-calendar">
            {weekDays.map((day) => (
              <div key={day.dateKey} className="reg-day">
                <div className="reg-day-head">
                  <div className="name">{day.label}</div>
                  <div className="date">{day.dateText}</div>
                </div>
                <div className="reg-day-body">
                  {shiftsList.map((shift) => {
                    const myReg = findMyReg(day.dateKey, shift);
                    const isSelected = selected.includes(`${day.dateKey}_${shift.id}`);
                    const count = countInSlot(day.dateKey, shift);
                    const targetLimit = shift.targetStaff || 3;
                    const isFull = count >= targetLimit;
                    const isFullBlock = !myReg && isFull;
                    const disabled =
                      !isEditableWeek ||
                      (myReg && myReg.status !== "pending") ||
                      isFullBlock;

                    return (
                      <button
                        key={shift.id}
                        type="button"
                        className={`reg-shift-block ${shift.colorClass} ${isSelected ? "selected" : ""} ${
                          myReg ? `status-${myReg.status}` : ""
                        } ${isFullBlock ? "is-full" : ""}`}
                        disabled={disabled}
                        onClick={() => handleClickShift(day.dateKey, shift)}
                        title={
                          myReg
                            ? `Trạng thái: ${STATUS_TEXT[myReg.status]}`
                            : isFull
                            ? `Ca ${shift.name} ngày ${day.dateKey} đã đủ số lượng người tối đa (${count}/${targetLimit} NV). Đã đầy / Hết chỗ!`
                            : "Bấm để chọn hoặc bỏ chọn ca này"
                        }
                        style={
                          isFullBlock
                            ? {
                                backgroundColor: "#f1f5f9",
                                borderColor: "#cbd5e1",
                                cursor: "not-allowed",
                                opacity: 0.8,
                              }
                            : undefined
                        }
                      >
                        <div className="title">
                          {SHIFT_ICONS[shift.id]} {shift.name} ({shift.soTieng}h)
                        </div>
                        <div className="time">
                          {shift.start} - {shift.end}
                        </div>
                        <div className="slots">
                          {myReg ? (
                            <strong>{STATUS_TEXT[myReg.status]}</strong>
                          ) : isSelected ? (
                            <strong style={{ color: "#2563eb" }}>✓ Đã chọn</strong>
                          ) : isFull ? (
                            <span
                              className="badge-full"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                backgroundColor: "#fee2e2",
                                color: "#b91c1c",
                                fontWeight: 700,
                                fontSize: "0.72rem",
                                padding: "2px 6px",
                                borderRadius: 4,
                                border: "1px solid #fca5a5",
                              }}
                            >
                              🚫 Đã đầy / Hết chỗ ({count}/{targetLimit})
                            </span>
                          ) : (
                            <span>Đã có {count}/${targetLimit} NV</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cụm nút hành động */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
        <button
          className="sw-btn sw-btn-light"
          onClick={() => setSelected([])}
          disabled={selected.length === 0}
        >
          Bỏ chọn tất cả
        </button>
        <button
          className="sw-btn sw-btn-primary"
          onClick={handleSubmit}
          disabled={selected.length === 0 || !isEditableWeek}
        >
          <Send size={16} /> Gửi đăng ký ({selected.length} ca Part-time)
        </button>
      </div>
    </div>
  );
}
