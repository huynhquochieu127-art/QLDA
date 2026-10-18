import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  MoveHorizontal,
  Plus,
  Trash2,
  Check,
  X,
  Filter,
  ArrowRightLeft,
  RotateCcw,
  Sparkles,
  Info,
  CalendarCheck,
  UserCheck,
  Coffee,
} from "lucide-react";
import axios from "axios";
import "../../css/shifts.css";
import { toDateKey, formatDateVN, API_BASE } from "../utils/staffWork";
import PartTimeShiftConfig from "./PartTimeShiftConfig";

// 3 Ca làm việc tiêu chuẩn trong ngày
const SHIFT_TYPES = [
  {
    id: "morning",
    name: "Ca Sáng",
    time: "07:00 - 12:00",
    icon: <Sun size={16} />,
    colorClass: "morning",
    targetStaff: 3,
  },
  {
    id: "afternoon",
    name: "Ca Chiều",
    time: "12:00 - 17:00",
    icon: <Sunset size={16} />,
    colorClass: "afternoon",
    targetStaff: 3,
  },
  {
    id: "evening",
    name: "Ca Tối",
    time: "17:00 - 22:30",
    icon: <Moon size={16} />,
    colorClass: "evening",
    targetStaff: 4, // Ca tối đông khách cần 4 nhân viên
  },
];

// Danh sách các ngày trong tuần (Thứ 2 -> Chủ Nhật)
const DAY_NAMES = [
  { dayIndex: 1, label: "Thứ Hai" },
  { dayIndex: 2, label: "Thứ Ba" },
  { dayIndex: 3, label: "Thứ Tư" },
  { dayIndex: 4, label: "Thứ Năm" },
  { dayIndex: 5, label: "Thứ Sáu" },
  { dayIndex: 6, label: "Thứ Bảy" },
  { dayIndex: 0, label: "Chủ Nhật" },
];

