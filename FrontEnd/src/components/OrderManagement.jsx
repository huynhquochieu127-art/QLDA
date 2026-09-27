import React, { useState, useEffect } from "react";
import {
  Clock,
  Coffee,
  CheckCircle,
  CreditCard,
  XCircle,
  RefreshCw,
  Search,
} from "lucide-react";

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch danh sách đơn hàng từ BackEnd
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/orders");
      if (!response.ok) throw new Error("Lỗi tải danh sách đơn hàng");
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error("Lỗi fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Tự động làm mới dữ liệu mỗi 8 giây để cập nhật trạng thái đơn hàng mới
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  // 2. Thao tác cập nhật trạng thái đơn hàng
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || "Thao tác thất bại");
      }

      // Cập nhật State trực tiếp tại FrontEnd
      setOrders((prev) =>
        prev.map((ord) =>
          ord.MaDonHang === orderId ? { ...ord, TrangThai: newStatus } : ord,
        ),
      );
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  // 3. Render Badge hiển thị trạng thái
  const renderStatusBadge = (status) => {
    const badgeStyles = {
      padding: "6px 12px",
      borderRadius: "20px",
      fontSize: "13px",
      fontWeight: "600",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
    };

    switch (status) {
      case "Mới tạo":
        return (
          <span
            style={{
              ...badgeStyles,
              backgroundColor: "#e0f2fe",
              color: "#0369a1",
            }}
          >
            <Clock size={14} /> Mới tạo
          </span>
        );
      case "Đang pha chế":
        return (
          <span
            style={{
              ...badgeStyles,
              backgroundColor: "#fef3c7",
              color: "#b45309",
            }}
          >
            <Coffee size={14} /> Đang pha chế
          </span>
        );
      case "Hoàn thành":
        return (
          <span
            style={{
              ...badgeStyles,
              backgroundColor: "#dcfce7",
              color: "#15803d",
            }}
          >
            <CheckCircle size={14} /> Hoàn thành
          </span>
        );
      case "Đã thanh toán":
        return (
          <span
            style={{
              ...badgeStyles,
              backgroundColor: "#dbeafe",
              color: "#1d4ed8",
            }}
          >
            <CreditCard size={14} /> Đã thanh toán
          </span>
        );
      case "Đã hủy":
        return (
          <span
            style={{
              ...badgeStyles,
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
            }}
          >
            <XCircle size={14} /> Đã hủy
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  // 4. Lọc dữ liệu theo Search và Filter
  const filteredOrders = orders.filter((order) => {
    const matchesFilter =
      statusFilter === "Tất cả" || order.TrangThai === statusFilter;
    const matchesSearch =
      order.MaDonHang.toString().includes(searchTerm) ||
      (order.MaBan && order.MaBan.toString().includes(searchTerm));
    return matchesFilter && matchesSearch;
  });

  return (
    <div
      style={{
        padding: "24px",
        fontFamily: "sans-serif",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#1e293b" }}>
            Quản lý Hóa đơn & Đơn hàng
          </h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
            Theo dõi và cập nhật trạng thái đơn hàng theo thời gian thực
          </p>
        </div>
        <button
          onClick={fetchOrders}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            backgroundColor: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Tải lại
        </button>
      </div>

      {/* Thanh Lọc & Tìm kiếm */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: "1", minWidth: "240px" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            type="text"
            placeholder="Tìm theo Mã đơn / Mã bàn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 10px 10px 38px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              outline: "none",
            }}
          />
        </div>

        {/* Nút lọc trạng thái */}
        {[
          "Tất cả",
          "Mới tạo",
          "Đang pha chế",
          "Hoàn thành",
          "Đã thanh toán",
          "Đã hủy",
        ].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: statusFilter === status ? "#2563eb" : "#fff",
              color: statusFilter === status ? "#fff" : "#475569",
              fontWeight: statusFilter === status ? "600" : "400",
              cursor: "pointer",
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Bảng Danh Sách Đơn Hàng */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#f1f5f9",
                borderBottom: "1px solid #e2e8f0",
                color: "#475569",
                fontSize: "14px",
              }}
            >
              <th style={{ padding: "12px 16px" }}>Mã Đơn</th>
              <th style={{ padding: "12px 16px" }}>Vị trí / Bàn</th>
              <th style={{ padding: "12px 16px" }}>Khách hàng</th>
              <th style={{ padding: "12px 16px" }}>Tổng tiền</th>
              <th style={{ padding: "12px 16px" }}>Phương thức</th>
              <th style={{ padding: "12px 16px" }}>Trạng thái</th>
              <th style={{ padding: "12px 16px", textAlign: "center" }}>
                Thao tác cập nhật
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    textAlign: "center",
                    padding: "32px",
                    color: "#94a3b8",
                  }}
                >
                  Chưa có đơn hàng nào phù hợp!
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.MaDonHang}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                >
                  <td
                    style={{
                      padding: "14px 16px",
                      fontWeight: "bold",
                      color: "#1e293b",
                    }}
                  >
                    #{order.MaDonHang}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {order.MaBan ? (
                      `Bàn ${order.MaBan}`
                    ) : (
                      <span style={{ color: "#64748b" }}>Mang đi</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {order.MaKhachHang
                      ? `KH #${order.MaKhachHang}`
                      : "Khách lẻ"}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontWeight: "600",
                      color: "#0f172a",
                    }}
                  >
                    {Number(
                      order.TongTien || order.ThanhTien || 0,
                    ).toLocaleString("vi-VN")}{" "}
                    đ
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      textTransform: "capitalize",
                    }}
                  >
                    {order.PhuongThucThanhToan || "Tiền mặt"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {renderStatusBadge(order.TrangThai)}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        justifyContent: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* [Pha chế] Nhận pha chế */}
                      {order.TrangThai === "Mới tạo" && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(order.MaDonHang, "Đang pha chế")
                          }
                          style={{
                            backgroundColor: "#d97706",
                            color: "#fff",
                            border: "none",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          ☕ Nhận pha chế
                        </button>
                      )}

                      {/* [Pha chế] Hoàn thành đồ uống */}
                      {order.TrangThai === "Đang pha chế" && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(order.MaDonHang, "Hoàn thành")
                          }
                          style={{
                            backgroundColor: "#16a34a",
                            color: "#fff",
                            border: "none",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          ✅ Hoàn thành
                        </button>
                      )}

                      {/* [Thu ngân] Xác nhận thanh toán */}
                      {(order.TrangThai === "Hoàn thành" ||
                        order.TrangThai === "Mới tạo") && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(order.MaDonHang, "Đã thanh toán")
                          }
                          style={{
                            backgroundColor: "#2563eb",
                            color: "#fff",
                            border: "none",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          💳 Thanh toán
                        </button>
                      )}

                      {/* Nút Hủy đơn */}
                      {order.TrangThai !== "Đã thanh toán" &&
                        order.TrangThai !== "Đã hủy" && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Xác nhận hủy đơn hàng #${order.MaDonHang}?`,
                                )
                              ) {
                                handleUpdateStatus(order.MaDonHang, "Đã hủy");
                              }
                            }}
                            style={{
                              backgroundColor: "#dc2626",
                              color: "#fff",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500",
                            }}
                          >
                            ❌ Hủy
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
