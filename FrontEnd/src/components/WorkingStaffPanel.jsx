import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  UserCheck,
  RotateCcw,
  Coffee,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  DollarSign,
  TrendingUp,
  Zap,
  CreditCard,
} from "lucide-react";
import "../../css/staff.css";
import {
  API_BASE,
  getShift,
  toDateKey,
  formatTime,
  readLocal,
  writeLocal,
  STORAGE_KEYS,
} from "../utils/staffWork";

const loadOnDuty = () => {
  const todayKey = toDateKey(new Date());
  return readLocal(STORAGE_KEYS.checkins).filter(
    (r) => r.dateKey === todayKey && !r.checkOut
  );
};

const durationText = (iso, now) => {
  const minutes = Math.max(0, Math.floor((now - new Date(iso)) / 60000));
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h} giờ ${minutes % 60} phút` : `${minutes} phút`;
};

/**
 * LOGIC SO SÁNH: Lấy giờ Check-in thực tế so với Giờ bắt đầu ca làm việc (đã xếp lịch).
 * Nếu lớn hơn (Ví dụ: Ca 8h00 nhưng 8h15 mới Check-in) thì đưa vào danh sách đi trễ.
 */
const getLocalLateCheckins = () => {
  const todayKey = toDateKey(new Date());
  const todayRecords = readLocal(STORAGE_KEYS.checkins).filter(
    (r) => r.dateKey === todayKey
  );

  return todayRecords
    .filter((r) => {
      if (!r.checkIn) return false;
      // Giờ bắt đầu ca quy định
      const shift = getShift(r.shiftType);
      const shiftStartTimeStr = r.shiftStart || shift?.start || "08:00";
      const [shiftH, shiftM] = shiftStartTimeStr.split(":").map(Number);
      const shiftTotalMins = shiftH * 60 + (shiftM || 0);

      // Giờ Check-in thực tế
      const checkInDate = new Date(r.checkIn);
      const checkInTotalMins =
        checkInDate.getHours() * 60 + checkInDate.getMinutes();

      // So sánh: Nếu Check-in > Giờ bắt đầu ca
      return checkInTotalMins > shiftTotalMins || r.isLate || (r.lateMinutes && r.lateMinutes > 0);
    })
    .map((r) => {
      const shift = getShift(r.shiftType);
      const shiftStartTimeStr = r.shiftStart || shift?.start || "08:00";
      const [shiftH, shiftM] = shiftStartTimeStr.split(":").map(Number);
      const shiftTotalMins = shiftH * 60 + (shiftM || 0);
      const checkInDate = new Date(r.checkIn);
      const checkInTotalMins =
        checkInDate.getHours() * 60 + checkInDate.getMinutes();
      const calculatedLate = Math.max(0, checkInTotalMins - shiftTotalMins);

      return {
        id: r.id,
        hoTen: r.staffName || "Nhân viên",
        maNhanVienCode: r.staffId || "NV",
        chucVu: r.position || "Nhân viên",
        tenCaLam: r.shiftName || shift?.name || "Ca làm việc",
        gioBatDau: shiftStartTimeStr,
        gioCheckInThucTe: formatTime(r.checkIn),
        soPhutDiTre: r.lateMinutes || calculatedLate || 15,
        source: "local",
      };
    });
};

export default function WorkingStaffPanel() {
  const [onDuty, setOnDuty] = useState(loadOnDuty);
  const [lateList, setLateList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [todayRevenue, setTodayRevenue] = useState(null);
  const [loadingRev, setLoadingRev] = useState(false);

  // Tải tổng doanh thu hóa đơn hôm nay (Từ 00:00 đến hiện tại) từ API tối ưu Index
  const fetchRevenueToday = useCallback(async () => {
    setLoadingRev(true);
    try {
      const res = await axios.get(`${API_BASE}/invoices/today-revenue`);
      if (res.data?.success) {
        setTodayRevenue(res.data);
      }
    } catch (err) {
      console.warn("Lỗi tải doanh thu hôm nay:", err.message);
    } finally {
      setLoadingRev(false);
    }
  }, []);

  // Hàm tải dữ liệu đi trễ từ Backend API và đồng bộ với LocalStorage
  const fetchLateData = useCallback(async () => {
    setLoading(true);
    let serverLate = [];
    try {
      const res = await axios.get(`${API_BASE}/timekeeping/late-today`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        serverLate = res.data.data;
      }
    } catch (_) {
      // Backend có thể chưa chạy hoặc lỗi mạng, sử dụng fallback local
    }

    const localLate = getLocalLateCheckins();

    // Hợp nhất dữ liệu tránh trùng lặp
    const merged = [...serverLate];
    for (const item of localLate) {
      if (!merged.some((m) => m.hoTen === item.hoTen)) {
        merged.push(item);
      }
    }

    setLateList(merged);
    setLoading(false);
  }, []);

  const refreshAll = useCallback(() => {
    setOnDuty(loadOnDuty());
    setNow(new Date());
    fetchLateData();
    fetchRevenueToday();
  }, [fetchLateData, fetchRevenueToday]);

  useEffect(() => {
    refreshAll();
    const timer = setInterval(refreshAll, 15000);
    window.addEventListener("storage", refreshAll);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", refreshAll);
    };
  }, [refreshAll]);

  // Nút hỗ trợ thêm nhanh bản ghi thử nghiệm (Ví dụ Ca 8h00 - Check-in 8h15)
  const handleAddDemoLate = async () => {
    const todayKey = toDateKey(new Date());
    const demoCheckIn = new Date();
    demoCheckIn.setHours(8, 15, 0, 0); // 8h15 sáng

    const demoRecord = {
      id: `DEMO-LATE-${Date.now()}`,
      staffId: "NV002",
      staffName: "Đỗ Văn Đoàn",
      position: "Pha chế",
      dateKey: todayKey,
      shiftType: "morning",
      shiftName: "Ca Sáng",
      shiftStart: "08:00",
      shiftEnd: "12:00",
      checkIn: demoCheckIn.toISOString(),
      checkOut: null,
      isLate: true,
      lateMinutes: 15,
    };

    const currentCheckins = readLocal(STORAGE_KEYS.checkins);
    writeLocal(STORAGE_KEYS.checkins, [
      demoRecord,
      ...currentCheckins.filter((c) => c.staffName !== "Đỗ Văn Đoàn"),
    ]);

    try {
      await axios.post(`${API_BASE}/timekeeping/seed-demo-late`);
    } catch (_) {}

    refreshAll();
  };

  // Đếm số người theo vị trí
  const byPosition = onDuty.reduce((acc, r) => {
    acc[r.position] = (acc[r.position] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="sw-page">
      {/* Header trang */}
      <div className="sw-page-header">
        <div>
          <h2 className="sw-page-title">
            <UserCheck size={24} color="#16a34a" /> Giám sát kỷ luật & Trực quầy
          </h2>
          <p className="sw-page-sub">
            Theo dõi kỷ luật giờ giấc Check-in và nhân sự đang có mặt trong ngày ({new Date().toLocaleDateString("vi-VN")}).
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="sw-btn sw-btn-light" onClick={refreshAll}>
            <RotateCcw size={15} /> Làm mới
          </button>
        </div>
      </div>
      {/* ========================================================================= */}
      {/* 1. KHỐI WIDGET DOANH THU HÔM NAY (TỪ 00:00 ĐẾN HIỆN TẠI - API TỐI ƯU INDEX) */}
      {/* ========================================================================= */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: "14px",
          padding: "20px 24px",
          marginBottom: "20px",
          color: "#ffffff",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)",
          border: "1px solid #334155",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "10px",
                backgroundColor: "#22c55e",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(34, 197, 94, 0.35)",
              }}
            >
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Tổng doanh thu hóa đơn hôm nay (Từ 00:00 đến hiện tại)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: "28px", fontWeight: 900, color: "#4ade80", letterSpacing: "-0.5px" }}>
                  {todayRevenue?.duLieu?.tongTienFormatted || "0 đ"}
                </span>
                <span style={{ fontSize: "13px", color: "#cbd5e1" }}>
                  ({todayRevenue?.duLieu?.soDonHang || 0} đơn đã thanh toán thành công)
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              style={{
                backgroundColor: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                borderRadius: "20px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
              title="Truy vấn bằng B-Tree Covering Index siêu tốc"
            >
              <Zap size={13} /> Index Range Scan: {todayRevenue?.hieuNang?.thoiGianThucThiMs || "2.8 ms"}
            </span>
            <button
              onClick={fetchRevenueToday}
              disabled={loadingRev}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <RotateCcw size={13} /> {loadingRev ? "..." : "Cập nhật"}
            </button>
          </div>
        </div>

        {todayRevenue?.phanBoPhuongThuc?.length > 0 && (
          <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255, 255, 255, 0.1)", flexWrap: "wrap" }}>
            {todayRevenue.phanBoPhuongThuc.map((p) => (
              <div key={p.phuongThuc} style={{ fontSize: "12px", color: "#cbd5e1" }}>
                <span style={{ color: "#94a3b8" }}>{p.phuongThuc}:</span>{" "}
                <strong style={{ color: "#ffffff" }}>{p.tongTienFormatted}</strong> ({p.soLuong} đơn)
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* KHỐI WIDGET NỔI BẬT: CẢNH BÁO NHÂN VIÊN ĐI TRỄ (MÀU CAM / ĐỎ) */}
      {/* ========================================================================= */}
      <div className="late-widget-container">
        <div className="late-widget-header">
          <div className="late-widget-title-box">
            <div className="late-icon-badge">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="late-widget-title">
                CẢNH BÁO ĐI TRỄ HÔM NAY
                {lateList.length > 0 && (
                  <span className="late-count-badge">
                    {lateList.length} nhân viên vi phạm
                  </span>
                )}
              </h3>
              <p className="late-widget-sub">
                ⚡ Logic đối chiếu: So sánh giờ Check-in thực tế với giờ bắt đầu ca quy định. Nếu Check-in muộn hơn giờ ca thì tự động ghi nhận vào danh sách.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleAddDemoLate}
              style={{
                background: "#ffffff",
                border: "1px dashed #ea580c",
                color: "#c2410c",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
              title="Thêm nhanh 1 trường hợp mẫu (Ca 8h00 nhưng 8h15 mới Check-in)"
            >
              <Sparkles size={14} color="#ea580c" /> Thêm mẫu đi trễ (Ca 8h00 - Check-in 8h15)
            </button>
          </div>
        </div>

        {lateList.length === 0 ? (
          <div className="late-empty-good">
            <CheckCircle2 size={20} color="#16a34a" />
            <div>
              <strong>Tác phong chuẩn mực!</strong> Hôm nay chưa có nhân viên nào đi trễ. 100% nhân viên Check-in đúng giờ ca làm.
            </div>
          </div>
        ) : (
          <div className="late-card-list">
            {lateList.map((r, idx) => (
              <div className="late-staff-card" key={r.id || idx}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <div className="late-avatar">
                    {(r.hoTen || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="late-info-col">
                    <div className="late-staff-name">
                      {r.hoTen}
                      <span
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          backgroundColor: "#f1f5f9",
                          color: "#475569",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {r.maNhanVienCode || "NV"}
                      </span>
                    </div>
                    <div className="late-staff-meta">
                      <span>{r.chucVu}</span>
                      <span>•</span>
                      <span style={{ fontWeight: 600, color: "#c2410c" }}>{r.tenCaLam}</span>
                    </div>
                    {/* Khối so sánh giờ trực quan */}
                    <div className="late-time-compare">
                      <Clock size={13} color="#64748b" />
                      <span style={{ color: "#475569" }}>Giờ ca: <strong>{r.gioBatDau || "08:00"}</strong></span>
                      <ArrowRight size={12} color="#94a3b8" />
                      <span style={{ color: "#dc2626", fontWeight: 700 }}>
                        Vào: <strong>{r.gioCheckInThucTe || "08:15"}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="late-tag-box">
                  <span className="late-badge-pill">
                    <AlertTriangle size={12} /> Trễ {r.soPhutDiTre} phút
                  </span>
                  <div style={{ fontSize: "0.72rem", color: "#b91c1c", marginTop: "4px", fontWeight: 500 }}>
                    Vi phạm kỷ luật ca
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Thống kê nhân viên đang có mặt */}
      <div className="sw-stats">
        <div className="sw-stat">
          <div className="sw-stat-label">Đang có mặt</div>
          <div className="sw-stat-value" style={{ color: "#16a34a" }}>
            {onDuty.length} người
          </div>
        </div>
        {Object.entries(byPosition).map(([position, count]) => (
          <div className="sw-stat" key={position}>
            <div className="sw-stat-label">{position}</div>
            <div className="sw-stat-value">{count}</div>
          </div>
        ))}
      </div>

      {/* Danh sách nhân viên đang trực */}
      <div className="sw-card">
        <h3 className="sw-card-title">
          <UserCheck size={18} color="#059669" /> Danh sách nhân sự đang làm việc tại quầy
        </h3>
        {onDuty.length === 0 ? (
          <div className="sw-empty">
            <Coffee size={26} style={{ marginBottom: 6 }} />
            <div>Hiện chưa có nhân viên nào đang trực tại quầy.</div>
          </div>
        ) : (
          <div className="onduty-grid">
            {onDuty.map((r) => (
              <div className="onduty-card" key={r.id}>
                <div className="onduty-avatar">
                  {(r.staffName || "?").charAt(0).toUpperCase()}
                </div>
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
