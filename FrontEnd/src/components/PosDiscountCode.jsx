import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../utils/staffWork";

// QH-89: Ô nhập "Mã giảm giá" ngay dưới giỏ hàng trên máy POS.
// Mã được kiểm tra bởi backend (hiệu lực QH-88, điểm khách hàng QH-87);
// backend trả về số tiền được giảm để POS cập nhật Tổng tiền cuối cùng.
export default function PosDiscountCode({ subtotal, customer, applied, onApply, onRemove }) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [availableCodes, setAvailableCodes] = useState([]);

  // Tải danh sách mã giảm giá đang hoạt động để gợi ý nhanh
  useEffect(() => {
    let isMounted = true;
    axios
      .get(`${API_BASE}/discounts`, { timeout: 6000 })
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res.data) ? res.data : [];
        const active = list.filter((d) => Number(d.TrangThai) === 1);
        setAvailableCodes(active.slice(0, 4));
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApply = async (e, directCode) => {
    if (e && e.preventDefault) e.preventDefault();
    const maGiamGia = (directCode || code).trim().toUpperCase();
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
      const payload = {
        maGiamGia,
        maCode: maGiamGia,
        code: maGiamGia,
        maKhachHang: customer ? customer.id : null,
        customerId: customer ? customer.id : null,
        customerPoints: customer ? (customer.points ?? customer.DiemTichLuy ?? 0) : 0,
        tongTien: subtotal,
        subtotal: subtotal,
      };

      const res = await axios.post(`${API_BASE}/discounts/validate`, payload, { timeout: 8000 });
      const data = res.data?.data ?? res.data?.discount ?? res.data ?? {};
      const soTienGiam = Number(data.soTienGiam ?? data.giamGia ?? data.discountAmount ?? data.amount ?? 0);
      
      if (res.data?.success === false || soTienGiam <= 0) {
        setError(res.data?.message || "Mã giảm giá không hợp lệ.");
        return;
      }

      onApply({
        code: data.maGiamGia || data.code || maGiamGia,
        amount: Math.min(soTienGiam, subtotal),
        discountAmount: Math.min(soTienGiam, subtotal),
        pointsUsed: Number(data.diemDaTru ?? data.diemSuDung ?? data.minPoints ?? 0),
        minPoints: Number(data.minPoints ?? data.diemDaTru ?? 0),
        description: data.moTa || data.tenKhuyenMai || data.name || "",
        name: data.tenKhuyenMai || data.name || data.moTa || "",
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
    const dispAmount = applied.discountAmount ?? applied.amount ?? 0;
    return (
      <div className="pos-discount">
        <div className="pos-discount-applied">
          <div className="pos-discount-applied-info">
            <span className="pos-discount-tag">🏷️ {applied.code}</span>
            <span className="pos-discount-note">
              {applied.description || applied.name || "Đã áp dụng mã giảm giá"}
              {(applied.pointsUsed > 0 || applied.minPoints > 0) &&
                ` · Yêu cầu ${(applied.pointsUsed || applied.minPoints).toLocaleString("vi-VN")} điểm`}
            </span>
          </div>
          <span className="pos-discount-amount">- {dispAmount.toLocaleString("vi-VN")} đ</span>
          <button type="button" className="pos-discount-remove" onClick={onRemove} title="Gỡ mã giảm giá">
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="pos-discount" onSubmit={(e) => handleApply(e, code)}>
      <label className="section-label" htmlFor="pos-discount-input">
        Mã giảm giá
      </label>
      <div className="pos-discount-row">
        <input
          id="pos-discount-input"
          type="text"
          className={`pos-discount-input ${error ? "invalid" : ""}`}
          placeholder="Nhập mã (vd: GIAM10, GIAMGIA20K)"
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

      {/* Gợi ý các mã khả dụng */}
      {availableCodes.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
          <span style={{ fontSize: "11px", color: "#64748b", alignSelf: "center" }}>Gợi ý:</span>
          {availableCodes.map((d) => (
            <button
              key={d.MaCode}
              type="button"
              onClick={() => {
                setCode(d.MaCode);
                handleApply(null, d.MaCode);
              }}
              style={{
                background: "#f1f5f9",
                border: "1px dashed #cbd5e1",
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#475569",
                cursor: "pointer",
              }}
              title={d.TenMG || d.MaCode}
            >
              {d.MaCode}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <div className="pos-discount-error">⚠️ {error}</div>
      ) : (
        !customer && (
          <div className="pos-discount-hint">Mã đổi điểm cần chọn khách hàng trước khi áp dụng.</div>
        )
      )}
    </form>
  );
}
