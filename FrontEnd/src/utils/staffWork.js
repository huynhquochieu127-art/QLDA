// Tiện ích dùng chung cho các màn hình nhân viên (đăng ký ca, chấm công, bảng công, phiếu lương)

export const API_BASE = "http://localhost:5000/api";

// 3 ca làm việc tiêu chuẩn (đồng bộ với màn hình Duyệt ca QH-39)
export const SHIFTS = [
  { id: "morning", name: "Ca Sáng", short: "Ca 1", start: "07:00", end: "12:00", targetStaff: 3 },
  { id: "afternoon", name: "Ca Chiều", short: "Ca 2", start: "12:00", end: "17:00", targetStaff: 3 },
  { id: "evening", name: "Ca Tối", short: "Ca 3", start: "17:00", end: "22:30", targetStaff: 4 },
];

export const getShift = (id) => SHIFTS.find((s) => s.id === id);

export const DAY_LABELS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

// Khóa ngày YYYY-MM-DD theo giờ địa phương (không dùng toISOString để tránh lệch múi giờ UTC+7)
export const toDateKey = (date) => {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

// Đọc lại khóa YYYY-MM-DD thành Date lúc 00:00 giờ địa phương
export const fromDateKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const formatDateVN = (key) => fromDateKey(key).toLocaleDateString("vi-VN");

export const getMonday = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

export const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

// "07:30" -> số phút trong ngày
export const timeToMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "--:--";

export const formatMoney = (amount) => `${Math.round(Number(amount) || 0).toLocaleString("vi-VN")} đ`;

// Thông tin người dùng đang đăng nhập (đọc từ session/local storage do trang Login lưu)
export const getCurrentUser = () => {
  let user = {};
  try {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (raw) user = JSON.parse(raw);
  } catch (_) {}

  const maNhanVien = user.maNhanVien || user.MaNhanVien || null;
  const code =
    user.maNhanVienCode ||
    user.MaNhanVienCode ||
    (maNhanVien ? `NV${String(maNhanVien).padStart(3, "0")}` : null);

  return {
    maNhanVien,
    staffId: code || user.email || user.name || "NV-DEMO",
    code,
    name: user.name || user.HoTen || "Nhân viên",
    position: user.chucVu || user.ChucVu || user.role || "Nhân viên",
    email: user.email || "",
    loaiNhanVien: user.loaiNhanVien || user.LoaiNhanVien || "Part-time",
  };
};

// Đọc/ghi dữ liệu tạm trong localStorage (an toàn khi bị chặn storage)
export const readLocal = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
};

export const writeLocal = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
};

// Các khóa dữ liệu tạm dùng chung giữa các màn hình
export const STORAGE_KEYS = {
  shiftRegistrations: "app_mock_shift_registrations", // QH-35 ghi, QH-39 đọc
  checkins: "app_mock_checkins", // QH-47 ghi, QH-100 đọc
  attendanceRequests: "app_mock_attendance_requests", // QH-49
  timesheetFeedback: "app_mock_timesheet_feedback", // QH-54
};
