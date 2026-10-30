import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../utils/staffWork";

// QH-89: Ô nhập "Mã giảm giá" ngay dưới giỏ hàng trên máy POS.
// Mã được kiểm tra bởi backend (hiệu lực QH-88, điểm khách hàng QH-87);
// backend trả về số tiền được giảm để POS cập nhật Tổng tiền cuối cùng.
export default function PosDiscountCode({ subtotal, customer, applied, onApply, onRemove }) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const handleApply = async (e) => {
    e.preventDefault();
    const maGiamGia = code.trim().toUpperCase();
    if (!maGiamGia) {
      setError("Vui lòng nhập mã giảm giá.");
      return;
    }
    if (subtotal <= 0) {
      setError("Giỏ hàng đang trống, chưa thể áp mã.");
      return;
    }

    setChecking(true);
    setError("");
    try {
      const res = await axios.post(
        `${API_BASE}/khuyen-mai/ap-dung`,
        { maGiamGia, maKhachHang: customer ? customer.id : null, tongTien: subtotal },
        { timeout: 5000 }
      );
      const data = res.data?.data ?? res.data ?? {};
      const soTienGiam = Number(data.soTienGiam ?? data.giamGia ?? 0);
      if (res.data?.success === false || soTienGiam <= 0) {
        setError(res.data?.message || "Mã giảm giá không hợp lệ.");
        return;
      }
      onApply({
        code: maGiamGia,
        amount: Math.min(soTienGiam, subtotal),
        pointsUsed: Number(data.diemDaTru ?? data.diemSuDung ?? 0),
        description: data.moTa || data.tenKhuyenMai || "",
        subtotalAtApply: subtotal,
      });
      setCode("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.response
            ? "Mã giảm giá không hợp lệ hoặc đã hết hạn."
            : "Không kết nối được máy chủ để kiểm tra mã. Vui lòng thử lại.")
      );
    } finally {
      setChecking(false);
    }
  };

  // Đã áp mã thành công: hiển thị thẻ mã + nút gỡ
  if (applied) {
    return (
      <div className="pos-discount">
        <div className="pos-discount-applied">
          <div className="pos-discount-applied-info">
            <span className="pos-discount-tag">🏷️ {applied.code}</span>
            <span className="pos-discount-note">
              {applied.description || "Đã áp dụng mã giảm giá"}
              {applied.pointsUsed > 0 && ` · Trừ ${applied.pointsUsed.toLocaleString("vi-VN")} điểm`}
            </span>
          </div>
          <span className="pos-discount-amount">- {applied.amount.toLocaleString("vi-VN")} đ</span>
          <button type="button" className="pos-discount-remove" onClick={onRemove} title="Gỡ mã giảm giá">
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="pos-discount" onSubmit={handleApply}>
      <label className="section-label" htmlFor="pos-discount-input">
        Mã giảm giá
      </label>
      <div className="pos-discount-row">
        <input
          id="pos-discount-input"
          type="text"
          className={`pos-discount-input ${error ? "invalid" : ""}`}
          placeholder="Nhập mã (vd: GIAM10)"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().replace(/\s/g, ""));
            if (error) setError("");
          }}
          maxLength={30}
          disabled={checking}
        />
        <button type="submit" className="pos-discount-btn" disabled={checking || !code.trim()}>
          {checking ? "Đang kiểm tra..." : "Áp dụng"}
        </button>
      </div>
      {error ? (
        <div className="pos-discount-error">{error}</div>
      ) : (
        !customer && (
          <div className="pos-discount-hint">Mã đổi điểm cần chọn khách hàng trước khi áp dụng.</div>
        )
      )}
    </form>
  );
}
