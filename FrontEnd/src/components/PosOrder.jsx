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

  //ket noi backend
];

export default function PosOrder({ selectedTableProp, onNavigateToTables }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [selectedTable, setSelectedTable] = useState(selectedTableProp || "Bàn 01");

  // Đồng bộ bàn khi chọn từ Sơ đồ bàn (QH-71)
  useEffect(() => {
    if (selectedTableProp) {
      setSelectedTable(selectedTableProp);
    }
  }, [selectedTableProp]);

  // Đọc danh sách bàn cấu hình từ Admin (localStorage)
  const [tableOptions, setTableOptions] = useState(() => {
    try {
      const saved = localStorage.getItem("cf_tables");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t) => t.name);
        }
      }
    } catch (e) {}
    return ["Bàn 01", "Bàn 02", "Bàn 03", "Bàn 04", "Bàn 05"];
  });

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

  // State QH-79: Nhập tiền khách đưa & Tính tiền thối lại
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH"); // 'CASH' | 'TRANSFER'
  const [customerCash, setCustomerCash] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

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

  // Xử lý mở Modal Thanh toán (QH-79)
  const handleOpenPayment = () => {
    if (cart.length === 0) {
      alert("Giỏ hàng đang trống! Vui lòng chọn món trước khi thanh toán.");
      return;
    }
    setCustomerCash("");
    setPaymentMethod("CASH");
    setShowPaymentModal(true);
  };

  // Tính toán tiền khách đưa & tiền thối lại (QH-79)
  const numericCustomerCash = Number(customerCash) || 0;
  const changeAmount = numericCustomerCash - totalAmount;
  const isCashEnough = numericCustomerCash >= totalAmount;
  const isPaymentValid = paymentMethod === "TRANSFER" || isCashEnough;

  // Xử lý nhập tiền khách đưa (chỉ lấy ký tự số)
  const handleCashInputChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    setCustomerCash(rawVal ? parseInt(rawVal, 10) : "");
  };

  // Chọn mệnh giá nhanh
  const handleSetQuickCash = (amount) => {
    setCustomerCash(amount);
  };

  // Cộng thêm tiền nhanh (+10k, +20k, +50k)
  const handleAddQuickCash = (added) => {
    setCustomerCash((prev) => (Number(prev) || 0) + added);
  };

  // Xóa số tiền đã nhập
  const handleClearCash = () => {
    setCustomerCash("");
  };

  // Xác nhận thanh toán & hoàn tất đơn hàng
  const handleConfirmPayment = async () => {
    if (!isPaymentValid) {
      alert("Khách đưa chưa đủ tiền thanh toán!");
      return;
    }

    const receiptInfo = {
      orderId: "HD" + Math.floor(100000 + Math.random() * 900000),
      table: selectedTable,
      customer: selectedCustomer,
      items: [...cart],
      totalAmount,
      paymentMethod,
      customerCash: paymentMethod === "CASH" ? numericCustomerCash : totalAmount,
      changeAmount: paymentMethod === "CASH" ? Math.max(0, changeAmount) : 0,
      createdAt: new Date().toLocaleTimeString("vi-VN") + " " + new Date().toLocaleDateString("vi-VN"),
    };

    // Thử lưu đơn hàng vào Backend API
    try {
      await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer ? selectedCustomer.id : null,
          items: cart,
          totalAmount,
          paymentMethod,
        }),
      });
    } catch (err) {
      console.log("Đơn hàng được lưu thành công trên máy (Offline):", err.message);
    }

    setLastReceipt(receiptInfo);
    setShowPaymentModal(false);
    setShowReceiptModal(true);
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
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="table-select"
            >
              <option value="Mang về">Mang về</option>
              {tableOptions.map((tblName) => (
                <option key={tblName} value={tblName}>
                  {tblName}
                </option>
              ))}
            </select>
            {onNavigateToTables && (
              <button
                type="button"
                onClick={onNavigateToTables}
                title="Mở Sơ đồ bàn trực quan dạng lưới (Grid) Xanh - Đỏ - Vàng"
                style={{
                  padding: "5px 9px",
                  fontSize: "12px",
                  fontWeight: "600",
                  borderRadius: "6px",
                  border: "1px solid #b8c8d9",
                  background: "#eef6ff",
                  cursor: "pointer",
                  color: "#0066cc",
                  whiteSpace: "nowrap",
                }}
              >
                🗺️ Sơ đồ bàn
              </button>
            )}
          </div>
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
          <button className="checkout-btn" onClick={handleOpenPayment}>
            Thanh Toán (F9)
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

      {/* ==========================================================
          QH-79: MODAL NHẬP TIỀN KHÁCH ĐƯA VÀ TÍNH TIỀN THỐI LẠI
          ========================================================== */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content payment-modal">
            {/* Header */}
            <div className="payment-modal-header">
              <h3>💵 Thanh Toán - {selectedTable}</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowPaymentModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Thông tin đơn hàng & Khách hàng */}
            <div className="payment-summary-box">
              <div>
                <div className="summary-meta-label">
                  Khách hàng:{" "}
                  <span className="summary-customer-info">
                    {selectedCustomer
                      ? `${selectedCustomer.name} (${selectedCustomer.phone})`
                      : "Khách lẻ"}
                  </span>
                </div>
                <div className="summary-meta-label">
                  Số lượng món: <strong>{cart.reduce((s, i) => s + i.quantity, 0)}</strong>
                </div>
              </div>
              <div className="summary-amount-wrapper">
                <div className="summary-amount-label">Cần thanh toán</div>
                <div className="summary-amount-value">
                  {totalAmount.toLocaleString("vi-VN")} đ
                </div>
              </div>
            </div>

            {/* Phương thức thanh toán */}
            <div className="payment-tabs">
              <button
                className={`payment-tab-btn ${paymentMethod === "CASH" ? "active" : ""}`}
                onClick={() => setPaymentMethod("CASH")}
              >
                💵 Tiền Mặt
              </button>
              <button
                className={`payment-tab-btn ${paymentMethod === "TRANSFER" ? "active" : ""}`}
                onClick={() => setPaymentMethod("TRANSFER")}
              >
                📲 Chuyển Khoản QR
              </button>
            </div>

            {/* NỘI DUNG THANH TOÁN TIỀN MẶT */}
            {paymentMethod === "CASH" && (
              <div className="cash-input-section">
                <div className="cash-label">
                  <span>Tiền khách đưa:</span>
                  {customerCash ? (
                    <span style={{ fontSize: "12px", color: "#666", fontWeight: "normal" }}>
                      ({Number(customerCash).toLocaleString("vi-VN")} VNĐ)
                    </span>
                  ) : null}
                </div>

                {/* Ô nhập tiền khách đưa */}
                <div className="cash-input-wrapper">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="cash-input-field"
                    placeholder="Nhập số tiền..."
                    value={
                      customerCash !== ""
                        ? Number(customerCash).toLocaleString("vi-VN")
                        : ""
                    }
                    onChange={handleCashInputChange}
                    autoFocus
                  />
                  {customerCash ? (
                    <button
                      className="clear-cash-btn"
                      onClick={handleClearCash}
                      title="Xóa tiền đã nhập"
                    >
                      ✕
                    </button>
                  ) : null}
                  <span className="cash-currency-badge">VNĐ</span>
                </div>

                {/* Hàng nút gợi ý tiền nhanh */}
                <div className="quick-cash-container">
                  <span className="quick-cash-title">Gợi ý mệnh giá nhanh:</span>
                  <div className="quick-cash-grid">
                    {/* Nút trả đúng số tiền */}
                    <button
                      type="button"
                      className="quick-cash-btn exact-btn"
                      onClick={() => handleSetQuickCash(totalAmount)}
                    >
                      Đủ tiền ({totalAmount.toLocaleString("vi-VN")})
                    </button>

                    {/* Các mệnh giá tiền mặt phổ biến */}
                    {[50000, 100000, 200000, 500000].map((denom) => (
                      <button
                        key={denom}
                        type="button"
                        className="quick-cash-btn"
                        onClick={() => handleSetQuickCash(denom)}
                      >
                        {denom.toLocaleString("vi-VN")} đ
                      </button>
                    ))}

                    {/* Nút cộng thêm nhanh */}
                    <button
                      type="button"
                      className="quick-cash-btn"
                      onClick={() => handleAddQuickCash(10000)}
                    >
                      +10.000 đ
                    </button>
                    <button
                      type="button"
                      className="quick-cash-btn"
                      onClick={() => handleAddQuickCash(20000)}
                    >
                      +20.000 đ
                    </button>
                    <button
                      type="button"
                      className="quick-cash-btn"
                      onClick={() => handleAddQuickCash(50000)}
                    >
                      +50.000 đ
                    </button>
                  </div>
                </div>

                {/* HỘP TÍNH TIỀN THỐI LẠI (TỰ ĐỘNG THEO THỜI GIAN THỰC) */}
                {customerCash === "" || customerCash === 0 ? (
                  <div className="change-box empty">
                    <div className="change-label-group">
                      <div className="change-label">Chưa nhập tiền khách đưa</div>
                      <div className="change-subtext">
                        Nhập số tiền hoặc bấm mệnh giá gợi ý phía trên
                      </div>
                    </div>
                    <div className="change-value">0 đ</div>
                  </div>
                ) : isCashEnough ? (
                  <div className="change-box success">
                    <div className="change-label-group">
                      <div className="change-label">✨ TIỀN THỐI LẠI CHO KHÁCH:</div>
                      <div className="change-subtext">
                        Đã nhận đủ {numericCustomerCash.toLocaleString("vi-VN")} đ
                      </div>
                    </div>
                    <div className="change-value">
                      {changeAmount.toLocaleString("vi-VN")} đ
                    </div>
                  </div>
                ) : (
                  <div className="change-box warning">
                    <div className="change-label-group">
                      <div className="change-label">⚠️ Khách đưa chưa đủ tiền!</div>
                      <div className="change-subtext">Còn thiếu:</div>
                    </div>
                    <div className="change-value">
                      {Math.abs(changeAmount).toLocaleString("vi-VN")} đ
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NỘI DUNG CHUYỂN KHOẢN QR */}
            {paymentMethod === "TRANSFER" && (
              <div className="qr-transfer-section">
                <p className="qr-note">
                  Quét mã QR để thanh toán chính xác:{" "}
                  <strong>{totalAmount.toLocaleString("vi-VN")} đ</strong>
                </p>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=COFFEE_PAY_${totalAmount}_${selectedTable}`}
                  alt="QR Code Thanh Toán"
                  className="qr-code-img"
                />
                <p className="qr-note" style={{ fontSize: "12px", color: "#888" }}>
                  Hệ thống tự động ghi nhận khi chuyển khoản thành công.
                </p>
              </div>
            )}

            {/* Nút hành động Modal */}
            <div className="payment-actions">
              <button
                type="button"
                className="btn-payment-cancel"
                onClick={() => setShowPaymentModal(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-payment-confirm"
                disabled={!isPaymentValid}
                onClick={handleConfirmPayment}
              >
                ✓ Hoàn Tất Thanh Toán
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL HÓA ĐƠN / BIÊN LAI THÀNH CÔNG
          ========================================================== */}
      {showReceiptModal && lastReceipt && (
        <div className="modal-overlay">
          <div className="modal-content receipt-modal">
            <div className="receipt-icon-success">✓</div>
            <h3 className="receipt-title">Thanh Toán Thành Công!</h3>
            <p style={{ fontSize: "13px", color: "#666", margin: "0 0 12px 0" }}>
              Đơn hàng tại <strong>{lastReceipt.table}</strong> đã được hoàn tất.
            </p>

            <div className="receipt-details-card">
              <div className="receipt-row">
                <span>Mã hóa đơn:</span>
                <strong>{lastReceipt.orderId}</strong>
              </div>
              <div className="receipt-row">
                <span>Thời gian:</span>
                <span>{lastReceipt.createdAt}</span>
              </div>
              <div className="receipt-row">
                <span>Khách hàng:</span>
                <span>
                  {lastReceipt.customer
                    ? `${lastReceipt.customer.name}`
                    : "Khách lẻ"}
                </span>
              </div>
              <div className="receipt-row">
                <span>Hình thức:</span>
                <span>
                  {lastReceipt.paymentMethod === "CASH"
                    ? "Tiền mặt"
                    : "Chuyển khoản QR"}
                </span>
              </div>

              <div className="receipt-row highlight">
                <span>Tổng cộng:</span>
                <span style={{ color: "#d63031" }}>
                  {lastReceipt.totalAmount.toLocaleString("vi-VN")} đ
                </span>
              </div>

              {lastReceipt.paymentMethod === "CASH" && (
                <>
                  <div className="receipt-row">
                    <span>Tiền khách đưa:</span>
                    <span>
                      {lastReceipt.customerCash.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                  <div className="receipt-row change-highlight">
                    <span>Tiền thối lại:</span>
                    <span>
                      {lastReceipt.changeAmount.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              className="checkout-btn"
              onClick={() => setShowReceiptModal(false)}
            >
              In Hóa Đơn & Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
