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
  Moon,
  Info,
  Clock,
  Briefcase,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import "../../css/staff.css";
import {
  DAY_LABELS,
  toDateKey,
  getMonday,
  addDays,
  getCurrentUser,
  formatDateVN,
  API_BASE,
} from "../utils/staffWork";

const STATUS_TEXT = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

// Ca Full-time tiêu chuẩn mặc định
const DEFAULT_FULLTIME_SHIFTS = [
  {
    id: "ca_a",
    name: "Ca A",
    short: "Ca A",
    label: "Ca A (Sáng)",
    start: "07:00",
    end: "15:00",
    soTieng: 8,
    targetStaff: 4,
    colorClass: "ca_a",
    icon: <Sun size={15} color="#15803d" />,
    moTa: "Ca làm việc chính buổi sáng (07:00 - 15:00, 8 tiếng)",
  },
  {
    id: "ca_b",
    name: "Ca B",
    short: "Ca B",
    label: "Ca B (Chiều/Tối)",
    start: "14:30",
    end: "22:30",
    soTieng: 8,
    targetStaff: 4,
    colorClass: "ca_b",
    icon: <Moon size={15} color="#0284c7" />,
    moTa: "Ca làm việc chính buổi chiều/tối (14:30 - 22:30, 8 tiếng)",
  },
];

/**
 * Component dành RIÊNG cho Nhân viên Full-time và Quản lý đăng ký 2 ca chính:
 * - Ca A (07:00 - 15:00, 8 tiếng)
 * - Ca B (14:30 - 22:30, 8 tiếng)
 */
