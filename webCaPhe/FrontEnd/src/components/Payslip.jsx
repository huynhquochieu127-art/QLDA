import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Receipt, Printer, Wallet, Users } from "lucide-react";
import "../../css/staff.css";
import { API_BASE, formatMoney, getCurrentUser } from "../utils/staffWork";

const STANDARD_WORK_DAYS = 26; // Ngày công chuẩn / tháng (Full-time)
const LATE_PENALTY = 20000; // Trừ mỗi lần đi trễ

// Số liệu công/thưởng mẫu theo tháng (khi chưa có dữ liệu bảng lương chính thức)
const sampleMonthData = (monthIndex) => ({
  workDays: 24 - (monthIndex % 3),
  workHours: 112 + (monthIndex % 4) * 6,
  overtimeHours: 4 + (monthIndex % 3) * 2,
  lateCount: 1 + (monthIndex % 2),
  unpaidLeaveDays: monthIndex % 3 === 0 ? 1 : 0,
  revenueBonus: 300000 + (monthIndex % 4) * 100000,
  mealAllowance: 500000,
});

const Line = ({ label, note, value, sign }) => (
  <div className="payslip-line">
    <div>
      {label}
      {note && <span className="note">{note}</span>}
    </div>
    <strong style={{ color: sign === "-" ? "#b91c1c" : sign === "+" ? "#15803d" : "#0f172a", whiteSpace: "nowrap" }}>
      {sign === "-" ? "- " : sign === "+" ? "+ " : ""}
      {formatMoney(value)}
    </strong>
  </div>
);

