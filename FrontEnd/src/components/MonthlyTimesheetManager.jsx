import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Camera,
  FileCheck,
  Send,
  Users,
  Clock,
  Calendar,
  Sparkles,
  Edit3,
  X,
  ShieldCheck,
  Info
} from "lucide-react";
import { API_BASE, formatMoney } from "../utils/staffWork";

export default function MonthlyTimesheetManager() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [timesheets, setTimesheets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Modal Sửa công / Xử lý khiếu nại (kiểm tra camera/sổ sách)
  const [editModalItem, setEditModalItem] = useState(null);
  const [editForm, setEditForm] = useState({
    soCong: "",
    soGioLam: "",
    soNgayTre: "",
    soNgayNghi: "",
    ghiChuQL: "",
  });

  // Modal xác nhận chốt sổ
  const [showConfirmLockModal, setShowConfirmLockModal] = useState(false);

  // Tải danh sách bảng công tháng
  const fetchMonthlyTimesheet = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/bangcong-thang`, {
        params: { thang: selectedMonth, nam: selectedYear },
      });
      if (res.data.success) {
        setTimesheets(res.data.data);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error("Lỗi tải bảng công tháng:", err);
      setMessage({ type: "error", text: "Không thể tải bảng công từ máy chủ!" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyTimesheet();
  }, [selectedMonth, selectedYear]);

  // Nạp kịch bản mẫu kiểm thử có khiếu nại
  const handleSeedDemo = async () => {
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/bangcong-thang/seed-demo`, {
        thang: selectedMonth,
        nam: selectedYear,
      });
      setMessage({ type: "success", text: res.data.message });
      await fetchMonthlyTimesheet();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Quản lý mở modal chỉnh sửa / xử lý khiếu nại
  const openEditModal = (item) => {
    if (summary?.isLocked) {
      alert("Dữ liệu bảng công đã bị khóa sau khi chốt sổ gửi Admin. Không thể chỉnh sửa!");
      return;
    }
    setEditModalItem(item);
    setEditForm({
      soCong: item.SoCong || 0,
      soGioLam: item.SoGioLam || 0,
      soNgayTre: item.SoNgayTre || 0,
      soNgayNghi: item.SoNgayNghi || 0,
      ghiChuQL:
        item.GhiChuQL ||
        (item.TrangThai === "emp_replied"
          ? "Đã trích xuất camera kiểm tra: Xác nhận đi làm đủ công."
          : "Quản lý đã kiểm tra sổ sách và cập nhật công."),
    });
  };

  // Lưu xử lý khiếu nại / cập nhật công
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editModalItem) return;
    setActionLoading(true);

    try {
      const isComplaint = editModalItem.TrangThai === "emp_replied";
      const endpoint = isComplaint
        ? `${API_BASE}/bangcong-thang/${editModalItem.MaBangCong}/resolve-complaint`
        : `${API_BASE}/bangcong-thang/${editModalItem.MaBangCong}`;

      const res = await axios.put(endpoint, {
        soCong: Number(editForm.soCong),
        soGioLam: Number(editForm.soGioLam),
        soNgayTre: Number(editForm.soNgayTre),
        soNgayNghi: Number(editForm.soNgayNghi),
        ghiChuQL: editForm.ghiChuQL,
      });

      setMessage({ type: "success", text: res.data.message });
      setEditModalItem(null);
      await fetchMonthlyTimesheet();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Duyệt nhanh tất cả nhân viên chưa xác nhận thành "Xác nhận đúng"
  const handleQuickConfirmAll = async () => {
    if (summary?.isLocked) return;
    if (!window.confirm(`Xác nhận duyệt đúng cho toàn bộ nhân viên tháng ${selectedMonth}/${selectedYear}?`)) return;

    setActionLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/bangcong-thang/confirm-all`, {
        thang: selectedMonth,
        nam: selectedYear,
      });
      setMessage({ type: "success", text: res.data.message });
      await fetchMonthlyTimesheet();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // QUẢN LÝ BẤM NÚT [CHỐT BẢNG CÔNG THÁNG] (Task QH-55)
  const handleCloseAndSubmitToAdmin = async () => {
    setShowConfirmLockModal(false);
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/bangcong-thang/close-and-submit-to-admin`, {
        thang: selectedMonth,
        nam: selectedYear,
      });
      setMessage({ type: "success", text: res.data.message });
      await fetchMonthlyTimesheet();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || err.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Badge trạng thái
  const renderStatusBadge = (status) => {
    switch (status) {
      case "submitted_to_admin":
        return (
          <span style={{ ...badgeStyle, backgroundColor: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>
            🔒 Đã chốt sổ (Đã gửi Admin)
          </span>
        );
      case "confirmed":
        return (
          <span style={{ ...badgeStyle, backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
            ✓ Xác nhận đúng
          </span>
        );
      case "emp_replied":
        return (
          <span style={{ ...badgeStyle, backgroundColor: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa" }}>
            ⚠️ Đang khiếu nại sai sót
          </span>
        );
      case "sent_to_emp":
        return (
          <span style={{ ...badgeStyle, backgroundColor: "#fefce8", color: "#ca8a04", border: "1px solid #fef08a" }}>
            ⏳ Chờ NV kiểm tra
          </span>
        );
      default:
        return (
          <span style={{ ...badgeStyle, backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
            📝 Nháp (Quản lý)
          </span>
        );
    }
  };

  const isLocked = summary?.isLocked;
  const canLock = summary?.canSubmitToAdmin;
  const complaints = timesheets.filter((r) => r.TrangThai === "emp_replied");

  return (
    <div style={{ padding: "8px 0", fontFamily: "Inter, sans-serif" }}>
      {/* 1. THANH ĐIỀU HƯỚNG & BỘ LỌC THỜI GIAN */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={22} color="#4f46e5" />
            Bảng Công Tháng & Chốt Sổ Gửi Admin (QH-55)
          </h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
            Quản lý kiểm tra khiếu nại camera/sổ sách, xác nhận đúng công. Sau khi 100% nhân viên xác nhận đúng, bấm <strong>[Chốt bảng công tháng]</strong> để khóa dữ liệu và tự động chuyển sang phân hệ Tính lương cho Admin.
          </p>
        </div>

        {/* Bộ chọn tháng/năm & Nút Demo */}
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

          <button
            onClick={fetchMonthlyTimesheet}
            disabled={loading}
            style={btnSecondaryStyle}
            title="Tải lại bảng công"
          >
            <RotateCcw size={15} /> Làm mới
          </button>

          <button
            onClick={handleSeedDemo}
            disabled={actionLoading || isLocked}
            style={{ ...btnSecondaryStyle, color: "#ea580c", borderColor: "#fed7aa", backgroundColor: "#fff7ed" }}
            title="Tạo tình huống có nhân viên khiếu nại camera để thử nghiệm"
          >
            <Sparkles size={15} /> Nạp kịch bản khiếu nại (Demo QH-55)
          </button>

          {!isLocked && (
            <button
              onClick={handleQuickConfirmAll}
              disabled={actionLoading}
              style={{ ...btnSecondaryStyle, color: "#2563eb", borderColor: "#bfdbfe", backgroundColor: "#eff6ff" }}
              title="Đánh dấu xác nhận đúng cho tất cả nhân viên chưa khiếu nại"
            >
              <CheckCircle2 size={15} /> Duyệt nhanh tất cả
            </button>
          )}
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

      {/* 2. BANNER TRẠNG THÁI TIẾN ĐỘ CHỐT SỔ */}
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
          backgroundColor: isLocked ? "#f0fdf4" : canLock ? "#eff6ff" : complaints.length > 0 ? "#fffbeb" : "#f8fafc",
          border: `1.5px solid ${isLocked ? "#86efac" : canLock ? "#93c5fd" : complaints.length > 0 ? "#fde68a" : "#e2e8f0"}`,
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isLocked ? "#22c55e" : canLock ? "#3b82f6" : complaints.length > 0 ? "#f59e0b" : "#64748b",
              color: "#fff",
            }}
          >
            {isLocked ? <Lock size={26} /> : canLock ? <FileCheck size={26} /> : complaints.length > 0 ? <AlertTriangle size={26} /> : <Unlock size={26} />}
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
              {isLocked
                ? `🔒 BẢNG CÔNG THÁNG ${selectedMonth}/${selectedYear} ĐÃ CHỐT SỔ & KHÓA DỮ LIỆU`
                : canLock
                ? `✨ 100% NHÂN VIÊN ĐÃ XÁC NHẬN ĐÚNG - ĐỦ ĐIỀU KIỆN CHỐT SỔ`
                : complaints.length > 0
                ? `⚠️ CÓ ${complaints.length} KHIẾU NẠI SAI SÓT CẦN QUẢN LÝ KIỂM TRA CAMERA/SỔ SÁCH`
                : `⏳ ĐANG CHỜ TOÀN BỘ NHÂN VIÊN XÁC NHẬN ĐÚNG BẢNG CÔNG`}
            </div>
            <div style={{ fontSize: "13px", color: "#475569", marginTop: 4 }}>
              {isLocked
                ? "Dữ liệu bảng công đã bị khóa hoàn toàn (không ai được sửa nữa) và đã tự động gửi tín hiệu sang phân hệ Tính lương cho Admin."
                : canLock
                ? "Toàn bộ nhân viên trong tháng đã xác nhận đúng. Quản lý có thể bấm nút [Chốt bảng công tháng] bên phải để gửi lên Admin."
                : complaints.length > 0
                ? "Theo quy chế: Quản lý phải kiểm tra camera/sổ sách thủ công và sửa lại công cho nhân viên trước khi được phép chốt sổ."
                : `Đã xác nhận: ${summary?.soLuongDaXacNhan || 0}/${summary?.tongNhanVien || 0} nhân viên. Cần 100% nhân viên xác nhận đúng mới được chốt sổ.`}
            </div>
          </div>
        </div>

        {/* NÚT BẤM [CHỐT BẢNG CÔNG THÁNG] (Task QH-55) */}
        <div>
          {isLocked ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, backgroundColor: "#dcfce7", color: "#15803d", fontWeight: "700", fontSize: "14px" }}>
              <ShieldCheck size={18} /> Đã khóa & Chuyển sang Admin
            </div>
          ) : (
            <button
              onClick={() => {
                if (!canLock) {
                  alert(
                    complaints.length > 0
                      ? `Chưa thể chốt sổ! Có ${complaints.length} khiếu nại đang chờ bạn kiểm tra camera/sổ sách. Vui lòng xử lý khiếu nại trước.`
                      : `Chưa thể chốt sổ! Vẫn còn nhân viên chưa ở trạng thái [Xác nhận đúng]. Toàn bộ nhân viên phải xác nhận đúng mới được chốt sổ gửi Admin!`
                  );
                  return;
                }
                setShowConfirmLockModal(true);
              }}
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
                fontWeight: "700",
                fontSize: "14px",
                cursor: canLock ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: canLock ? "#4f46e5" : "#cbd5e1",
                color: "#ffffff",
                boxShadow: canLock ? "0 4px 14px rgba(79, 70, 229, 0.4)" : "none",
                transition: "all 0.2s ease",
              }}
              title={canLock ? "Bấm để chốt bảng công và gửi lên Admin tính lương" : "Cần 100% nhân viên xác nhận đúng mới được chốt"}
            >
              <Lock size={16} /> [Chốt bảng công tháng] & Gửi Admin
            </button>
          )}
        </div>
      </div>

      {/* 3. KHU VỰC DANH SÁCH KHIẾU NẠI NỔI BẬT (NẾU CÓ) */}
      {complaints.length > 0 && !isLocked && (
        <div
          style={{
            backgroundColor: "#fff7ed",
            border: "1.5px solid #fdba74",
            borderRadius: "10px",
            padding: "18px 20px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Camera size={20} color="#ea580c" />
            <h3 style={{ margin: 0, fontSize: "16px", color: "#9a3412" }}>
              Danh sách khiếu nại cần Quản lý kiểm tra camera / sổ sách thủ công ({complaints.length})
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {complaints.map((c) => (
              <div
                key={c.MaBangCong}
                style={{
                  backgroundColor: "#ffffff",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid #fed7aa",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: "700", color: "#0f172a" }}>
                    {c.HoTen} ({c.MaNhanVienCode}) - <span style={{ color: "#64748b", fontWeight: "normal" }}>{c.ChucVu}</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#b45309", marginTop: 4 }}>
                    💬 <strong>Nhân viên phản ánh:</strong> "{c.PhanHoiNV || "Báo sai sót số công / số giờ làm"}"
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: 2 }}>
                    Hiện tại: {c.SoCong} công ({c.SoGioLam} giờ), trễ {c.SoNgayTre} lần.
                  </div>
                </div>

                <button
                  onClick={() => openEditModal(c)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#ea580c",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Camera size={14} /> Kiểm tra camera & Sửa công
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. BẢNG TỔNG HỢP CÔNG CHI TIẾT TẤT CẢ NHÂN VIÊN */}
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
            Danh sách chi tiết bảng công nhân viên tháng {selectedMonth}/{selectedYear} ({timesheets.length} nhân viên)
          </div>
          {isLocked && (
            <span style={{ fontSize: "12px", color: "#059669", fontWeight: "600", display: "flex", alignItems: "center", gap: 4 }}>
              <Lock size={13} /> Dữ liệu đã bị khóa
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            Đang tải dữ liệu bảng công...
          </div>
        ) : timesheets.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            Chưa có nhân viên nào trong tháng này.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                <th style={thStyle}>Mã NV</th>
                <th style={thStyle}>Họ và tên</th>
                <th style={thStyle}>Chức vụ & Loại HĐ</th>
                <th style={thStyle}>Mức lương</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Số công</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Số giờ</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Đi trễ</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Nghỉ</th>
                <th style={thStyle}>Trạng thái xác nhận</th>
                <th style={thStyle}>Ghi chú kiểm tra của QL</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map((row) => (
                <tr
                  key={row.MaBangCong}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    backgroundColor: row.TrangThai === "emp_replied" ? "#fffbeb" : "transparent",
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: "700", color: "#475569" }}>
                    {row.MaNhanVienCode || `NV00${row.MaNhanVien}`}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: "700", color: "#0f172a" }}>{row.HoTen}</div>
                    {row.PhanHoiNV && (
                      <div style={{ fontSize: "12px", color: "#ea580c", marginTop: 2 }}>
                        💬 {row.PhanHoiNV}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div>{row.ChucVu}</div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: row.LoaiNhanVien === "Part-time" ? "#0284c7" : "#16a34a",
                      }}
                    >
                      {row.LoaiNhanVien}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {formatMoney(row.Luong)} / {row.LoaiNhanVien === "Part-time" ? "giờ" : "tháng"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: "700", color: "#0f172a" }}>
                    {row.SoCong}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: "600" }}>
                    {row.SoGioLam}h
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    {row.SoNgayTre > 0 ? (
                      <span style={{ color: "#dc2626", fontWeight: "700" }}>{row.SoNgayTre} lần</span>
                    ) : (
                      <span style={{ color: "#16a34a" }}>0</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    {row.SoNgayNghi}
                  </td>
                  <td style={tdStyle}>
                    {renderStatusBadge(row.TrangThai)}
                    {row.NgayXacNhan && (
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: 2 }}>
                        Xác nhận: {row.NgayXacNhan}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 220, fontSize: "12px", color: "#475569" }}>
                    {row.GhiChuQL || "—"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                    {isLocked ? (
                      <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>
                        <Lock size={12} style={{ verticalAlign: "-2px" }} /> Đã khóa
                      </span>
                    ) : (
                      <button
                        onClick={() => openEditModal(row)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: row.TrangThai === "emp_replied" ? "#ea580c" : "#ffffff",
                          color: row.TrangThai === "emp_replied" ? "#ffffff" : "#334155",
                          fontWeight: "600",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {row.TrangThai === "emp_replied" ? <Camera size={12} /> : <Edit3 size={12} />}
                        {row.TrangThai === "emp_replied" ? "Sửa camera" : "Chỉnh sửa"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. MODAL CHỈNH SỬA CÔNG / XỬ LÝ KHIẾU NẠI (KIỂM TRA CAMERA/SỔ SÁCH) */}
      {editModalItem && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <Camera size={20} color="#ea580c" />
                Kiểm tra Camera / Sổ sách & Chỉnh sửa công
              </h3>
              <button onClick={() => setEditModalItem(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#64748b" }}>✕</button>
            </div>

            <div style={{ backgroundColor: "#f8fafc", padding: "12px 14px", borderRadius: 8, marginBottom: 16, fontSize: "13px" }}>
              <div><strong>Nhân viên:</strong> {editModalItem.HoTen} ({editModalItem.MaNhanVienCode}) - {editModalItem.ChucVu} ({editModalItem.LoaiNhanVien})</div>
              {editModalItem.PhanHoiNV && (
                <div style={{ marginTop: 6, color: "#ea580c" }}>
                  <strong>Khiếu nại của NV:</strong> "{editModalItem.PhanHoiNV}"
                </div>
              )}
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Số ngày công:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="31"
                    required
                    value={editForm.soCong}
                    onChange={(e) => setEditForm({ ...editForm, soCong: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tổng số giờ làm:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={editForm.soGioLam}
                    onChange={(e) => setEditForm({ ...editForm, soGioLam: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Số lần đi trễ:</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editForm.soNgayTre}
                    onChange={(e) => setEditForm({ ...editForm, soNgayTre: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Số ngày nghỉ:</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editForm.soNgayNghi}
                    onChange={(e) => setEditForm({ ...editForm, soNgayNghi: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Ghi chú đối soát của Quản lý (Camera/Sổ sách):</label>
                <textarea
                  rows="3"
                  required
                  placeholder="VD: Đã đối soát camera lúc 07:00 ngày 12/10, nhân viên có mặt đúng giờ. Cập nhật đủ công."
                  value={editForm.ghiChuQL}
                  onChange={(e) => setEditForm({ ...editForm, ghiChuQL: e.target.value })}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditModalItem(null)}
                  style={btnSecondaryStyle}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ ...btnPrimaryStyle, backgroundColor: "#ea580c" }}
                >
                  {actionLoading ? "Đang lưu..." : "✓ Lưu & Đặt thành 'Xác nhận đúng'"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL XÁC NHẬN CHỐT BẢNG CÔNG THÁNG & GỬI ADMIN */}
      {showConfirmLockModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: 520 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "#e0e7ff", color: "#4f46e5", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Lock size={30} />
              </div>
              <h3 style={{ margin: 0, fontSize: "19px", color: "#0f172a" }}>
                Xác nhận chốt bảng công tháng {selectedMonth}/{selectedYear}?
              </h3>
            </div>

            <div style={{ backgroundColor: "#f8fafc", padding: "14px 18px", borderRadius: 8, fontSize: "13px", color: "#334155", lineHeight: "1.6", marginBottom: 20 }}>
              <p style={{ margin: "0 0 8px" }}>
                ✓ <strong>100% nhân viên</strong> trong tháng đã ở trạng thái <strong>[Xác nhận đúng]</strong>.
              </p>
              <p style={{ margin: "0 0 8px", color: "#b91c1c" }}>
                🔒 <strong>LƯU Ý QUAN TRỌNG:</strong> Sau khi Quản lý bấm chốt, dữ liệu bảng công sẽ bị <strong>KHÓA HOÀN TOÀN</strong> (không ai được sửa nữa).
              </p>
              <p style={{ margin: 0, color: "#15803d" }}>
                🚀 Hệ thống sẽ tự động gửi tín hiệu <strong>"Đã chốt sổ"</strong> sang phân hệ Tính lương cho Admin để bắt đầu chạy tính toán bảng lương.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowConfirmLockModal(false)}
                style={btnSecondaryStyle}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCloseAndSubmitToAdmin}
                style={{ ...btnPrimaryStyle, backgroundColor: "#4f46e5" }}
              >
                {actionLoading ? "Đang chốt..." : "🔒 Xác nhận chốt & Gửi lên Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
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
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontWeight: "600",
  fontSize: "13px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(15, 23, 42, 0.6)",
  backdropFilter: "blur(3px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 16,
};

const modalContentStyle = {
  backgroundColor: "#ffffff",
  borderRadius: 12,
  padding: 24,
  maxWidth: 550,
  width: "100%",
  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#334155",
  marginBottom: 4,
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  fontSize: "14px",
  color: "#0f172a",
  boxSizing: "border-box",
};
