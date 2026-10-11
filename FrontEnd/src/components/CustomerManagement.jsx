import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Loader2,
  Gift,
  Phone,
  Cake,
  Star,
  Award,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  PlusCircle,
  MinusCircle,
} from "lucide-react";

export default function CustomerManagement({ currentRole }) {
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [pointsModalCustomer, setPointsModalCustomer] = useState(null);

  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    dob: "",
    email: "",
  });
  const [pointDelta, setPointDelta] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 5;

  const API_URL = "http://localhost:5000/api/customers";

  const fetchCustomersFromMySQL = async (searchQuery = "", page = 1) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch(
        `${API_URL}?search=${encodeURIComponent(searchQuery)}&page=${page}&limit=${itemsPerPage}`,
      );
      if (!response.ok) throw new Error("Không thể kết nối đến máy chủ MySQL!");

      const result = await response.json();
      setCustomers(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      console.error("Lỗi kết nối API:", err);
      setErrorMessage(err.message || "Lỗi tải dữ liệu khách hàng từ MySQL.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomersFromMySQL(customerSearch, currentPage);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, currentPage]);

  const isBirthdayToday = (dobString) => {
    if (!dobString) return false;
    const today = new Date();
    const dob = new Date(dobString);
    return (
      today.getDate() === dob.getDate() && today.getMonth() === dob.getMonth()
    );
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      const isEditing = Boolean(editingCustomer);
      const url = isEditing ? `${API_URL}/${editingCustomer.id}` : API_URL;
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm),
      });

      const resData = await response.json();
      if (!response.ok)
        throw new Error(resData.message || "Thao tác thất bại!");

      alert(isEditing ? "Cập nhật thành công!" : "Thêm thành công!");
      setShowAddModal(false);
      setEditingCustomer(null);
      fetchCustomersFromMySQL(customerSearch, currentPage);
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa khách hàng này?")) return;
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Xóa thất bại!");
      alert("Xóa thành công!");
      fetchCustomersFromMySQL(customerSearch, currentPage);
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleUpdatePoints = async (action) => {
    const amount = parseInt(pointDelta, 10);
    if (isNaN(amount) || amount <= 0) {
      alert("Nhập số điểm hợp lệ lớn hơn 0!");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/${pointsModalCustomer.id}/points`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, points: amount }),
        },
      );
      if (!response.ok) throw new Error("Lỗi cập nhật điểm!");

      setPointsModalCustomer(null);
      setPointDelta("");
      fetchCustomersFromMySQL(customerSearch, currentPage);
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  return (
    <div className="customers-view">
      <div className="page-header">
        <div>
          <h2 className="page-title">Quản lý Khách Hàng (MySQL Database)</h2>
          <p className="page-subtitle">
            Dữ liệu lưu trữ trực tiếp trên MySQL - Tra cứu SĐT nhanh
          </p>
        </div>
        <button
          className="btn-add-customer"
          onClick={() => {
            setEditingCustomer(null);
            setCustomerForm({ name: "", phone: "", dob: "", email: "" });
            setShowAddModal(true);
          }}
        >
          <Plus size={18} /> Thêm khách hàng MySQL
        </button>
      </div>

      <div className="search-container">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Nhập SĐT hoặc Tên cần tra cứu từ MySQL..."
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="customer-search-input"
          />
          {loading && <Loader2 size={18} className="spinner-icon" />}
        </div>
      </div>

      {errorMessage && <div className="error-banner">{errorMessage}</div>}

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên khách hàng</th>
              <th>Số điện thoại</th>
              <th>Ngày sinh</th>
              <th>Hạng thẻ</th>
              <th>Điểm tích lũy</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="loading-cell">
                  <Loader2 size={24} className="spinner" />
                  <span>Đang truy vấn dữ liệu từ MySQL...</span>
                </td>
              </tr>
            ) : customers.length > 0 ? (
              customers.map((item) => {
                const isBday = isBirthdayToday(item.dob);
                return (
                  <tr key={item.id} className={isBday ? "row-birthday" : ""}>
                    <td>
                      <strong>#{item.id}</strong>
                    </td>
                    <td>
                      <div className="customer-name-wrapper">
                        <span>{item.name}</span>
                        {isBday && (
                          <span className="birthday-tag">
                            <Gift size={12} /> Sinh nhật
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="cell-flex phone-highlight">
                        <Phone size={14} className="icon-muted" />
                        <strong>{item.phone}</strong>
                      </span>
                    </td>
                    <td>
                      <span className="cell-flex">
                        <Cake size={14} className="icon-muted" />
                        {item.dob
                          ? new Date(item.dob).toLocaleDateString("vi-VN")
                          : "Chưa nhập"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`rank-badge rank-${(item.rank || "Đồng").toLowerCase()}`}
                      >
                        <Star size={12} className="inline-star" />
                        {item.rank || "Đồng"}
                      </span>
                    </td>
                    <td className="points-cell">{item.points || 0} pts</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          title="Tích/Trừ điểm"
                          onClick={() => setPointsModalCustomer(item)}
                          className="action-btn btn-award"
                        >
                          <Award size={16} />
                        </button>
                        <button
                          title="Chỉnh sửa"
                          onClick={() => {
                            setEditingCustomer(item);
                            setCustomerForm({
                              name: item.name || "",
                              phone: item.phone || "",
                              dob: item.dob || "",
                              email: item.email || "",
                            });
                            setShowAddModal(true);
                          }}
                          className="action-btn btn-edit"
                        >
                          <Edit size={16} />
                        </button>
                        {(currentRole === "admin" ||
                          currentRole === "manager") && (
                          <button
                            title="Xóa khỏi MySQL"
                            onClick={() => handleDeleteCustomer(item.id)}
                            className="action-btn btn-delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="empty-table-cell">
                  Không tìm thấy khách hàng nào trong database MySQL!
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination-bar">
            <span className="pagination-info">
              Trang {currentPage} / {totalPages}
            </span>
            <div className="pagination-buttons">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="page-btn"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                className="page-btn"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>
                {editingCustomer
                  ? "Chỉnh sửa Khách hàng"
                  : "Thêm mới vào MySQL"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-close-modal"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer}>
              <div className="form-group">
                <label>Tên khách hàng (*)</label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Số điện thoại (*)</label>
                <input
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, phone: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Ngày sinh</label>
                <input
                  type="date"
                  value={customerForm.dob}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, dob: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, email: e.target.value })
                  }
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-cancel"
                >
                  Hủy
                </button>
                <button type="submit" className="btn-save">
                  {editingCustomer ? "Cập nhật MySQL" : "Lưu vào MySQL"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pointsModalCustomer && (
        <div className="modal-overlay">
          <div className="modal-container modal-small">
            <div className="modal-header">
              <h3>Cập nhật điểm trong MySQL</h3>
              <button
                onClick={() => setPointsModalCustomer(null)}
                className="btn-close-modal"
              >
                <X size={20} />
              </button>
            </div>
            <p className="points-modal-desc">
              Khách hàng: <strong>{pointsModalCustomer.name}</strong> (
              {pointsModalCustomer.points || 0} pts)
            </p>
            <div className="form-group">
              <label>Số điểm điều chỉnh</label>
              <input
                type="number"
                placeholder="Nhập số điểm..."
                value={pointDelta}
                onChange={(e) => setPointDelta(e.target.value)}
              />
            </div>
            <div className="points-action-grid">
              <button
                onClick={() => handleUpdatePoints("add")}
                className="btn-points-add"
              >
                <PlusCircle size={16} /> Cộng điểm
              </button>
              <button
                onClick={() => handleUpdatePoints("subtract")}
                className="btn-points-subtract"
              >
                <MinusCircle size={16} /> Trừ điểm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
