import React, { useState, useEffect } from "react";
import MonthlyTimesheetManager from "./MonthlyTimesheetManager";
import { CheckSquare, Calendar, Clock } from "lucide-react";
import { API_BASE as API_BASE_URL } from "../config/api";

const TimekeepingManagement = () => {
  const [activeModule, setActiveModule] = useState("monthly_timesheet"); // Mặc định mở Bảng công tháng QH-55
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [managerNotes, setManagerNotes] = useState({});

  // Tải danh sách yêu cầu bổ sung điểm danh từ Backend
  const fetchSupplementRequests = async (status = filterStatus) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/yeucau-chamcong?status=${status}`,
      );
      const result = await response.json();
      if (result.success) {
        setRequests(result.data);
      }
    } catch (error) {
      console.error("Lỗi kết nối khi tải danh sách yêu cầu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplementRequests(filterStatus);
  }, [filterStatus]);

  // Xử lý khi Quản lý thay đổi ghi chú trên từng dòng
  const handleNoteChange = (maYeuCau, value) => {
    setManagerNotes((prev) => ({ ...prev, [maYeuCau]: value }));
  };

  // Xử lý khi Quản lý bấm "Đồng ý"
  const handleApprove = async (yc) => {
    const confirmMsg = `Xác nhận ĐỒNG Ý bổ sung điểm danh cho nhân viên "${yc.HoTen}" (${yc.MaNhanVienCode}) vào ngày ${yc.Ngay} (${yc.CaLam}: ${yc.ThoiGian})?\n\nHệ thống sẽ tự động tạo bản ghi Check-in/Check-out hợp lệ để tính lương.`;
    if (!window.confirm(confirmMsg)) return;

    setProcessingId(yc.MaYeuCau);
    try {
      const response = await fetch(
        `${API_BASE_URL}/yeucau-chamcong/${yc.MaYeuCau}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ghiChuQL: managerNotes[yc.MaYeuCau] || "Đồng ý bổ sung công hợp lệ",
          }),
        },
      );

      const result = await response.json();
      if (result.success) {
        alert("✅ " + result.message);
        fetchSupplementRequests(filterStatus);
      } else {
        alert("❌ Lỗi: " + result.message);
      }
    } catch (error) {
      console.error("Lỗi khi duyệt yêu cầu:", error);
      alert("Không thể kết nối đến máy chủ Backend!");
    } finally {
      setProcessingId(null);
    }
  };

  // Xử lý khi Quản lý bấm "Từ chối"
  const handleReject = async (yc) => {
    const reason =
      managerNotes[yc.MaYeuCau] ||
      window.prompt(
        "Nhập lý do từ chối yêu cầu này:",
        "Không đủ căn cứ xác thực",
      );
    if (reason === null) return; // Bấm Cancel trong prompt

    setProcessingId(yc.MaYeuCau);
    try {
      const response = await fetch(
        `${API_BASE_URL}/yeucau-chamcong/${yc.MaYeuCau}/reject`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ghiChuQL: reason }),
        },
      );

      const result = await response.json();
      if (result.success) {
        alert("Đã từ chối yêu cầu bổ sung điểm danh.");
        fetchSupplementRequests(filterStatus);
      } else {
        alert("❌ Lỗi: " + result.message);
      }
    } catch (error) {
      console.error("Lỗi khi từ chối yêu cầu:", error);
      alert("Không thể kết nối đến máy chủ Backend!");
    } finally {
      setProcessingId(null);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span
            style={{
              ...badgeStyle,
              backgroundColor: "#fef3c7",
              color: "#d97706",
            }}
          >
            ⏳ Chờ duyệt
          </span>
        );
      case "approved":
        return (
          <span
            style={{
              ...badgeStyle,
              backgroundColor: "#d1fae5",
              color: "#059669",
            }}
          >
            ✓ Đã duyệt (Đã sinh công)
          </span>
        );
      case "rejected":
        return (
          <span
            style={{
              ...badgeStyle,
              backgroundColor: "#fee2e2",
              color: "#dc2626",
            }}
          >
            ✕ Từ chối
          </span>
        );
      default:
        return <span style={badgeStyle}>{status}</span>;
    }
  };

  return (
    <div style={{ padding: "24px", fontFamily: "Inter, sans-serif" }}>
      {/* THANH ĐIỀU HƯỚNG MODULE CHÍNH */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          borderBottom: "2px solid #e2e8f0",
          marginBottom: "24px",
          paddingBottom: "4px",
        }}
      >
        <button
          onClick={() => setActiveModule("monthly_timesheet")}
          style={{
            padding: "10px 20px",
            border: "none",
            borderBottom: activeModule === "monthly_timesheet" ? "3px solid #4f46e5" : "3px solid transparent",
            backgroundColor: "transparent",
            color: activeModule === "monthly_timesheet" ? "#4f46e5" : "#64748b",
            fontWeight: "700",
            fontSize: "15px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Calendar size={18} />
          Bảng Công Tháng & Chốt Sổ Gửi Admin (QH-55)
        </button>

        <button
          onClick={() => setActiveModule("supplement")}
          style={{
            padding: "10px 20px",
            border: "none",
            borderBottom: activeModule === "supplement" ? "3px solid #2563eb" : "3px solid transparent",
            backgroundColor: "transparent",
            color: activeModule === "supplement" ? "#2563eb" : "#64748b",
            fontWeight: "700",
            fontSize: "15px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckSquare size={18} />
          Duyệt Yêu Cầu Bổ Sung Điểm Danh (QH-49)
        </button>
      </div>

      {activeModule === "monthly_timesheet" ? (
        <MonthlyTimesheetManager />
      ) : (
        <>
          {/* Header & Bộ lọc bổ sung điểm danh */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, color: "#0f172a", fontSize: "22px" }}>
                Duyệt Yêu Cầu Bổ Sung Điểm Danh
              </h2>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                Khi bấm "Đồng ý", hệ thống tự động tạo bản ghi Check-in/Check-out
                hợp lệ vào bảng chấm công cho nhân viên.
              </p>
            </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { key: "pending", label: "Chờ duyệt" },
            { key: "approved", label: "Đã duyệt" },
            { key: "rejected", label: "Đã từ chối" },
            { key: "all", label: "Tất cả" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: filterStatus === tab.key ? "none" : "1px solid #cbd5e1",
                backgroundColor:
                  filterStatus === tab.key ? "#2563eb" : "#ffffff",
                color: filterStatus === tab.key ? "#ffffff" : "#334155",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bảng danh sách */}
      {loading ? (
        <div style={emptyBoxStyle}>Đang tải danh sách yêu cầu...</div>
      ) : requests.length === 0 ? (
        <div style={emptyBoxStyle}>
          Không có yêu cầu bổ sung điểm danh nào ở trạng thái này.
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            backgroundColor: "#fff",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  backgroundColor: "#f8fafc",
                  borderBottom: "2px solid #e2e8f0",
                  textAlign: "left",
                }}
              >
                <th style={thStyle}>Mã NV</th>
                <th style={thStyle}>Nhân viên</th>
                <th style={thStyle}>Ngày thiếu công</th>
                <th style={thStyle}>Ca làm & Giờ bổ sung</th>
                <th style={thStyle}>Lý do của NV</th>
                <th style={thStyle}>Ghi chú Quản lý</th>
                <th style={thStyle}>Trạng thái</th>
                {filterStatus === "pending" && (
                  <th style={{ ...thStyle, textAlign: "center" }}>
                    Thao tác duyệt
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {requests.map((yc) => (
                <tr
                  key={yc.MaYeuCau}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                >
                  <td
                    style={{ ...tdStyle, fontWeight: "600", color: "#475569" }}
                  >
                    {yc.MaNhanVienCode || `NV00${yc.MaNhanVien}`}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: "600", color: "#0f172a" }}>
                      {yc.HoTen}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {yc.TenChucVu || "Nhân viên"}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: "500" }}>{yc.Ngay}</td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: "600", color: "#1e293b" }}>
                      {yc.CaLam}
                    </span>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#0284c7",
                        fontWeight: "500",
                      }}
                    >
                      🕒 {yc.ThoiGian}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: "220px" }}>{yc.LyDo}</td>
                  <td style={tdStyle}>
                    {yc.TrangThai === "pending" ? (
                      <input
                        type="text"
                        placeholder="Ghi chú duyệt (tùy chọn)..."
                        value={managerNotes[yc.MaYeuCau] || ""}
                        onChange={(e) =>
                          handleNoteChange(yc.MaYeuCau, e.target.value)
                        }
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13px",
                          width: "180px",
                        }}
                      />
                    ) : (
                      <span style={{ color: "#64748b", fontSize: "13px" }}>
                        {yc.GhiChuQL || "—"}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>{renderStatusBadge(yc.TrangThai)}</td>
                  {filterStatus === "pending" && (
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <button
                        onClick={() => handleApprove(yc)}
                        disabled={processingId === yc.MaYeuCau}
                        style={{
                          padding: "7px 14px",
                          backgroundColor: "#10b981",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontWeight: "600",
                          cursor: "pointer",
                          marginRight: "8px",
                          fontSize: "13px",
                        }}
                      >
                        {processingId === yc.MaYeuCau
                          ? "Đang xử lý..."
                          : "✓ Đồng ý"}
                      </button>
                      <button
                        onClick={() => handleReject(yc)}
                        disabled={processingId === yc.MaYeuCau}
                        style={{
                          padding: "7px 14px",
                          backgroundColor: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontWeight: "600",
                          cursor: "pointer",
                          fontSize: "13px",
                        }}
                      >
                        ✕ Từ chối
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}
    </div>
  );
};

// Styles nội tuyến giúp chạy ngay không phụ thuộc file CSS ngoài
const thStyle = {
  padding: "14px 16px",
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  textTransform: "uppercase",
};
const tdStyle = {
  padding: "14px 16px",
  fontSize: "14px",
  color: "#334155",
  verticalAlign: "middle",
};
const badgeStyle = {
  padding: "5px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "600",
  display: "inline-block",
};
const emptyBoxStyle = {
  padding: "32px",
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  textAlign: "center",
  color: "#64748b",
  border: "1px dashed #cbd5e1",
  fontSize: "15px",
};

export default TimekeepingManagement;
