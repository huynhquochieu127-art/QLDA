import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2, Edit, Loader2, X } from "lucide-react";
import "../../css/home.css"; 

export default function CategoryManagement({ currentRole }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState("");

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/categories");
      setCategories(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!categoryName) return alert("Vui lòng nhập tên danh mục!");
    
    try {
      if (editingCategory) {
        await axios.put(`http://localhost:5000/api/categories/${editingCategory.MaDanhMuc}`, {
          tenDanhMuc: categoryName,
        });
        alert("Cập nhật thành công!");
      } else {
        await axios.post("http://localhost:5000/api/categories", {
          tenDanhMuc: categoryName,
        });
        alert("Thêm danh mục thành công!");
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa danh mục này?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/categories/${id}`);
      alert("Xóa thành công!");
      fetchCategories();
    } catch (err) {
      alert("Không thể xóa: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="customers-view">
      <div className="page-header">
        <div>
          <h2 className="page-title">Quản lý Danh Mục</h2>
          <p className="page-subtitle">Thêm, sửa, xóa các nhóm đồ uống/bánh ngọt</p>
        </div>
        {(currentRole === "admin" || currentRole === "manager") && (
          <button
            className="btn-add-customer"
            onClick={() => {
              setEditingCategory(null);
              setCategoryName("");
              setShowModal(true);
            }}
          >
            <Plus size={18} /> Thêm Danh mục
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên Danh Mục</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="3" className="loading-cell">
                  <Loader2 size={24} className="spinner" />
                  <span>Đang tải...</span>
                </td>
              </tr>
            ) : categories.length > 0 ? (
              categories.map((cat) => (
                <tr key={cat.MaDanhMuc}>
                  <td><strong>#{cat.MaDanhMuc}</strong></td>
                  <td>{cat.TenDanhMuc}</td>
                  <td>
                    <div className="action-buttons">
                      {(currentRole === "admin" || currentRole === "manager") && (
                        <>
                          <button
                            title="Chỉnh sửa"
                            className="action-btn btn-edit"
                            onClick={() => {
                              setEditingCategory(cat);
                              setCategoryName(cat.TenDanhMuc);
                              setShowModal(true);
                            }}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            title="Xóa"
                            className="action-btn btn-delete"
                            onClick={() => handleDelete(cat.MaDanhMuc)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="empty-table-cell">
                  Chưa có danh mục nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}</h3>
              <button className="btn-close-modal" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Tên danh mục (*)</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                  placeholder="VD: Cà phê, Trà sữa..."
                  className="customer-search-input"
                  style={{ width: '100%', marginTop: '8px' }}
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-save">
                  {editingCategory ? "Cập nhật" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
