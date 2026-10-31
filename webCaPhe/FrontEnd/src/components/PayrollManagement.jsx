import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Wallet,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Printer,
  ShieldCheck,
  Calendar,
  DollarSign,
  Users,
  Lock,
  ArrowRight
} from "lucide-react";
import { API_BASE, formatMoney } from "../utils/staffWork";

export default function PayrollManagement() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [payrolls, setPayrolls] = useState([]);
  const [summary, setSummary] = useState(null);
  const [timesheetStatus, setTimesheetStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [message, setMessage] = useState(null);

  // Tải danh sách bảng lương
  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/bangluong`, {
        params: { thang: selectedMonth, nam: selectedYear },
      });
      if (res.data.success) {
        setPayrolls(res.data.data);
        setSummary(res.data.summary);
        setTimesheetStatus(res.data.timesheetStatus);
      }
    } catch (err) {
      console.error("Lỗi tải bảng lương:", err);
      setMessage({ type: "error", text: "Không thể kết nối đến máy chủ lấy bảng lương!" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth, selectedYear]);

  // ADMIN BẮT ĐẦU CHẠY TÍNH LƯƠNG
  // Nghiệp vụ: API chỉ bắt đầu chạy khi nhận được tín hiệu "Đã chốt sổ" từ QH-55 đẩy sang
  const handleCalculatePayroll = async (forceOption = false) => {
    setCalculating(true);
    setMessage(null);
    try {
      const res = await axios.post(`${API_BASE}/bangluong/calculate`, {
        thang: selectedMonth,
        nam: selectedYear,
        force: forceOption,
      });

      setMessage({ type: "success", text: res.data.message });
      await fetchPayroll();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      setMessage({ type: "error", text: errMsg });
    } finally {
      setCalculating(false);
    }
  };

  // Admin duyệt từng phiếu lương
  const handleApproveItem = async (id, status) => {
    try {
      const res = await axios.put(`${API_BASE}/bangluong/${id}/approve`, {
        trangThai: status,
      });
      setMessage({ type: "success", text: res.data.message });
      await fetchPayroll();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || err.message });
    }
  };

  // Admin duyệt toàn bộ bảng lương
  const handleApproveAll = async () => {
    if (!window.confirm(`Xác nhận duyệt toàn bộ bảng lương tháng ${selectedMonth}/${selectedYear}?`)) return;
    try {
      const res = await axios.post(`${API_BASE}/bangluong/approve-all`, {
        thang: selectedMonth,
        nam: selectedYear,
      });
      setMessage({ type: "success", text: res.data.message });
      await fetchPayroll();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || err.message });
    }
  };

  const isLocked = timesheetStatus?.isTimesheetLocked;

  return (
    <div style={{ padding: "24px", fontFamily: "Inter, sans-serif" }}>
      {/* 1. HEADER & BỘ LỌC */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
            <Wallet size={24} color="#059669" />
            Quản Lý Bảng Lương & Quyết Toán (Admin)
          </h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
            Admin nhận bảng công đã chốt từ Quản lý. <strong>API chỉ bắt đầu chạy tính lương khi nhận được tín hiệu "Đã chốt sổ" từ phân hệ Bảng công (Task QH-55) đẩy sang.</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "#fff", padding: "6px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Tháng:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              style={{ border: "none", outline: "none", fontWeight: "600", fontSize: "14px", color: "#0f172a", cursor: "pointer" }}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Tháng {String(i + 1).padStart(2, "0")}
                </option>
              ))}
            </select>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ border: "none", outline: "none", fontWeight: "600", fontSize: "14px", color: "#0f172a", cursor: "pointer" }}
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button onClick={fetchPayroll} disabled={loading} style={btnSecondaryStyle}>
            <RotateCcw size={15} /> Làm mới
          </button>

          <button onClick={() => window.print()} style={btnSecondaryStyle}>
            <Printer size={15} /> In / Xuất PDF
          </button>
        </div>
      </div>

      {/* THÔNG BÁO TÁC VỤ */}
      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: message.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: message.type === "success" ? "#065f46" : "#991b1b",
            border: `1px solid ${message.type === "success" ? "#a7f3d0" : "#fecaca"}`,
          }}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: "bold" }}>✕</button>
        </div>
      )}

      {/* QUY TẮC TÍNH LƯƠNG CHUẨN (QH-28 & QH-29) */}
      <div
        style={{
          backgroundColor: "#f8fafc",
          border: "1.5px solid #cbd5e1",
          borderRadius: "10px",
          padding: "14px 18px",
          marginBottom: "16px",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "280px" }}>
          <div style={{ fontWeight: 700, color: "#0284c7", fontSize: "14px", marginBottom: "4px" }}>
            ⏱️ Part-time (QH-29):
          </div>
          <div style={{ fontSize: "13px", color: "#334155" }}>
            <strong>Tổng lương</strong> = Số giờ làm thực tế × Mức lương theo giờ
          </div>
        </div>
        <div style={{ flex: 1, minWidth: "280px" }}>
          <div style={{ fontWeight: 700, color: "#16a34a", fontSize: "14px", marginBottom: "4px" }}>
            👔 Full-time (QH-28):
          </div>
          <div style={{ fontSize: "13px", color: "#334155" }}>
            <strong>Tổng lương</strong> = Lương cứng (QH-28) − (Số ngày nghỉ không phép × Phạt) + Thưởng (nếu có)
          </div>
        </div>
      </div>

      {/* 2. BANNER LIÊN KẾT TÍN HIỆU TỪ BẢNG CÔNG (TASK QH-55) */}
      <div
        style={{
          borderRadius: "12px",
          padding: "18px 24px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          backgroundColor: isLocked ? "#f0fdf4" : "#fffbeb",
          border: `1.5px solid ${isLocked ? "#86efac" : "#fde68a"}`,
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isLocked ? "#16a34a" : "#f59e0b",
              color: "#fff",
            }}
          >
            {isLocked ? <ShieldCheck size={26} /> : <AlertTriangle size={26} />}
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
              {isLocked
                ? `✅ ĐÃ NHẬN TÍN HIỆU "ĐÃ CHỐT SỔ" TỪ QUẢN LÝ (TASK QH-55)`
                : `⚠️ CHƯA NHẬN ĐƯỢC TÍN HIỆU "ĐÃ CHỐT SỔ" TỪ PHÂN HỆ BẢNG CÔNG`}
            </div>
            <div style={{ fontSize: "13px", color: "#475569", marginTop: 4 }}>
              {isLocked
                ? `Bảng công tháng ${selectedMonth}/${selectedYear} đã được Quản lý chốt sổ và khóa dữ liệu an toàn. API tính lương đã được kích hoạt và sẵn sàng tính toán.`
                : `Theo quy định hệ thống: API chỉ bắt đầu chạy tính lương khi Quản lý hoàn tất kiểm tra camera/sổ sách, xử lý hết khiếu nại và bấm nút [Chốt bảng công tháng].`}
            </div>
          </div>
        </div>

        {/* NÚT TÍNH LƯƠNG TỰ ĐỘNG */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={handleCalculatePayroll}
            disabled={calculating || !isLocked}
            style={{
              padding: "12px 22px",
              borderRadius: "8px",
              border: "none",
              fontWeight: "700",
              fontSize: "14px",
              cursor: isLocked ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: isLocked ? "#16a34a" : "#cbd5e1",
              color: "#ffffff",
              boxShadow: isLocked ? "0 4px 12px rgba(22, 163, 74, 0.3)" : "none",
            }}
            title={isLocked ? "Bấm để tính lương tự động dựa trên bảng công đã chốt" : "Cần Quản lý chốt sổ bảng công trước mới được tính lương"}
          >
            <DollarSign size={16} />
            {calculating ? "Đang chạy tính toán..." : "Chạy Tính Lương Tự Động"}
          </button>

          {!isLocked && (
            <button
              onClick={() => handleCalculatePayroll(true)}
              disabled={calculating}
              style={{
                ...btnSecondaryStyle,
                padding: "12px 16px",
                fontSize: "13px",
                color: "#d97706",
                borderColor: "#fde68a",
                backgroundColor: "#fffbeb",
              }}
              title="Tính toán thử nghiệm ngay mà không cần đợi Quản lý chốt sổ"
            >
              ⚡ Tính Thử Nghiệm (Force)
            </button>
          )}

          {payrolls.length > 0 && (
            <button onClick={handleApproveAll} style={{ ...btnSecondaryStyle, backgroundColor: "#eff6ff", borderColor: "#bfdbfe", color: "#2563eb", padding: "12px 16px" }}>
              <CheckCircle2 size={16} /> Duyệt tất cả
            </button>
          )}
        </div>
      </div>

      {/* 3. THỐNG KÊ TỔNG QUAN QUỸ LƯƠNG */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div style={statCardStyle}>
          <div style={{ color: "#64748b", fontSize: "13px", fontWeight: "600" }}>Tổng số nhân viên tính lương</div>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", marginTop: 4 }}>
            {summary?.tongNhanVien || 0} nhân sự
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ color: "#64748b", fontSize: "13px", fontWeight: "600" }}>Tổng quỹ lương thực lĩnh</div>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#16a34a", marginTop: 4 }}>
            {formatMoney(summary?.tongTienLuong || 0)}
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ color: "#64748b", fontSize: "13px", fontWeight: "600" }}>Trạng thái chi trả</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#2563eb", marginTop: 8 }}>
            Đã duyệt: {summary?.daDuyet || 0} / {summary?.tongNhanVien || 0} phiếu lương
          </div>
        </div>
      </div>

      {/* 4. BẢNG DANH SÁCH LƯƠNG CHI TIẾT */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          overflowX: "auto",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "15px" }}>
            Bảng lương tháng {selectedMonth}/{selectedYear} ({payrolls.length} nhân viên)
          </div>
          {isLocked && (
            <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600", display: "flex", alignItems: "center", gap: 4 }}>
              <ShieldCheck size={14} /> Dữ liệu chuẩn từ Bảng công đã chốt (QH-55)
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            Đang tải dữ liệu bảng lương...
          </div>
        ) : payrolls.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            {isLocked ? (
              <div>
                <p>Bảng công tháng này đã được Quản lý chốt sổ thành công!</p>
                <button onClick={handleCalculatePayroll} disabled={calculating} style={{ ...btnPrimaryStyle, margin: "12px auto" }}>
                  <DollarSign size={15} /> Bấm vào đây để chạy tính lương tự động
                </button>
              </div>
            ) : (
              <p>Chưa có bảng lương tháng này. Vui lòng đợi Quản lý hoàn tất kiểm tra và chốt bảng công (QH-55).</p>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                <th style={thStyle}>Mã NV</th>
                <th style={thStyle}>Họ và tên</th>
                <th style={thStyle}>Chức vụ / Loại HĐ</th>
                <th style={thStyle}>Lương cơ sở</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Công / Giờ TT</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Thưởng</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Khấu trừ (Phạt)</th>
                <th style={{ ...thStyle, textAlign: "right" }}>THỰC LĨNH</th>
                <th style={thStyle}>Chi tiết công thức</th>
                <th style={thStyle}>Trạng thái</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Thao tác Admin</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map((row) => (
                <tr key={row.MaBangLuong} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ ...tdStyle, fontWeight: "700", color: "#475569" }}>
                    {row.MaNhanVienCode || `NV00${row.MaNhanVien}`}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: "700", color: "#0f172a" }}>{row.HoTen}</div>
                  </td>
                  <td style={tdStyle}>
                    <div>{row.ChucVu}</div>
                    <span style={{ fontSize: "11px", fontWeight: "600", color: row.LoaiNhanVien === "Part-time" ? "#0284c7" : "#16a34a" }}>
                      {row.LoaiNhanVien}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: "600" }}>{formatMoney(row.LuongCoBan)}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      {row.LoaiNhanVien === "Part-time" ? "theo giờ" : "lương cứng"}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: "600" }}>
                    {row.LoaiNhanVien === "Part-time" ? (
                      <span style={{ color: "#0284c7" }}>{row.SoGioLam} giờ</span>
                    ) : (
                      <div>
                        <span>{row.SoCong} công</span>
                        {Number(row.SoNgayNghiKhongPhep) > 0 && (
                          <div style={{ color: "#dc2626", fontSize: "11px", fontWeight: "500" }}>
                            Nghỉ KP: {row.SoNgayNghiKhongPhep} ngày
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: Number(row.Thuong) > 0 ? "#16a34a" : "#64748b", fontWeight: "600" }}>
                    {Number(row.Thuong) > 0 ? `+ ${formatMoney(row.Thuong)}` : "0đ"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: Number(row.KhauTru) > 0 ? "#dc2626" : "#64748b", fontWeight: "600" }}>
                    {Number(row.KhauTru) > 0 ? `- ${formatMoney(row.KhauTru)}` : "0đ"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: "800", fontSize: "15px", color: "#059669" }}>
                    {formatMoney(row.TongLuong)}
                  </td>
                  <td style={{ ...tdStyle, fontSize: "12px", color: "#475569", maxWidth: "240px", lineHeight: "1.3" }}>
                    {row.GhiChu || (row.LoaiNhanVien === "Part-time" ? `${row.SoGioLam}h × ${formatMoney(row.LuongCoBan)}` : `Lương cứng - Phạt + Thưởng`)}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        ...badgeStyle,
                        backgroundColor: row.TrangThai === "Đã thanh toán" ? "#ecfdf5" : row.TrangThai === "Đã duyệt" ? "#eff6ff" : "#fefce8",
                        color: row.TrangThai === "Đã thanh toán" ? "#059669" : row.TrangThai === "Đã duyệt" ? "#2563eb" : "#ca8a04",
                        border: `1px solid ${row.TrangThai === "Đã thanh toán" ? "#a7f3d0" : row.TrangThai === "Đã duyệt" ? "#bfdbfe" : "#fef08a"}`,
                      }}
                    >
                      {row.TrangThai}
                    </span>
                    {row.NgayThanhToan && (
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: 2 }}>
                        Chi trả: {row.NgayThanhToan}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                    {row.TrangThai === "Chờ duyệt" && (
                      <button
                        onClick={() => handleApproveItem(row.MaBangLuong, "Đã duyệt")}
                        style={{ ...btnSecondaryStyle, padding: "5px 10px", fontSize: "12px", color: "#2563eb", borderColor: "#bfdbfe" }}
                      >
                        ✓ Duyệt lương
                      </button>
                    )}
                    {row.TrangThai === "Đã duyệt" && (
                      <button
                        onClick={() => handleApproveItem(row.MaBangLuong, "Đã thanh toán")}
                        style={{ ...btnSecondaryStyle, padding: "5px 10px", fontSize: "12px", color: "#16a34a", borderColor: "#86efac" }}
                      >
                        💳 Đã chi trả
                      </button>
                    )}
                    {row.TrangThai === "Đã thanh toán" && (
                      <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600" }}>✓ Hoàn tất</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  padding: "12px 14px",
  fontSize: "12px",
  fontWeight: "700",
  color: "#475569",
  textTransform: "uppercase",
};

const tdStyle = {
  padding: "12px 14px",
  fontSize: "13px",
  color: "#334155",
  verticalAlign: "middle",
};

const badgeStyle = {
  padding: "4px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "600",
  display: "inline-block",
};

const statCardStyle = {
  backgroundColor: "#ffffff",
  padding: "16px 20px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
};

const btnSecondaryStyle = {
  padding: "8px 14px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#ffffff",
  color: "#334155",
  fontWeight: "600",
  fontSize: "13px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const btnPrimaryStyle = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#16a34a",
  color: "#ffffff",
  fontWeight: "600",
  fontSize: "13px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};
