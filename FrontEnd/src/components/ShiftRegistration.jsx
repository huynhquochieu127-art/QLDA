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
  ShieldAlert,
} from "lucide-react";
import "../../css/staff.css";
import {
  SHIFTS,
  DAY_LABELS,
  toDateKey,
  getMonday,
  addDays,
  getCurrentUser,
  readLocal,
  writeLocal,
  STORAGE_KEYS,
  API_BASE,
} from "../utils/staffWork";

const SHIFT_ICONS = {
  morning: <Sun size={13} />,
  afternoon: <Sunset size={13} />,
  evening: <Moon size={13} />,
};

const STATUS_TEXT = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

// QH-35: Giao diện lịch để nhân viên xem và đăng ký ca của tuần tiếp theo
export default function ShiftRegistration() {
  const user = useMemo(() => getCurrentUser(), []);
  const thisMonday = useMemo(() => getMonday(new Date()), []);
  const [weekStart, setWeekStart] = useState(() => addDays(thisMonday, 7)); // Mặc định: tuần sau
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [selected, setSelected] = useState([]); // ["YYYY-MM-DD_morning", ...]
  const [notice, setNotice] = useState("");
  const [shiftsList, setShiftsList] = useState(SHIFTS);
  const [previewForFullTime, setPreviewForFullTime] = useState(false);

  // Xác định loại nhân viên: Part-time hay Full-time
  const isPartTime = useMemo(() => {
    const rawType = (user.loaiNhanVien || user.position || "").toLowerCase();
    return rawType.includes("part") || !rawType.includes("full");
  }, [user]);

  // Tải cấu hình 3 ca ngắn (Ca 1, Ca 2, Ca 3) từ Database
  useEffect(() => {
    axios
      .get(`${API_BASE}/shifts/part-time`)
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const apiShifts = res.data.data.map((s, idx) => ({
            id: s.tenCaLam === "Ca 1" ? "morning" : (s.tenCaLam === "Ca 2" ? "afternoon" : "evening"),
            name: s.tenCaLam,
            short: s.tenCaLam,
            start: s.gioBatDau,
            end: s.gioKetThuc,
            soTieng: s.soTieng,
            targetStaff: s.targetStaff,
            maCaLam: s.maCaLam,
          }));
          setShiftsList(apiShifts);
        }
      })
      .catch(() => {});
  }, []);

  // Tải danh sách đăng ký ca thực tế từ CSDL MySQL (bảng dangky_ca)
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

  const myWeekRegs = registrations.filter(
    (r) => isMyRegistration(r) && weekKeys.includes(r.dateKey)
  );

  const findMyReg = (dateKey, shiftId) =>
    myWeekRegs.find((r) => r.dateKey === dateKey && r.shiftType === shiftId);

  const countInSlot = (dateKey, shiftId) =>
    registrations.filter(
      (r) => r.dateKey === dateKey && r.shiftType === shiftId && r.status !== "rejected"
    ).length;

  // Click vào block ca: chọn/bỏ chọn, hoặc hủy đăng ký đang chờ duyệt từ Database
  const handleClickShift = async (dateKey, shift) => {
    const existing = findMyReg(dateKey, shift.id);
    if (existing) {
      if (
        existing.status === "pending" &&
        window.confirm(`Hủy đăng ký ${shift.name} ngày ${dateKey.split("-").reverse().join("/")}?`)
      ) {
        try {
          await axios.delete(`${API_BASE}/shifts/registrations/${existing.id}`);
          setNotice(`Đã hủy đăng ký ${shift.name} trong CSDL.`);
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

  // Gửi các ca đã chọn để lưu vào bảng dangky_ca trong MySQL
  const handleSubmit = async () => {
    if (selected.length === 0) return;

    const payload = selected.map((key) => {
      const [dateKey, shiftType] = key.split("_");
      const matchedShift = shiftsList.find((s) => s.id === shiftType);
      return {
        staffId: user.staffId || user.maNhanVien || user.id,
        staffName: user.name,
        role: user.position,
        dateKey,
        shiftType,
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
          `Đã lưu ${payload.length} ca làm vào Database thành công cho tuần (${weekRangeText})! Quản lý / Admin sẽ thấy trong mục "Duyệt ca làm & Lịch trình" tại tuần này để phê duyệt.`
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

  return (
    <div className="sw-page">
      <div className="sw-page-header">
        <div>
          <h2 className="sw-page-title">
            <CalendarDays size={24} color="#6366f1" /> Đăng ký ca làm việc
          </h2>
          <p className="sw-page-sub">
            Bấm vào ca muốn làm để chọn, sau đó bấm <strong>Gửi đăng ký</strong>. Bấm lại vào ca đang
            chờ duyệt để hủy.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="sw-btn sw-btn-light"
            onClick={() => {
              setWeekStart(addDays(weekStart, -7));
              setSelected([]);
            }}
            disabled={weekStart <= thisMonday}
            title="Tuần trước"
          >
            <ChevronLeft size={16} />
          </button>
          <div style={{ textAlign: "center", minWidth: 190 }}>
            <div style={{ fontWeight: 700 }}>
              {weekStart.getTime() === thisMonday.getTime()
                ? "Tuần này"
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
          <span>Tuần hiện tại đã chốt lịch, bạn chỉ có thể xem. Chuyển sang tuần sau để đăng ký ca.</span>
        </div>
      )}

      <div className="sw-stats">
        <div className="sw-stat">
          <div className="sw-stat-label">Đang chọn</div>
          <div className="sw-stat-value" style={{ color: "#4f46e5" }}>{selected.length} ca</div>
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

      {!isPartTime && (
        <div
          className="sw-alert"
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            color: "#92400e",
            borderRadius: 8,
            padding: "12px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: 2, color: "#d97706" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
              Lưu ý: 3 ca ngắn (Ca 1, Ca 2, Ca 3) chỉ áp dụng cho nhân viên Part-time
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: 4, lineHeight: 1.5 }}>
              Tài khoản hiện tại được định danh là <strong>{user.loaiNhanVien || user.position || "Full-time"}</strong>.
              Hệ thống chỉ mở cổng đăng ký 3 ca linh hoạt này cho nhân viên <strong>Part-time</strong> (sinh viên).
              Nhân viên Full-time làm việc theo ca chuẩn cố định hoặc theo phân bổ của Quản lý.
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="sw-btn sw-btn-light"
                style={{ fontSize: "0.8rem", padding: "4px 10px", borderColor: "#fcd34d" }}
                onClick={() => setPreviewForFullTime((prev) => !prev)}
              >
                {previewForFullTime ? "✕ Thu gọn chế độ xem" : "👁️ Xem trước khung giờ 3 ca Part-time"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(!isPartTime && !previewForFullTime) ? (
        <div
          className="sw-card"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "#6b7280",
            border: "2px dashed #e5e7eb",
          }}
        >
          <Clock size={40} color="#9ca3af" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#374151" }}>
            Lịch đăng ký ca ngắn dành cho Part-time
          </h3>
          <p style={{ maxWidth: 520, margin: "8px auto 16px", fontSize: "0.9rem" }}>
            Hệ thống tự động ẩn bảng đăng ký vì bạn không thuộc nhóm nhân viên Part-time.
            Nếu bạn muốn kiểm tra các khung giờ Ca 1, Ca 2, Ca 3, vui lòng bấm nút "Xem trước khung giờ" ở trên.
          </p>
          <button
            type="button"
            className="sw-btn sw-btn-light"
            onClick={() => setPreviewForFullTime(true)}
          >
            👁️ Xem trước khung giờ 3 ca
          </button>
        </div>
      ) : (
        <>
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
              <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                🎯 Khung 3 ca ngắn: <strong>Ca 1</strong> ({shiftsList[0]?.start}-{shiftsList[0]?.end}) · <strong>Ca 2</strong> ({shiftsList[1]?.start}-{shiftsList[1]?.end}) · <strong>Ca 3</strong> ({shiftsList[2]?.start}-{shiftsList[2]?.end})
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "#eff6ff",
                  color: "#2563eb",
                  fontWeight: 600,
                }}
              >
                Dành cho Part-time
              </span>
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
                        const myReg = findMyReg(day.dateKey, shift.id);
                        const isSelected = selected.includes(`${day.dateKey}_${shift.id}`);
                        const count = countInSlot(day.dateKey, shift.id);
                        const targetLimit = shift.targetStaff || 3;
                        const isFull = count >= targetLimit;
                        const disabled =
                          !isPartTime ||
                          !isEditableWeek ||
                          (myReg && myReg.status !== "pending") ||
                          (!myReg && !isSelected && isFull);

                        return (
                          <button
                            key={shift.id}
                            type="button"
                            className={`reg-shift-block ${shift.id} ${isSelected ? "selected" : ""} ${
                              myReg ? `status-${myReg.status}` : ""
                            }`}
                            disabled={disabled}
                            onClick={() => {
                              if (!isPartTime) {
                                alert("Chỉ nhân viên Part-time mới có thể đăng ký các ca ngắn này.");
                                return;
                              }
                              handleClickShift(day.dateKey, shift);
                            }}
                            title={
                              !isPartTime
                                ? "Chỉ nhân viên Part-time mới có thể đăng ký ca này"
                                : myReg
                                ? `Trạng thái: ${STATUS_TEXT[myReg.status]}`
                                : isFull
                                ? "Ca đã đủ người"
                                : "Bấm để chọn ca này"
                            }
                          >
                            <div className="title">
                              {SHIFT_ICONS[shift.id] || <Clock size={13} />} {shift.name} ({shift.soTieng || 5}h)
                            </div>
                            <div className="time">
                              {shift.start} - {shift.end}
                            </div>
                            <div className="slots">
                              {myReg ? (
                                <strong>{STATUS_TEXT[myReg.status]}</strong>
                              ) : isSelected ? (
                                <strong style={{ color: "#4f46e5" }}>✓ Đã chọn</strong>
                              ) : isFull ? (
                                "Đã đủ người"
                              ) : (
                                `Đã có ${count}/${targetLimit} người`
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

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
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
              disabled={selected.length === 0 || !isEditableWeek || !isPartTime}
            >
              <Send size={16} /> Gửi đăng ký ({selected.length} ca)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
