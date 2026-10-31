import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell,
} from "recharts";
import {
  BarChart2, Table2, RotateCcw, Loader2, Download, Calendar, TrendingUp,
  ShoppingBag, BadgeDollarSign, Scissors, FileText,
} from "lucide-react";
import RevenuePdfReportModal from "./RevenuePdfReportModal";
import "../../css/staff.css";
import { API_BASE } from "../config/api";
const INK     = "#0f172a";
const INK_MUT = "#64748b";
const INDIGO  = "#4f46e5";
const GREEN   = "#10b981";
const AMBER   = "#f59e0b";
const ROSE    = "#f43f5e";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtVND = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v || 0);

const shortMoney = (v) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}tỷ`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}tr`;
  if (v >= 1_000)         return `${Math.round(v / 1_000)}k`;
  return `${v}`;
};

const toISODate = (d) => d.toISOString().split("T")[0];

const getRange = (mode) => {
  const now = new Date();
  if (mode === "week") {
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return { from: toISODate(mon), to: toISODate(now) };
  }
  if (mode === "month") {
    return {
      from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
      to: toISODate(now),
    };
  }
  if (mode === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const qStart = new Date(now.getFullYear(), q * 3, 1);
    return { from: toISODate(qStart), to: toISODate(now) };
  }
  return { from: "", to: "" }; // custom
};

// ── Tooltip ──────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 24px rgba(15,23,42,0.12)", minWidth: 180 }}>
      <div style={{ color: INK_MUT, fontSize: 12, marginBottom: 6, fontWeight: 500 }}>{p.NgayLabel}</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
        <span style={{ color: INK_MUT, fontSize: 12 }}>Doanh thu</span>
        <span style={{ fontWeight: 700, color: INDIGO }}>{fmtVND(p.TongDoanhThu)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
        <span style={{ color: INK_MUT, fontSize: 12 }}>Số đơn</span>
        <span style={{ fontWeight: 600, color: INK }}>{p.TongDon} đơn</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <span style={{ color: INK_MUT, fontSize: 12 }}>Chiết khấu</span>
        <span style={{ fontWeight: 500, color: ROSE }}>{fmtVND(p.TongChietKhau)}</span>
      </div>
    </div>
  );
};

