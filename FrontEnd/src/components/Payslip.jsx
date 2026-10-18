import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Receipt, Printer, Wallet } from "lucide-react";
import "../../css/staff.css";
import { API_BASE, formatMoney, getCurrentUser } from "../utils/staffWork";

const STANDARD_WORK_DAYS = 26; // Ngày công chuẩn / tháng (Full-time)
const LATE_PENALTY = 20000; // Trừ mỗi lần đi trễ
const INSURANCE_RATE = 0.105; // BHXH + BHYT + BHTN phần người lao động

// Số liệu công/thưởng mẫu theo tháng (sẽ thay bằng dữ liệu bảng công khi có API tính lương)
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
  const monthOptions = [1, 2, 3].map((offset) => new Date(now.getFullYear(), now.getMonth() - offset, 1));
  const [monthDate, setMonthDate] = useState(monthOptions[0]);
  const [employee, setEmployee] = useState(null);
  const [realPayroll, setRealPayroll] = useState(null);

  // Lấy thông tin nhân viên
  useEffect(() => {
    const empId = user.maNhanVien || 3;
    axios
      .get(`${API_BASE}/employees/${empId}`)
      .then((res) => setEmployee(res.data?.data || null))
      .catch(() => {});
  }, [user.maNhanVien]);

  // Lấy phiếu lương thật từ cơ sở dữ liệu nếu Admin đã tính lương từ Bảng công đã chốt
  useEffect(() => {
    const empId = user.maNhanVien || 3;
    const t = monthDate.getMonth() + 1;
    const n = monthDate.getFullYear();
    axios
      .get(`${API_BASE}/bangluong/my`, {
        params: { maNhanVien: empId, thang: t, nam: n },
      })
      .then((res) => {
        if (res.data.success && res.data.data) {
          setRealPayroll(res.data.data);
        } else {
          setRealPayroll(null);
        }
      })
      .catch(() => {});
  }, [user.maNhanVien, monthDate]);

  const isPartTime = (realPayroll?.LoaiNhanVien || employee?.LoaiNhanVien) === "Part-time";
  const baseRate = Number(realPayroll?.LuongCoBan || employee?.Luong) > 0
    ? Number(realPayroll?.LuongCoBan || employee?.Luong)
    : isPartTime ? 25000 : 6500000;
  const sample = sampleMonthData(monthDate.getMonth());

  const workDays = realPayroll ? Number(realPayroll.SoCong) : sample.workDays;
  const workHours = realPayroll ? Number(realPayroll.SoGioLam) : sample.workHours;
  const lateCount = realPayroll ? Number(realPayroll.SoNgayTre || 0) : sample.lateCount;

  // Tính toán phiếu lương
  const dailyRate = isPartTime ? 0 : baseRate / STANDARD_WORK_DAYS;
  const hourlyRate = isPartTime ? baseRate : baseRate / (STANDARD_WORK_DAYS * 8);
  const basePay = isPartTime ? workHours * baseRate : dailyRate * workDays;
  const overtimePay = sample.overtimeHours * hourlyRate * 1.5;

  const earnings = realPayroll
    ? [{ label: "Thưởng (Chuyên cần & Doanh thu)", note: "Tính theo bảng công đã chốt", value: Number(realPayroll.Thuong || 0) }]
    : [
        { label: "Thưởng doanh thu", note: "Theo doanh số cửa hàng trong tháng", value: sample.revenueBonus },
        { label: "Tăng ca", note: `${sample.overtimeHours} giờ × 150% đơn giá giờ`, value: overtimePay },
        { label: "Phụ cấp ăn ca", value: sample.mealAllowance },
      ];

  const deductions = realPayroll
    ? [{ label: "Khấu trừ (Bảo hiểm & Phạt trễ)", note: realPayroll.GhiChu || "Khấu trừ theo quy định", value: Number(realPayroll.KhauTru || 0) }]
    : [
        { label: "Đi trễ", note: `${lateCount} lần × ${formatMoney(LATE_PENALTY)}`, value: lateCount * LATE_PENALTY },
        {
          label: "Nghỉ không phép",
          note: isPartTime ? "Không áp dụng cho Part-time" : `${sample.unpaidLeaveDays} ngày × lương 1 ngày`,
          value: isPartTime ? 0 : sample.unpaidLeaveDays * dailyRate,
        },
        {
          label: "Bảo hiểm (BHXH, BHYT, BHTN)",
          note: isPartTime ? "Không áp dụng cho Part-time" : "10.5% lương cơ bản",
          value: isPartTime ? 0 : baseRate * INSURANCE_RATE,
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
          <select
            className="sw-select"
            style={{ width: "auto" }}
            value={monthLabel}
            onChange={(e) => setMonthDate(monthOptions.find((m) => `${String(m.getMonth() + 1).padStart(2, "0")}/${m.getFullYear()}` === e.target.value))}
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
            <strong>PL-{monthDate.getFullYear()}{String(monthDate.getMonth() + 1).padStart(2, "0")}-{user.code || "DEMO"}</strong>
          </div>
        </div>

        <div className="payslip-body">
          <div className="payslip-info">
            <div><span>Nhân viên: </span><strong>{employee?.HoTen || user.name}</strong></div>
            <div><span>Mã NV: </span><strong>{employee?.MaNhanVienCode || user.code || "-"}</strong></div>
            <div><span>Chức vụ: </span><strong>{employee?.ChucVu || user.position}</strong></div>
            <div><span>Hợp đồng: </span><strong>{isPartTime ? "Part-time (Lương giờ)" : "Full-time (Lương cứng)"}</strong></div>
            <div>
              <span>Mức lương: </span>
              <strong>{formatMoney(baseRate)} / {isPartTime ? "giờ" : "tháng"}</strong>
            </div>
            <div>
              <span>{isPartTime ? "Giờ công: " : "Ngày công: "}</span>
              <strong>{isPartTime ? `${data.workHours} giờ` : `${data.workDays}/${STANDARD_WORK_DAYS} ngày`}</strong>
            </div>
          </div>

          <div className="payslip-section base">
            <h4>Lương chính</h4>
            <Line
              label={isPartTime ? "Lương theo giờ công" : "Lương theo ngày công"}
              note={
                isPartTime
                  ? `${data.workHours} giờ × ${formatMoney(baseRate)}`
                  : `${formatMoney(baseRate)} ÷ ${STANDARD_WORK_DAYS} × ${data.workDays} ngày`
              }
              value={basePay}
            />
          </div>

          <div className="payslip-section plus">
            <h4>Các khoản cộng</h4>
            {earnings.map((e) => (
              <Line key={e.label} {...e} sign="+" />
            ))}
          </div>

          <div className="payslip-section base">
            <div className="payslip-line total">
              <span>Tổng thu nhập</span>
              <span>{formatMoney(grossIncome)}</span>
            </div>
          </div>

          <div className="payslip-section minus">
            <h4>Các khoản trừ</h4>
            {deductions.map((d) => (
              <Line key={d.label} {...d} sign="-" />
            ))}
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
