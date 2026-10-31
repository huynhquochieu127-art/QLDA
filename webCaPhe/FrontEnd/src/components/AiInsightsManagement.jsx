import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Bot, Lightbulb, RotateCcw, Loader2, Info, TrendingUp, Clock, CalendarDays, CreditCard } from "lucide-react";
import "../../css/staff.css";
import { API_BASE, DAY_LABELS, formatMoney } from "../utils/staffWork";

const BAR = "#4f46e5";
const BAR_PEAK = "#3730a3";
const INK_MUTED = "#64748b";

const RANGES = [
  { id: 7, label: "7 ngày" },
  { id: 30, label: "30 ngày" },
  { id: 90, label: "90 ngày" },
];

// Đơn được tính doanh thu: đã thanh toán / hoàn thành (giống revenueRoutes.js), bỏ đơn hủy
const isPaid = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("hủy") || s.includes("huy") || s.includes("cancel")) return false;
  return s.includes("thanh to") || s.includes("paid") || s.includes("completed") || s.includes("thành công");
};

const shortMoney = (v) => {
  if (v >= 1000000) return `${(v / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return `${Math.round(v)}`;
};

const paymentLabel = (raw) => {
  const s = String(raw || "").toUpperCase();
  if (s.includes("CHUYEN") || s.includes("TRANSFER") || s.includes("QR") || s.includes("BANK")) return "Chuyển khoản / QR";
  if (s.includes("THE") || s.includes("CARD")) return "Thẻ";
  if (s.includes("TIEN") || s.includes("CASH") || s === "") return "Tiền mặt";
  return raw;
};

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", boxShadow: "0 4px 12px rgba(15,23,42,0.1)" }}>
      <div style={{ color: INK_MUTED }}>{p.full}</div>
      <div style={{ fontWeight: 700, color: "#0f172a" }}>{formatMoney(p.revenue)}</div>
      <div style={{ color: INK_MUTED }}>{p.orders} đơn</div>
    </div>
  );
};

function MiniBarChart({ data, height = 230 }) {
  const peak = data.reduce((m, d) => (d.revenue > m ? d.revenue : m), 0);
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#eef2f7" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#cbd5e1" }} tick={{ fill: INK_MUTED, fontSize: 11 }} interval={0} />
          <YAxis tickFormatter={shortMoney} tickLine={false} axisLine={false} tick={{ fill: INK_MUTED, fontSize: 11 }} width={46} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(79, 70, 229, 0.06)" }} />
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={24}>
            {data.map((d) => (
              <Cell key={d.label} fill={peak > 0 && d.revenue === peak ? BAR_PEAK : BAR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Trang "Gợi ý AI / ML": phân tích thống kê từ lịch sử đơn hàng thật.
// Khi mô hình AI (QH-93/QH-94) có API, các gợi ý món sẽ hiển thị trên POS (QH-95).
export default function AiInsightsManagement() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rangeDays, setRangeDays] = useState(30);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [ordRes, prodRes] = await Promise.all([
        axios.get(`${API_BASE}/orders`, { params: { limit: 2000 } }),
        axios.get(`${API_BASE}/products`).catch(() => ({ data: [] })),
      ]);
      setOrders(Array.isArray(ordRes.data) ? ordRes.data : ordRes.data?.data || []);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được dữ liệu đơn hàng từ máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (rangeDays - 1));

    const paid = orders
      .map((o) => ({ ...o, _date: o.NgayDat ? new Date(o.NgayDat) : null, _amount: Number(o.ThanhTien ?? o.TongTien ?? 0) }))
      .filter((o) => o._date && !isNaN(o._date) && o._date >= since && isPaid(o.TrangThai));

    const totalRevenue = paid.reduce((s, o) => s + o._amount, 0);
    const avgOrder = paid.length ? totalRevenue / paid.length : 0;

    // Theo giờ trong ngày (6h - 23h)
    const byHour = Array.from({ length: 18 }, (_, i) => ({ hour: i + 6, revenue: 0, orders: 0 }));
    paid.forEach((o) => {
      const h = o._date.getHours();
      const slot = byHour.find((x) => x.hour === h);
      if (slot) {
        slot.revenue += o._amount;
        slot.orders += 1;
      }
    });
    const hourData = byHour.map((x) => ({ ...x, label: `${x.hour}h`, full: `${x.hour}:00 - ${x.hour}:59` }));

    // Theo thứ trong tuần (Thứ Hai -> Chủ Nhật)
    const order = [1, 2, 3, 4, 5, 6, 0];
    const byDay = order.map((d) => ({ day: d, revenue: 0, orders: 0 }));
    paid.forEach((o) => {
      const slot = byDay.find((x) => x.day === o._date.getDay());
      slot.revenue += o._amount;
      slot.orders += 1;
    });
    const dayData = byDay.map((x) => ({
      ...x,
      label: x.day === 0 ? "CN" : `T${x.day + 1}`,
      full: DAY_LABELS[x.day],
    }));

    // Phương thức thanh toán
    const payMap = {};
    paid.forEach((o) => {
      const k = paymentLabel(o.PhuongThucThanhToan);
      payMap[k] = (payMap[k] || 0) + 1;
    });
    const payments = Object.entries(payMap).sort((a, b) => b[1] - a[1]);

    // Khung giờ cao điểm 2 tiếng liên tiếp
    let peakWindow = null;
    for (let i = 0; i < hourData.length - 1; i++) {
      const sum = hourData[i].orders + hourData[i + 1].orders;
      if (!peakWindow || sum > peakWindow.orders) peakWindow = { from: hourData[i].hour, to: hourData[i].hour + 2, orders: sum };
    }
    const openHours = hourData.filter((h) => h.hour >= 8 && h.hour <= 21);
    const quietest = openHours.reduce((m, h) => (!m || h.orders < m.orders ? h : m), null);
    const bestDay = dayData.reduce((m, d) => (!m || d.revenue > m.revenue ? d : m), null);
    const worstDay = dayData.reduce((m, d) => (!m || d.revenue < m.revenue ? d : m), null);
    const discounted = paid.filter((o) => Number(o.GiamGia || 0) > 0).length;

    return { paid, totalRevenue, avgOrder, hourData, dayData, payments, peakWindow, quietest, bestDay, worstDay, discounted };
  }, [orders, rangeDays]);

  // Gợi ý hành động sinh tự động từ số liệu
  const insights = useMemo(() => {
    const s = stats;
    if (s.paid.length < 5) return [];
    const list = [];
    if (s.peakWindow?.orders > 0) {
      const pct = Math.round((s.peakWindow.orders / s.paid.length) * 100);
      list.push({
        icon: <Clock size={16} />,
        title: `Giờ cao điểm ${s.peakWindow.from}h – ${s.peakWindow.to}h`,
        text: `Chiếm ${pct}% số đơn. Nên xếp thêm nhân viên pha chế/thu ngân và chuẩn bị nguyên liệu trước khung giờ này.`,
      });
    }
    if (s.quietest && s.peakWindow && s.quietest.orders < s.peakWindow.orders / 4) {
      list.push({
        icon: <Lightbulb size={16} />,
        title: `Khung ${s.quietest.hour}h vắng khách`,
        text: `Chỉ ${s.quietest.orders} đơn trong ${rangeDays} ngày. Có thể chạy "giờ vàng" giảm giá hoặc combo để kéo khách.`,
      });
    }
    if (s.bestDay && s.worstDay && s.bestDay.revenue > 0 && s.bestDay.day !== s.worstDay.day) {
      list.push({
        icon: <CalendarDays size={16} />,
        title: `${s.bestDay.full} bán mạnh nhất, ${s.worstDay.full} yếu nhất`,
        text: `Doanh thu ${s.bestDay.full} gấp ${(s.bestDay.revenue / Math.max(1, s.worstDay.revenue)).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} lần ${s.worstDay.full}. Nên dồn khuyến mãi vào ${s.worstDay.full} và tăng nhân sự ${s.bestDay.full}.`,
      });
    }
    if (s.avgOrder > 0) {
      list.push({
        icon: <TrendingUp size={16} />,
        title: `Giá trị trung bình ${formatMoney(s.avgOrder)}/đơn`,
        text: `Gợi ý combo đồ uống + bánh khoảng ${formatMoney(Math.round((s.avgOrder * 1.25) / 1000) * 1000)} để nâng giá trị đơn thêm ~25%.`,
      });
    }
    if (s.payments.length > 0) {
      const [topPay, count] = s.payments[0];
      list.push({
        icon: <CreditCard size={16} />,
        title: `${Math.round((count / s.paid.length) * 100)}% khách trả bằng ${topPay}`,
        text: `${s.discounted} đơn (${Math.round((s.discounted / s.paid.length) * 100)}%) có dùng mã giảm giá.`,
      });
    }
    return list;
  }, [stats, rangeDays]);

  const activeProducts = products.filter((p) => Number(p.is_active ?? 1) === 1).length;

  return (
    <div className="sw-page">
      <div className="sw-page-header">
        <div>
          <h2 className="sw-page-title">
            <Bot size={24} color="#8b5cf6" /> Phân tích & Gợi ý AI / ML
          </h2>
          <p className="sw-page-sub">Phân tích xu hướng bán hàng từ lịch sử đơn hàng thực tế của quán.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="sw-segment">
            {RANGES.map((r) => (
              <button key={r.id} className={rangeDays === r.id ? "active" : ""} onClick={() => setRangeDays(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
          <button className="sw-btn sw-btn-light" onClick={fetchData} title="Tải lại">
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div className="sw-alert sw-alert-info">
        <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Các số liệu và gợi ý dưới đây là <strong>phân tích thống kê</strong> trên dữ liệu đơn hàng. Mô hình AI gợi ý món
          (QH-93, QH-94) chưa có API nên POS đang dùng gợi ý mặc định theo nhóm món.
        </span>
      </div>

      {error && <div className="sw-alert sw-alert-error">{error}</div>}

      {loading ? (
        <div className="sw-empty">
          <Loader2 size={24} className="spin-animation" />
        </div>
      ) : (
        <>
          <div className="sw-stats">
            <div className="sw-stat">
              <div className="sw-stat-label">Đơn đã thanh toán ({rangeDays} ngày)</div>
              <div className="sw-stat-value">{stats.paid.length.toLocaleString("vi-VN")}</div>
            </div>
            <div className="sw-stat">
              <div className="sw-stat-label">Doanh thu</div>
              <div className="sw-stat-value">{formatMoney(stats.totalRevenue)}</div>
            </div>
            <div className="sw-stat">
              <div className="sw-stat-label">Giá trị TB / đơn</div>
              <div className="sw-stat-value">{formatMoney(stats.avgOrder)}</div>
            </div>
            <div className="sw-stat">
              <div className="sw-stat-label">Món đang bán</div>
              <div className="sw-stat-value">{activeProducts}</div>
            </div>
          </div>

          <div className="sw-card">
            <h3 className="sw-card-title">
              <Lightbulb size={18} color="#8b5cf6" /> Gợi ý tối ưu vận hành
            </h3>
            {insights.length === 0 ? (
              <div className="sw-empty">Cần ít nhất 5 đơn đã thanh toán trong {rangeDays} ngày để đưa ra gợi ý.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {insights.map((it) => (
                  <div
                    key={it.title}
                    style={{ display: "flex", gap: 10, padding: "10px 12px", background: "#faf5ff", border: "1px solid #ede9fe", borderRadius: 10 }}
                  >
                    <div style={{ color: "#7c3aed", marginTop: 2 }}>{it.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#1e293b" }}>{it.title}</div>
                      <div style={{ fontSize: "0.86rem", color: "#475569", marginTop: 2 }}>{it.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sw-grid-2">
            <div className="sw-card">
              <h3 className="sw-card-title">Doanh thu theo giờ trong ngày</h3>
              <MiniBarChart data={stats.hourData} />
            </div>
            <div className="sw-card">
              <h3 className="sw-card-title">Doanh thu theo thứ trong tuần</h3>
              <MiniBarChart data={stats.dayData} />
            </div>
          </div>

          <div className="sw-card">
            <h3 className="sw-card-title">Phương thức thanh toán</h3>
            {stats.payments.length === 0 ? (
              <div className="sw-empty">Chưa có dữ liệu.</div>
            ) : (
              stats.payments.map(([name, count]) => {
                const pct = Math.round((count / stats.paid.length) * 100);
                return (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
                    <span style={{ width: 150, fontSize: "0.88rem", color: "#334155" }}>{name}</span>
                    <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 14 }}>
                      <div style={{ width: `${pct}%`, background: BAR, height: 14, borderRadius: 4 }} />
                    </div>
                    <span style={{ width: 90, textAlign: "right", fontSize: "0.85rem", color: "#334155" }}>
                      {count} đơn · {pct}%
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
