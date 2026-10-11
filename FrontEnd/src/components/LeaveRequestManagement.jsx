import React, { useState } from "react";
import { FileSpreadsheet } from "lucide-react";

export default function LeaveRequestManagement() {
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveDate, setLeaveDate] = useState("");

  const handleSubmitLeaveRequest = (e) => {
    e.preventDefault();
    if (!leaveDate || !leaveReason) {
      alert("Vui lòng điền đầy đủ ngày xin nghỉ và lý do!");
      return;
    }
    alert("Đã gửi đơn xin nghỉ lên Quản lý/Admin thành công!");
    setLeaveReason("");
    setLeaveDate("");
  };

  return (
    <div
      className="tab-placeholder"
      style={{
        textAlign: "left",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "1rem",
        }}
      >
        <FileSpreadsheet size={28} style={{ color: "#d97706" }} />
        <h2 style={{ margin: 0 }}>Tạo Đơn Xin Nghỉ Phép</h2>
      </div>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
        Gửi đơn xin nghỉ phép lên Quản lý/Admin để duyệt ca làm thay thế
        (`don_xin_nghi`).
      </p>

      <form onSubmit={handleSubmitLeaveRequest}>
        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "600",
            }}
          >
            Ngày xin nghỉ (*)
          </label>
          <input
            type="date"
            value={leaveDate}
            onChange={(e) => setLeaveDate(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
            }}
            required
          />
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "600",
            }}
          >
            Lý do xin nghỉ (*)
          </label>
          <textarea
            rows="4"
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
            placeholder="Nhập lý do chi tiết..."
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
            }}
            required
          ></textarea>
        </div>
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Gửi Đơn Xin Nghỉ
        </button>
      </form>
    </div>
  );
}
