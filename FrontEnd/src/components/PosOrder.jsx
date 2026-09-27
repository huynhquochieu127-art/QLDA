import React, { useState, useEffect, useRef } from "react";
import "../../css/pos.css";

const CATEGORIES = [
  { id: "all", name: "Tất cả" },
  { id: "coffee", name: "Cà Phê" },
  { id: "tea", name: "Trà Sữa & Trà" },
  { id: "cake", name: "Bánh Ngọt" },
  { id: "snack", name: "Ăn Vặt" },
];

const PRODUCTS = [
  {
    id: 1,
    name: "Cà Phê Đen",
    price: 25000,
    category: "coffee",
    image: "https://via.placeholder.com/100?text=CaPheDen",
  },
  {
    id: 2,
    name: "Cà Phê Sữa",
    price: 29000,
    category: "coffee",
    image: "https://via.placeholder.com/100?text=CaPheSua",
  },
  {
    id: 3,
    name: "Bạc Xỉu",
    price: 32000,
    category: "coffee",
    image: "https://via.placeholder.com/100?text=BacXiu",
  },
  {
    id: 4,
    name: "Trà Đào Cam Sả",
    price: 39000,
    category: "tea",
    image: "https://via.placeholder.com/100?text=TraDao",
  },
  {
    id: 5,
    name: "Trà Sữa Trân Châu",
    price: 45000,
    category: "tea",
    image: "https://via.placeholder.com/100?text=TraSua",
  },
  {
    id: 6,
    name: "Bánh Tiramisu",
    price: 35000,
    category: "cake",
    image: "https://via.placeholder.com/100?text=Tiramisu",
  },
  {
    id: 7,
    name: "Bánh Croissant",
    price: 28000,
    category: "cake",
    image: "https://via.placeholder.com/100?text=Croissant",
  },
  {
    id: 8,
    name: "Khoai Tây Chiên",
    price: 30000,
    category: "snack",
    image: "https://via.placeholder.com/100?text=KhoaiTay",
  },
];

// Giả lập Database khách hàng ban đầu
const MOCK_CUSTOMERS = [
  { id: 101, phone: "0905123456", name: "Nguyễn Văn A", dob: "1995-05-20" },
  { id: 102, phone: "0914888999", name: "Trần Thị B", dob: "1998-11-12" },
  { id: 103, phone: "0987654321", name: "Lê Văn C", dob: "2000-01-01" },
];