export default function FullTimeShiftRegistration() {
  const user = useMemo(() => getCurrentUser(), []);
  const thisMonday = useMemo(() => getMonday(new Date()), []);
  const [weekStart, setWeekStart] = useState(() => addDays(thisMonday, 7)); // Mặc định đăng ký cho tuần sau
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [selected, setSelected] = useState([]); // ["YYYY-MM-DD_ca_a", ...]
  const [notice, setNotice] = useState("");
  const [shiftsList, setShiftsList] = useState(DEFAULT_FULLTIME_SHIFTS);

  // Xác định hợp đồng: Full-time hay Part-time
  const isFullTime = useMemo(() => {
    const rawType = (
      user.loaiNhanVien ||
      user.position ||
      user.role ||
      ""
    ).toLowerCase();
    return (
      rawType.includes("full") ||
      rawType.includes("quản lý") ||
      rawType.includes("manager") ||
      rawType.includes("admin") ||
      !rawType.includes("part")
    );
  }, [user]);

  // 1. Tải cấu hình 2 ca Full-time từ Database
  const fetchFullTimeConfig = () => {
    axios
      .get(`${API_BASE}/shifts/full-time`)
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const apiShifts = res.data.data.map((s, idx) => ({
            id: s.tenCaLam === "Ca A" ? "ca_a" : "ca_b",
            name: s.tenCaLam,
            short: s.tenCaLam,
            label: s.tenCaLam === "Ca A" ? "Ca A (Sáng)" : "Ca B (Chiều/Tối)",
            start: s.gioBatDau,
            end: s.gioKetThuc,
            soTieng: s.soTieng || 8,
            targetStaff: s.targetStaff || 4,
            maCaLam: s.maCaLam,
            colorClass: s.tenCaLam === "Ca A" ? "ca_a" : "ca_b",
            icon: s.tenCaLam === "Ca A" ? <Sun size={15} color="#15803d" /> : <Moon size={15} color="#0284c7" />,
            moTa: s.moTa,
          }));
          setShiftsList(apiShifts);
        }
      })
      .catch((err) => {
        console.warn("Dùng cấu hình ca Full-time mặc định:", err.message);
      });
  };

  // 2. Tải danh sách đăng ký ca thực tế từ CSDL MySQL
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
    fetchFullTimeConfig();
    fetchRegistrations();
  }, [weekStart]);

  // Chỉ cho phép đăng ký cho các tuần tương lai
  const isEditableWeek = weekStart > thisMonday;

  // 7 ngày trong tuần
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

  // Các ca Full-time của tôi trong tuần này
  const myWeekRegs = registrations.filter(
    (r) =>
      isMyRegistration(r) &&
      weekKeys.includes(r.dateKey) &&
      (r.shiftType === "ca_a" ||
        r.shiftType === "ca_b" ||
        r.tenCaLam === "Ca A" ||
        r.tenCaLam === "Ca B" ||
        r.loaiCa === "Full-time")
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

  // Xử lý click vào ca
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

    const key = `${dateKey}_${shift.id}`;
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  // Gửi đăng ký ca Full-time vào CSDL
  const handleSubmit = async () => {
    if (selected.length === 0) return;

    const payload = selected.map((key) => {
      const [dateKey, shiftType] = key.split("_");
      const matchedShift = shiftsList.find((s) => s.id === shiftType);
      return {
        staffId: user.staffId || user.maNhanVien || user.id,
        staffName: user.name,
        role: user.position || "Full-time",
        dateKey,
        shiftType, // "ca_a" hoặc "ca_b"
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
          `Đã đăng ký thành công ${payload.length} ca Full-time cho tuần (${weekRangeText})! Quản lý sẽ thấy trong mục "Duyệt ca làm & Lịch trình" để phê duyệt.`
        );
        fetchRegistrations();
      }
    } catch (err) {
      alert("Lỗi khi gửi đăng ký ca: " + (err.response?.data?.message || err.message));
    }
  };

  const weekRangeText = `${addDays(weekStart, 0).toLocaleDateString("vi-VN")} — ${addDays(
    weekStart,
    6
  ).toLocaleDateString("vi-VN")}`;

  const countByStatus = (status) => myWeekRegs.filter((r) => r.status === status).length;

  // CHẶN HOÀN TOÀN NHÂN VIÊN PART-TIME
  if (!isFullTime) {
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
            Quyền truy cập bị từ chối: Dành riêng cho nhân viên Full-time
          </h3>
          <p style={{ maxWidth: 540, margin: "0 auto 16px", color: "#7f1d1d", fontSize: "0.92rem", lineHeight: 1.6 }}>
            Tài khoản của bạn được ghi nhận là hợp đồng <strong>Part-time (Sinh viên)</strong>.
            Theo quy định, nhân viên Part-time <strong>không có quyền đăng ký các ca làm Full-time (Ca A & Ca B)</strong>.
          </p>
          <div style={{ display: "inline-block", background: "#ffffff", padding: "8px 16px", borderRadius: 8, border: "1px solid #fecaca", fontSize: "0.85rem", color: "#991b1b" }}>
            Vui lòng vào mục <strong>"Đăng ký ca làm (Part-time)"</strong> trên thanh menu để đăng ký Ca 1, Ca 2 hoặc Ca 3.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sw-page">
      {/* Header trang đăng ký ca Full-time */}
      <div className="sw-page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 className="sw-page-title" style={{ color: "#15803d" }}>
              <Briefcase size={26} color="#16a34a" /> Đăng ký ca làm Full-time
            </h2>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 999,
                background: "#f0fdf4",
                color: "#166534",
                border: "1px solid #bbf7d0",
              }}
            >
              Dành riêng cho Full-time & Quản lý
            </span>
          </div>
          <p className="sw-page-sub">
            Thiết lập ca làm việc chính thức 8 tiếng/ngày: <strong>Ca A (Sáng: 07:00 - 15:00)</strong> và{" "}
            <strong>Ca B (Chiều/Tối: 14:30 - 22:30)</strong>. Bấm vào ca để chọn và gửi đăng ký.
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
          <span>Tuần hiện tại đã chốt lịch, bạn chỉ có thể xem. Vui lòng chuyển sang tuần sau để đăng ký ca mới.</span>
        </div>
      )}

      {/* Thông tin 2 ca Full-time chính */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {shiftsList.map((shift) => (
          <div
            key={shift.id}
            style={{
              background: shift.id === "ca_a" ? "#f0fdf4" : "#eff6ff",
              border: `1.5px solid ${shift.id === "ca_a" ? "#bbf7d0" : "#bfdbfe"}`,
              borderRadius: 12,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {shift.icon}
                <strong style={{ fontSize: "1rem", color: shift.id === "ca_a" ? "#166534" : "#1e40af" }}>
                  {shift.name} ({shift.label})
                </strong>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: 4 }}>
                Khung giờ: <strong>{shift.start} - {shift.end}</strong> ({shift.soTieng} tiếng/ca)
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "#ffffff",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                }}
              >
                Định biên: {shift.targetStaff || 4} NV
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Thống kê ca đăng ký của nhân viên Full-time trong tuần */}
      <div className="sw-stats">
        <div className="sw-stat">
          <div className="sw-stat-label">Đang chọn</div>
          <div className="sw-stat-value" style={{ color: "#16a34a" }}>
            {selected.length} ca
          </div>
        </div>
        <div className="sw-stat">
          <div className="sw-stat-label">Ca A & B chờ duyệt</div>
          <div className="sw-stat-value" style={{ color: "#d97706" }}>
            {countByStatus("pending")} ca
          </div>
        </div>
        <div className="sw-stat">
          <div className="sw-stat-label">Đã phê duyệt</div>
          <div className="sw-stat-value" style={{ color: "#16a34a" }}>
            {countByStatus("approved")} ca
          </div>
        </div>
        <div className="sw-stat">
          <div className="sw-stat-label">Bị từ chối</div>
          <div className="sw-stat-value" style={{ color: "#dc2626" }}>
            {countByStatus("rejected")} ca
          </div>
        </div>
      </div>

      {/* LƯỚI LỊCH ĐĂNG KÝ 2 CA FULL-TIME */}
      <div className="sw-card" style={{ padding: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div style={{ fontSize: "0.9rem", color: "#15803d", fontWeight: 700 }}>
            📅 Lịch đăng ký 2 Ca chính tuần: {weekRangeText}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
            Bấm chọn Ca A hoặc Ca B bạn muốn làm trong tuần
          </div>
        </div>

        <div className="sw-table-wrap">
          <div className="reg-calendar">
            {weekDays.map((day) => (
              <div key={day.dateKey} className="reg-day">
                <div className="reg-day-head" style={{ background: "#f8fafc" }}>
                  <div className="name" style={{ color: "#0f172a" }}>{day.label}</div>
                  <div className="date">{day.dateText}</div>
                </div>

                <div className="reg-day-body">
                  {shiftsList.map((shift) => {
                    const myReg = findMyReg(day.dateKey, shift);
                    const isSelected = selected.includes(`${day.dateKey}_${shift.id}`);
                    const count = countInSlot(day.dateKey, shift);
                    const targetLimit = shift.targetStaff || 4;
                    const isFull = count >= targetLimit;
                    const disabled =
                      !isEditableWeek ||
                      (myReg && myReg.status !== "pending") ||
                      (!myReg && !isSelected && isFull);

                    return (
                      <button
                        key={shift.id}
                        type="button"
                        className={`reg-shift-block ${shift.colorClass} ${isSelected ? "selected" : ""} ${
                          myReg ? `status-${myReg.status}` : ""
                        }`}
                        disabled={disabled}
                        onClick={() => handleClickShift(day.dateKey, shift)}
                        title={
                          myReg
                            ? `Trạng thái: ${STATUS_TEXT[myReg.status]}`
                            : isFull
                            ? "Ca này đã đủ định biên nhân viên"
                            : "Bấm để chọn hoặc bỏ chọn ca này"
                        }
                        style={{
                          minHeight: 88,
                          borderColor: isSelected
                            ? "#16a34a"
                            : myReg?.status === "approved"
                            ? "#16a34a"
                            : myReg?.status === "pending"
                            ? "#f59e0b"
                            : "#e2e8f0",
                          backgroundColor: isSelected
                            ? "#f0fdf4"
                            : myReg?.status === "approved"
                            ? "#f0fdf4"
                            : myReg?.status === "pending"
                            ? "#fffbeb"
                            : "#ffffff",
                        }}
                      >
                        <div
                          className="title"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            color: shift.id === "ca_a" ? "#15803d" : "#0284c7",
                            fontWeight: 700,
                          }}
                        >
                          {shift.icon} {shift.name} ({shift.soTieng}h)
                        </div>

                        <div className="time" style={{ fontWeight: 600, color: "#475569" }}>
                          {shift.start} - {shift.end}
                        </div>

                        <div className="slots" style={{ marginTop: 6 }}>
                          {myReg ? (
                            <strong
                              style={{
                                color:
                                  myReg.status === "approved"
                                    ? "#16a34a"
                                    : myReg.status === "rejected"
                                    ? "#dc2626"
                                    : "#d97706",
                              }}
                            >
                              {STATUS_TEXT[myReg.status]}
                            </strong>
                          ) : isSelected ? (
                            <strong style={{ color: "#16a34a" }}>✓ Đã chọn</strong>
                          ) : isFull ? (
                            <span style={{ color: "#dc2626" }}>Đã đủ người</span>
                          ) : (
                            <span>Đã có {count}/{targetLimit} NV</span>
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
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
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
          style={{ background: "#16a34a", borderColor: "#15803d" }}
        >
          <Send size={16} /> Gửi đăng ký ({selected.length} ca Full-time)
        </button>
      </div>
    </div>
  );
}