// QH-59: Giao diện phiếu lương chi tiết (Payslip)
export default function Payslip() {
  const user = useMemo(() => getCurrentUser(), []);
  const now = new Date();

  // Tùy chọn 4 tháng gần nhất (bao gồm cả tháng hiện tại offset 0 và 3 tháng trước)
  const monthOptions = [0, 1, 2, 3].map((offset) => new Date(now.getFullYear(), now.getMonth() - offset, 1));

  // Đọc tháng ban đầu nếu có truyền qua hash URL (ví dụ từ notification link #my_payslip?thang=10&nam=2026)
  const getInitialMonth = () => {
    const hash = window.location.hash;
    const match = hash.match(/thang=(\d+)&nam=(\d+)/);
    if (match) {
      const t = parseInt(match[1], 10);
      const n = parseInt(match[2], 10);
      if (t >= 1 && t <= 12 && n > 2000) {
        const found = monthOptions.find((m) => m.getMonth() + 1 === t && m.getFullYear() === n);
        return found || new Date(n, t - 1, 1);
      }
    }
    return monthOptions[0];
  };

  const [monthDate, setMonthDate] = useState(getInitialMonth);
  const [employee, setEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [realPayroll, setRealPayroll] = useState(null);

  const isAdmin =
    (user.position || user.role || "").toLowerCase().includes("admin") ||
    !user.maNhanVien;

  const [selectedEmpId, setSelectedEmpId] = useState(user.maNhanVien || 3);
  const activeEmpId = isAdmin ? selectedEmpId : user.maNhanVien || 3;

  // Nếu là Admin, tải danh sách nhân viên để Admin có thể xem phiếu lương của từng nhân viên
  useEffect(() => {
    if (isAdmin) {
      axios
        .get(`${API_BASE}/employees`)
        .then((res) => {
          if (res.data?.success && Array.isArray(res.data.data)) {
            setEmployees(res.data.data);
            if (!user.maNhanVien && res.data.data.length > 0) {
              setSelectedEmpId((prev) => prev || res.data.data[0].MaNhanVien);
            }
          }
        })
        .catch(() => {});
    }
  }, [isAdmin, user.maNhanVien]);

  // Lấy thông tin nhân viên đang xem
  useEffect(() => {
    if (!activeEmpId) return;
    axios
      .get(`${API_BASE}/employees/${activeEmpId}`)
      .then((res) => setEmployee(res.data?.data || null))
      .catch(() => {});
  }, [activeEmpId]);

  // Lấy phiếu lương thật từ cơ sở dữ liệu nếu Admin đã tính lương từ Bảng công đã chốt
  useEffect(() => {
    if (!activeEmpId) return;
    const t = monthDate.getMonth() + 1;
    const n = monthDate.getFullYear();
    axios
      .get(`${API_BASE}/bangluong/my`, {
        params: { maNhanVien: activeEmpId, thang: t, nam: n },
      })
      .then((res) => {
        if (res.data.success && res.data.data) {
          setRealPayroll(res.data.data);
        } else {
          setRealPayroll(null);
        }
      })
      .catch(() => {
        setRealPayroll(null);
      });
  }, [activeEmpId, monthDate]);

  const isPartTime = (realPayroll?.LoaiNhanVien || employee?.LoaiNhanVien) === "Part-time";
  const baseRate = Number(realPayroll?.LuongCoBan || employee?.Luong) > 0
    ? Number(realPayroll?.LuongCoBan || employee?.Luong)
    : isPartTime ? 25000 : 6500000;
  const sample = sampleMonthData(monthDate.getMonth());

  const workDays = realPayroll ? Number(realPayroll.SoCong) : sample.workDays;
  const workHours = realPayroll ? Number(realPayroll.SoGioLam) : sample.workHours;
  const lateCount = realPayroll ? Number(realPayroll.SoNgayTre || 0) : sample.lateCount;

  // Tính toán phiếu lương theo chuẩn QH-28 & QH-29
  const dailyRate = isPartTime ? 0 : Math.round(baseRate / STANDARD_WORK_DAYS);
  const hourlyRate = isPartTime ? baseRate : Math.round(baseRate / (STANDARD_WORK_DAYS * 8));

  // Lương chính: Part-time tính theo giờ làm thực tế, Full-time là Lương cứng
  const basePay = isPartTime ? Math.round(workHours * baseRate) : baseRate;
  const overtimePay = sample.overtimeHours * hourlyRate * 1.5;

  const earnings = realPayroll
    ? Number(realPayroll.Thuong || 0) > 0
      ? [
          {
            label: "Thưởng (Chuyên cần & Hiệu suất)",
            note: "Áp dụng theo quy chế chấm công",
            value: Number(realPayroll.Thuong),
          },
        ]
      : []
    : [
        { label: "Thưởng doanh thu", note: "Theo doanh số cửa hàng trong tháng", value: sample.revenueBonus },
        { label: "Tăng ca", note: `${sample.overtimeHours} giờ × 150% đơn giá giờ`, value: overtimePay },
        { label: "Phụ cấp ăn ca", value: sample.mealAllowance },
      ];

  const leavePenaltyDays = Number(realPayroll?.SoNgayNghiKhongPhep || 0);
  const leavePenaltyValue = isPartTime ? 0 : leavePenaltyDays * dailyRate;
  const latePenaltyValue = lateCount * LATE_PENALTY;

  const deductions = realPayroll
    ? [
        ...(leavePenaltyValue > 0
          ? [
              {
                label: "Phạt nghỉ không phép (QH-28)",
                note: `${leavePenaltyDays} ngày nghỉ KP × ${formatMoney(dailyRate)}/ngày`,
                value: leavePenaltyValue,
              },
            ]
          : []),
        ...(latePenaltyValue > 0
          ? [
              {
                label: "Phạt đi trễ",
                note: `${lateCount} lần × ${formatMoney(LATE_PENALTY)}`,
                value: latePenaltyValue,
              },
            ]
          : []),
      ]
    : [
        { label: "Đi trễ", note: `${lateCount} lần × ${formatMoney(LATE_PENALTY)}`, value: lateCount * LATE_PENALTY },
        {
          label: "Nghỉ không phép",
          note: isPartTime ? "Không áp dụng cho Part-time" : `${sample.unpaidLeaveDays} ngày × lương 1 ngày`,
          value: isPartTime ? 0 : sample.unpaidLeaveDays * dailyRate,
        },
      ];

  const totalEarnings = earnings.reduce((s, e) => s + e.value, 0);
  const grossIncome = basePay + totalEarnings;
  const totalDeductions = deductions.reduce((s, d) => s + d.value, 0);
  const netPay = realPayroll ? Number(realPayroll.TongLuong) : Math.max(0, grossIncome - totalDeductions);

  const monthLabel = `${String(monthDate.getMonth() + 1).padStart(2, "0")}/${monthDate.getFullYear()}`;

  return (
    <div className="sw-page">
      <div className="sw-page-header">
        <div>
          <h2 className="sw-page-title">
            <Receipt size={24} color="#6366f1" /> Phiếu lương
            {realPayroll ? (
              <span className="sw-demo-tag" style={{ backgroundColor: "#dcfce7", color: "#15803d", borderColor: "#86efac" }}>
                ✓ Quyết toán chính thức (Bảng công đã chốt)
              </span>
            ) : (
              <span className="sw-demo-tag">Số liệu công mẫu</span>
            )}
          </h2>
          <p className="sw-page-sub">Chi tiết thu nhập, các khoản cộng/trừ và số tiền thực lĩnh.</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Menu chọn nhân viên xem phiếu lương dành cho Admin */}
          {isAdmin && employees.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", padding: "4px 8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
              <Users size={16} color="#475569" />
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Nhân viên:</span>
              <select
                className="sw-select"
                style={{ width: "auto", border: "none", background: "transparent", fontWeight: "700", outline: "none", cursor: "pointer" }}
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(Number(e.target.value))}
              >
                {employees.map((emp) => (
                  <option key={emp.MaNhanVien} value={emp.MaNhanVien}>
                    {emp.MaNhanVienCode || `NV00${emp.MaNhanVien}`} - {emp.HoTen} ({emp.LoaiNhanVien || "Part-time"})
                  </option>
                ))}
              </select>
            </div>
          )}

          <select
            className="sw-select"
            style={{ width: "auto" }}
            value={monthLabel}
            onChange={(e) => {
              const selected = monthOptions.find(
                (m) => `${String(m.getMonth() + 1).padStart(2, "0")}/${m.getFullYear()}` === e.target.value
              );
              if (selected) setMonthDate(selected);
            }}
          >
            {monthOptions.map((m) => {
              const label = `${String(m.getMonth() + 1).padStart(2, "0")}/${m.getFullYear()}`;
              return (
                <option key={label} value={label}>
                  Tháng {label}
                </option>
              );
            })}
          </select>

          <button className="sw-btn sw-btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> In / Xuất PDF
          </button>
        </div>
      </div>

      <div className="payslip">
        <div className="payslip-head">
          <div>
            <h2>PHIẾU LƯƠNG THÁNG {monthLabel}</h2>
            <p>QuanLyCF · Hệ thống quản lý quán cà phê</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0 }}>Mã phiếu</p>
            <strong>
              PL-{monthDate.getFullYear()}
              {String(monthDate.getMonth() + 1).padStart(2, "0")}-
              {employee?.MaNhanVienCode || user.code || `NV00${activeEmpId}`}
            </strong>
          </div>
        </div>

        <div className="payslip-body">
          <div className="payslip-info">
            <div>
              <span>Nhân viên: </span>
              <strong>{employee?.HoTen || user.name}</strong>
            </div>
            <div>
              <span>Mã NV: </span>
              <strong>{employee?.MaNhanVienCode || user.code || `NV00${activeEmpId}`}</strong>
            </div>
            <div>
              <span>Chức vụ: </span>
              <strong>{employee?.ChucVu || user.position}</strong>
            </div>
            <div>
              <span>Hợp đồng: </span>
              <strong>{isPartTime ? "Part-time (Lương giờ)" : "Full-time (Lương cứng)"}</strong>
            </div>
            <div>
              <span>Mức lương: </span>
              <strong>
                {formatMoney(baseRate)} / {isPartTime ? "giờ" : "tháng"}
              </strong>
            </div>
            <div>
              <span>{isPartTime ? "Giờ công: " : "Ngày công: "}</span>
              <strong>
                {isPartTime ? `${workHours} giờ` : `${workDays}/${STANDARD_WORK_DAYS} ngày`}
              </strong>
            </div>
          </div>

          <div className="payslip-section base">
            <h4>Lương chính</h4>
            <Line
              label={isPartTime ? "Lương theo giờ công" : "Lương theo ngày công"}
              note={
                isPartTime
                  ? `${workHours} giờ × ${formatMoney(baseRate)}`
                  : `${formatMoney(baseRate)} ÷ ${STANDARD_WORK_DAYS} × ${workDays} ngày`
              }
              value={basePay}
            />
          </div>

          <div className="payslip-section plus">
            <h4>Các khoản cộng</h4>
            {earnings.length > 0 ? (
              earnings.map((e) => <Line key={e.label} {...e} sign="+" />)
            ) : (
              <div style={{ fontSize: "13px", color: "#64748b", fontStyle: "italic", padding: "4px 0" }}>
                Không có khoản cộng trong kỳ lương này
              </div>
            )}
          </div>

          <div className="payslip-section base">
            <div className="payslip-line total">
              <span>Tổng thu nhập</span>
              <span>{formatMoney(grossIncome)}</span>
            </div>
          </div>

          <div className="payslip-section minus">
            <h4>Các khoản trừ</h4>
            {deductions.length > 0 ? (
              deductions.map((d) => <Line key={d.label} {...d} sign="-" />)
            ) : (
              <div style={{ fontSize: "13px", color: "#64748b", fontStyle: "italic", padding: "4px 0" }}>
                Không có khoản khấu trừ trong kỳ lương này
              </div>
            )}
            <div className="payslip-line total">
              <span>Tổng khấu trừ</span>
              <span style={{ color: "#b91c1c" }}>- {formatMoney(totalDeductions)}</span>
            </div>
          </div>

          <div className="payslip-net">
            <div>
              <div className="label">
                <Wallet size={16} style={{ verticalAlign: "-3px" }} /> THỰC LĨNH
              </div>
              <div className="sw-hint">Số tiền chuyển khoản cuối cùng</div>
            </div>
            <div className="value">{formatMoney(netPay)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
