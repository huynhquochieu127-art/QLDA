import React, { useState } from "react";
import { CheckSquare } from "lucide-react";

export default function TimekeepingManagement() {
  const [checkInStatus, setCheckInStatus] = useState("chua_checkin");

  const handleCheckIn = () => {
    alert("Check-in thành công vào ca làm việc!");
    setCheckInStatus("da_checkin");
  };

  const handleCheckOut = () => {
    alert("Check-out thành công! Ca làm việc kết thúc.");
    setCheckInStatus("da_checkout");
  };

  return (
    <div className="tab-placeholder">
      <CheckSquare
        size={36}
        style={{ color: "#2563eb", marginBottom: "1rem" }}
      />
      <h2>Chấm Công & Điểm Danh Ca Làm Việc</h2>
      <p>Thực hiện Check-in / Check-out cho ca làm việc hiện tại của bạn.</p>

      <div
        style={{
          marginTop: "2rem",
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
        }}
      >
        {checkInStatus === "chua_checkin" && (
          <button
            onClick={handleCheckIn}
            style={{
              padding: "12px 24px",
              backgroundColor: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Check-in Ca Làm
          </button>
        )}
        {checkInStatus === "da_checkin" && (
          <button
            onClick={handleCheckOut}
            style={{
              padding: "12px 24px",
              backgroundColor: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Check-out Ca Làm
          </button>
        )}
        {checkInStatus === "da_checkout" && (
          <span style={{ color: "#16a34a", fontWeight: "bold" }}>
            ✓ Bạn đã hoàn thành ca làm việc ngày hôm nay!
          </span>
        )}
      </div>
    </div>
  );
}
