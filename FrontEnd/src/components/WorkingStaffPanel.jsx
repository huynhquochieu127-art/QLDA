import React, { useState, useEffect } from "react";
import { UserCheck, RotateCcw, Coffee } from "lucide-react";
import "../../css/staff.css";
import { getShift, toDateKey, formatTime, readLocal, STORAGE_KEYS } from "../utils/staffWork";

const loadOnDuty = () => {
  const todayKey = toDateKey(new Date());
  return readLocal(STORAGE_KEYS.checkins).filter((r) => r.dateKey === todayKey && !r.checkOut);
};

const durationText = (iso, now) => {
  const minutes = Math.max(0, Math.floor((now - new Date(iso)) / 60000));
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h} giờ ${minutes % 60} phút` : `${minutes} phút`;
};

// QH-100: Danh sách nhân viên đang làm việc (đã Check-in, chưa Check-out trong hôm nay)
export default function WorkingStaffPanel() {
  const [onDuty, setOnDuty] = useState(loadOnDuty);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const refresh = () => {
      setOnDuty(loadOnDuty());
      setNow(new Date());
    };
    const timer = setInterval(refresh, 15000);
    // Cập nhật ngay khi nhân viên check-in/out ở tab khác
    window.addEventListener("storage", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Đếm số người theo vị trí (Pha chế, Thu ngân, ...)
  const byPosition = onDuty.reduce((acc, r) => {
    acc[r.position] = (acc[r.position] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="sw-page">
      <div className="sw-page-header">
        <div>
          <h2 className="sw-page-title">
            <UserCheck size={24} color="#16a34a" /> Nhân viên đang trực
          </h2>
          <p className="sw-page-sub">
            Những nhân viên đã Check-in nhưng chưa Check-out trong hôm nay ({new Date().toLocaleDateString("vi-VN")}).
          </p>
        </div>
        <button
          className="sw-btn sw-btn-light"
          onClick={() => {
            setOnDuty(loadOnDuty());
            setNow(new Date());
          }}
        >
          <RotateCcw size={15} /> Làm mới
        </button>
      </div>

      <div className="sw-stats">
        <div className="sw-stat">
          <div className="sw-stat-label">Đang có mặt</div>
          <div className="sw-stat-value" style={{ color: "#16a34a" }}>{onDuty.length} người</div>
        </div>
        {Object.entries(byPosition).map(([position, count]) => (
          <div className="sw-stat" key={position}>
            <div className="sw-stat-label">{position}</div>
            <div className="sw-stat-value">{count}</div>
          </div>
        ))}
      </div>

      <div className="sw-card">
        {onDuty.length === 0 ? (
          <div className="sw-empty">
            <Coffee size={26} style={{ marginBottom: 6 }} />
            <div>Hiện chưa có nhân viên nào đang trực tại quầy.</div>
          </div>
        ) : (
          <div className="onduty-grid">
            {onDuty.map((r) => (
              <div className="onduty-card" key={r.id}>
                <div className="onduty-avatar">{(r.staffName || "?").charAt(0).toUpperCase()}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="onduty-name">{r.staffName}</div>
                  <div className="onduty-meta">
                    {r.position} · {getShift(r.shiftType)?.name}
                  </div>
                  <div className="onduty-meta">
                    Vào lúc {formatTime(r.checkIn)} · {durationText(r.checkIn, now)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
