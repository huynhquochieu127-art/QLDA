import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  Search,
  Award,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  Copy,
  Calendar,
  AlertCircle,
  TrendingDown,
  Sparkles,
} from "lucide-react";

const formatVND = (num) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num || 0);

const EMPTY_FORM = {
  maCode: "",
  tenMG: "",
  loaiGiam: "percent",
  giaTriGiam: "",
  giaTriToiDa: "",
  diemToiThieu: 50, // Mặc định gợi ý mốc 50 điểm
  donHangToiThieu: "",
  gioiHanDung: "",
  ngayBatDau: new Date().toISOString().split("T")[0],
  ngayHetHan: "",
  trangThai: 1,
};

export default function DiscountManagement({ currentRole }) {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Toggle loading per id
  const [togglingId, setTogglingId] = useState(null);

  const fetchDiscounts = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (filterType !== "all") params.type = filterType;
      if (filterStatus !== "all") params.status = filterStatus;

      const res = await axios.get("http://localhost:5000/api/discounts", { params });
      setDiscounts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, [filterType, filterStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDiscounts();
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      maCode: item.MaCode || "",
      tenMG: item.TenMG || "",
      loaiGiam: item.LoaiGiam || "percent",
      giaTriGiam: item.GiaTriGiam || "",
      giaTriToiDa: item.GiaTriToiDa || "",
      diemToiThieu: item.DiemToiThieu !== undefined ? item.DiemToiThieu : 0,
      donHangToiThieu: item.DonHangToiThieu || "",
      gioiHanDung: item.GioiHanDung || "",
      ngayBatDau: item.NgayBatDau ? item.NgayBatDau.split("T")[0] : "",
      ngayHetHan: item.NgayHetHan ? item.NgayHetHan.split("T")[0] : "",
      trangThai: item.TrangThai !== undefined ? item.TrangThai : 1,
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.maCode.trim() || !form.tenMG.trim() || form.giaTriGiam === "") {
      return setFormError("Vui lòng điền đầy đủ Mã Code, Tên chiến dịch và Mức giảm!");
    }
    if (Number(form.giaTriGiam) <= 0) {
      return setFormError("Mức giảm phải lớn hơn 0!");
    }
    if (form.loaiGiam === "percent" && Number(form.giaTriGiam) > 100) {
      return setFormError("Giảm theo % không được vượt quá 100%!");
    }
    if (Number(form.diemToiThieu) < 0) {
      return setFormError("Mốc điểm tích lũy không được âm!");
    }

    setSaving(true);
    setFormError("");

    try {
      if (editingItem) {
        await axios.put(`http://localhost:5000/api/discounts/${editingItem.MaMG}`, form);
        setNotice(`Đã cập nhật chiến dịch "${form.maCode.toUpperCase()}" thành công!`);
      } else {
        await axios.post("http://localhost:5000/api/discounts", form);
        setNotice(
          `Đã tạo chiến dịch mã "${form.maCode.toUpperCase()}" (Yêu cầu tối thiểu ${form.diemToiThieu} điểm) thành công!`
        );
      }
      setShowModal(false);
      fetchDiscounts();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus, code) => {
    const nextStatus = currentStatus === 1 ? 0 : 1;
    setTogglingId(id);

    // Optimistic UI
    setDiscounts((prev) =>
      prev.map((d) => (d.MaMG === id ? { ...d, TrangThai: nextStatus } : d))
    );

    try {
      await axios.patch(`http://localhost:5000/api/discounts/${id}/status`, {
        trangThai: nextStatus,
      });
      setNotice(
        `Đã ${nextStatus ? "kích hoạt" : "tạm dừng"} chiến dịch mã "${code}"!`
      );
    } catch (err) {
      // Revert
      setDiscounts((prev) =>
        prev.map((d) => (d.MaMG === id ? { ...d, TrangThai: currentStatus } : d))
      );
      alert("Lỗi cập nhật trạng thái: " + (err.response?.data?.message || err.message));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã giảm giá "${code}" không?`)) return;
    try {
      await axios.delete(`http://localhost:5000/api/discounts/${id}`);
      setNotice(`Đã xóa thành công mã "${code}"!`);
      fetchDiscounts();
    } catch (err) {
      alert("Lỗi khi xóa mã: " + (err.response?.data?.message || err.message));
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setNotice(`Đã sao chép mã "${code}" vào bộ nhớ tạm!`);
  };

  const canEdit = currentRole === "admin" || currentRole === "manager";

  // Thống kê số liệu
  const totalCodes = discounts.length;
  const activeCodes = discounts.filter((d) => d.TrangThai === 1).length;
  const pointConstrainedCodes = discounts.filter((d) => (d.DiemToiThieu || 0) > 0).length;

  return (
    <div className="customers-view" style={{ maxWidth: "1280px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <h2 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Tag size={26} style={{ color: "#7c3aed" }} />
            Thiết Lập Chiến Dịch Mã Giảm Giá
          </h2>
          <p className="page-subtitle">
            Tạo và quản lý mã coupon (VD: <strong>GIAM10%</strong>, <strong>TRU20K</strong>) kèm điều kiện ràng buộc <strong>Mốc điểm tích lũy</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="btn-refresh"
            onClick={fetchDiscounts}
            style={{
              padding: "10px 14px",
              background: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            <RefreshCw size={16} className={loading ? "spinner" : ""} />
            <span>Làm mới</span>
          </button>

          {canEdit && (
            <button
              type="button"
              className="btn-add-customer"
              onClick={openAddModal}
              style={{
                padding: "12px 22px",
                fontSize: "15px",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(124, 58, 237, 0.35)",
              }}
            >
              <Plus size={20} /> Tạo mã giảm giá mới
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: 500 }}>Tổng số mã chiến dịch</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#111827", marginTop: "4px" }}>{totalCodes}</div>
        </div>

        <div style={{ background: "#f0fdf4", padding: "16px 20px", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "13px", color: "#166534", fontWeight: 500 }}>Đang hoạt động</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#15803d", marginTop: "4px" }}>{activeCodes}</div>
        </div>

        <div style={{ background: "#fffbeb", padding: "16px 20px", borderRadius: "12px", border: "1px solid #fde68a" }}>
          <div style={{ fontSize: "13px", color: "#92400e", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
            <Award size={15} style={{ color: "#d97706" }} /> Có ràng buộc Mốc điểm
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#b45309", marginTop: "4px" }}>
            {pointConstrainedCodes} <span style={{ fontSize: "14px", fontWeight: 500 }}>chiến dịch</span>
          </div>
        </div>
      </div>

      {/* Notice Message */}
      {notice && (
        <div
          style={{
            marginBottom: "16px",
            padding: "10px 16px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#166534",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#166534" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", flex: "1 1 280px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type="text"
              placeholder="Tìm theo Mã code (VD: GIAM10%, TRU20K) hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px 9px 36px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                background: "#fff",
              }}
            />
            <Search
              size={16}
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "9px 16px",
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Tìm
          </button>
        </form>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: "9px 14px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            background: "#fff",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          <option value="all">⚡ Tất cả loại giảm</option>
          <option value="percent">Giảm theo %</option>
          <option value="fixed">Giảm số tiền cố định (VNĐ)</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: "9px 14px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            background: "#fff",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          <option value="all">📋 Tất cả trạng thái</option>
          <option value="1">🟢 Đang hoạt động</option>
          <option value="0">⚪ Đã tạm dừng</option>
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Table of Discounts */}
      <div className="table-card" style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "12px 16px" }}>Mã Code</th>
              <th style={{ padding: "12px 16px" }}>Tên Chiến Dịch</th>
              <th style={{ padding: "12px 16px" }}>Mức Giảm</th>
              <th style={{ padding: "12px 16px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#b45309" }}>
                  <Award size={16} /> Mốc Điểm Ràng Buộc
                </span>
              </th>
              <th style={{ padding: "12px 16px" }}>Đơn Tối Thiểu</th>
              <th style={{ padding: "12px 16px" }}>Lượt Dùng</th>
              <th style={{ padding: "12px 16px" }}>Thời Hạn</th>
              <th style={{ padding: "12px 16px" }}>Trạng Thái</th>
              {canEdit && <th style={{ padding: "12px 16px" }}>Thao Tác</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canEdit ? 9 : 8} style={{ padding: "30px", textAlign: "center", color: "#6b7280" }}>
                  <Loader2 size={24} className="spinner" style={{ margin: "0 auto 8px" }} />
                  <div>Đang tải danh sách chiến dịch mã giảm giá...</div>
                </td>
              </tr>
            ) : discounts.length > 0 ? (
              discounts.map((item) => {
                const isActive = item.TrangThai === 1;
                const isToggling = togglingId === item.MaMG;
                const minPoints = item.DiemToiThieu || 0;

                return (
                  <tr key={item.MaMG} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    {/* Mã Code */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: "14px",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            background: "#f3e8ff",
                            color: "#6b21a8",
                            border: "1px dashed #c084fc",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {item.MaCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(item.MaCode)}
                          title="Sao chép mã"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "2px" }}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </td>

                    {/* Tên chiến dịch */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#1f2937" }}>{item.TenMG}</div>
                    </td>

                    {/* Mức giảm */}
                    <td style={{ padding: "12px 16px" }}>
                      {item.LoaiGiam === "percent" ? (
                        <div>
                          <strong style={{ color: "#7c3aed", fontSize: "15px" }}>
                            {Number(item.GiaTriGiam)}%
                          </strong>
                          {item.GiaTriToiDa ? (
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>
                              Max {formatVND(item.GiaTriToiDa)}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <strong style={{ color: "#059669", fontSize: "15px" }}>
                          -{formatVND(item.GiaTriGiam)}
                        </strong>
                      )}
                    </td>

                    {/* ⭐ CỘT MỐC ĐIỂM RÀNG BUỘC (RẤT QUAN TRỌNG) */}
                    <td style={{ padding: "12px 16px" }}>
                      {minPoints > 0 ? (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            background: "#fef3c7",
                            border: "1px solid #fcd34d",
                            color: "#92400e",
                            fontWeight: 600,
                            fontSize: "13px",
                          }}
                        >
                          <Award size={15} style={{ color: "#d97706" }} />
                          <span>Tối thiểu {minPoints} điểm</span>
                        </div>
                      ) : (
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: "#f3f4f6",
                            color: "#6b7280",
                            fontSize: "12px",
                          }}
                        >
                          0 điểm (Tất cả khách)
                        </span>
                      )}
                    </td>

                    {/* Đơn tối thiểu */}
                    <td style={{ padding: "12px 16px", color: "#4b5563", fontSize: "13px" }}>
                      {Number(item.DonHangToiThieu) > 0 ? formatVND(item.DonHangToiThieu) : "Không yêu cầu"}
                    </td>

                    {/* Lượt dùng */}
                    <td style={{ padding: "12px 16px", fontSize: "13px" }}>
                      <span style={{ fontWeight: 600, color: "#111827" }}>{item.SoLanDung || 0}</span>
                      <span style={{ color: "#6b7280" }}>
                        {" "}
                        / {item.GioiHanDung ? `${item.GioiHanDung} lượt` : "∞"}
                      </span>
                    </td>

                    {/* Thời hạn */}
                    <td style={{ padding: "12px 16px", fontSize: "12px", color: "#6b7280" }}>
                      {item.NgayHetHan ? (
                        <div>
                          Hết hạn:{" "}
                          <strong style={{ color: "#111827" }}>
                            {new Date(item.NgayHetHan).toLocaleDateString("vi-VN")}
                          </strong>
                        </div>
                      ) : (
                        <span style={{ color: "#16a34a" }}>Vô thời hạn</span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive}
                          disabled={!canEdit || isToggling}
                          onClick={() => handleToggleStatus(item.MaMG, item.TrangThai, item.MaCode)}
                          style={{
                            position: "relative",
                            display: "inline-flex",
                            alignItems: "center",
                            width: "44px",
                            height: "24px",
                            padding: "2px",
                            borderRadius: "9999px",
                            backgroundColor: isActive ? "#16a34a" : "#9ca3af",
                            border: "none",
                            cursor: canEdit ? "pointer" : "not-allowed",
                            transition: "background-color 0.25s ease",
                            outline: "none",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              backgroundColor: "#ffffff",
                              transform: isActive ? "translateX(20px)" : "translateX(0px)",
                              transition: "transform 0.25s ease",
                            }}
                          />
                        </button>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: isActive ? "#15803d" : "#6b7280",
                          }}
                        >
                          {isActive ? "Đang chạy" : "Tạm dừng"}
                        </span>
                      </div>
                    </td>

                    {/* Thao tác */}
                    {canEdit && (
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="action-btn btn-edit"
                            title="Chỉnh sửa mã"
                            onClick={() => openEditModal(item)}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            type="button"
                            className="action-btn btn-delete"
                            title="Xóa mã"
                            onClick={() => handleDelete(item.MaMG, item.MaCode)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={canEdit ? 9 : 8} style={{ padding: "30px", textAlign: "center", color: "#9ca3af" }}>
                  Chưa có chiến dịch mã giảm giá nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tạo mới / Chỉnh sửa */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={20} style={{ color: "#7c3aed" }} />
                {editingItem ? "Chỉnh Sửa Chiến Dịch Mã Giảm Giá" : "Thiết Lập Chiến Dịch Mã Giảm Giá Mới"}
              </h3>
              <button className="btn-close-modal" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              {formError && (
                <div
                  style={{
                    marginBottom: "14px",
                    padding: "10px 14px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    borderRadius: "8px",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Mã Code */}
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Mã Giảm Giá (Code) (*)
                </label>
                <input
                  type="text"
                  value={form.maCode}
                  onChange={(e) => setForm({ ...form, maCode: e.target.value.toUpperCase() })}
                  placeholder="VD: GIAM10%, TRU20K, VIP50K..."
                  required
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "15px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                />
                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                  Mã này thu ngân hoặc khách hàng sẽ nhập khi thanh toán tại POS.
                </span>
              </div>

              {/* Tên chiến dịch */}
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Tên Chiến Dịch (*)
                </label>
                <input
                  type="text"
                  value={form.tenMG}
                  onChange={(e) => setForm({ ...form, tenMG: e.target.value })}
                  placeholder="VD: Tri ân khách hàng thân thiết, Giảm giá cuối tuần..."
                  required
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* Loại giảm & Mức giảm */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div className="form-group">
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Hình Thức Giảm
                  </label>
                  <select
                    value={form.loaiGiam}
                    onChange={(e) => setForm({ ...form, loaiGiam: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                  >
                    <option value="percent">Giảm theo phần trăm (%)</option>
                    <option value="fixed">Giảm số tiền cố định (VNĐ)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Mức Giảm (*) {form.loaiGiam === "percent" ? "(%)" : "(VNĐ)"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={form.loaiGiam === "percent" ? 100 : undefined}
                    value={form.giaTriGiam}
                    onChange={(e) => setForm({ ...form, giaTriGiam: e.target.value })}
                    placeholder={form.loaiGiam === "percent" ? "VD: 10" : "VD: 20000"}
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  />
                </div>
              </div>

              {/* Giảm tối đa nếu là percent */}
              {form.loaiGiam === "percent" && (
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Số Tiền Giảm Tối Đa (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={form.giaTriToiDa}
                    onChange={(e) => setForm({ ...form, giaTriToiDa: e.target.value })}
                    placeholder="VD: 50000 (Để trống nếu không giới hạn tối đa)"
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                  />
                </div>
              )}

              {/* ⭐ KHU VỰC THIẾT LẬP RÀNG BUỘC MỐC ĐIỂM TÍCH LŨY (THEO YÊU CẦU ĐỀ BÀI) */}
              <div
                style={{
                  marginBottom: "16px",
                  padding: "14px",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Award size={18} style={{ color: "#d97706" }} />
                  <label style={{ margin: 0, fontWeight: 700, color: "#92400e", fontSize: "14px" }}>
                    Điều Kiện Ràng Buộc: Mốc Điểm Tích Lũy (*)
                  </label>
                </div>
                <div style={{ fontSize: "12px", color: "#78350f", marginBottom: "10px" }}>
                  Khách hàng phải có <strong>tối thiểu số điểm này</strong> mới được phép áp dụng mã khi thanh toán đơn hàng.
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="number"
                    min="0"
                    value={form.diemToiThieu}
                    onChange={(e) => setForm({ ...form, diemToiThieu: e.target.value })}
                    placeholder="VD: 50"
                    required
                    style={{
                      width: "120px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "2px solid #f59e0b",
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#92400e",
                      background: "#fff",
                    }}
                  />
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#92400e" }}>Điểm</span>

                  {/* Quick Select Chips */}
                  <div style={{ display: "flex", gap: "6px", marginLeft: "auto", flexWrap: "wrap" }}>
                    {[0, 30, 50, 80, 100].map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => setForm({ ...form, diemToiThieu: pt })}
                        style={{
                          padding: "4px 8px",
                          fontSize: "12px",
                          borderRadius: "6px",
                          border: Number(form.diemToiThieu) === pt ? "1px solid #b45309" : "1px solid #fcd34d",
                          background: Number(form.diemToiThieu) === pt ? "#f59e0b" : "#fff",
                          color: Number(form.diemToiThieu) === pt ? "#fff" : "#92400e",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        {pt === 0 ? "0đ (Mọi KH)" : `${pt} điểm`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Đơn tối thiểu & Giới hạn lượt */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div className="form-group">
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Đơn Tối Thiểu (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.donHangToiThieu}
                    onChange={(e) => setForm({ ...form, donHangToiThieu: e.target.value })}
                    placeholder="VD: 50000 (0 nếu không áp dụng)"
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Giới Hạn Lượt Dùng
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.gioiHanDung}
                    onChange={(e) => setForm({ ...form, gioiHanDung: e.target.value })}
                    placeholder="VD: 100 (Để trống: Không giới hạn)"
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>

              {/* Thời hạn áp dụng */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div className="form-group">
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Ngày Bắt Đầu
                  </label>
                  <input
                    type="date"
                    value={form.ngayBatDau}
                    onChange={(e) => setForm({ ...form, ngayBatDau: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Ngày Hết Hạn
                  </label>
                  <input
                    type="date"
                    value={form.ngayHetHan}
                    onChange={(e) => setForm({ ...form, ngayHetHan: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>

              {/* Trạng thái hoạt động */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px",
                  background: form.trangThai ? "#f0fdf4" : "#f3f4f6",
                  border: `1px solid ${form.trangThai ? "#bbf7d0" : "#e5e7eb"}`,
                  borderRadius: "8px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: form.trangThai ? "#15803d" : "#4b5563" }}>
                    Trạng thái: {form.trangThai ? "🟢 Kích hoạt (Cho phép dùng tại POS)" : "⚪ Tạm dừng (Không thể áp dụng)"}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(form.trangThai)}
                  onClick={() => setForm({ ...form, trangThai: form.trangThai ? 0 : 1 })}
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    width: "44px",
                    height: "24px",
                    padding: "2px",
                    borderRadius: "9999px",
                    backgroundColor: form.trangThai ? "#16a34a" : "#9ca3af",
                    border: "none",
                    cursor: "pointer",
                    transition: "background-color 0.25s ease",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: "#ffffff",
                      transform: form.trangThai ? "translateX(20px)" : "translateX(0px)",
                      transition: "transform 0.25s ease",
                    }}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="modal-actions" style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={saving}>
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={saving}
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  {saving ? (
                    <Loader2 size={16} className="spinner" style={{ display: "inline", marginRight: "6px" }} />
                  ) : null}
                  {editingItem ? "Lưu thay đổi" : "Tạo chiến dịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
