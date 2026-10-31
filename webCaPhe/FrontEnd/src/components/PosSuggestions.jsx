import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../utils/staffWork";

// Món hay gọi kèm theo từng nhóm (dùng tạm khi API AI chưa sẵn sàng)
const PAIRING_RULES = {
  coffee: ["cake", "snack"],
  tea: ["snack", "cake"],
  cake: ["coffee", "tea"],
  snack: ["tea", "coffee"],
};

const MAX_SUGGESTIONS = 3;

// Gợi ý dự phòng theo luật ghép nhóm món, bỏ qua các món đã có trong giỏ
const fallbackSuggestions = (cart, products) => {
  const inCart = new Set(cart.map((i) => i.id));
  const anchor = cart[0];
  const targetCategories = PAIRING_RULES[anchor.category] || [];
  return targetCategories
    .flatMap((cat) => products.filter((p) => p.category === cat && !inCart.has(p.id)))
    .slice(0, MAX_SUGGESTIONS)
    .map((p) => ({ product: p, reason: `Hay được gọi kèm ${anchor.name}` }));
};

// Ghép kết quả từ API AI với danh sách món trên POS (theo id hoặc tên món)
const mapApiSuggestions = (data, cart, products) => {
  const inCart = new Set(cart.map((i) => i.id));
  return (Array.isArray(data) ? data : [])
    .map((s) => {
      const product = products.find(
        (p) =>
          String(p.id) === String(s.maSanPham ?? s.id) ||
          p.name.toLowerCase() === String(s.tenSanPham ?? s.name ?? "").toLowerCase()
      );
      return product && !inCart.has(product.id)
        ? { product, reason: s.lyDo || s.reason || "AI gợi ý dựa trên lịch sử đơn hàng" }
        : null;
    })
    .filter(Boolean)
    .slice(0, MAX_SUGGESTIONS);
};

// QH-95: Khu vực "Món gọi kèm gợi ý" trên máy POS
export default function PosSuggestions({ cart, products, onAdd }) {
  const [suggestions, setSuggestions] = useState([]);
  const [source, setSource] = useState("ai"); // 'ai' | 'fallback'
  const [loading, setLoading] = useState(false);

  // Gọi lại khi danh sách món trong giỏ thay đổi (bắt đầu từ món đầu tiên)
  const cartKey = cart.map((i) => i.id).join(",");

  useEffect(() => {
    if (cart.length === 0) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    axios
      .post(
        `${API_BASE}/ai/goi-y-mon`,
        { maSanPham: cart.map((i) => i.id), tenMon: cart.map((i) => i.name) },
        { timeout: 3000 }
      )
      .then((res) => {
        const mapped = mapApiSuggestions(res.data?.data ?? res.data, cart, products);
        if (cancelled) return;
        if (mapped.length > 0) {
          setSuggestions(mapped);
          setSource("ai");
        } else {
          setSuggestions(fallbackSuggestions(cart, products));
          setSource("fallback");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestions(fallbackSuggestions(cart, products));
        setSource("fallback");
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [cartKey]);

  if (cart.length === 0) return null;

  return (
    <div className="pos-suggest">
      <div className="pos-suggest-head">
        <span className="pos-suggest-title">✨ Món gọi kèm gợi ý</span>
        <span className={`pos-suggest-source ${source}`}>
          {loading ? "Đang phân tích..." : source === "ai" ? "AI" : "Gợi ý mặc định"}
        </span>
      </div>

      {!loading && suggestions.length === 0 ? (
        <div className="pos-suggest-empty">Chưa có món phù hợp để gợi ý.</div>
      ) : (
        <div className="pos-suggest-list">
          {suggestions.map(({ product, reason }) => (
            <button
              key={product.id}
              type="button"
              className="pos-suggest-item"
              onClick={() => onAdd(product)}
              title={`Bấm để thêm ${product.name} vào đơn`}
            >
              <div className="pos-suggest-info">
                <span className="pos-suggest-name">{product.name}</span>
                <span className="pos-suggest-reason">{reason}</span>
              </div>
              <span className="pos-suggest-add">
                {product.price.toLocaleString("vi-VN")} đ <strong>+</strong>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