export default function ShiftApprovalManagement({ currentRole = "manager" }) {
  // Quản lý tuần làm việc hiện tại (dựa vào ngày bắt đầu của tuần - Thứ 2)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Lấy Thứ 2 của tuần này
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [viewMode, setViewMode] = useState("calendar"); // 'calendar' | 'table'
  const [draggedItem, setDraggedItem] = useState(null); // Item đang được kéo thả
  const [dragOverSlot, setDragOverSlot] = useState(null); // Slot đang hover kéo qua

  // Modal State
  const [reassignModalItem, setReassignModalItem] = useState(null); // Chuyển ca nhanh
  const [newTargetShift, setNewTargetShift] = useState("morning");
  const [newTargetDate, setNewTargetDate] = useState("");

  const [showAssignModal, setShowAssignModal] = useState(false); // Xếp thêm ca
  const [showConfigModal, setShowConfigModal] = useState(false); // Cấu hình 3 ca Part-time
  const [assignForm, setAssignForm] = useState({
    staffId: "",
    staffName: "",
    role: "Thu ngân",
    date: "",
    shiftType: "morning",
  });

  // Filter trong Table View
  const [tableFilterStatus, setTableFilterStatus] = useState("all");
  const [tableFilterShift, setTableFilterShift] = useState("all");
  const [tableFilterWeek, setTableFilterWeek] = useState("all");

  const [bannerNotice, setBannerNotice] = useState("");

  // Lấy danh sách nhân viên từ hệ thống để gán vào ca
  const [availableStaff, setAvailableStaff] = useState([
    { id: "NV001", name: "Nguyễn Hải Hậu", role: "Quản trị viên" },
    { id: "NV002", name: "Trần Minh Quang", role: "Quản lý" },
    { id: "NV003", name: "Lê Thị Thảo", role: "Thu ngân" },
    { id: "NV004", name: "Phạm Quốc Tuấn", role: "Pha chế" },
    { id: "NV005", name: "Vũ Hoàng Yến", role: "Thu ngân" },
    { id: "NV006", name: "Đỗ Đăng Khoa", role: "Pha chế" },
    { id: "NV007", name: "Bùi Thị Mai", role: "Phục vụ" },
    { id: "NV008", name: "Ngô Văn Phát", role: "Pha chế" },
  ]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/employees`)
      .then((res) => {
        const list = res.data?.data?.data || res.data?.data || res.data;
        if (Array.isArray(list) && list.length > 0) {
          setAvailableStaff(
            list.map((emp) => ({
              id: emp.MaNhanVienCode || `NV${String(emp.MaNhanVien || emp.id).padStart(3, "0")}`,
              maNhanVien: emp.MaNhanVien || emp.id,
              name: emp.HoTen || emp.name,
              role: emp.ChucVu || emp.position || "Nhân viên",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Tính 7 ngày trong tuần từ currentWeekStart
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    const dayIndex = d.getDay();
    const dayLabel = DAY_NAMES.find((dn) => dn.dayIndex === dayIndex)?.label;
    const dateFormatted = d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
    const dateKey = toDateKey(d); // YYYY-MM-DD theo giờ địa phương
    const isToday = toDateKey(new Date()) === dateKey;

    return {
      date: d,
      dateKey,
      dayLabel,
      dateFormatted,
      isToday,
    };
  });



  // State lưu danh sách ca làm việc từ CSDL MySQL (bảng dangky_ca)
  const [shiftRegistrations, setShiftRegistrations] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);

  // Tải dữ liệu đăng ký ca từ Database API
  const fetchShiftRegistrations = async () => {
    try {
      setLoadingShifts(true);
      const res = await axios.get(`${API_BASE}/shifts/registrations`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setShiftRegistrations(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi nạp danh sách ca làm từ Database:", err);
    } finally {
      setLoadingShifts(false);
    }
  };

  useEffect(() => {
    fetchShiftRegistrations();
  }, [currentWeekStart]);

  // Điều hướng tuần
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  // ========================================================
  // CÁC HÀNH ĐỘNG CỦA QUẢN LÝ: DUYỆT / TỪ CHỐI / CHUYỂN CA VÀO DATABASE
  // ========================================================

  // 1. Duyệt ca (Approve)
  const handleApprove = async (id, staffName) => {
    try {
      await axios.put(`${API_BASE}/shifts/registrations/${id}/status`, {
        status: "approved",
      });
      setShiftRegistrations((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "approved" } : item
        )
      );
      setBannerNotice(`Đã duyệt ca làm cho nhân viên "${staffName}" vào CSDL.`);
    } catch (err) {
      alert("Lỗi khi duyệt ca làm: " + (err.response?.data?.message || err.message));
    }
  };

  // 2. Từ chối ca (Reject)
  const handleReject = async (id, staffName) => {
    try {
      await axios.put(`${API_BASE}/shifts/registrations/${id}/status`, {
        status: "rejected",
      });
      setShiftRegistrations((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "rejected" } : item
        )
      );
      setBannerNotice(`Đã từ chối ca làm của nhân viên "${staffName}" trong CSDL.`);
    } catch (err) {
      alert("Lỗi khi từ chối ca làm: " + (err.response?.data?.message || err.message));
    }
  };

  // 3. Duyệt tất cả ca đang chờ trong tuần hoặc trên toàn hệ thống
  const handleApproveAll = async () => {
    const currentWeekDateKeys = weekDays.map((w) => w.dateKey);
    const pendingThisWeek = currentWeekShifts.filter((s) => s.status === "pending").length;

    let payload = { dateKeys: currentWeekDateKeys };
    if (pendingThisWeek === 0 && allPendingShifts.length > 0) {
      if (
        window.confirm(
          `Tuần hiện tại không có ca chờ duyệt. Bạn có muốn duyệt tất cả ${allPendingShifts.length} ca chờ duyệt trên toàn hệ thống (bao gồm tuần sau) không?`
        )
      ) {
        payload = {}; // không giới hạn dateKeys -> duyệt tất cả ca pending
      } else {
        return;
      }
    }

    try {
      const res = await axios.put(`${API_BASE}/shifts/registrations/approve-all`, payload);
      fetchShiftRegistrations();
      setBannerNotice(res.data?.message || `Đã duyệt tất cả ca làm đang chờ!`);
    } catch (err) {
      alert("Lỗi khi duyệt đồng loạt ca: " + (err.response?.data?.message || err.message));
    }
  };

  // 4. Xóa lượt xếp ca khỏi CSDL
  const handleDeleteRegistration = async (id, staffName) => {
    if (window.confirm(`Hủy ca đăng ký của nhân viên "${staffName}" trong CSDL?`)) {
      try {
        await axios.delete(`${API_BASE}/shifts/registrations/${id}`);
        setShiftRegistrations((prev) => prev.filter((item) => item.id !== id));
        setBannerNotice(`Đã xóa ca đăng ký của "${staffName}" khỏi CSDL.`);
      } catch (err) {
        alert("Lỗi khi xóa ca làm: " + (err.response?.data?.message || err.message));
      }
    }
  };

  // ========================================================
  // KÉO THẢ (DRAG & DROP) ĐỂ ĐIỀU PHỐI / XẾP LẠI CA
  // ========================================================
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, dateKey, shiftType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSlot(`${dateKey}_${shiftType}`);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = async (e, targetDateKey, targetShiftType) => {
    e.preventDefault();
    setDragOverSlot(null);

    if (!draggedItem) return;

    if (
      draggedItem.dateKey === targetDateKey &&
      draggedItem.shiftType === targetShiftType
    ) {
      setDraggedItem(null);
      return;
    }

    const targetShiftName =
      SHIFT_TYPES.find((s) => s.id === targetShiftType)?.name || "Ca mới";
    const targetDay =
      weekDays.find((w) => w.dateKey === targetDateKey)?.dayLabel || targetDateKey;

    try {
      await axios.put(`${API_BASE}/shifts/registrations/${draggedItem.id}/reassign`, {
        targetDateKey,
        targetShiftType,
        status: "approved",
      });

      setShiftRegistrations((prev) =>
        prev.map((item) =>
          item.id === draggedItem.id
            ? {
                ...item,
                dateKey: targetDateKey,
                shiftType: targetShiftType,
                status: "approved",
              }
            : item
        )
      );

      setBannerNotice(
        `Đã chuyển nhân viên "${draggedItem.staffName}" sang ${targetShiftName} (${targetDay}) trong CSDL!`
      );
    } catch (err) {
      alert("Lỗi khi chuyển ca: " + (err.response?.data?.message || err.message));
    }
    setDraggedItem(null);
  };

  // ========================================================
  // CHUYỂN CA NHANH QUA MODAL (NẾU KHÔNG KÉO THẢ)
  // ========================================================
  const handleOpenReassignModal = (item) => {
    setReassignModalItem(item);
    setNewTargetShift(item.shiftType);
    setNewTargetDate(item.dateKey);
  };

  const handleSaveReassign = async (e) => {
    e.preventDefault();
    if (!reassignModalItem) return;

    const targetShiftName =
      SHIFT_TYPES.find((s) => s.id === newTargetShift)?.name || newTargetShift;

    try {
      await axios.put(`${API_BASE}/shifts/registrations/${reassignModalItem.id}/reassign`, {
        targetDateKey: newTargetDate,
        targetShiftType: newTargetShift,
        status: "approved",
      });

      setShiftRegistrations((prev) =>
        prev.map((item) =>
          item.id === reassignModalItem.id
            ? {
                ...item,
                dateKey: newTargetDate,
                shiftType: newTargetShift,
                status: "approved",
              }
            : item
        )
      );

      setBannerNotice(
        `Đã chuyển ca cho "${reassignModalItem.staffName}" sang ${targetShiftName} trong CSDL!`
      );
      setReassignModalItem(null);
    } catch (err) {
      alert("Lỗi khi chuyển ca: " + (err.response?.data?.message || err.message));
    }
  };

  // ========================================================
  // XẾP THÊM NHÂN VIÊN VÀO CA (ASSIGN STAFF) LƯU VÀO CSDL
  // ========================================================
  const handleOpenAssignModal = (dateKey = "", shiftType = "morning") => {
    const defaultDate = dateKey || weekDays[0].dateKey;
    const defaultStaff = availableStaff[0] || { id: "NV001", name: "Nhân viên", role: "Thu ngân" };
    setAssignForm({
      staffId: defaultStaff.id,
      staffName: defaultStaff.name,
      role: defaultStaff.role,
      date: defaultDate,
      shiftType: shiftType,
    });
    setShowAssignModal(true);
  };

  const handleSaveAssign = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/shifts/registrations`, {
        staffId: assignForm.staffId,
        staffName: assignForm.staffName,
        role: assignForm.role,
        dateKey: assignForm.date,
        shiftType: assignForm.shiftType,
        status: "approved",
      });

      if (res.data?.success) {
        setBannerNotice(`Đã xếp nhân viên "${assignForm.staffName}" vào ca thành công trong CSDL!`);
        setShowAssignModal(false);
        fetchShiftRegistrations();
      }
    } catch (err) {
      alert("Lỗi khi xếp ca nhân viên: " + (err.response?.data?.message || err.message));
    }
  };

  // Đặt lại dữ liệu mẫu trong CSDL MySQL
  const handleResetData = async () => {
    if (window.confirm("Đặt lại dữ liệu ca đăng ký về mặc định trong CSDL MySQL?")) {
      try {
        const res = await axios.post(`${API_BASE}/shifts/registrations/reset-sample`);
        if (res.data?.success) {
          setShiftRegistrations(res.data.data || []);
          setBannerNotice("Đã đặt lại dữ liệu đăng ký ca trong CSDL thành công.");
        }
      } catch (err) {
        alert("Lỗi khi đặt lại dữ liệu: " + (err.response?.data?.message || err.message));
      }
    }
  };

  // ========================================================
  // TÍNH TOÁN THỐNG KÊ TUẦN (KPIs) & TOÀN HỆ THỐNG
  // ========================================================
  const allPendingShifts = shiftRegistrations.filter((s) => s.status === "pending");
  const currentWeekDateKeys = weekDays.map((w) => w.dateKey);
  const currentWeekShifts = shiftRegistrations.filter((s) =>
    currentWeekDateKeys.includes(s.dateKey)
  );

  const totalRegistrations = currentWeekShifts.length;
  const approvedCount = currentWeekShifts.filter((s) => s.status === "approved").length;
  const pendingCount = currentWeekShifts.filter((s) => s.status === "pending").length;
  const rejectedCount = currentWeekShifts.filter((s) => s.status === "rejected").length;
  const pendingOtherWeeks = allPendingShifts.length - pendingCount;

  // Tính số lượng ca bị thiếu người
  let understaffedSlotsCount = 0;
  weekDays.forEach((day) => {
    SHIFT_TYPES.forEach((shift) => {
      const countInSlot = currentWeekShifts.filter(
        (s) =>
          s.dateKey === day.dateKey &&
          s.shiftType === shift.id &&
          s.status === "approved"
      ).length;
      if (countInSlot < shift.targetStaff) {
        understaffedSlotsCount++;
      }
    });
  });

  // Phạm vi ngày hiển thị trên Header (vd: 05/10/2026 - 11/10/2026)
  const weekStartStr = weekDays[0].date.toLocaleDateString("vi-VN");
  const weekEndStr = weekDays[6].date.toLocaleDateString("vi-VN");

  return (
    <div className="shifts-container">
      {/* Banner thông báo hành động */}
      {bannerNotice && (
        <div className="form-banner-success">
          <CheckCircle2 size={18} />
          <span>{bannerNotice}</span>
          <button
            onClick={() => setBannerNotice("")}
            className="emp-modal-close"
            style={{ marginLeft: "auto" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* CẢNH BÁO TỔNG QUAN: CÓ CA CHỜ DUYỆT (ĐẶC BIỆT LÀ CỦA PART-TIME Ở TUẦN SAU) */}
      {allPendingShifts.length > 0 && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={22} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#92400e" }}>
                Có {allPendingShifts.length} lượt đăng ký ca làm việc đang chờ Quản lý duyệt!
              </div>
              <div style={{ fontSize: "0.82rem", color: "#b45309", marginTop: 2 }}>
                {pendingCount > 0 ? `Tuần này có ${pendingCount} ca.` : "Tuần hiện tại (đang xem) không có ca chờ."}
                {pendingOtherWeeks > 0 &&
                  ` Có ${pendingOtherWeeks} ca của sinh viên Part-time đã đăng ký ở Tuần sau.`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {pendingOtherWeeks > 0 && (
              <button
                type="button"
                className="sw-btn"
                style={{
                  background: "#d97706",
                  color: "#ffffff",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  padding: "7px 14px",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
                onClick={handleNextWeek}
              >
                👉 Chuyển sang Tuần sau xem {pendingOtherWeeks} ca
              </button>
            )}
            <button
              type="button"
              className="sw-btn sw-btn-light"
              style={{ fontSize: "0.82rem", padding: "7px 12px", background: "#ffffff" }}
              onClick={() => {
                setViewMode("table");
                setTableFilterStatus("pending");
                setTableFilterWeek("all");
              }}
            >
              📋 Danh sách toàn bộ ca chờ duyệt
            </button>
          </div>
        </div>
      )}

      {/* Gợi ý kéo thả */}
      <div className="drag-tip-box">
        <Sparkles size={18} />
        <span>
          <strong>Mẹo cho Quản lý:</strong> Bạn có thể dùng chuột <strong>kéo và thả trực tiếp</strong> thẻ nhân viên từ Ca này sang Ca khác để xếp lại lịch khi ca bị thiếu người!
        </span>
      </div>

      {/* THỐNG KÊ NHANH TUẦN (KPI CARDS) */}
      <div className="shifts-stats-grid">
        <div className="shifts-stat-card">
          <div className="shifts-stat-info">
            <h4>Tổng lượt đăng ký</h4>
            <div className="stat-number">{totalRegistrations}</div>
          </div>
          <div className="shifts-stat-icon blue">
            <CalendarCheck size={22} />
          </div>
        </div>

        <div className="shifts-stat-card">
          <div className="shifts-stat-info">
            <h4>Đang chờ duyệt</h4>
            <div className="stat-number" style={{ color: "#d97706" }}>
              {pendingCount}
              {pendingOtherWeeks > 0 && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#b45309",
                    marginLeft: 6,
                    background: "#fef3c7",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                  title={`Có ${pendingOtherWeeks} ca chờ duyệt ở tuần sau`}
                >
                  +{pendingOtherWeeks} ca tuần sau
                </span>
              )}
            </div>
            {pendingCount === 0 && pendingOtherWeeks > 0 && (
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: "#4f46e5",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  marginTop: 4,
                  textAlign: "left",
                }}
                onClick={handleNextWeek}
              >
                👉 Chuyển sang tuần sau duyệt ca
              </button>
            )}
          </div>
          <div className="shifts-stat-icon amber">
            <Clock size={22} />
          </div>
        </div>

        <div className="shifts-stat-card">
          <div className="shifts-stat-info">
            <h4>Đã phê duyệt</h4>
            <div className="stat-number" style={{ color: "#16a34a" }}>
              {approvedCount}
            </div>
          </div>
          <div className="shifts-stat-icon green">
            <UserCheck size={22} />
          </div>
        </div>

        <div className="shifts-stat-card">
          <div className="shifts-stat-info">
            <h4>Ca còn thiếu người</h4>
            <div className="stat-number" style={{ color: understaffedSlotsCount > 0 ? "#dc2626" : "#16a34a" }}>
              {understaffedSlotsCount} ca
            </div>
          </div>
          <div className="shifts-stat-icon red">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* THANH CÔNG CỤ & ĐIỀU HƯỚNG TUẦN */}
      <div className="shifts-toolbar">
        {/* Điều hướng tuần */}
        <div className="week-navigation">
          <button
            className="nav-week-btn"
            onClick={handlePrevWeek}
            title="Tuần trước"
          >
            <ChevronLeft size={18} />
          </button>
          <button className="btn-today" onClick={handleCurrentWeek}>
            Tuần này
          </button>
          <button
            className="nav-week-btn"
            onClick={handleNextWeek}
            title="Tuần sau"
          >
            <ChevronRight size={18} />
          </button>

          <div className="week-display">
            <h3 className="week-title">Lịch Đăng Ký Ca Làm Việc</h3>
            <p className="week-dates">
              Phạm vi: {weekStartStr} — {weekEndStr}
            </p>
          </div>
        </div>

        {/* Nút tác vụ quản lý */}
        <div className="shifts-actions">
          {/* Toggle Chế độ xem: Lịch / Bảng */}
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === "calendar" ? "active" : ""}`}
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon size={15} /> Lịch tuần
            </button>
            <button
              className={`view-mode-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              <Users size={15} /> Dạng bảng
            </button>
          </div>

          {/* Duyệt tất cả ca chờ */}
          <button
            className="btn-approve-all"
            onClick={handleApproveAll}
            disabled={pendingCount === 0 && allPendingShifts.length === 0}
            title={
              pendingCount > 0
                ? `Duyệt nhanh ${pendingCount} ca trong tuần đang xem`
                : allPendingShifts.length > 0
                ? `Duyệt toàn bộ ${allPendingShifts.length} ca chờ duyệt trên hệ thống`
                : "Không có ca nào chờ duyệt"
            }
          >
            <Check size={16} /> Duyệt tất cả (
            {pendingCount > 0 ? pendingCount : allPendingShifts.length})
          </button>

          {/* Thêm xếp ca mới */}
          <button
            className="btn-assign-shift"
            onClick={() => handleOpenAssignModal()}
          >
            <Plus size={16} /> Xếp ca trực tiếp
          </button>

          {/* Cấu hình 3 ca Part-time */}
          <button
            className="btn-secondary-action"
            style={{
              padding: "8px 14px",
              background: "#eff6ff",
              color: "#1d4ed8",
              borderColor: "#bfdbfe",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onClick={() => setShowConfigModal(true)}
            title="Cấu hình khung giờ 3 ca lẻ cho sinh viên Part-time (Ca 1, Ca 2, Ca 3)"
          >
            <Clock size={15} /> 3 Ca Part-time
          </button>

          {/* Reset dữ liệu */}
          <button
            className="btn-secondary-action"
            style={{ padding: "8px 12px" }}
            onClick={handleResetData}
            title="Đặt lại dữ liệu mẫu"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* ========================================================
          1. CHẾ ĐỘ XEM LỊCH (CALENDAR VIEW) - KÉO THẢ MƯỢT MÀ
          ======================================================== */}
      {viewMode === "calendar" && (
        <div className="shifts-calendar-wrapper">
          <div className="shifts-calendar-grid">
            {/* Cột góc Header */}
            <div className="calendar-corner-header">
              <span>CA / NGÀY</span>
            </div>

            {/* 7 Cột tiêu đề các ngày trong tuần */}
            {weekDays.map((day) => (
              <div
                key={day.dateKey}
                className={`calendar-day-header ${day.isToday ? "is-today" : ""}`}
              >
                <div className="day-name">{day.dayLabel}</div>
                <div className="day-date">{day.dateFormatted}</div>
                {day.isToday && <span className="today-tag">Hôm nay</span>}
              </div>
            ))}

            {/* 3 HÀNG CHO 3 CA: SÁNG, CHIỀU, TỐI */}
            {SHIFT_TYPES.map((shift) => (
              <React.Fragment key={shift.id}>
                {/* Tiêu đề loại ca ở cột đầu */}
                <div className="shift-row-header">
                  <div className={`shift-title-wrapper ${shift.colorClass}`}>
                    {shift.icon}
                    <span>{shift.name}</span>
                  </div>
                  <div className="shift-hours">{shift.time}</div>
                  <div className="shift-target">
                    Định mức: <strong>{shift.targetStaff} NV</strong>
                  </div>
                </div>

                {/* 7 Ô ca cho 7 ngày trong tuần */}
                {weekDays.map((day) => {
                  const slotKey = `${day.dateKey}_${shift.id}`;
                  // Lọc danh sách nhân viên trong ô này
                  const staffInSlot = shiftRegistrations.filter(
                    (item) =>
                      item.dateKey === day.dateKey &&
                      item.shiftType === shift.id
                  );

                  const approvedCountInSlot = staffInSlot.filter(
                    (s) => s.status === "approved"
                  ).length;
                  const isUnderstaffed =
                    approvedCountInSlot < shift.targetStaff;

                  return (
                    <div
                      key={slotKey}
                      className={`shift-slot ${
                        dragOverSlot === slotKey ? "drag-over" : ""
                      }`}
                      onDragOver={(e) =>
                        handleDragOver(e, day.dateKey, shift.id)
                      }
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day.dateKey, shift.id)}
                    >
                      {/* Tiêu đề ô ca: Số lượng & Nút thêm nhanh */}
                      <div className="shift-slot-header">
                        <span
                          className={`slot-staff-count ${
                            isUnderstaffed ? "warning" : ""
                          }`}
                          title={`Hiện có: ${approvedCountInSlot} đã duyệt / Cần: ${shift.targetStaff}`}
                        >
                          {approvedCountInSlot}/{shift.targetStaff} NV
                          {isUnderstaffed && (
                            <span style={{ marginLeft: 3 }}>⚠️</span>
                          )}
                        </span>

                        <button
                          className="btn-slot-add"
                          title="Xếp thêm nhân viên vào ca này"
                          onClick={() =>
                            handleOpenAssignModal(day.dateKey, shift.id)
                          }
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Danh sách thẻ nhân viên trong ca */}
                      {staffInSlot.length === 0 ? (
                        <div className="empty-slot-msg">Chưa có ai đăng ký</div>
                      ) : (
                        staffInSlot.map((item) => (
                          <div
                            key={item.id}
                            className={`shift-card status-${item.status} ${
                              draggedItem?.id === item.id ? "dragging" : ""
                            }`}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, item)}
                            title="Kéo thẻ này để thả sang ca khác"
                          >
                            <div className="shift-card-top">
                              <div className="shift-staff-info">
                                <div className="shift-staff-avatar">
                                  {item.staffName.charAt(0).toUpperCase()}
                                </div>
                                <span className="shift-staff-name">
                                  {item.staffName}
                                </span>
                              </div>
                            </div>

                            <div className="shift-card-mid">
                              <span className="shift-role-tag">
                                {item.role}
                              </span>
                              <span
                                className={`shift-status-tag ${item.status}`}
                              >
                                {item.status === "approved"
                                  ? "Đã duyệt"
                                  : item.status === "rejected"
                                  ? "Từ chối"
                                  : "Chờ duyệt"}
                              </span>
                            </div>

                            {/* Cụm nút duyệt nhanh trên thẻ */}
                            <div className="shift-card-actions">
                              {item.status !== "approved" && (
                                <button
                                  className="shift-btn-act approve"
                                  title="Phê duyệt ca làm"
                                  onClick={() =>
                                    handleApprove(item.id, item.staffName)
                                  }
                                >
                                  <Check size={13} />
                                </button>
                              )}

                              {item.status !== "rejected" && (
                                <button
                                  className="shift-btn-act reject"
                                  title="Từ chối ca làm"
                                  onClick={() =>
                                    handleReject(item.id, item.staffName)
                                  }
                                >
                                  <X size={13} />
                                </button>
                              )}

                              {/* Nút chuyển ca nhanh */}
                              <button
                                className="shift-btn-act move"
                                title="Chuyển sang ca khác"
                                onClick={() => handleOpenReassignModal(item)}
                              >
                                <ArrowRightLeft size={12} />
                              </button>

                              {/* Nút xóa */}
                              <button
                                className="shift-btn-act delete"
                                title="Hủy ca này"
                                onClick={() =>
                                  handleDeleteRegistration(
                                    item.id,
                                    item.staffName
                                  )
                                }
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          2. CHẾ ĐỘ XEM BẢNG (TABLE VIEW)
          ======================================================== */}
      {viewMode === "table" && (
        <div className="shifts-table-card">
          <div
            style={{
              padding: "16px 20px",
              display: "flex",
              gap: 12,
              background: "#ffffff",
              borderBottom: "1px solid #f1f5f9",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Filter size={15} color="#64748b" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Lọc theo:</span>
            </div>

            <select
              className="filter-select"
              value={tableFilterWeek}
              onChange={(e) => setTableFilterWeek(e.target.value)}
              style={{ fontWeight: 600, color: "#1e293b", borderColor: "#cbd5e1" }}
            >
              <option value="all">🌐 Toàn bộ ca trên hệ thống ({shiftRegistrations.length} ca)</option>
              <option value="pending_only">⏳ Chỉ các ca đang chờ duyệt ({allPendingShifts.length} ca)</option>
              <option value="current">📅 Tuần hiện tại ({weekStartStr} — {weekEndStr})</option>
            </select>

            <select
              className="filter-select"
              value={tableFilterStatus}
              onChange={(e) => setTableFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chỉ xem Chờ duyệt</option>
              <option value="approved">Đã phê duyệt</option>
              <option value="rejected">Bị từ chối</option>
            </select>

            <select
              className="filter-select"
              value={tableFilterShift}
              onChange={(e) => setTableFilterShift(e.target.value)}
            >
              <option value="all">Tất cả các ca</option>
              <option value="morning">Ca Sáng (07:00 - 12:00)</option>
              <option value="afternoon">Ca Chiều (12:00 - 17:00)</option>
              <option value="evening">Ca Tối (17:00 - 22:30)</option>
            </select>
          </div>

          <table className="shifts-table">
            <thead>
              <tr>
                <th>Mã ĐK</th>
                <th>Ngày làm việc</th>
                <th>Ca đăng ký</th>
                <th>Nhân viên</th>
                <th>Chuyên môn</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: "right" }}>Thao tác duyệt</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const baseShifts =
                  tableFilterWeek === "current"
                    ? currentWeekShifts
                    : tableFilterWeek === "pending_only"
                    ? allPendingShifts
                    : shiftRegistrations;

                const filteredRows = baseShifts.filter((item) => {
                  const matchStatus =
                    tableFilterStatus === "all" || item.status === tableFilterStatus;
                  const matchShift =
                    tableFilterShift === "all" || item.shiftType === tableFilterShift;
                  return matchStatus && matchShift;
                });

                if (filteredRows.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "36px 16px", color: "#64748b" }}>
                        Không có ca làm việc nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  );
                }

                const dayNamesMap = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

                return filteredRows.map((item) => {
                  const shiftObj = SHIFT_TYPES.find((s) => s.id === item.shiftType);
                  const dayObj = weekDays.find((w) => w.dateKey === item.dateKey);
                  const dayName =
                    dayObj?.dayLabel ||
                    (item.dateKey ? dayNamesMap[new Date(item.dateKey).getDay()] : "Ngày làm");

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong style={{ fontFamily: "monospace", color: "#2563eb" }}>
                          {item.id}
                        </strong>
                      </td>
                      <td>
                        <strong>{dayName}</strong> ({formatDateVN(item.dateKey)})
                      </td>
                      <td>
                        <span
                          className={`shift-title-wrapper ${shiftObj?.colorClass || "morning"}`}
                          style={{ fontSize: 13 }}
                        >
                          {shiftObj?.icon} {item.tenCaLam || shiftObj?.name} (
                          {item.gioBatDau
                            ? `${String(item.gioBatDau).slice(0, 5)} - ${String(item.gioKetThuc).slice(0, 5)}`
                            : shiftObj?.time})
                        </span>
                      </td>
                      <td>
                        <div className="emp-name-cell">
                          <div
                            className="emp-avatar"
                            style={{ width: 28, height: 28, fontSize: 12 }}
                          >
                            {(item.staffName || "NV").charAt(0).toUpperCase()}
                          </div>
                          <span className="emp-name">{item.staffName || "Nhân viên"}</span>
                        </div>
                      </td>
                      <td>
                        <span className="shift-role-tag">{item.role || "Nhân viên"}</span>
                      </td>
                      <td>
                        <span className={`shift-status-tag ${item.status}`}>
                          {item.status === "approved"
                            ? "Đã duyệt"
                            : item.status === "rejected"
                            ? "Từ chối"
                            : "Chờ duyệt"}
                        </span>
                      </td>
                      <td>
                        <div
                          className="emp-actions"
                          style={{ justifyContent: "flex-end" }}
                        >
                          {item.status !== "approved" && (
                            <button
                              className="btn-icon-action"
                              title="Duyệt ca"
                              style={{ color: "#16a34a" }}
                              onClick={() =>
                                handleApprove(item.id, item.staffName)
                              }
                            >
                              <Check size={16} />
                            </button>
                          )}
                          {item.status !== "rejected" && (
                            <button
                              className="btn-icon-action"
                              title="Từ chối"
                              style={{ color: "#dc2626" }}
                              onClick={() =>
                                handleReject(item.id, item.staffName)
                              }
                            >
                              <X size={16} />
                            </button>
                          )}
                          <button
                            className="btn-icon-action"
                            title="Chuyển ca"
                            onClick={() => handleOpenReassignModal(item)}
                          >
                            <ArrowRightLeft size={15} />
                          </button>
                          <button
                            className="btn-icon-action delete"
                            title="Xóa"
                            onClick={() =>
                              handleDeleteRegistration(item.id, item.staffName)
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================
          MODAL 1: CHUYỂN CA NHANH CHO NHÂN VIÊN (REASSIGN MODAL)
          ======================================================== */}
      {reassignModalItem && (
        <div
          className="shift-modal-overlay"
          onClick={() => setReassignModalItem(null)}
        >
          <div
            className="shift-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shift-modal-header">
              <h3>Chuyển ca làm việc cho nhân viên</h3>
              <button
                className="emp-modal-close"
                onClick={() => setReassignModalItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReassign}>
              <div className="shift-modal-body">
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
                    Nhân viên:{" "}
                    <strong style={{ color: "#0f172a" }}>
                      {reassignModalItem.staffName}
                    </strong>{" "}
                    ({reassignModalItem.role})
                  </p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#64748b" }}>
                    Ca hiện tại:{" "}
                    <strong>
                      {SHIFT_TYPES.find((s) => s.id === reassignModalItem.shiftType)?.name}
                    </strong>{" "}
                    - Ngày {formatDateVN(reassignModalItem.dateKey)}
                  </p>
                </div>

                <div className="shift-form-row">
                  <label>Chọn ngày mới trong tuần:</label>
                  <select
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                  >
                    {weekDays.map((d) => (
                      <option key={d.dateKey} value={d.dateKey}>
                        {d.dayLabel} ({d.dateFormatted}) {d.isToday ? "- Hôm nay" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="shift-form-row">
                  <label>Chọn ca làm việc mới:</label>
                  <select
                    value={newTargetShift}
                    onChange={(e) => setNewTargetShift(e.target.value)}
                  >
                    {SHIFT_TYPES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.time})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="shift-modal-footer">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setReassignModalItem(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-submit-save">
                  <ArrowRightLeft size={15} /> Xác nhận chuyển ca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: XẾP CA TRỰC TIẾP (ASSIGN STAFF MODAL)
          ======================================================== */}
      {showAssignModal && (
        <div
          className="shift-modal-overlay"
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className="shift-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shift-modal-header">
              <h3>Xếp ca làm việc trực tiếp</h3>
              <button
                className="emp-modal-close"
                onClick={() => setShowAssignModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAssign}>
              <div className="shift-modal-body">
                <div className="shift-form-row">
                  <label>Chọn nhân viên:</label>
                  <select
                    value={assignForm.staffId}
                    onChange={(e) => {
                      const selected = availableStaff.find(
                        (s) => s.id === e.target.value
                      );
                      setAssignForm({
                        ...assignForm,
                        staffId: selected.id,
                        staffName: selected.name,
                        role: selected.role,
                      });
                    }}
                  >
                    {availableStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} - {staff.role} ({staff.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="shift-form-row">
                  <label>Chọn ngày làm việc:</label>
                  <select
                    value={assignForm.date}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, date: e.target.value })
                    }
                  >
                    {weekDays.map((d) => (
                      <option key={d.dateKey} value={d.dateKey}>
                        {d.dayLabel} ({d.dateFormatted}) {d.isToday ? "- Hôm nay" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="shift-form-row">
                  <label>Chọn ca làm việc:</label>
                  <select
                    value={assignForm.shiftType}
                    onChange={(e) =>
                      setAssignForm({
                        ...assignForm,
                        shiftType: e.target.value,
                      })
                    }
                  >
                    {SHIFT_TYPES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.time})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="shift-modal-footer">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setShowAssignModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-submit-save">
                  <Plus size={15} /> Xếp vào ca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfigModal && (
        <PartTimeShiftConfig isModal={true} onClose={() => setShowConfigModal(false)} />
      )}
    </div>
  );
}
