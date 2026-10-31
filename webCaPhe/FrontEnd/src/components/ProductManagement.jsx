import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Plus, Trash2, Edit, Loader2, X, Coffee, CheckCircle2, ImageIcon, UploadCloud } from "lucide-react";
import { API_BASE, API_ORIGIN, getFullImageUrl } from "../config/api";

const formatPrice = (p) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(p);

const resolveProductImg = (url) => getFullImageUrl(url);

const EMPTY_FORM = {
  tenSanPham: "",
  gia: "",
  moTa: "",
  coBan: false,
  maDanhMuc: "",
  hinhAnh: "",
};

export default function ProductManagement({ currentRole }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Lọc theo danh mục
  const [filterCat, setFilterCat] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // Upload ảnh sản phẩm
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Thông báo & tô sáng món vừa thêm (QH-67)
  const [notice, setNotice] = useState("");
  const [highlightId, setHighlightId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Lấy danh sách danh mục (dùng cho dropdown)
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/categories`);
      setCategories(res.data);
    } catch (e) {}
  };

  // Lấy danh sách sản phẩm
  const fetchProducts = async (catId = "") => {
    setLoading(true);
    setError("");
    try {
      const params = catId ? { maDanhMuc: catId } : {};
      const res = await axios.get(`${API_BASE}/products`, { params });
      setProducts(res.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const handleFilterChange = (e) => {
    setFilterCat(e.target.value);
    fetchProducts(e.target.value);
  };

  const openAdd = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setImageFile(null);
    setImagePreview("");
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditingProduct(p);
    setForm({
      tenSanPham: p.TenSanPham || "",
      gia: p.Gia || "",
      moTa: p.MoTa || "",
      coBan: !!p.CoBan,
      maDanhMuc: p.MaDanhMuc || "",
      hinhAnh: p.HinhAnh || "",
    });

    // Hiển thị ảnh cũ nếu có
    setImageFile(null);
    setImagePreview(resolveProductImg(p.HinhAnh));
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setForm((f) => ({ ...f, hinhAnh: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.tenSanPham.trim() || form.gia === "") {
      return setFormError("Vui lòng nhập Tên và Giá!");
    }
    if (Number(form.gia) <= 0) {
      return setFormError("Giá món phải lớn hơn 0.");
    }
    setFormError("");

    let finalHinhAnh = form.hinhAnh || "";

    // Upload ảnh mới nếu có chọn file
    if (imageFile) {
      setUploadingImage(true);
      try {
        const fd = new FormData();
        fd.append("image", imageFile);
        const uploadRes = await axios.post(`${API_BASE}/products/upload-image`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalHinhAnh = uploadRes.data.imageUrl;
      } catch (uploadErr) {
        setUploadingImage(false);
        return setFormError("Lỗi upload ảnh: " + (uploadErr.response?.data?.message || uploadErr.message));
      }
      setUploadingImage(false);
    }

    try {
      const payload = { ...form, hinhAnh: finalHinhAnh };
      if (editingProduct) {
        await axios.put(`${API_BASE}/products/${editingProduct.MaSanPham}`, payload);
        alert("Cập nhật thành công!");
      } else {
        const res = await axios.post(`${API_BASE}/products`, payload);
        setNotice(`Đã thêm món mới "${form.tenSanPham.trim()}" vào thực đơn.`);
        setHighlightId(res.data?.id ?? null);
        setTimeout(() => setHighlightId(null), 4000);
      }
      setShowModal(false);
      fetchProducts(filterCat);
    } catch (e) {
      alert("Lỗi: " + (e.response?.data?.message || e.message));
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${name}" không?`)) return;
    try {
      await axios.delete(`${API_BASE}/products/${id}`);
      alert("Xóa thành công!");
      fetchProducts(filterCat);
    } catch (e) {
      alert("Lỗi: " + (e.response?.data?.message || e.message));
    }
  };

  const canEdit = currentRole === "admin" || currentRole === "manager";

  // Nút gạt Còn hàng / Hết hàng (QH-68 Toggle is_active)
  const handleToggleStatus = async (product) => {
    if (!canEdit) return;
    const currentStatus = product.is_active === 0 ? 0 : 1;
    const newStatus = currentStatus === 1 ? 0 : 1;
    setTogglingId(product.MaSanPham);

    // Cập nhật State trực quan ngay lập tức
    setProducts((prev) =>
      prev.map((p) =>
        p.MaSanPham === product.MaSanPham ? { ...p, is_active: newStatus } : p
      )
    );

    try {
      await axios.patch(
        `${API_BASE}/products/${product.MaSanPham}/status`,
        { is_active: newStatus }
      );
      setNotice(
        `Món "${product.TenSanPham}" hiện: ${
          newStatus === 1
            ? "Còn hàng (Hiển thị trên POS)"
            : "Hết hàng (Đã ẩn khỏi POS tránh thu ngân order nhầm)"
        }`
      );
      setTimeout(() => setNotice(""), 3500);
    } catch (err) {
      // Rollback nếu API lỗi
      setProducts((prev) =>
        prev.map((p) =>
          p.MaSanPham === product.MaSanPham ? { ...p, is_active: currentStatus } : p
        )
      );
      alert("Lỗi cập nhật trạng thái: " + (err.response?.data?.message || err.message));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="customers-view">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Quản lý Đồ Uống & Thực Đơn</h2>
          <p className="page-subtitle">Thêm, sửa, xóa các món trong thực đơn</p>
        </div>
        {canEdit && (
          <button
            className="btn-add-customer"
            onClick={openAdd}
            style={{
              padding: "12px 22px",
              fontSize: "15px",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
            }}
          >
            <Plus size={20} /> Thêm món mới
          </button>
        )}
      </div>

      {/* Thông báo thêm món thành công (QH-67) */}
      {notice && (
        <div
          style={{
            marginBottom: "16px",
            padding: "10px 14px",
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
          <CheckCircle2 size={18} />
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

      {/* Lọc theo danh mục */}
      <div style={{ marginBottom: "16px" }}>
        <select
          value={filterCat}
          onChange={handleFilterChange}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          <option value="">📋 Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.MaDanhMuc} value={c.MaDanhMuc}>
              {c.TenDanhMuc}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Bảng danh sách */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Ảnh</th>
              <th>Tên Đồ Uống</th>
              <th>Giá</th>
              <th>Danh Mục</th>
              <th>Mô Tả</th>
              <th style={{ textAlign: "center" }}>Trạng thái (POS)</th>
              {canEdit && <th>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="loading-cell">
                  <Loader2 size={24} className="spinner" />
                  <span>Đang tải...</span>
                </td>
              </tr>
            ) : products.length > 0 ? (
              products.map((p) => (
                <tr
                  key={p.MaSanPham}
                  style={
                    highlightId !== null && String(p.MaSanPham) === String(highlightId)
                      ? { backgroundColor: "#ecfdf5", transition: "background-color 0.6s" }
                      : { transition: "background-color 0.6s" }
                  }
                >
                  <td><strong>#{p.MaSanPham}</strong></td>
                  <td>
                    {p.HinhAnh ? (
                      <img
                        src={resolveProductImg(p.HinhAnh)}
                        alt={p.TenSanPham}
                        style={{
                          width: "46px",
                          height: "46px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                        }}
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      <div style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "8px",
                        background: "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px dashed #d1d5db"
                      }}>
                        <ImageIcon size={18} style={{ color: "#9ca3af" }} />
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Coffee size={15} style={{ color: "#8B5E3C" }} />
                      {p.TenSanPham}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: "#16a34a" }}>{formatPrice(p.Gia)}</strong>
                  </td>
                  <td>
                    <span style={{
                      background: "#f3f4f6",
                      borderRadius: "999px",
                      padding: "2px 10px",
                      fontSize: "12px"
                    }}>
                      {p.TenDanhMuc || "—"}
                    </span>
                  </td>
                  <td style={{ color: "#6b7280", fontSize: "13px" }}>{p.MoTa || "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      {/* Nút gạt Toggle: Xanh = Còn hàng, Xám = Hết hàng */}
                      <button
                        type="button"
                        disabled={!canEdit || togglingId === p.MaSanPham}
                        onClick={() => handleToggleStatus(p)}
                        style={{
                          position: "relative",
                          width: "44px",
                          height: "24px",
                          borderRadius: "999px",
                          backgroundColor: p.is_active === 0 ? "#94a3b8" : "#10b981",
                          border: "none",
                          cursor: canEdit ? "pointer" : "default",
                          transition: "all 0.25s ease",
                          padding: "2px",
                          display: "inline-flex",
                          alignItems: "center",
                          boxShadow: p.is_active === 0 ? "none" : "0 2px 6px rgba(16, 185, 129, 0.4)",
                        }}
                        title={
                          p.is_active === 0
                            ? "Đang HẾT HÀNG (Ẩn khỏi POS). Nhấn để bật CÒN HÀNG"
                            : "Đang CÒN HÀNG (Hiển thị trên POS). Nhấn để tắt thành HẾT HÀNG"
                        }
                      >
                        <span
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            backgroundColor: "#ffffff",
                            transform: p.is_active === 0 ? "translateX(0px)" : "translateX(20px)",
                            transition: "transform 0.25s ease",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {togglingId === p.MaSanPham && (
                            <Loader2 size={12} className="spin-animation" style={{ color: "#10b981" }} />
                          )}
                        </span>
                      </button>

                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          minWidth: "62px",
                          textAlign: "left",
                          color: p.is_active === 0 ? "#64748b" : "#059669",
                        }}
                      >
                        {p.is_active === 0 ? "Hết hàng" : "Còn hàng"}
                      </span>
                    </div>
                  </td>
                  {canEdit && (
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn btn-edit" title="Chỉnh sửa" onClick={() => openEdit(p)}>
                          <Edit size={16} />
                        </button>
                        <button className="action-btn btn-delete" title="Xóa" onClick={() => handleDelete(p.MaSanPham, p.TenSanPham)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty-table-cell">Chưa có đồ uống nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm / Sửa */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingProduct ? "Chỉnh sửa Đồ Uống" : "Thêm Đồ Uống Mới"}</h3>
              <button className="btn-close-modal" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              {formError && (
                <div
                  style={{
                    marginBottom: "12px",
                    padding: "8px 12px",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                >
                  {formError}
                </div>
              )}
              <div className="form-group">
                <label>Tên đồ uống (*)</label>
                <input
                  type="text"
                  value={form.tenSanPham}
                  onChange={(e) => setForm({ ...form, tenSanPham: e.target.value })}
                  placeholder="VD: Cà Phê Đen, Trà Sữa Trân Châu..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Giá (VNĐ) (*)</label>
                <input
                  type="number"
                  value={form.gia}
                  onChange={(e) => setForm({ ...form, gia: e.target.value })}
                  placeholder="VD: 35000"
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label>Danh mục</label>
                <select
                  value={form.maDanhMuc}
                  onChange={(e) => setForm({ ...form, maDanhMuc: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ddd" }}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((c) => (
                    <option key={c.MaDanhMuc} value={c.MaDanhMuc}>{c.TenDanhMuc}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <input
                  type="text"
                  value={form.moTa}
                  onChange={(e) => setForm({ ...form, moTa: e.target.value })}
                  placeholder="Mô tả ngắn về món..."
                />
              </div>
              {/* Upload ảnh */}
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <ImageIcon size={15} />
                  Ảnh sản phẩm
                </label>
                <div
                  style={{
                    border: "2px dashed #d1d5db",
                    borderRadius: "10px",
                    padding: "14px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: imagePreview ? "#f9fafb" : "#fafafa",
                    transition: "border-color 0.2s",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                >
                  {imagePreview ? (
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <img
                        src={imagePreview}
                        alt="preview"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "160px",
                          borderRadius: "8px",
                          objectFit: "contain",
                          display: "block",
                          margin: "0 auto",
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                        style={{
                          position: "absolute",
                          top: "-8px",
                          right: "-8px",
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: "22px",
                          height: "22px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          lineHeight: 1,
                        }}
                        title="Xóa ảnh"
                      >
                        ×
                      </button>
                      <p style={{ marginTop: "8px", fontSize: "12px", color: "#6b7280" }}>
                        Nhấn để đổi ảnh khác
                      </p>
                    </div>
                  ) : (
                    <div style={{ color: "#9ca3af", padding: "10px 0" }}>
                      <UploadCloud size={32} style={{ margin: "0 auto 8px", display: "block", color: "#6366f1" }} />
                      <p style={{ fontSize: "14px", color: "#374151", fontWeight: 500, margin: "0 0 4px" }}>
                        Chọn ảnh từ máy tính
                      </p>
                      <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
                        Hoặc kéo đả thả vào đây &bull; JPG, PNG, WEBP &bull; Tối đa 5MB
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
              </div>
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="coBanCheck"
                  checked={form.coBan}
                  onChange={(e) => setForm({ ...form, coBan: e.target.checked })}
                />
                <label htmlFor="coBanCheck" style={{ margin: 0 }}>Là món cơ bản (luôn có trong menu)</label>
              </div>
              <div className="modal-actions" style={{ marginTop: "20px" }}>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-save" disabled={uploadingImage}>
                  {uploadingImage ? (
                    <><Loader2 size={16} className="spinner" style={{ marginRight: 6 }} /> Đang upload...</>
                  ) : (
                    editingProduct ? "Cập nhật" : "Thêm mới"
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
