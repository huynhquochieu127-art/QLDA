import React, { useState, useEffect, useMemo } from "react";
import {
  LogIn,
  LogOut,
  CheckCircle2,
  Clock,
  History,
  X,
} from "lucide-react";
import "../../css/staff.css";
import {
  SHIFTS,
  getShift,
  toDateKey,
  formatDateVN,
  formatTime,
  timeToMinutes,
  getCurrentUser,
  readLocal,
  writeLocal,
  STORAGE_KEYS,
} from "../utils/staffWork";

// Cho phép check-in sớm tối đa 30 phút trước giờ vào ca
const EARLY_CHECKIN_MINUTES = 30;

// QH-47: Nút Check-in / Check-out trên trang chủ của nhân viên
export default function EmployeeCheckIn() {
  const user = useMemo(() => getCurrentUser(), []);
  const [now, setNow] = useState(new Date());
  const [checkins, setCheckins] = useState(() => readLocal(STORAGE_KEYS.checkins));
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayKey = toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const myToday = checkins.filter((r) => r.staffId === user.staffId && r.dateKey === todayKey);
  const openRecord = checkins.find((r) => r.staffId === user.staffId && !r.checkOut);

  // Ca hiện tại: đang trong khung [giờ vào - 30 phút, giờ ra)
  const currentShift = SHIFTS.find(
    (s) =>
      nowMinutes >= timeToMinutes(s.start) - EARLY_CHECKIN_MINUTES &&
      nowMinutes < timeToMinutes(s.end)
  );
  const currentShiftDone = currentShift && myToday.some((r) => r.shiftType === currentShift.id);

  // Ca tiếp theo chưa làm (trong hôm nay, nếu hết thì là Ca Sáng ngày mai)
  const nextShift = SHIFTS.find(
    (s) =>
      timeToMinutes(s.start) - EARLY_CHECKIN_MINUTES > nowMinutes &&
      !myToday.some((r) => r.shiftType === s.id)
  );

  let mode = "hidden";
  if (openRecord) mode = "out";
  else if (currentShift && !currentShiftDone) mode = "in";

  const saveCheckins = (next) => {
    setCheckins(next);
    writeLocal(STORAGE_KEYS.checkins, next);
  };

  const handleCheckIn = () => {
    setProcessing(true);
    const lateMinutes = Math.max(0, nowMinutes - timeToMinutes(currentShift.start));
    const record = {
      id: `CI-${Date.now()}`,
      staffId: user.staffId,
      staffName: user.name,
      position: user.position,
      dateKey: todayKey,
      shiftType: currentShift.id,
      checkIn: new Date().toISOString(),
      checkOut: null,
      lateMinutes,
    };
    saveCheckins([record, ...checkins]);
    setNotice({
      type: lateMinutes > 0 ? "warning" : "success",
      text:
        lateMinutes > 0
          ? `Check-in ${currentShift.name} thành công lúc ${formatTime(record.checkIn)} (trễ ${lateMinutes} phút).`
          : `Check-in ${currentShift.name} thành công lúc ${formatTime(record.checkIn)}. Chúc bạn làm việc vui vẻ!`,
    });
    setProcessing(false);
  };

  const handleCheckOut = () => {
    if (!window.confirm(`Xác nhận Check-out ${getShift(openRecord.shiftType)?.name}?`)) return;
    setProcessing(true);
    const checkOut = new Date().toISOString();
    saveCheckins(checkins.map((r) => (r.id === openRecord.id ? { ...r, checkOut } : r)));
    setNotice({
      type: "success",
      text: `Check-out thành công lúc ${formatTime(checkOut)}. Cảm ơn bạn đã hoàn thành ca làm!`,
    });
    setProcessing(false);
  };

  const renderShiftLabel = (shift) => `${shift.name} (${shift.start} - ${shift.end})`;

  return (
    <div className="sw-page">
      <div className="sw-page-header">
        <div>
          <h2 className="sw-page-title">
            <Clock size={24} color="#6366f1" /> Chấm công hôm nay
          </h2>
          <p className="sw-page-sub">
            Xin chào <strong>{user.name}</strong> · {user.position}
          </p>
        </div>
      </div>

      {notice && (
        <div className={`sw-alert sw-alert-${notice.type}`}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{notice.text}</span>
          <button className="sw-alert-close" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="sw-grid-2">
        {/* NÚT CHECK-IN / CHECK-OUT */}
        <div className="sw-card checkin-hero">
          <div className="checkin-clock">{now.toLocaleTimeString("vi-VN")}</div>
          <div className="checkin-date">
            {now.toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </div>

          {mode === "in" && (
            <>
              <div className="checkin-shift-info">
                Ca hiện tại: <strong>{renderShiftLabel(currentShift)}</strong>
              </div>
              <button className="checkin-big-btn in" onClick={handleCheckIn} disabled={processing}>
                <LogIn size={40} />
                Check-in
                <span>Bấm để vào ca</span>
              </button>
            </>
          )}

          {mode === "out" && (
            <>
              <div className="checkin-shift-info">
                Đang làm <strong>{getShift(openRecord.shiftType)?.name}</strong> · vào lúc{" "}
                <strong>{formatTime(openRecord.checkIn)}</strong>
                {openRecord.dateKey !== todayKey && ` (${formatDateVN(openRecord.dateKey)})`}
              </div>
              <button className="checkin-big-btn out" onClick={handleCheckOut} disabled={processing}>
                <LogOut size={40} />
                Check-out
                <span>Bấm khi kết thúc ca</span>
              </button>
            </>
          )}

          {mode === "hidden" && (
            <div className="checkin-done-box">
              <CheckCircle2 size={34} color="#16a34a" style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                {currentShiftDone
                  ? `Bạn đã hoàn thành ${currentShift.name} hôm nay`
                  : "Hiện không trong giờ ca làm việc"}
              </div>
              <div style={{ fontSize: "0.88rem" }}>
                Nút Check-in sẽ hiện lại khi tới ca tiếp theo:{" "}
                <strong>
                  {nextShift
                    ? `${renderShiftLabel(nextShift)} hôm nay`
                    : `${renderShiftLabel(SHIFTS[0])} ngày mai`}
                </strong>
                .
              </div>
            </div>
          )}
        </div>

        {/* LỊCH SỬ CHẤM CÔNG HÔM NAY */}
        <div className="sw-card">
          <h3 className="sw-card-title">
            <History size={18} /> Lịch sử chấm công hôm nay
          </h3>
          {myToday.length === 0 ? (
            <div className="sw-empty">Chưa có lượt check-in nào hôm nay.</div>
          ) : (
            <div className="sw-table-wrap">
              <table className="sw-table">
                <thead>
                  <tr>
                    <th>Ca</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {myToday.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{getShift(r.shiftType)?.name}</strong>
                      </td>
                      <td>{formatTime(r.checkIn)}</td>
                      <td>
                        {r.checkOut ? (
                          formatTime(r.checkOut)
                        ) : (
                          <span className="sw-badge sw-badge-info">Đang làm</span>
                        )}
                      </td>
                      <td>
                        {r.lateMinutes > 0 ? (
                          <span className="sw-badge sw-badge-pending">Trễ {r.lateMinutes} phút</span>
                        ) : (
                          <span className="sw-badge sw-badge-approved">Đúng giờ</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