export default function PosOrder() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [selectedTable, setSelectedTable] = useState("Bàn 01");

  // State Khách hàng
  const [phoneSearch, setPhoneSearch] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // State Modal Tạo mới Khách hàng
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    dob: "",
  });

  const dropdownRef = useRef(null);

  // Tự động đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce gọi API / tìm kiếm khách hàng khi thu ngân nhập 3 ký tự trở lên
  useEffect(() => {
    if (selectedCustomer) return; // Đã chọn khách hàng thì không tìm nữa

    const cleanPhone = phoneSearch.trim();

    if (cleanPhone.length >= 3) {
      setIsSearching(true);
      setShowDropdown(true);

      const timer = setTimeout(() => {
        // TODO: Thay thế đoạn này bằng API call thực tế:
        // fetch(`/api/customers/search?phone=${cleanPhone}`)
        const results = MOCK_CUSTOMERS.filter((c) =>
          c.phone.includes(cleanPhone),
        );

        setCustomerSuggestions(results);
        setIsSearching(false);
      }, 300); // Debounce 300ms

      return () => clearTimeout(timer);
    } else {
      setCustomerSuggestions([]);
      setShowDropdown(false);
    }
  }, [phoneSearch, selectedCustomer]);

  // Chọn khách hàng từ dropdown
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setPhoneSearch(customer.phone);
    setShowDropdown(false);
  };

  // Hủy chọn khách hàng
  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setPhoneSearch("");
    setCustomerSuggestions([]);
  };

  // Mở Popup tạo khách hàng mới với SĐT đã nhập sẵn
  const handleOpenAddModal = () => {
    setNewCustomer({ name: "", phone: phoneSearch.trim(), dob: "" });
    setShowDropdown(false);
    setShowAddCustomerModal(true);
  };

  // Lưu khách hàng mới
  const handleSaveNewCustomer = (e) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) {
      alert("Vui lòng điền Tên và Số điện thoại!");
      return;
    }

    // TODO: Thay bằng API call POST /api/customers
    const createdCustomer = {
      id: Date.now(),
      ...newCustomer,
    };

    MOCK_CUSTOMERS.push(createdCustomer); // Giả lập thêm vào DB
    setSelectedCustomer(createdCustomer);
    setPhoneSearch(createdCustomer.phone);
    setShowAddCustomerModal(false);
    alert(`Đã tạo thành công khách hàng: ${createdCustomer.name}`);
  };

  // Lọc sản phẩm theo danh mục
  const filteredProducts =
    activeCategory === "all"
      ? PRODUCTS
      : PRODUCTS.filter((item) => item.category === activeCategory);

  // Thêm vào giỏ hàng
  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  // Cập nhật số lượng
  const updateQuantity = (id, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean),
    );
  };

  // Xóa sản phẩm khỏi giỏ
  const removeFromCart = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  // Tính tổng tiền
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Xử lý thanh toán
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("Giỏ hàng đang trống!");
      return;
    }

    const customerText = selectedCustomer
      ? `Khách hàng: ${selectedCustomer.name} (${selectedCustomer.phone})`
      : "Khách hàng: Khách lẻ";

    alert(
      `Thanh toán thành công cho ${selectedTable}!\n${customerText}\nTổng tiền: ${totalAmount.toLocaleString("vi-VN")} VNĐ`,
    );
    setCart([]);
    handleClearCustomer();
  };

  return (
    <div className="pos-container">
      {/* CỘT TRÁI: Danh mục & Danh sách món */}
      <div className="pos-main">
        {/* Header danh mục */}
        <div className="category-bar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Lưới sản phẩm */}
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="product-card"
              onClick={() => addToCart(product)}
            >
              <img
                src={product.image}
                alt={product.name}
                className="product-image"
              />
              <div className="product-info">
                <h4 className="product-name">{product.name}</h4>
                <p className="product-price">
                  {product.price.toLocaleString("vi-VN")} đ
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CỘT PHẢI: Giỏ hàng / Hóa đơn */}
      <div className="pos-sidebar">
        <div className="sidebar-header">
          <h2>Đơn Hàng</h2>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="table-select"
          >
            <option value="Mang về">Mang về</option>
            <option value="Bàn 01">Bàn 01</option>
            <option value="Bàn 02">Bàn 02</option>
            <option value="Bàn 03">Bàn 03</option>
            <option value="Bàn 04">Bàn 04</option>
          </select>
        </div>

        {/* Mô phỏng Ô TÌM KIẾM KHÁCH HÀNG */}
        <div className="customer-search-section" ref={dropdownRef}>
          <label className="section-label">Thông tin khách hàng</label>
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Nhập SĐT khách hàng (vd: 456, 999)..."
              value={phoneSearch}
              onChange={(e) => {
                setPhoneSearch(e.target.value);
                if (selectedCustomer) setSelectedCustomer(null);
              }}
              className="customer-input"
            />
            {selectedCustomer || phoneSearch ? (
              <button className="clear-btn" onClick={handleClearCustomer}>
                ×
              </button>
            ) : null}
          </div>

          {/* Đã chọn khách hàng */}
          {selectedCustomer && (
            <div className="selected-customer-card">
              <div>
                <strong>{selectedCustomer.name}</strong> -{" "}
                {selectedCustomer.phone}
                {selectedCustomer.dob && (
                  <span className="customer-dob">
                    {" "}
                    (NS: {selectedCustomer.dob})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Gợi ý Dropdown */}
          {showDropdown && !selectedCustomer && (
            <div className="customer-dropdown">
              {isSearching ? (
                <div className="dropdown-item loading">Đang tìm kiếm...</div>
              ) : customerSuggestions.length > 0 ? (
                customerSuggestions.map((cust) => (
                  <div
                    key={cust.id}
                    className="dropdown-item"
                    onClick={() => handleSelectCustomer(cust)}
                  >
                    <div className="cust-name">{cust.name}</div>
                    <div className="cust-phone">{cust.phone}</div>
                  </div>
                ))
              ) : (
                <div className="dropdown-item no-result">
                  <span>Không tìm thấy khách hàng!</span>
                  <button
                    className="btn-add-quick"
                    onClick={handleOpenAddModal}
                  >
                    + Tạo mới khách hàng
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Danh sách món trong giỏ */}
        <div className="cart-list">
          {cart.length === 0 ? (
            <div className="empty-cart">Chưa có món nào được chọn</div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <span className="cart-item-name">{item.name}</span>
                  <span className="cart-item-price">
                    {(item.price * item.quantity).toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div className="cart-item-controls">
                  <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                  <button
                    className="delete-btn"
                    onClick={() => removeFromCart(item.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tổng tiền & Thanh toán */}
        <div className="sidebar-footer">
          <div className="summary-row">
            <span>Tạm tính:</span>
            <span>{totalAmount.toLocaleString("vi-VN")} đ</span>
          </div>
          <div className="summary-row total">
            <span>Tổng cộng:</span>
            <span>{totalAmount.toLocaleString("vi-VN")} đ</span>
          </div>
          <button className="checkout-btn" onClick={handleCheckout}>
            Thanh Toán
          </button>
        </div>
      </div>

      {/* POPUP / MODAL TẠO KHÁCH HÀNG MỚI */}
      {showAddCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Thêm Khách Hàng Mới</h3>
            <form onSubmit={handleSaveNewCustomer}>
              <div className="form-group">
                <label>Số điện thoại *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên khách hàng"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Ngày sinh</label>
                <input
                  type="date"
                  value={newCustomer.dob}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, dob: e.target.value })
                  }
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddCustomerModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-save">
                  Lưu & Chọn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
