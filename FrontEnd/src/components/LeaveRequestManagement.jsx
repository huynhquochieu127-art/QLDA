import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  RotateCcw,
  Plus,
  X,
  Check,
  Calendar,
  User,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import "../../css/leave_requests.css";
import { API_BASE } from "../config/api";

export default function LeaveRequestManagement({
  currentRole = "manager",
  onNavigateTab,
}) {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'approved' | 'rejected' | 'all'
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);

  // Modal phê duyệt (Approve)
  const [approveModalItem, setApproveModalItem] = useState(null);
  const [submittingApprove, setSubmittingApprove] = useState(false);

  // Modal từ chối (Reject)
  const [rejectModalItem, setRejectModalItem] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  // Modal tạo đơn mới (Create)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    maNhanVien: "",
    ngayNghi: new Date().toISOString().slice(0, 10),
    ngayNghiDen: "",
    loaiNghi: "phep",
    lyDo: "",
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [previewShiftOverlap, setPreviewShiftOverlap] = useState(null);

  // Lấy dữ liệu ca làm đã xếp từ Database CSDL (bảng dangky_ca)
  const [dbShifts, setDbShifts] = useState([]);
  useEffect(() => {
    axios
      .get(`${API_BASE}/shifts/registrations`)
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setDbShifts(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Show Toast helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch danh sách đơn xin nghỉ
  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/leave-requests`);
      if (res.data?.success) {
        let list = res.data.data || [];

        // Kết hợp kiểm tra chéo với cả localStorage xếp ca (QH-40)
        list = list.map((item) => {
          let hasOverlap = item.hasAssignedShift;
          let shiftText = item.assignedShiftText || "";
          let shiftWarning = item.shiftWarning || "";

          // Kiểm tra thêm trong dbShifts nếu cần
          if (!hasOverlap && dbShifts.length > 0) {
            const matchedLocal = dbShifts.find((s) => {
              const matchDate = s.dateKey === item.NgayNghi;
              const matchStaff =
                s.staffId === item.MaNhanVienCode ||
                (s.staffName &&
                  item.TenNhanVien &&
                  s.staffName.toLowerCase() === item.TenNhanVien.toLowerCase());
              const isApproved = s.status === "approved";
              return matchDate && matchStaff && isApproved;
            });

            if (matchedLocal) {
              hasOverlap = true;
              const shiftMapName = {
                morning: "Ca Sáng (07:00 - 12:00)",
                afternoon: "Ca Chiều (12:00 - 17:00)",
                evening: "Ca Tối (17:00 - 22:30)",
              };
              shiftText =
                shiftMapName[matchedLocal.shiftType] || matchedLocal.shiftType;
              shiftWarning = `Đã xếp ${shiftText}! Cần người làm thay thế.`;
            }
          }

          return {
            ...item,
            hasAssignedShift: hasOverlap,
            assignedShiftText: shiftText,
            shiftWarning: shiftWarning,
          };
        });

        setRequests(list);
      }
    } catch (err) {
      console.error("Lỗi khi tải đơn xin nghỉ:", err);
      showToast("Không thể tải danh sách đơn xin nghỉ từ máy chủ!", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch danh sách nhân viên để chọn khi tạo đơn
  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE}/employees`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setEmployees(res.data.data);
        if (res.data.data.length > 0 && !createForm.maNhanVien) {
          setCreateForm((prev) => ({
            ...prev,
            maNhanVien: res.data.data[0].rawId || res.data.data[0].id,
          }));
        }
      }
    } catch (err) {
      console.warn("Lỗi tải danh sách nhân viên:", err);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
    fetchEmployees();
  }, []);

  // Mở Modal Phê duyệt (Approve)
  const handleOpenApproveModal = (item) => {
    setApproveModalItem(item);
  };

  // Xác nhận Phê duyệt (Approve - Gọi API Backend)
  const handleConfirmApprove = async () => {
    if (!approveModalItem) return;

    setSubmittingApprove(true);
    try {
      const res = await axios.patch(
        `${API_BASE}/leave-requests/${approveModalItem.MaDon}/status`,
        {
          status: "approved",
          ghiChuQL: "Đã phê duyệt",
        }
      );

      if (res.data?.success) {
        showToast(
          approveModalItem.hasAssignedShift
            ? `✅ Đã duyệt đơn nghỉ cho ${approveModalItem.TenNhanVien}! (Lưu ý tìm người thay ca ${approveModalItem.assignedShiftText})`
            : `✅ Đã phê duyệt đơn xin nghỉ thành công!`
        );
        setApproveModalItem(null);
        fetchLeaveRequests();
      }
    } catch (err) {
      console.error("Lỗi phê duyệt đơn:", err);
      showToast(
        err.response?.data?.message || "Lỗi khi cập nhật trạng thái đơn!",
        "error"
      );
    } finally {
      setSubmittingApprove(false);
    }
  };

  // Mở modal Từ chối (Reject)
  const handleOpenRejectModal = (item) => {
    setRejectModalItem(item);
    setRejectReason("");
  };

  // Xử lý Xác nhận Từ chối (Reject - Màu Đỏ kèm theo ô nhập lý do từ chối)
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectModalItem) return;

    setSubmittingReject(true);
    try {
      const res = await axios.patch(
        `${API_BASE}/leave-requests/${rejectModalItem.MaDon}/status`,
        {
          status: "rejected",
          ghiChuQL: rejectReason.trim(),
        }
      );

      if (res.data?.success) {
        showToast(
          `❌ Đã từ chối đơn xin nghỉ của ${rejectModalItem.TenNhanVien}!`,
          "success"
        );
        setRejectModalItem(null);
        setRejectReason("");
        fetchLeaveRequests();
      }
    } catch (err) {
      console.error("Lỗi từ chối đơn:", err);
      showToast(
        err.response?.data?.message || "Lỗi khi từ chối đơn xin nghỉ!",
        "error"
      );
    } finally {
      setSubmittingReject(false);
    }
  };

  // Xử lý hoàn tác hoặc đổi trạng thái lại sang Pending nếu cần
  const handleReopenToPending = async (item) => {
    if (!window.confirm("Chuyển đơn này trở lại trạng thái Chờ xử lý?")) return;
    try {
      await axios.patch(`${API_BASE}/leave-requests/${item.MaDon}/status`, {
        status: "pending",
        ghiChuQL: "",
      });
      showToast("Đã chuyển đơn về trạng thái Chờ xử lý!");
      fetchLeaveRequests();
    } catch (err) {
      showToast("Lỗi khi cập nhật trạng thái đơn!", "error");
    }
  };

  // Xử lý gửi đơn mới (Create Leave Request)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.maNhanVien || !createForm.ngayNghi || !createForm.lyDo) {
      alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }

    setSubmittingCreate(true);
    try {
      const res = await axios.post(`${API_BASE}/leave-requests`, createForm);
      if (res.data?.success) {
        showToast("Đã tạo đơn xin nghỉ thành công!");
        setShowCreateModal(false);
        setCreateForm({
          maNhanVien: employees[0]?.rawId || employees[0]?.id || "",
          ngayNghi: new Date().toISOString().slice(0, 10),
          ngayNghiDen: "",
          loaiNghi: "phep",
          lyDo: "",
        });
        setPreviewShiftOverlap(null);
        fetchLeaveRequests();
      }
    } catch (err) {
      console.error("Lỗi tạo đơn:", err);
      showToast(
        err.response?.data?.message || "Lỗi khi gửi đơn xin nghỉ!",
        "error"
      );
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Kiểm tra preview trùng ca khi đang nhập form tạo đơn
  const handleCheckOverlapOnForm = (empId, date) => {
    if (!empId || !date) {
      setPreviewShiftOverlap(null);
      return;
    }
    const matched = localShifts.find(
      (s) =>
        (s.staffId === empId || String(s.staffId).includes(String(empId))) &&
        s.dateKey === date &&
        s.status === "approved"
    );
    if (matched) {
      const shiftMapName = {
        morning: "Ca Sáng (07:00 - 12:00)",
        afternoon: "Ca Chiều (12:00 - 17:00)",
        evening: "Ca Tối (17:00 - 22:30)",
      };
      setPreviewShiftOverlap(
        shiftMapName[matched.shiftType] || matched.shiftType
      );
    } else {
      setPreviewShiftOverlap(null);
    }
  };

  // Thống kê số lượng
  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.TrangThai === "pending").length;
    const approved = requests.filter((r) => r.TrangThai === "approved").length;
    const rejected = requests.filter((r) => r.TrangThai === "rejected").length;
    const overlapPending = requests.filter(
      (r) => r.TrangThai === "pending" && r.hasAssignedShift
    ).length;
    return {
      total: requests.length,
      pending,
      approved,
      rejected,
      overlapPending,
    };
  }, [requests]);

  // Lọc danh sách theo Tab và Từ khóa tìm kiếm
  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      // Lọc theo Tab
      if (activeTab === "pending" && item.TrangThai !== "pending") return false;
      if (activeTab === "approved" && item.TrangThai !== "approved")
        return false;
      if (activeTab === "rejected" && item.TrangThai !== "rejected")
        return false;

      // Lọc theo Từ khóa tìm kiếm
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = (item.TenNhanVien || "").toLowerCase().includes(term);
        const matchCode = (item.MaNhanVienCode || "")
          .toLowerCase()
          .includes(term);
        const matchReason = (item.LyDo || "").toLowerCase().includes(term);
        if (!matchName && !matchCode && !matchReason) return false;
      }

      return true;
    });
  }, [requests, activeTab, searchTerm]);

  // Format ngày tháng tiếng Việt thân thiện
  const formatDateVN = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const days = [
        "Chủ Nhật",
        "Thứ Hai",
        "Thứ Ba",
        "Thứ Tư",
        "Thứ Năm",
        "Thứ Sáu",
        "Thứ Bảy",
      ];
      const dayName = days[d.getDay()];
      const formatted = d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      return { dayName, formatted };
    } catch (_) {
      return { dayName: "", formatted: dateStr };
    }
  };

  const getLoaiNghiBadge = (loai) => {
    switch (loai) {
      case "om":
        return <span className="reason-type-badge om">Nghỉ Ốm</span>;
      case "viec_rieng":
        return (
          <span className="reason-type-badge viec_rieng">Việc Riêng</span>
        );
      case "khac":
        return <span className="reason-type-badge khac">Khác</span>;
      default:
        return <span className="reason-type-badge phep">Nghỉ Phép</span>;
    }
  };

  return (
    <div className="leave-management-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`leave-toast ${toast.type}`}>
          {toast.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. HEADER SECTION */}
      <div className="leave-header">
        <div className="leave-header-title">
          <FileSpreadsheet size={32} style={{ color: "#d97706" }} />
          <div>
            <h1>Dashboard Quản Lý Đơn Xin Nghỉ Phép</h1>
            <p>
              Theo dõi, phê duyệt đơn xin nghỉ và cảnh báo trùng ca làm việc đã
              xếp (QH-40)
            </p>
          </div>
        </div>

        <div className="leave-header-actions">
          <button
            className="btn-secondary"
            onClick={fetchLeaveRequests}
            title="Làm mới danh sách"
          >
            <RotateCcw size={16} /> Làm mới
          </button>
          <button
            className="btn-approve"
            style={{ backgroundColor: "#2563eb" }}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} /> Tạo đơn xin nghỉ
          </button>
        </div>
      </div>

      {/* 2. STATS KPI CARDS */}
      <div className="leave-stats-grid">
        <div
          className="leave-stat-card"
          onClick={() => setActiveTab("pending")}
          style={{
            cursor: "pointer",
            borderColor: activeTab === "pending" ? "#f59e0b" : "",
          }}
        >
          <div className="leave-stat-icon pending">
            <Clock size={24} />
          </div>
          <div className="leave-stat-info">
            <h3>{stats.pending}</h3>
            <span>Đang Chờ Xử Lý</span>
          </div>
        </div>

        <div
          className="leave-stat-card"
          onClick={() => setActiveTab("pending")}
          style={{ cursor: "pointer" }}
        >
          <div className="leave-stat-icon warning">
            <AlertTriangle size={24} />
          </div>
          <div className="leave-stat-info">
            <h3>{stats.overlapPending}</h3>
            <span>Trùng Ca Cần Thay (QH-40)</span>
          </div>
        </div>

        <div
          className="leave-stat-card"
          onClick={() => setActiveTab("approved")}
          style={{
            cursor: "pointer",
            borderColor: activeTab === "approved" ? "#16a34a" : "",
          }}
        >
          <div className="leave-stat-icon approved">
            <CheckCircle2 size={24} />
          </div>
          <div className="leave-stat-info">
            <h3>{stats.approved}</h3>
            <span>Đã Phê Duyệt</span>
          </div>
        </div>

        <div
          className="leave-stat-card"
          onClick={() => setActiveTab("rejected")}
          style={{
            cursor: "pointer",
            borderColor: activeTab === "rejected" ? "#dc2626" : "",
          }}
        >
          <div className="leave-stat-icon rejected">
            <XCircle size={24} />
          </div>
          <div className="leave-stat-info">
            <h3>{stats.rejected}</h3>
            <span>Đã Từ Chối</span>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR & FILTERS */}
      <div className="leave-toolbar">
        <div className="leave-tabs">
          <button
            className={`leave-tab-btn ${
              activeTab === "pending" ? "active" : ""
            }`}
            onClick={() => setActiveTab("pending")}
          >
            <Clock size={16} /> Chờ xử lý
            <span className="leave-tab-badge pending">{stats.pending}</span>
          </button>
          <button
            className={`leave-tab-btn ${
              activeTab === "approved" ? "active" : ""
            }`}
            onClick={() => setActiveTab("approved")}
          >
            <CheckCircle2 size={16} /> Đã duyệt
            <span className="leave-tab-badge">{stats.approved}</span>
          </button>
          <button
            className={`leave-tab-btn ${
              activeTab === "rejected" ? "active" : ""
            }`}
            onClick={() => setActiveTab("rejected")}
          >
            <XCircle size={16} /> Đã từ chối
            <span className="leave-tab-badge">{stats.rejected}</span>
          </button>
          <button
            className={`leave-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            Tất cả đơn
            <span className="leave-tab-badge">{stats.total}</span>
          </button>
        </div>

        <div className="leave-search-box">
          <Search size={16} style={{ color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Tìm theo tên NV, mã NV hoặc lý do..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "#94a3b8",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN TABLE DASHBOARD */}
      <div className="leave-table-card">
        <div className="leave-table-responsive">
          <table className="leave-table">
            <thead>
              <tr>
                <th style={{ width: "90px" }}>Mã Đơn</th>
                <th>Tên Nhân Viên</th>
                <th>Ngày Xin Nghỉ</th>
                <th style={{ minWidth: "220px" }}>Lý Do</th>
                <th>Cảnh Báo Xếp Ca (QH-40)</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: "center", minWidth: "200px" }}>
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    Đang tải dữ liệu từ hệ thống...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="leave-empty-state">
                      <FileSpreadsheet
                        size={48}
                        className="leave-empty-icon"
                      />
                      <h3>Không có đơn xin nghỉ nào</h3>
                      <p>
                        {activeTab === "pending"
                          ? "Hiện tại không có đơn xin nghỉ nào đang chờ xử lý."
                          : "Không tìm thấy dữ liệu phù hợp với bộ lọc hiện tại."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((item) => {
                  const dateInfo = formatDateVN(item.NgayNghi);
                  const isPending = item.TrangThai === "pending";
                  const isApproved = item.TrangThai === "approved";
                  const isRejected = item.TrangThai === "rejected";

                  return (
                    <tr
                      key={item.MaDon}
                      className={
                        isPending && item.hasAssignedShift
                          ? "has-overlap"
                          : ""
                      }
                    >
                      {/* Cột Mã Đơn */}
                      <td>
                        <strong style={{ color: "#475569" }}>
                          #{item.MaDon}
                        </strong>
                      </td>

                      {/* Cột Tên Nhân Viên */}
                      <td>
                        <div className="emp-cell">
                          <div className="emp-avatar">
                            {(item.TenNhanVien || "NV")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="emp-info">
                            <span className="emp-name">
                              {item.TenNhanVien || "Chưa rõ họ tên"}
                            </span>
                            <span className="emp-code">
                              {item.MaNhanVienCode ||
                                `NV${String(item.MaNhanVien).padStart(
                                  3,
                                  "0"
                                )}`}
                              {item.ChucVu && (
                                <span className="emp-role-tag">
                                  {item.ChucVu}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột Ngày Xin Nghỉ */}
                      <td>
                        <div className="date-cell">
                          <span className="date-main">
                            {dateInfo.formatted}
                          </span>
                          <span className="date-day">{dateInfo.dayName}</span>
                          {item.NgayNghiDen &&
                            item.NgayNghiDen !== item.NgayNghi && (
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#64748b",
                                }}
                              >
                                Đến: {formatDateVN(item.NgayNghiDen).formatted}
                              </span>
                            )}
                        </div>
                      </td>

                      {/* Cột Lý Do */}
                      <td>
                        <div className="reason-cell">
                          {getLoaiNghiBadge(item.LoaiNghi)}
                          <div className="reason-text">{item.LyDo}</div>
                        </div>
                      </td>

                      {/* Cột Cảnh Báo Xếp Ca (QH-40) */}
                      <td>
                        {item.hasAssignedShift ? (
                          <div className="shift-warning-badge">
                            <AlertTriangle
                              size={16}
                              style={{ color: "#d97706", flexShrink: 0 }}
                            />
                            <div>
                              <div>
                                <strong>Đã xếp ca:</strong>{" "}
                                {item.assignedShiftText}
                              </div>
                              <span
                                style={{
                                  color: "#b45309",
                                  fontWeight: "500",
                                }}
                              >
                                ⚠️ Cần tìm người làm thay thế!
                              </span>
                              {onNavigateTab && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onNavigateTab("shifts_approval")
                                  }
                                  style={{
                                    display: "block",
                                    marginTop: "3px",
                                    background: "none",
                                    border: "none",
                                    color: "#2563eb",
                                    fontSize: "0.72rem",
                                    padding: 0,
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                  }}
                                >
                                  Mở lịch ca (QH-40) &rarr;
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="shift-no-overlap">
                            Không trùng ca làm
                          </span>
                        )}
                      </td>

                      {/* Cột Trạng Thái */}
                      <td>
                        {isPending && (
                          <span className="status-badge pending">
                            <Clock size={12} /> Chờ xử lý
                          </span>
                        )}
                        {isApproved && (
                          <span className="status-badge approved">
                            <CheckCircle2 size={12} /> Đã duyệt
                          </span>
                        )}
                        {isRejected && (
                          <div>
                            <span className="status-badge rejected">
                              <XCircle size={12} /> Đã từ chối
                            </span>
                            {item.GhiChuQL && (
                              <span
                                className="reject-note"
                                title={item.GhiChuQL}
                              >
                                Lý do: {item.GhiChuQL}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Cột Thao Tác (2 nút Phê duyệt - Xanh & Từ chối - Đỏ) */}
                      <td>
                        <div
                          className="action-buttons-group"
                          style={{ justifyContent: "center" }}
                        >
                          {isPending ? (
                            <>
                              {/* NÚT PHÊ DUYỆT (APPROVE - MÀU XANH) */}
                              <button
                                className="btn-approve"
                                onClick={() => handleOpenApproveModal(item)}
                                title="Phê duyệt đơn này"
                              >
                                <Check size={15} /> Phê duyệt
                              </button>

                              {/* NÚT TỪ CHỐI (REJECT - MÀU ĐỎ KÈM Ô NHẬP LÝ DO) */}
                              <button
                                className="btn-reject"
                                onClick={() => handleOpenRejectModal(item)}
                                title="Từ chối đơn này (nhập lý do)"
                              >
                                <X size={15} /> Từ chối
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn-reopen"
                              onClick={() => handleReopenToPending(item)}
                              title="Chuyển lại về trạng thái Chờ xử lý để duyệt lại"
                            >
                              <RotateCcw size={12} /> Đổi trạng thái
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5A. MODAL XÁC NHẬN PHÊ DUYỆT (APPROVE MODAL KÈM CẢNH BÁO QH-40) */}
      {/* ========================================================================= */}
      {approveModalItem && (
        <div className="leave-modal-overlay">
          <div className="leave-modal-content">
            <div
              className="leave-modal-header"
              style={{ backgroundColor: "#f0fdf4", color: "#166534" }}
            >
              <h3>
                <CheckCircle2 size={20} /> Xác Nhận Phê Duyệt Đơn Nghỉ Phép
              </h3>
              <button
                className="leave-modal-close-btn"
                onClick={() => setApproveModalItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="leave-modal-body">
              <div className="leave-modal-info-box">
                <div>
                  <strong>Nhân viên:</strong> {approveModalItem.TenNhanVien} (
                  {approveModalItem.MaNhanVienCode ||
                    `NV${approveModalItem.MaNhanVien}`}
                  )
                </div>
                <div>
                  <strong>Ngày xin nghỉ:</strong>{" "}
                  {formatDateVN(approveModalItem.NgayNghi).formatted} (
                  {formatDateVN(approveModalItem.NgayNghi).dayName})
                </div>
                <div>
                  <strong>Lý do nhân viên gửi:</strong>{" "}
                  <em>"{approveModalItem.LyDo}"</em>
                </div>
              </div>

              {approveModalItem.hasAssignedShift ? (
                <div
                  style={{
                    backgroundColor: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "8px",
                    padding: "12px",
                    color: "#92400e",
                    fontSize: "0.875rem",
                    lineHeight: "1.4",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: "700",
                      marginBottom: "4px",
                    }}
                  >
                    <AlertTriangle size={18} style={{ color: "#d97706" }} />
                    CẢNH BÁO XẾP CA (QH-40):
                  </div>
                  <div>
                    Nhân viên đã được Quản lý xếp ca:{" "}
                    <strong>{approveModalItem.assignedShiftText}</strong> vào
                    ngày này!
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      color: "#b45309",
                      fontWeight: "500",
                    }}
                  >
                    👉 Sau khi phê duyệt, Quản lý cần chủ động sắp xếp hoặc phân
                    công nhân sự thay thế ca này để không gián đoạn hoạt động của
                    quán.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    color: "#166534",
                    fontSize: "0.875rem",
                    backgroundColor: "#f0fdf4",
                    padding: "10px 12px",
                    borderRadius: "6px",
                  }}
                >
                  ✓ Ngày này nhân viên chưa có ca làm việc được phân công.
                </div>
              )}
            </div>

            <div className="leave-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setApproveModalItem(null)}
                disabled={submittingApprove}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-approve"
                onClick={handleConfirmApprove}
                disabled={submittingApprove}
              >
                {submittingApprove ? (
                  "Đang phê duyệt..."
                ) : (
                  <>
                    <Check size={16} /> Xác nhận Phê duyệt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5B. MODAL TỪ CHỐI ĐƠN (REJECT MODAL VỚI Ô NHẬP LÝ DO) */}
      {/* ========================================================================= */}
      {rejectModalItem && (
        <div className="leave-modal-overlay">
          <div className="leave-modal-content">
            <div className="leave-modal-header reject-header">
              <h3>
                <XCircle size={20} /> Từ Chối Đơn Xin Nghỉ Phép
              </h3>
              <button
                className="leave-modal-close-btn"
                onClick={() => setRejectModalItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject}>
              <div className="leave-modal-body">
                <div className="leave-modal-info-box">
                  <div>
                    <strong>Nhân viên:</strong>{" "}
                    {rejectModalItem.TenNhanVien} (
                    {rejectModalItem.MaNhanVienCode ||
                      `NV${rejectModalItem.MaNhanVien}`}
                    )
                  </div>
                  <div>
                    <strong>Ngày xin nghỉ:</strong>{" "}
                    {formatDateVN(rejectModalItem.NgayNghi).formatted} (
                    {formatDateVN(rejectModalItem.NgayNghi).dayName})
                  </div>
                  <div>
                    <strong>Lý do nhân viên gửi:</strong>{" "}
                    <em>"{rejectModalItem.LyDo}"</em>
                  </div>
                  {rejectModalItem.hasAssignedShift && (
                    <div
                      style={{
                        marginTop: "6px",
                        color: "#b45309",
                        fontWeight: "600",
                      }}
                    >
                      ⚠️ Ca làm đã xếp: {rejectModalItem.assignedShiftText}
                    </div>
                  )}
                </div>

                <label
                  style={{
                    display: "block",
                    fontWeight: "600",
                    marginBottom: "6px",
                    color: "#334155",
                  }}
                >
                  Nhập lý do từ chối (để nhân viên nắm bắt lý do):
                </label>

                {/* Gợi ý lý do nhanh */}
                <div className="quick-reasons-wrap">
                  {[
                    "Quán thiếu người trực ca này",
                    "Ngày cao điểm cuối tuần đông khách",
                    "Cần báo trước tối thiểu 24 giờ",
                    "Trùng lịch nghỉ với nhân viên cùng vị trí",
                  ].map((quick, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="quick-reason-btn"
                      onClick={() => setRejectReason(quick)}
                    >
                      + {quick}
                    </button>
                  ))}
                </div>

                <textarea
                  rows="4"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Ngày này quán đông khách thiếu người trực, không thể duyệt nghỉ đột xuất..."
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    boxSizing: "border-box",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                  autoFocus
                ></textarea>
              </div>

              <div className="leave-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setRejectModalItem(null)}
                  disabled={submittingReject}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-reject"
                  disabled={submittingReject}
                >
                  {submittingReject ? (
                    "Đang xử lý..."
                  ) : (
                    <>
                      <X size={16} /> Xác nhận từ chối
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL TẠO ĐƠN XIN NGHỈ PHÉP MỚI */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="leave-modal-overlay">
          <div className="leave-modal-content">
            <div className="leave-modal-header create-header">
              <h3>
                <FileSpreadsheet size={20} /> Tạo Đơn Xin Nghỉ Phép Mới
              </h3>
              <button
                className="leave-modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="leave-modal-body">
                {/* Chọn nhân viên */}
                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: "600",
                      marginBottom: "4px",
                    }}
                  >
                    Nhân viên xin nghỉ (*)
                  </label>
                  <select
                    value={createForm.maNhanVien}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreateForm({ ...createForm, maNhanVien: val });
                      handleCheckOverlapOnForm(val, createForm.ngayNghi);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                    }}
                    required
                  >
                    {employees.map((emp) => (
                      <option
                        key={emp.rawId || emp.id}
                        value={emp.rawId || emp.id}
                      >
                        {emp.code || emp.id} - {emp.name || emp.fullName} (
                        {emp.role || emp.chucVu || "Nhân viên"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chọn ngày nghỉ */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontWeight: "600",
                        marginBottom: "4px",
                      }}
                    >
                      Ngày bắt đầu nghỉ (*)
                    </label>
                    <input
                      type="date"
                      value={createForm.ngayNghi}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCreateForm({ ...createForm, ngayNghi: val });
                        handleCheckOverlapOnForm(createForm.maNhanVien, val);
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontWeight: "600",
                        marginBottom: "4px",
                      }}
                    >
                      Đến ngày (tùy chọn)
                    </label>
                    <input
                      type="date"
                      value={createForm.ngayNghiDen}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          ngayNghiDen: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                      }}
                    />
                  </div>
                </div>

                {/* Cảnh báo trùng ca làm real-time nếu có */}
                {previewShiftOverlap && (
                  <div
                    style={{
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      color: "#92400e",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "0.8125rem",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>
                      <strong>Cảnh báo QH-40:</strong> Nhân viên này đã được xếp{" "}
                      <strong>{previewShiftOverlap}</strong> vào ngày này!
                    </span>
                  </div>
                )}

                {/* Loại nghỉ phép */}
                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: "600",
                      marginBottom: "4px",
                    }}
                  >
                    Loại nghỉ
                  </label>
                  <select
                    value={createForm.loaiNghi}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, loaiNghi: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <option value="phep">Nghỉ phép định kỳ / Phép năm</option>
                    <option value="om">Nghỉ ốm / Khám chữa bệnh</option>
                    <option value="viec_rieng">Việc riêng gia đình</option>
                    <option value="khac">Lý do khác</option>
                  </select>
                </div>

                {/* Lý do xin nghỉ */}
                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: "600",
                      marginBottom: "4px",
                    }}
                  >
                    Lý do xin nghỉ chi tiết (*)
                  </label>
                  <textarea
                    rows="3"
                    value={createForm.lyDo}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, lyDo: e.target.value })
                    }
                    placeholder="Nhập lý do chi tiết..."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                    }}
                    required
                  ></textarea>
                </div>
              </div>

              <div className="leave-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submittingCreate}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-approve"
                  style={{ backgroundColor: "#2563eb" }}
                  disabled={submittingCreate}
                >
                  {submittingCreate ? (
                    "Đang gửi..."
                  ) : (
                    <>
                      <Check size={16} /> Gửi đơn xin nghỉ
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
