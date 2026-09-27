import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2, Edit, Loader2, X, Coffee } from "lucide-react";

const formatPrice = (p) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(p);

const EMPTY_FORM = {
  tenSanPham: "",
  gia: "",
  moTa: "",
  coBan: false,
  maDanhMuc: "",
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

  // Lấy danh sách danh mục (dùng cho dropdown)
  const fetchCategories = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/categories");
      setCategories(res.data);
    } catch (e) {}
  };

  // Lấy danh sách sản phẩm
  const fetchProducts = async (catId = "") => {
    setLoading(true);
    setError("");
    try {
      const params = catId ? { maDanhMuc: catId } : {};
      const res = await axios.get("http://localhost:5000/api/products", { params });
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
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.tenSanPham || form.gia === "") {
      return alert("Vui lòng nhập Tên và Giá!");
    }
    try {
      if (editingProduct) {
        await axios.put(`http://localhost:5000/api/products/${editingProduct.MaSanPham}`, form);
        alert("Cập nhật thành công!");
      } else {
        await axios.post("http://localhost:5000/api/products", form);
        alert("Thêm sản phẩm thành công!");
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
      await axios.delete(`http://localhost:5000/api/products/${id}`);
      alert("Xóa thành công!");
      fetchProducts(filterCat);
    } catch (e) {
      alert("Lỗi: " + (e.response?.data?.message || e.message));
    }
  };

  const canEdit = currentRole === "admin" || currentRole === "manager";

  return (
    <div className="customers-view">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Quản lý Đồ Uống & Thực Đơn</h2>
          <p className="page-subtitle">Thêm, sửa, xóa các món trong thực đơn</p>
        </div>
        {canEdit && (
          <button className="btn-add-customer" onClick={openAdd}>
            <Plus size={18} /> Thêm Đồ Uống
          </button>
        )}
      </div>

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
              <th>Tên Đồ Uống</th>
              <th>Giá</th>
              <th>Danh Mục</th>
              <th>Mô Tả</th>
              <th>Cơ Bản</th>
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
                <tr key={p.MaSanPham}>
                  <td><strong>#{p.MaSanPham}</strong></td>
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
                  <td>
                    <span style={{
                      color: p.CoBan ? "#16a34a" : "#9ca3af",
                      fontWeight: 600,
                      fontSize: "13px"
                    }}>
                      {p.CoBan ? "✔ Có" : "✘ Không"}
                    </span>
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
                <button type="submit" className="btn-save">
                  {editingProduct ? "Cập nhật" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
