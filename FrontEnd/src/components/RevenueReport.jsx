import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { BarChart2, Table2, RotateCcw, Loader2 } from "lucide-react";
import "../../css/staff.css";
import { API_BASE, DAY_LABELS, toDateKey, getMonday, addDays, formatMoney } from "../utils/staffWork";

const BAR_COLOR = "#4f46e5";
const INK_MUTED = "#64748b";

// Các tên cột ngày tạo đơn có thể có trong bảng donhang
const DATE_FIELDS = ["NgayTao", "NgayDat", "NgayLap", "ThoiGianTao", "ThoiGian", "CreatedAt", "createdAt"];

const shortMoney = (v) => {
  if (v >= 1000000) return `${(v / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return `${v}`;
};

// Doanh thu mẫu theo ngày (dùng khi chưa lấy được đơn hàng có ngày tạo từ máy chủ)
const sampleRevenue = (date) => {
  const day = date.getDate();
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  return (weekend ? 4200000 : 2600000) + ((day * 37) % 11) * 180000;
};

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "8px 12px",
        boxShadow: "0 4px 12px rgba(15,23,42,0.1)",
        fontSize: "0.85rem",
      }}
    >
      <div style={{ color: INK_MUTED, marginBottom: 2 }}>{p.fullLabel}</div>
      <div style={{ fontWeight: 700, color: "#0f172a" }}>{formatMoney(p.revenue)}</div>
      {p.orders !== null && <div style={{ color: INK_MUTED }}>{p.orders} đơn hàng</div>}
    </div>
  );
};

// QH-99: Báo cáo doanh thu - biểu đồ cột theo Tuần này / Tháng này
export default function RevenueReport() {
  const [range, setRange] = useState("week"); // 'week' | 'month'
  const [orders, setOrders] = useState([]);
  const [dateField, setDateField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/orders`);
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setOrders(list);
      setDateField(DATE_FIELDS.find((f) => list.some((o) => o[f])) || null);
    } catch (err) {
      console.error("Lỗi tải đơn hàng:", err);
      setOrders([]);
      setDateField(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const useSample = !dateField;

  // Các ngày trên trục X theo bộ lọc
  const days = useMemo(() => {
    const today = new Date();
    if (range === "week") {
      const monday = getMonday(today);
      return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    }
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1));
  }, [range]);

  const chartData = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const byDay = {};
    if (!useSample) {
      orders.forEach((o) => {
        if (String(o.TrangThai || "").toLowerCase().includes("hủy")) return;
        const key = toDateKey(o[dateField]);
        if (!byDay[key]) byDay[key] = { revenue: 0, orders: 0 };
        byDay[key].revenue += Number(o.ThanhTien ?? o.TongTien ?? 0);
        byDay[key].orders += 1;
      });
    }
    return days.map((d) => {
      const key = toDateKey(d);
      const isFuture = key > todayKey;
      const revenue = isFuture ? 0 : useSample ? sampleRevenue(d) : byDay[key]?.revenue || 0;
      return {
        key,
        label: range === "week" ? DAY_LABELS[d.getDay()].replace("Thứ ", "T").replace("Chủ Nhật", "CN") : `${d.getDate()}`,
        fullLabel: `${DAY_LABELS[d.getDay()]}, ${d.toLocaleDateString("vi-VN")}`,
        revenue,
        orders: useSample ? null : byDay[key]?.orders || 0,
        isFuture,
      };
    });
  }, [days, orders, dateField, useSample, range]);

  const total = chartData.reduce((s, d) => s + d.revenue, 0);
  const passedDays = chartData.filter((d) => !d.isFuture).length || 1;
  const best = chartData.reduce((a, b) => (b.revenue > a.revenue ? b : a), chartData[0]);
  const totalOrders = useSample ? null : chartData.reduce((s, d) => s + (d.orders || 0), 0);

  return (
    <div className="sw-page">
      <div className="sw-page-header">
        <div>
          <h2 className="sw-page-title">
            <BarChart2 size={24} color="#6366f1" /> Báo cáo doanh thu
            {useSample && !loading && <span className="sw-demo-tag">Dữ liệu mẫu</span>}
          </h2>
          <p className="sw-page-sub">
            Doanh thu theo từng ngày {range === "week" ? "trong tuần này" : "trong tháng này"} (không tính đơn đã hủy).
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="sw-segment">
            <button className={range === "week" ? "active" : ""} onClick={() => setRange("week")}>
              Tuần này
            </button>
            <button className={range === "month" ? "active" : ""} onClick={() => setRange("month")}>
              Tháng này
            </button>
          </div>
          <button className="sw-btn sw-btn-light" onClick={() => setShowTable(!showTable)}>
            <Table2 size={15} /> {showTable ? "Ẩn bảng" : "Xem bảng"}
          </button>
          <button className="sw-btn sw-btn-light" onClick={fetchOrders} title="Tải lại">
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div className="sw-stats">
        <div className="sw-stat">
          <div className="sw-stat-label">Tổng doanh thu</div>
          <div className="sw-stat-value">{formatMoney(total)}</div>
        </div>
        <div className="sw-stat">
          <div className="sw-stat-label">Trung bình / ngày</div>
          <div className="sw-stat-value">{formatMoney(total / passedDays)}</div>
        </div>
        <div className="sw-stat">
          <div className="sw-stat-label">Ngày cao nhất</div>
          <div className="sw-stat-value" style={{ fontSize: "1.1rem" }}>
            {best && best.revenue > 0 ? `${best.key.slice(8)}/${best.key.slice(5, 7)} · ${shortMoney(best.revenue)}` : "-"}
          </div>
        </div>
        <div className="sw-stat">
          <div className="sw-stat-label">Số đơn hàng</div>
          <div className="sw-stat-value">{totalOrders === null ? "-" : totalOrders}</div>
        </div>
      </div>

      <div className="sw-card">
        <h3 className="sw-card-title">Doanh thu theo ngày (VNĐ)</h3>
        {loading ? (
          <div className="sw-empty">
            <Loader2 size={22} className="spin-animation" />
          </div>
        ) : (
          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tick={{ fill: INK_MUTED, fontSize: 12 }}
                  interval={0}
                />
                <YAxis
                  tickFormatter={shortMoney}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: INK_MUTED, fontSize: 12 }}
                  width={52}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(79, 70, 229, 0.06)" }} />
                <Bar dataKey="revenue" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {/* Chỉ ghi nhãn giá trị cho ngày cao nhất để biểu đồ gọn */}
                  <LabelList
                    dataKey="revenue"
                    position="top"
                    content={({ x, y, width, value, index }) =>
                      best && chartData[index]?.key === best.key && value > 0 ? (
                        <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#334155" fontSize={12} fontWeight={600}>
                          {shortMoney(value)}
                        </text>
                      ) : null
                    }
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {showTable && (
        <div className="sw-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="sw-table-wrap">
            <table className="sw-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th style={{ textAlign: "right" }}>Số đơn</th>
                  <th style={{ textAlign: "right" }}>Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((d) => (
                  <tr key={d.key}>
                    <td>{d.fullLabel}</td>
                    <td style={{ textAlign: "right" }}>{d.orders === null ? "-" : d.orders}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{d.isFuture ? "-" : formatMoney(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
