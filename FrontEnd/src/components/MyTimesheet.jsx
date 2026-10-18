import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Flag,
  X,
  Send,
  Lock,
  ShieldCheck,
} from "lucide-react";
import "../../css/staff.css";
import {
  SHIFTS,
  getShift,
  DAY_LABELS,
  toDateKey,
  formatDateVN,
  formatTime,
  timeToMinutes,
  getCurrentUser,
  readLocal,
  writeLocal,
  STORAGE_KEYS,
  API_BASE,
} from "../utils/staffWork";

const ROW_STATUS = {
  ok: { text: "Đủ công", cls: "sw-badge-approved" },
  late: { text: "Đi trễ", cls: "sw-badge-pending" },
  missing_out: { text: "Thiếu check-out", cls: "sw-badge-rejected" },
  working: { text: "Đang làm", cls: "sw-badge-info" },
};

const monthKeyOf = (date) => toDateKey(date).slice(0, 7); // YYYY-MM

// Dựng bảng công từ dữ liệu check-in thật của nhân viên trong tháng
const buildFromCheckins = (checkins) =>
  checkins
    .map((r) => {
      const shift = getShift(r.shiftType);
      const hours = r.checkOut
        ? Math.max(0, (new Date(r.checkOut) - new Date(r.checkIn)) / 3600000)
        : 0;
      let status = "ok";
      if (!r.checkOut) status = r.dateKey === toDateKey(new Date()) ? "working" : "missing_out";
      else if (r.lateMinutes > 0) status = "late";
      return {
        id: r.id,
        dateKey: r.dateKey,
        shiftName: shift?.name || r.shiftType,
        checkIn: formatTime(r.checkIn),
        checkOut: r.checkOut ? formatTime(r.checkOut) : "--:--",
        hours,
        lateMinutes: r.lateMinutes || 0,
        status,
      };
    })
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

// Dữ liệu mẫu khi nhân viên chưa có lượt chấm công nào trong tháng
const buildSample = (year, month, untilDay) => {
  const rows = [];
  for (let day = 1; day <= untilDay; day++) {
    const date = new Date(year, month, day);
    const seed = (day * 7 + month * 3) % 10;
    if (date.getDay() === 1 || seed === 0) continue; // nghỉ thứ Hai và vài ngày rải rác
    const shift = SHIFTS[day % 3];
    const late = seed === 3 ? 12 : seed === 6 ? 5 : 0;
    const missingOut = seed === 8;
    const startMin = timeToMinutes(shift.start) + late;
    const endMin = timeToMinutes(shift.end);
    const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    rows.push({
      id: `S-${day}`,
      dateKey: toDateKey(date),
      shiftName: shift.name,
      checkIn: fmt(startMin),
      checkOut: missingOut ? "--:--" : fmt(endMin),
      hours: missingOut ? 0 : (endMin - startMin) / 60,
      lateMinutes: late,
      status: missingOut ? "missing_out" : late > 0 ? "late" : "ok",
    });
  }
  return rows;
};