// ── Component chính ─────────────────────────────────────────────────────────
export default function RevenueReport() {
  const [rangeMode, setRangeMode] = useState("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [data,       setData]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showTable,  setShowTable]  = useState(false);
  const [error,      setError]      = useState("");

  // Tính from/to theo mode
  const { from, to } = useMemo(() => {
    if (rangeMode === "custom") return { from: customFrom, to: customTo };
    return getRange(rangeMode);
  }, [rangeMode, customFrom, customTo]);

  // Fetch JSON
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (from) params.from = from;
      if (to)   params.to   = to;
      const res = await axios.get(`${API_BASE}/reports/revenue`, { params });
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      setData(rows.map(r => ({
        ...r,
        NgayLabel: r.Ngay ? new Date(r.Ngay).toLocaleDateString("vi-VN") : "",
        TongDon:       Number(r.TongDon       || 0),
        TongDoanhThu:  Number(r.TongDoanhThu  || 0),
        TongChietKhau: Number(r.TongChietKhau || 0),
        ThucThu:       Number(r.ThucThu       || 0),
      })));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Xuất Excel ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to)   params.set("to",   to);
      const url = `${API_BASE}/reports/revenue/export?${params.toString()}`;

      const res = await axios.get(url, { responseType: "blob" });

      // Lấy tên file từ header hoặc tạo mặc định
      let fileName = "BaoCaoDoanhThu.xlsx";
      const cd = res.headers["content-disposition"];
      if (cd) {
        const match = cd.match(/filename[^;=\n]*=([^;\n]*)/i);
        if (match) fileName = decodeURIComponent(match[1].replace(/['"]/g, "").trim());
      }

      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert("Lỗi xuất Excel: " + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  // KPIs ────────────────────────────────────────────────────────────────────
  const totalDon  = data.reduce((s, r) => s + r.TongDon, 0);
  const totalDT   = data.reduce((s, r) => s + r.TongDoanhThu, 0);
  const totalCK   = data.reduce((s, r) => s + r.TongChietKhau, 0);
  const avgPerDay = data.length ? Math.round(totalDT / data.length) : 0;
  const bestDay   = data.reduce((best, r) => r.TongDoanhThu > (best?.TongDoanhThu || 0) ? r : best, null);

  const RANGE_BTNS = [
    { id: "week",    label: "Tuần này" },
    { id: "month",   label: "Tháng này" },
    { id: "quarter", label: "Quý này" },
    { id: "custom",  label: "Tùy chọn" },
  ];

  return (
    <div className="sw-page">

      {/* ── Header ── */}
      <div className="sw-page-header">
        <div>
          <h2 className="sw-page-title">
            <BarChart2 size={24} color={INDIGO} /> Báo cáo doanh thu
          </h2>
          <p className="sw-page-sub">
            Thống kê đơn hàng đã thanh toán · {from && to ? `${from} → ${to}` : "Tất cả"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Bộ lọc thời gian */}
          <div className="sw-segment">
            {RANGE_BTNS.map(b => (
              <button
                key={b.id}
                className={rangeMode === b.id ? "active" : ""}
                onClick={() => setRangeMode(b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Nút xem bảng */}
          <button className="sw-btn sw-btn-light" onClick={() => setShowTable(v => !v)}>
            <Table2 size={15} /> {showTable ? "Ẩn bảng" : "Xem bảng"}
          </button>

          {/* Nút làm mới */}
          <button className="sw-btn sw-btn-light" onClick={fetchData} title="Tải lại">
            <RotateCcw size={15} className={loading ? "spin-animation" : ""} />
          </button>

          {/* ⭐ Nút xuất Excel */}
          <button
            className="sw-btn"
            style={{
              background: exporting ? "#94a3b8" : "linear-gradient(135deg,#10b981,#059669)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontWeight: 600,
              fontSize: 14,
              cursor: exporting ? "not-allowed" : "pointer",
              boxShadow: exporting ? "none" : "0 4px 12px rgba(16,185,129,0.35)",
              transition: "all 0.2s",
            }}
            onClick={handleExport}
            disabled={exporting || data.length === 0}
            title={data.length === 0 ? "Không có dữ liệu để xuất" : "Xuất báo cáo Excel (.xlsx)"}
          >
            {exporting
              ? <><Loader2 size={16} className="spin-animation" /> Đang xuất...</>
              : <><Download size={16} /> Xuất Excel</>
            }
          </button>

          {/* 📄 Nút Xuất PDF (Chủ Đầu Tư) */}
          <button
            className="sw-btn"
            style={{
              background: data.length === 0 ? "#cbd5e1" : "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontWeight: 600,
              fontSize: 14,
              cursor: data.length === 0 ? "not-allowed" : "pointer",
              boxShadow: data.length === 0 ? "none" : "0 4px 12px rgba(245, 158, 11, 0.35)",
              transition: "all 0.2s",
            }}
            onClick={() => setShowPdfModal(true)}
            disabled={data.length === 0}
            title={data.length === 0 ? "Không có dữ liệu để xuất" : "Xem trước & Xuất PDF báo cáo gửi Chủ Đầu Tư"}
          >
            <FileText size={16} /> Báo cáo PDF (CĐT)
          </button>
        </div>
      </div>

      {/* ── Bộ lọc ngày tuỳ chỉnh ── */}
      {rangeMode === "custom" && (
        <div style={{
          display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
          background: "#f8fafc", border: "1px solid #e2e8f0",
          borderRadius: 10, padding: "12px 16px", marginBottom: 16,
        }}>
          <Calendar size={18} color={INDIGO} />
          <span style={{ fontWeight: 500, color: INK, fontSize: 14 }}>Khoảng thời gian:</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, color: INK_MUT }}>Từ ngày</label>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #cbd5e1", fontSize: 14 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, color: INK_MUT }}>Đến ngày</label>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #cbd5e1", fontSize: 14 }}
            />
          </div>
          <button
            onClick={fetchData}
            style={{ background: INDIGO, color: "#fff", border: "none", borderRadius: 7, padding: "7px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}
          >
            Áp dụng
          </button>
        </div>
      )}

      {/* ── Lỗi ── */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Tổng số đơn",     value: `${totalDon} đơn`,     icon: <ShoppingBag size={20} color="#fff" />,     bg: "linear-gradient(135deg,#6366f1,#4f46e5)" },
          { label: "Tổng doanh thu",  value: fmtVND(totalDT),       icon: <BadgeDollarSign size={20} color="#fff" />, bg: "linear-gradient(135deg,#10b981,#059669)" },
          { label: "Tổng chiết khấu", value: fmtVND(totalCK),       icon: <Scissors size={20} color="#fff" />,        bg: "linear-gradient(135deg,#f59e0b,#d97706)" },
          { label: "TB / ngày",       value: fmtVND(avgPerDay),     icon: <TrendingUp size={20} color="#fff" />,      bg: "linear-gradient(135deg,#ec4899,#db2777)" },
        ].map((k, i) => (
          <div key={i} style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 14px rgba(0,0,0,0.08)" }}>
            <div style={{ background: k.bg, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{k.label}</span>
              {k.icon}
            </div>
            <div style={{ background: "#fff", padding: "14px 18px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: INK }}>{loading ? "..." : k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Biểu đồ ── */}
      <div className="sw-card" style={{ marginBottom: 20 }}>
        <h3 className="sw-card-title" style={{ marginBottom: 16 }}>Doanh thu theo ngày (VNĐ)</h3>
        {loading ? (
          <div className="sw-empty"><Loader2 size={22} className="spin-animation" /></div>
        ) : data.length === 0 ? (
          <div className="sw-empty" style={{ color: INK_MUT }}>Không có dữ liệu trong khoảng thời gian này.</div>
        ) : (
          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis
                  dataKey="NgayLabel"
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tick={{ fill: INK_MUT, fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={shortMoney}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: INK_MUT, fontSize: 11 }}
                  width={58}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(79,70,229,0.05)" }} />
                <Bar dataKey="TongDoanhThu" radius={[5, 5, 0, 0]} maxBarSize={32}>
                  {data.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry === bestDay ? "#4f46e5" : "#818cf8"}
                    />
                  ))}
                  <LabelList
                    dataKey="TongDoanhThu"
                    position="top"
                    content={({ x, y, width, value, index }) =>
                      data[index] === bestDay && value > 0 ? (
                        <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#334155" fontSize={11} fontWeight={700}>
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

      {/* ── Bảng dữ liệu chi tiết ── */}
      {showTable && (
        <div className="sw-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 className="sw-card-title" style={{ margin: 0 }}>Bảng chi tiết theo ngày</h3>
            <span style={{ fontSize: 12, color: INK_MUT }}>{data.length} ngày có giao dịch</span>
          </div>
          <div className="sw-table-wrap">
            <table className="sw-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 16px" }}>Ngày giao dịch</th>
                  <th style={{ textAlign: "center", padding: "10px 16px" }}>Tổng số đơn</th>
                  <th style={{ textAlign: "right", padding: "10px 16px" }}>Tổng doanh thu</th>
                  <th style={{ textAlign: "right", padding: "10px 16px" }}>Chiết khấu</th>
                  <th style={{ textAlign: "right", padding: "10px 16px" }}>Thực thu</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                    <td style={{ padding: "9px 16px", fontWeight: 500 }}>{r.NgayLabel}</td>
                    <td style={{ padding: "9px 16px", textAlign: "center" }}>{r.TongDon}</td>
                    <td style={{ padding: "9px 16px", textAlign: "right", color: INDIGO, fontWeight: 600 }}>{fmtVND(r.TongDoanhThu)}</td>
                    <td style={{ padding: "9px 16px", textAlign: "right", color: ROSE }}>{fmtVND(r.TongChietKhau)}</td>
                    <td style={{ padding: "9px 16px", textAlign: "right", color: GREEN, fontWeight: 700 }}>{fmtVND(r.ThucThu)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#1e293b", color: "#fff" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 700 }}>TỔNG CỘNG</td>
                  <td style={{ padding: "10px 16px", textAlign: "center", fontWeight: 700 }}>{totalDon}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700 }}>{fmtVND(totalDT)}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700 }}>{fmtVND(totalCK)}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700 }}>{fmtVND(data.reduce((s,r)=>s+r.ThucThu,0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Báo cáo PDF gửi Chủ Đầu Tư ── */}
      <RevenuePdfReportModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        data={data}
        from={from}
        to={to}
        rangeLabel={
          rangeMode === "week"
            ? "Tuần này"
            : rangeMode === "month"
            ? "Tháng này"
            : rangeMode === "quarter"
            ? "Quý này"
            : "Tùy chọn"
        }
      />
    </div>
  );
}
