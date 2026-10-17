import React, { useState, useMemo } from "react";
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
  const [registrations, setRegistrations] = useState(() =>
    readLocal(STORAGE_KEYS.shiftRegistrations)
  );
  const [selected, setSelected] = useState([]); // ["YYYY-MM-DD_morning", ...]
  const [notice, setNotice] = useState("");

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
  const myWeekRegs = registrations.filter(
    (r) => r.staffId === user.staffId && weekKeys.includes(r.dateKey)
  );

  const findMyReg = (dateKey, shiftId) =>
    myWeekRegs.find((r) => r.dateKey === dateKey && r.shiftType === shiftId);

  const countInSlot = (dateKey, shiftId) =>
    registrations.filter(
      (r) => r.dateKey === dateKey && r.shiftType === shiftId && r.status !== "rejected"
    ).length;

  const saveRegistrations = (next) => {
    setRegistrations(next);
    writeLocal(STORAGE_KEYS.shiftRegistrations, next);
  };

  // Click vào block ca: chọn/bỏ chọn, hoặc hủy đăng ký đang chờ duyệt
  const handleClickShift = (dateKey, shift) => {
    const existing = findMyReg(dateKey, shift.id);
    if (existing) {
      if (existing.status === "pending" &&
        window.confirm(`Hủy đăng ký ${shift.name} ngày ${dateKey.split("-").reverse().join("/")}?`)) {
        saveRegistrations(registrations.filter((r) => r.id !== existing.id));
        setNotice(`Đã hủy đăng ký ${shift.name}.`);
      }
      return;
    }
    const key = `${dateKey}_${shift.id}`;
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSubmit = () => {
    const registeredAt = new Date().toLocaleDateString("vi-VN");
    const newRegs = selected.map((key, i) => {
      const [dateKey, shiftType] = key.split("_");
      return {
        id: `REG-${Date.now()}-${i}`,
        staffId: user.staffId,
        staffName: user.name,
        role: user.position,
        dateKey,
        shiftType,
        status: "pending",
        registeredAt,
      };
    });
    saveRegistrations([...registrations, ...newRegs]);
    setSelected([]);
    setNotice(`Đã gửi đăng ký ${newRegs.length} ca làm. Vui lòng chờ Quản lý duyệt.`);
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

      <div className="sw-card" style={{ padding: 14 }}>
        <div className="sw-table-wrap">
          <div className="reg-calendar">
            {weekDays.map((day) => (
              <div key={day.dateKey} className="reg-day">
                <div className="reg-day-head">
                  <div className="name">{day.label}</div>
                  <div className="date">{day.dateText}</div>
                </div>
                <div className="reg-day-body">
                  {SHIFTS.map((shift) => {
                    const myReg = findMyReg(day.dateKey, shift.id);
                    const isSelected = selected.includes(`${day.dateKey}_${shift.id}`);
                    const count = countInSlot(day.dateKey, shift.id);
                    const isFull = count >= shift.targetStaff;
                    const disabled =
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
                        onClick={() => handleClickShift(day.dateKey, shift)}
                        title={
                          myReg
                            ? `Trạng thái: ${STATUS_TEXT[myReg.status]}`
                            : isFull
                            ? "Ca đã đủ người"
                            : "Bấm để chọn ca này"
                        }
                      >
                        <div className="title">
                          {SHIFT_ICONS[shift.id]} {shift.short} · {shift.name.replace("Ca ", "")}
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
                            `Đã có ${count}/${shift.targetStaff} người`
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
          disabled={selected.length === 0 || !isEditableWeek}
        >
          <Send size={16} /> Gửi đăng ký ({selected.length} ca)
        </button>
      </div>
    </div>
  );
}
