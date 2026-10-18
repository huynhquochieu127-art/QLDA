import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Bell, Check, ExternalLink, Calendar, Info, X } from "lucide-react";
import { io } from "socket.io-client";
import { API_BASE } from "../utils/staffWork";

export default function NotificationBell({ currentUser, onNavigateTab }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const empId =
    currentUser?.MaNhanVien ||
    currentUser?.id ||
    currentUser?.staffId ||
    null;

  // 1. Tải danh sách thông báo của nhân viên
  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE}/notifications/my`, {
        params: { maNhanVien: empId },
      });
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn("Lỗi tải thông báo:", err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // 2. Kết nối Socket.IO để nhận thông báo realtime
    let socket;
    try {
      const backendUrl = API_BASE.replace("/api", "");
      socket = io(backendUrl, { transports: ["websocket", "polling"] });

      socket.on("connect", () => {
        // Connected
      });

      socket.on("new_notification", (notif) => {
        // Kiểm tra xem thông báo này có dành cho nhân viên này không
        if (!notif.maNhanVien || String(notif.maNhanVien) === String(empId)) {
          setNotifications((prev) => [
            {
              MaTB: notif.maTB || Date.now(),
              TieuDe: notif.tieuDe,
              NoiDung: notif.noiDung,
              Loai: notif.loai,
              Link: notif.link,
              DaXem: 0,
              NgayTao: notif.ngayTao || new Date(),
            },
            ...prev,
          ]);
          setUnreadCount((c) => c + 1);
        }
      });
    } catch (e) {
      console.warn("Socket connect error:", e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [empId]);

  // Click bên ngoài dropdown để đóng
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Đánh dấu 1 thông báo là đã đọc
  const handleMarkAsRead = async (notif) => {
    if (notif.DaXem) return;
    try {
      await axios.put(`${API_BASE}/notifications/${notif.MaTB}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.MaTB === notif.MaTB ? { ...n, DaXem: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.warn("Lỗi đánh dấu đã đọc:", err.message);
    }
  };

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllAsRead = async () => {
    try {
      await axios.put(`${API_BASE}/notifications/read-all`, {
        maNhanVien: empId,
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, DaXem: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.warn("Lỗi mark all read:", err.message);
    }
  };

  // Khi click vào link xem chi tiết Bảng công nháp
  const handleOpenDetailLink = (notif) => {
    handleMarkAsRead(notif);
    setIsOpen(false);

    if (notif.Link && notif.Link.includes("my_timesheet")) {
      if (onNavigateTab) {
        onNavigateTab("my_timesheet");
      }
    } else if (onNavigateTab) {
      onNavigateTab("my_timesheet");
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      {/* Nút Chuông thông báo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "relative",
          background: isOpen ? "#f1f5f9" : "transparent",
          border: "1px solid #e2e8f0",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: unreadCount > 0 ? "#2563eb" : "#475569",
          transition: "all 0.2s",
        }}
        title="Thông báo hệ thống"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              backgroundColor: "#ef4444",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "700",
              minWidth: "18px",
              height: "18px",
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 0 0 2px #ffffff",
              animation: "pulse 2s infinite",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu Danh Sách Thông Báo */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "48px",
            right: 0,
            width: "380px",
            maxWidth: "90vw",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e2e8f0",
            zIndex: 9999,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header Dropdown */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bell size={16} color="#2563eb" />
              <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                Thông Báo
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: "#dbeafe",
                    color: "#1e40af",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "10px",
                  }}
                >
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Đọc tất cả
              </button>
            )}
          </div>

          {/* Body Dropdown */}
          <div
            style={{
              maxHeight: "380px",
              overflowY: "auto",
              padding: "4px 0",
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: "13px",
                }}
              >
                <Info size={28} style={{ margin: "0 auto 8px", opacity: 0.6 }} />
                <p style={{ margin: 0 }}>Bạn chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isTimesheet = notif.Loai === "timesheet_review";
                const isUnread = !notif.DaXem;

                return (
                  <div
                    key={notif.MaTB}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: isUnread ? "#f0f9ff" : "#ffffff",
                      transition: "background 0.15s",
                      cursor: "default",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: isTimesheet ? "#e0f2fe" : "#f1f5f9",
                          color: isTimesheet ? "#0284c7" : "#64748b",
                          padding: "6px",
                          borderRadius: "8px",
                          marginTop: "2px",
                        }}
                      >
                        <Calendar size={16} />
                      </div>

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: isUnread ? 700 : 600,
                            fontSize: "13px",
                            color: isUnread ? "#0369a1" : "#1e293b",
                            marginBottom: "4px",
                          }}
                        >
                          {notif.TieuDe}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#475569",
                            lineHeight: "1.4",
                            marginBottom: "8px",
                          }}
                        >
                          {notif.NoiDung}
                        </div>

                        {/* Nút / Link xem chi tiết Bảng công nháp */}
                        {notif.Link && (
                          <button
                            onClick={() => handleOpenDetailLink(notif)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              backgroundColor: "#0284c7",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "5px 10px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.15s",
                              boxShadow: "0 1px 2px rgba(2, 132, 199, 0.2)",
                            }}
                          >
                            <span>👉 Xem chi tiết Bảng công nháp</span>
                            <ExternalLink size={12} />
                          </button>
                        )}

                        <div
                          style={{
                            fontSize: "11px",
                            color: "#94a3b8",
                            marginTop: "6px",
                          }}
                        >
                          {formatTimeAgo(notif.NgayTao)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
