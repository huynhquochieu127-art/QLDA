import React from "react";
import { Bot, AlertCircle } from "lucide-react";

export default function AiInsightsManagement() {
  return (
    <div className="tab-placeholder">
      <Bot size={36} style={{ color: "#8b5cf6", marginBottom: "1rem" }} />
      <h2>Phân Tích & Gợi Ý AI / Machine Learning</h2>
      <p>
        Mô hình AI gợi ý món bán chạy, dự đoán doanh thu và phân tích xu hướng
        mua hàng của khách hàng.
      </p>

      <div
        style={{
          marginTop: "2rem",
          padding: "1.5rem",
          backgroundColor: "#f3f4f6",
          borderRadius: "8px",
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#8b5cf6",
            fontWeight: "bold",
            marginBottom: "0.5rem",
          }}
        >
          <AlertCircle size={18} /> Gợi ý tối ưu thực đơn:
        </div>
        <ul
          style={{
            paddingLeft: "1.2rem",
            margin: 0,
            color: "#374151",
            lineHeight: "1.8",
          }}
        >
          <li>
            <strong>Cà Phê Muối:</strong> Tăng 25% doanh số vào khung giờ sáng
            (07:00 - 09:00).
          </li>
          <li>
            <strong>Combo đề xuất:</strong> Trà Đào Cam Sả + Bánh Ngọt giảm 10%
            để nâng giá trị trung bình đơn hàng.
          </li>
        </ul>
      </div>
    </div>
  );
}
