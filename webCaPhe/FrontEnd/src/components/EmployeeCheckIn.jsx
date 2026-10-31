import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  LogIn,
  LogOut,
  CheckCircle2,
  Clock,
  HelpCircle,
  History,
  FileClock,
  X,
} from "lucide-react";
import "../../css/staff.css";
import AttendanceSupplementForm from "./AttendanceSupplementForm";
import {
  API_BASE,
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

const STATUS_LABELS = {
  pending: { text: "Chờ duyệt", cls: "sw-badge-pending" },
  approved: { text: "Đã duyệt", cls: "sw-badge-approved" },
  rejected: { text: "Từ chối", cls: "sw-badge-rejected" },
};

// QH-47: Nút Check-in / Check-out trên trang chủ của nhân viên
export default function EmployeeCheckIn() {
  const user = useMemo(() => getCurrentUser(), []);
  const [now, setNow] = useState(new Date());
  const [checkins, setCheckins] = useState(() => readLocal(STORAGE_KEYS.checkins));
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState(null);

  // QH-49: Yêu cầu bổ sung điểm danh
  const [showSupplementForm, setShowSupplementForm] = useState(false);
  const [serverRequests, setServerRequests] = useState([]);
  const [localRequests, setLocalRequests] = useState(() =>
    readLocal(STORAGE_KEYS.attendanceRequests).filter((r) => r.staffId === user.staffId)
  );

  // Tải dữ liệu chấm công hôm nay của nhân viên từ MySQL
  const fetchMyTodayCheckins = useCallback(() => {
    const empId = user.maNhanVien || user.staffId;
    if (!empId) return;

    axios
      .get(`${API_BASE}/timekeeping/my-today`, {
        params: { maNhanVien: empId, staffId: user.staffId },
      })
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const dbRecords = res.data.data.map((r) => {
            const shiftNameLower = (r.TenCaLam || "").toLowerCase();
            let shiftType = "morning";
            if (shiftNameLower.includes("chiều") || shiftNameLower.includes("2") || shiftNameLower.includes("b")) {
              shiftType = "afternoon";
            } else if (shiftNameLower.includes("tối") || shiftNameLower.includes("3")) {
              shiftType = "evening";
            }

            return {
              id: `DB-${r.MaChamCong}`,
              staffId: user.staffId,
              staffName: user.name,
              position: user.position,
              dateKey: r.NgayLam,
              shiftType,
              shiftName: r.TenCaLam || "Ca làm việc",
              shiftStart: r.GioBatDau || "07:00",
              shiftEnd: r.GioKetThuc || "12:00",
              checkIn: r.GioCheckIn,
              checkOut: r.GioCheckOut || null,
              isLate: Boolean(r.DiTre),
              lateMinutes: r.DiTre ? 15 : 0,
              timeSource: "SERVER_DB",
            };
          });

          // Hợp nhất dữ liệu: ưu tiên dữ liệu từ DB
          setCheckins((prev) => {
            const others = prev.filter(
              (p) => !(p.staffId === user.staffId && p.dateKey === toDateKey(new Date()))
            );
            const nextList = [...dbRecords, ...others];
            writeLocal(STORAGE_KEYS.checkins, nextList);
            return nextList;
          });
        }
      })
      .catch(() => {});
  }, [user.maNhanVien, user.staffId, user.name, user.position]);

  useEffect(() => {
    fetchMyTodayCheckins();
  }, [fetchMyTodayCheckins]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tải các yêu cầu bổ sung điểm danh của chính nhân viên này từ backend (nếu có)
  useEffect(() => {
    if (!user.maNhanVien) return;
    axios
      .get(`${API_BASE}/yeucau-chamcong`, { params: { status: "all" } })
      .then((res) => {
        const list = (res.data?.data || []).filter(
          (r) => String(r.MaNhanVien) === String(user.maNhanVien)
        );
        setServerRequests(list);
      })
      .catch(() => {});
  }, [user.maNhanVien]);

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

  const handleCheckIn = async () => {
    setProcessing(true);
    try {
      // BẮT BUỘC: Gửi request lên Backend để Backend tự động lấy Server Time (chống gian lận đổi giờ thiết bị)
      const empIdentifier = user.maNhanVien || user.staffId;
      const res = await axios.post(`${API_BASE}/timekeeping/checkin`, {
        maNhanVien: empIdentifier,
        staffId: user.staffId,
        maCaLam: currentShift?.maCaLam || currentShift?.id,
        shiftType: currentShift?.id,
      });

      const serverData = res.data;
      const serverTimeStr = serverData.serverTimeString || formatTime(serverData.serverTime);
      const isLate = !!serverData.isLate;
      const lateMinutes = serverData.lateMinutes || 0;

      const record = {
        id: `CI-${Date.now()}`,
        staffId: user.staffId,
        staffName: user.name,
        position: user.position,
        dateKey: serverData.serverDate || todayKey,
        shiftType: currentShift.id,
        shiftName: currentShift.name,
        shiftStart: currentShift.start,
        shiftEnd: currentShift.end,
        checkIn: serverData.serverTime || new Date().toISOString(),
        checkOut: null,
        isLate,
        lateMinutes,
        timeSource: "SERVER_TIME",
      };
      saveCheckins([record, ...checkins]);
      fetchMyTodayCheckins();

      setNotice({
        type: isLate ? "warning" : "success",
        text:
          serverData.message ||
          (isLate
            ? `CẢNH BÁO: Check-in ${currentShift.name} lúc ${serverTimeStr} bằng giờ máy chủ (trễ ${lateMinutes} phút so với giờ bắt đầu ${currentShift.start}).`
            : `Check-in ${currentShift.name} thành công đúng giờ lúc ${serverTimeStr} (Ghi nhận bằng giờ máy chủ). Chúc bạn làm việc vui vẻ!`),
      });
    } catch (err) {
      console.error("Lỗi Check-in với máy chủ:", err);
      const lateMinutes = Math.max(0, nowMinutes - timeToMinutes(currentShift.start));
      const isLate = lateMinutes > 0;
      const record = {
        id: `CI-${Date.now()}`,
        staffId: user.staffId,
        staffName: user.name,
        position: user.position,
        dateKey: todayKey,
        shiftType: currentShift.id,
        shiftName: currentShift.name,
        shiftStart: currentShift.start,
        shiftEnd: currentShift.end,
        checkIn: new Date().toISOString(),
        checkOut: null,
        isLate,
        lateMinutes,
        timeSource: "CLIENT_OFFLINE",
      };
      saveCheckins([record, ...checkins]);
      setNotice({
        type: "warning",
        text: `Lưu ý: Không kết nối được giờ máy chủ (${err.response?.data?.message || err.message}). Đã lưu tạm thời trên thiết bị!`,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm(`Xác nhận Check-out ${getShift(openRecord.shiftType)?.name}?`)) return;
    setProcessing(true);
    try {
      const empIdentifier = user.maNhanVien || user.staffId;
      const res = await axios.post(`${API_BASE}/timekeeping/checkout`, {
        maNhanVien: empIdentifier,
        staffId: user.staffId,
        maCaLam: openRecord?.shiftId,
      });

      const serverData = res.data;
      const serverTimeStr = serverData.serverTimeString || formatTime(serverData.serverTime);
      const checkOut = serverData.serverTime || new Date().toISOString();

      saveCheckins(checkins.map((r) => (r.id === openRecord.id ? { ...r, checkOut } : r)));
      fetchMyTodayCheckins();
      setNotice({
        type: "success",
        text:
          serverData.message ||
          `Check-out thành công lúc ${serverTimeStr} (Ghi nhận bằng giờ máy chủ)! Cảm ơn bạn đã hoàn thành ca làm!`,
      });
    } catch (err) {
      console.error("Lỗi Check-out với máy chủ:", err);
      const checkOut = new Date().toISOString();
      saveCheckins(checkins.map((r) => (r.id === openRecord.id ? { ...r, checkOut } : r)));
      setNotice({
        type: "info",
        text: `Check-out đã ghi nhận (Máy chủ: ${err.response?.data?.message || err.message}).`,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSupplementSubmitted = (record) => {
    setShowSupplementForm(false);
    setLocalRequests((prev) => [record, ...prev]);
    // Tải lại danh sách từ server nếu có maNhanVien
    if (user.maNhanVien) {
      axios
        .get(`${API_BASE}/yeucau-chamcong`, { params: { status: "all" } })
        .then((res) => {
          const list = (res.data?.data || []).filter(
            (r) => String(r.MaNhanVien) === String(user.maNhanVien)
          );
          setServerRequests(list);
        })
        .catch(() => {});
    }
    setNotice({
      type: "success",
      text: record.synced
        ? "Đã gửi yêu cầu bổ sung điểm danh thành công lên hệ thống. Vui lòng chờ Quản lý duyệt."
        : "Đã ghi nhận yêu cầu bổ sung điểm danh (Chờ duyệt).",
    });
  };

  // Gộp danh sách yêu cầu: từ máy chủ + các yêu cầu lưu tạm chưa gửi được
  const myRequests = [
    ...serverRequests.map((r) => ({
      id: `SV-${r.MaYeuCau}`,
      ngay: r.Ngay,
      caLam: r.CaLam,
      loai: r.Loai,
      thoiGian: r.ThoiGian,
      lyDo: r.LyDo,
      trangThai: r.TrangThai,
      synced: true,
    })),
    ...localRequests.filter((r) => !r.synced),
  ];

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
        <button className="sw-btn sw-btn-warning" onClick={() => setShowSupplementForm(true)}>
          <HelpCircle size={16} /> Quên điểm danh?
        </button>
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
          <div
            style={{
              marginTop: 6,
              fontSize: "0.78rem",
              color: "#166534",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              padding: "3px 10px",
              borderRadius: 20,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontWeight: 600,
            }}
          >
            🔒 Giờ máy chủ tự động (Chống đổi giờ thiết bị)
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

      {/* QH-49: DANH SÁCH YÊU CẦU BỔ SUNG ĐIỂM DANH CỦA TÔI */}
      <div className="sw-card">
        <h3 className="sw-card-title">
          <FileClock size={18} /> Yêu cầu bổ sung điểm danh của tôi
        </h3>
        {myRequests.length === 0 ? (
          <div className="sw-empty">
            Bạn chưa gửi yêu cầu nào. Nếu quên check-in, bấm nút <strong>"Quên điểm danh?"</strong> ở
            góc trên.
          </div>
        ) : (
          <div className="sw-table-wrap">
            <table className="sw-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Ca</th>
                  <th>Loại</th>
                  <th>Giờ thực tế</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((r) => {
                  const status = STATUS_LABELS[r.trangThai] || STATUS_LABELS.pending;
                  return (
                    <tr key={r.id}>
                      <td>{r.ngay ? formatDateVN(r.ngay) : "-"}</td>
                      <td>{r.caLam}</td>
                      <td>{r.loai || "-"}</td>
                      <td>{r.thoiGian || "-"}</td>
                      <td style={{ maxWidth: 280 }}>{r.lyDo}</td>
                      <td>
                        <span className={`sw-badge ${status.cls}`}>{status.text}</span>
                        {!r.synced && <div className="sw-hint">Lưu tạm, chưa gửi máy chủ</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showSupplementForm && (
        <AttendanceSupplementForm
          user={user}
          onClose={() => setShowSupplementForm(false)}
          onSubmitted={handleSupplementSubmitted}
        />
      )}
    </div>
  );
}