// QH-54: Nhân viên xem bảng công nháp và bấm Xác nhận đúng / Báo cáo sai sót
export default function MyTimesheet() {
  const user = useMemo(() => getCurrentUser(), []);
  const now = new Date();
  const monthOptions = [0, 1].map((offset) => new Date(now.getFullYear(), now.getMonth() - offset, 1));
  const [monthDate, setMonthDate] = useState(monthOptions[0]);
  const monthKey = monthKeyOf(monthDate);

  const [dbRecord, setDbRecord] = useState(null);
  const [feedbackMap, setFeedbackMap] = useState(() => readLocal(STORAGE_KEYS.timesheetFeedback, {}));
  const feedbackKey = `${user.staffId}_${monthKey}`;
  const feedback = feedbackMap[feedbackKey];

  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportError, setReportError] = useState("");
  const [notice, setNotice] = useState("");

  // Tải thông tin bảng công của nhân viên từ MySQL
  const fetchMyTimesheet = () => {
    const empId = user.maNhanVien || 3;
    const t = monthDate.getMonth() + 1;
    const n = monthDate.getFullYear();
    axios
      .get(`${API_BASE}/bangcong-thang/my`, {
        params: { maNhanVien: empId, thang: t, nam: n },
      })
      .then((res) => {
        if (res.data.success && res.data.data) {
          setDbRecord(res.data.data);
        } else {
          setDbRecord(null);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchMyTimesheet();
  }, [user.maNhanVien, monthKey]);

  const { rows, isSample } = useMemo(() => {
    const mine = readLocal(STORAGE_KEYS.checkins).filter(
      (r) => r.staffId === user.staffId && r.dateKey.startsWith(monthKey)
    );
    if (mine.length > 0) return { rows: buildFromCheckins(mine), isSample: false };
    const isCurrentMonth = monthKey === monthKeyOf(now);
    const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    return {
      rows: buildSample(monthDate.getFullYear(), monthDate.getMonth(), isCurrentMonth ? now.getDate() : lastDay),
      isSample: true,
    };
  }, [monthKey]);

  const totalDays = dbRecord?.SoCong ? Number(dbRecord.SoCong) : new Set(rows.filter((r) => r.status !== "missing_out").map((r) => r.dateKey)).size;
  const totalHours = dbRecord?.SoGioLam ? Number(dbRecord.SoGioLam) : rows.reduce((sum, r) => sum + r.hours, 0);
  const lateCount = dbRecord?.SoNgayTre !== undefined ? Number(dbRecord.SoNgayTre) : rows.filter((r) => r.lateMinutes > 0).length;
  const missingCount = rows.filter((r) => r.status === "missing_out").length;

  const saveFeedback = (value) => {
    const next = { ...feedbackMap, [feedbackKey]: value };
    setFeedbackMap(next);
    writeLocal(STORAGE_KEYS.timesheetFeedback, next);
  };

  // NHÂN VIÊN BẤM XÁC NHẬN ĐÚNG
  const handleConfirm = async () => {
    if (!window.confirm(`Xác nhận bảng công tháng ${monthKey.split("-").reverse().join("/")} là chính xác? Sau khi chốt sẽ không thể báo sai sót.`)) return;

    try {
      const empId = user.maNhanVien || 3;
      const t = monthDate.getMonth() + 1;
      const n = monthDate.getFullYear();
      await axios.post(`${API_BASE}/bangcong-thang/my/confirm`, {
        maNhanVien: empId,
        thang: t,
        nam: n,
      });
      fetchMyTimesheet();
    } catch (_) {}

    saveFeedback({ status: "confirmed", at: new Date().toISOString() });
    setNotice("Đã xác nhận bảng công. Trạng thái: Xác nhận đúng.");
  };

  const openReport = (prefill = "") => {
    setReportText(prefill || dbRecord?.PhanHoiNV || feedback?.reason || "");
    setReportError("");
    setShowReport(true);
  };

  // NHÂN VIÊN GỬI KHIẾU NẠI / BÁO SAI SÓT (QH-54)
  const handleSendReport = async (e) => {
    e.preventDefault();
    if (reportText.trim().length < 10) {
      setReportError("Vui lòng mô tả sai sót cụ thể (tối thiểu 10 ký tự).");
      return;
    }

    try {
      const empId = user.maNhanVien || 3;
      const t = monthDate.getMonth() + 1;
      const n = monthDate.getFullYear();
      await axios.post(`${API_BASE}/bangcong-thang/my/dispute`, {
        maNhanVien: empId,
        thang: t,
        nam: n,
        lyDo: reportText.trim(),
      });
      fetchMyTimesheet();
    } catch (_) {}

    saveFeedback({ status: "disputed", reason: reportText.trim(), at: new Date().toISOString() });
    setShowReport(false);
    setNotice("Đã gửi báo cáo sai sót. Trạng thái: Đang khiếu nại, Quản lý sẽ kiểm tra camera/sổ sách.");
  };

  const isSubmittedToAdmin = dbRecord?.TrangThai === "submitted_to_admin" || dbRecord?.isLocked;
  const isConfirmed = dbRecord?.TrangThai === "confirmed" || feedback?.status === "confirmed";
  const isDisputed = dbRecord?.TrangThai === "emp_replied" || feedback?.status === "disputed";
  const isLocked = isSubmittedToAdmin || isConfirmed;

  return (
    <div className="sw-page">
      <div className="sw-page-header">
        <div>
          <h2 className="sw-page-title">
            <ClipboardCheck size={24} color="#6366f1" /> Bảng công nháp
            {isSample && <span className="sw-demo-tag">Dữ liệu mẫu</span>}
          </h2>
          <p className="sw-page-sub">
            Kiểm tra chi tiết từng ngày làm việc, sau đó xác nhận hoặc báo cáo nếu có sai sót.
          </p>
        </div>
        <div className="sw-segment">
          {monthOptions.map((m) => (
            <button
              key={monthKeyOf(m)}
              className={monthKeyOf(m) === monthKey ? "active" : ""}
              onClick={() => setMonthDate(m)}
            >
              Tháng {m.getMonth() + 1}/{m.getFullYear()}
            </button>
          ))}
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

      {/* TRẠNG THÁI BẢNG CÔNG */}
      {isSubmittedToAdmin && (
        <div className="sw-alert sw-alert-success" style={{ backgroundColor: "#ecfdf5", border: "1.5px solid #a7f3d0", color: "#065f46" }}>
          <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 2, color: "#059669" }} />
          <span>
            <strong>BẢNG CÔNG ĐÃ ĐƯỢC QUẢN LÝ CHỐT SỔ & GỬI LÊN ADMIN TÍNH LƯƠNG</strong> — Dữ liệu đã bị khóa. Bảng lương đang được phân hệ Tính lương xử lý.
          </span>
        </div>
      )}

      {isConfirmed && !isSubmittedToAdmin && (
        <div className="sw-alert sw-alert-success">
          <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Xác nhận đúng</strong> — bạn đã xác nhận bảng công chính xác. Đang chờ Quản lý chốt sổ gửi Admin.
          </span>
        </div>
      )}

      {isDisputed && !isSubmittedToAdmin && (
        <div className="sw-alert sw-alert-warning">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Đang khiếu nại sai sót</strong> — nội dung: "{dbRecord?.PhanHoiNV || feedback?.reason}". Quản lý sẽ kiểm tra camera/sổ sách để cập nhật lại.
          </span>
        </div>
      )}

      <div className="sw-stats">
        <div className="sw-stat">
          <div className="sw-stat-label">Ngày công</div>
          <div className="sw-stat-value">{totalDays} ngày</div>
        </div>
        <div className="sw-stat">
          <div className="sw-stat-label">Tổng giờ làm</div>
          <div className="sw-stat-value">{totalHours.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giờ</div>
        </div>
        <div className="sw-stat">
          <div className="sw-stat-label">Số lần đi trễ</div>
          <div className="sw-stat-value" style={{ color: lateCount ? "#d97706" : "#16a34a" }}>{lateCount}</div>
        </div>
        <div className="sw-stat">
          <div className="sw-stat-label">Thiếu check-out</div>
          <div className="sw-stat-value" style={{ color: missingCount ? "#dc2626" : "#16a34a" }}>{missingCount}</div>
        </div>
      </div>

      <div className="sw-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="sw-table-wrap">
          <table className="sw-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Thứ</th>
                <th>Ca làm</th>
                <th>Giờ vào</th>
                <th>Giờ ra</th>
                <th>Số giờ</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="sw-empty">Chưa có dữ liệu công trong tháng này.</td>
                </tr>
              ) : (
                rows.map((r) => {
                  const status = ROW_STATUS[r.status];
                  return (
                    <tr
                      key={r.id}
                      className={r.status === "missing_out" ? "row-danger" : r.status === "late" ? "row-warning" : ""}
                    >
                      <td><strong>{formatDateVN(r.dateKey)}</strong></td>
                      <td>{DAY_LABELS[new Date(r.dateKey + "T00:00:00").getDay()]}</td>
                      <td>{r.shiftName}</td>
                      <td>{r.checkIn}</td>
                      <td>{r.checkOut}</td>
                      <td>{r.hours.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}</td>
                      <td>
                        <span className={`sw-badge ${status.cls}`}>
                          {status.text}
                          {r.lateMinutes > 0 && r.status === "late" ? ` ${r.lateMinutes}'` : ""}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {!isLocked && (
                          <button
                            className="sw-btn sw-btn-light"
                            style={{ padding: "4px 8px" }}
                            title="Báo sai ngày này"
                            onClick={() => openReport(`Ngày ${formatDateVN(r.dateKey)} (${r.shiftName}): `)}
                          >
                            <Flag size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <button className="sw-btn sw-btn-warning" onClick={() => openReport()} disabled={isLocked}>
          <AlertTriangle size={16} /> Báo cáo sai sót
        </button>
        <button className="sw-btn sw-btn-success" onClick={handleConfirm} disabled={isLocked}>
          <CheckCircle2 size={16} /> Xác nhận đúng
        </button>
      </div>

      {/* MODAL BÁO CÁO SAI SÓT */}
      {showReport && (
        <div className="sw-modal-overlay" onClick={() => setShowReport(false)}>
          <form className="sw-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSendReport}>
            <div className="sw-modal-header">
              <h3>Báo cáo sai sót bảng công</h3>
              <button type="button" className="sw-modal-close" onClick={() => setShowReport(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="sw-modal-body">
              <div className="sw-field" style={{ marginBottom: 0 }}>
                <label className="sw-label">
                  Nội dung sai sót <span className="sw-required">*</span>
                </label>
                <textarea
                  className={`sw-textarea ${reportError ? "invalid" : ""}`}
                  autoFocus
                  placeholder="Ví dụ: Ngày 15 em có đi làm nhưng hệ thống không ghi nhận..."
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                />
                {reportError && <span className="sw-field-error">{reportError}</span>}
              </div>
            </div>
            <div className="sw-modal-footer">
              <button type="button" className="sw-btn sw-btn-light" onClick={() => setShowReport(false)}>
                Hủy bỏ
              </button>
              <button type="submit" className="sw-btn sw-btn-primary">
                <Send size={16} /> Gửi báo cáo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
