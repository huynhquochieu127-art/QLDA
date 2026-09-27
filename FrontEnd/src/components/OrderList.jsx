// src/components/OrderList.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const STATUS_LABELS = {
  PENDING: { label: "Mới tạo", color: "bg-gray-200 text-gray-800" },
  PROCESSING: { label: "Đang pha chế", color: "bg-yellow-200 text-yellow-800" },
  COMPLETED: { label: "Hoàn thành", color: "bg-blue-200 text-blue-800" },
  PAID: { label: "Đã thanh toán", color: "bg-green-200 text-green-800" },
  CANCELLED: { label: "Đã hủy", color: "bg-red-200 text-red-800" },
};

export default function OrderList() {
  const [orders, setOrders] = useState([]);

  // Hàm gọi API lấy danh sách đơn hàng
  const fetchOrders = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/orders");
      setOrders(res.data);
    } catch (err) {
      console.error("Lỗi tải danh sách đơn hàng", err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Hàm cập nhật trạng thái xuống CSDL
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(`http://localhost:5000/api/orders/${orderId}/status`, {
        status: newStatus,
      });
      // Cập nhật lại UI sau khi lưu thành công
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId ? { ...order, status: newStatus } : order,
        ),
      );
    } catch (err) {
      alert("Cập nhật trạng thái thất bại!");
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Quản lý Đơn hàng</h2>
      <div className="grid gap-4">
        {orders.map((order) => (
          <div
            key={order._id}
            className="border p-4 rounded-lg shadow-sm bg-white"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-lg">
                Đơn hàng #{order._id.slice(-6)}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_LABELS[order.status]?.color}`}
              >
                {STATUS_LABELS[order.status]?.label || order.status}
              </span>
            </div>

            {/* Các nút bấm thay đổi trạng thái dựa theo vòng đời */}
            <div className="flex flex-wrap gap-2 mt-4 pt-2 border-t">
              {order.status === "PENDING" && (
                <button
                  onClick={() => handleUpdateStatus(order._id, "PROCESSING")}
                  className="px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Bắt đầu pha chế
                </button>
              )}

              {order.status === "PROCESSING" && (
                <button
                  onClick={() => handleUpdateStatus(order._id, "COMPLETED")}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Hoàn thành món
                </button>
              )}

              {order.status === "COMPLETED" && (
                <button
                  onClick={() => handleUpdateStatus(order._id, "PAID")}
                  className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Xác nhận thanh toán
                </button>
              )}

              {order.status !== "PAID" && order.status !== "CANCELLED" && (
                <button
                  onClick={() => handleUpdateStatus(order._id, "CANCELLED")}
                  className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Hủy đơn
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
