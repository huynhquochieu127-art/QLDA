import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Bell,
  Check,
  ExternalLink,
  Calendar,
  Info,
  X,
  Receipt,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { io } from "socket.io-client";
import { API_BASE } from "../utils/staffWork";

export default function NotificationBell({ currentUser, onNavigateTab }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [toastNotif, setToastNotif] = useState(null); // Popup Ting ting khi vừa có lương
  const dropdownRef = useRef(null);

  const empId =
    currentUser?.MaNhanVien ||
    currentUser?.id ||
    currentUser?.staffId ||
    null;

  // Hiệu ứng âm thanh "Ting ting" chuẩn bằng Web Audio API
  const playTingTingSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;

      // Nốt thứ nhất (880Hz - A5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Nốt thứ hai cao hơn (1320Hz - E6) tạo tiếng "Ting!" tươi vui
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, now + 0.1);
      gain2.gain.setValueAtTime(0.18, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.45);
    } catch (e) {
      // Bỏ qua nếu browser chặn autoplay âm thanh khi chưa click
    }
  };

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
          const newObj = {
            MaTB: notif.maTB || Date.now(),
            TieuDe: notif.tieuDe,
            NoiDung: notif.noiDung,
            Loai: notif.loai,
            Link: notif.link,
            DaXem: 0,
            NgayTao: notif.ngayTao || new Date(),
          };

          setNotifications((prev) => [newObj, ...prev]);
          setUnreadCount((c) => c + 1);

          // Phát âm thanh Ting ting & hiển thị popup thông báo
          playTingTingSound();
          setToastNotif(newObj);

          // Tự đóng toast sau 8 giây
          setTimeout(() => {
            setToastNotif((cur) => (cur?.MaTB === newObj.MaTB ? null : cur));
          }, 8000);
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

  // Khi click vào link xem chi tiết (Bảng công hoặc Phiếu lương)
  const handleOpenDetailLink = (notif) => {
    handleMarkAsRead(notif);
    setIsOpen(false);
    setToastNotif(null);

    const isPayslip =
      notif.Loai === "payslip" ||
      (notif.Link && notif.Link.includes("my_payslip")) ||
      (notif.TieuDe && notif.TieuDe.toLowerCase().includes("phiếu lương"));

    if (isPayslip) {
      if (onNavigateTab) onNavigateTab("my_payslip");
    } else {
      if (onNavigateTab) onNavigateTab("my_timesheet");
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
      {/* 1. TOAST POPUP NOTIFICATION TING TING KHI NHẬN ĐƯỢC PHIẾU LƯƠNG */}
      {toastNotif && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 99999,
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08)",
            border: "2px solid #22c55e",
            maxWidth: "380px",
            animation: "slideInRight 0.3s ease-out",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: "#dcfce7",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Receipt size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "#15803d" }}>
                  {toastNotif.TieuDe}
                </div>
                <div style={{ fontSize: "12px", color: "#475569", marginTop: 2 }}>
                  {toastNotif.NoiDung}
                </div>
              </div>
            </div>
            <button
              onClick={() => setToastNotif(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              onClick={() => handleOpenDetailLink(toastNotif)}
              style={{
                backgroundColor: "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 6px rgba(22, 163, 74, 0.3)",
              }}
            >
              <span>Xem Phiếu Lương Ngay</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 2. NÚT CHUÔNG THÔNG BÁO TRÊN HEADER */}
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

      {/* 3. DROPDOWN MENU DANH SÁCH THÔNG BÁO */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "48px",
            right: 0,
            width: "390px",
            maxWidth: "92vw",
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
                const isPayslip =
                  notif.Loai === "payslip" ||
                  (notif.Link && notif.Link.includes("my_payslip")) ||
                  (notif.TieuDe && notif.TieuDe.toLowerCase().includes("phiếu lương"));
                const isTimesheet = notif.Loai === "timesheet_review";
                const isUnread = !notif.DaXem;

                return (
                  <div
                    key={notif.MaTB}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: isUnread
                        ? isPayslip
                          ? "#f0fdf4"
                          : "#f0f9ff"
                        : "#ffffff",
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
                          backgroundColor: isPayslip
                            ? "#dcfce7"
                            : isTimesheet
                            ? "#e0f2fe"
                            : "#f1f5f9",
                          color: isPayslip
                            ? "#15803d"
                            : isTimesheet
                            ? "#0284c7"
                            : "#64748b",
                          padding: "7px",
                          borderRadius: "8px",
                          marginTop: "2px",
                        }}
                      >
                        {isPayslip ? <Receipt size={17} /> : <Calendar size={16} />}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: isUnread ? 700 : 600,
                            fontSize: "13px",
                            color: isPayslip
                              ? "#15803d"
                              : isUnread
                              ? "#0369a1"
                              : "#1e293b",
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

                        {/* Nút / Link xem chi tiết */}
                        {notif.Link && (
                          <button
                            onClick={() => handleOpenDetailLink(notif)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              backgroundColor: isPayslip ? "#16a34a" : "#0284c7",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "5px 12px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.15s",
                              boxShadow: isPayslip
                                ? "0 1px 3px rgba(22, 163, 74, 0.3)"
                                : "0 1px 2px rgba(2, 132, 199, 0.2)",
                            }}
                          >
                            <span>
                              {isPayslip
                                ? "👉 Xem chi tiết Phiếu lương (QH-59)"
                                : "👉 Xem chi tiết Bảng công nháp"}
                            </span>
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
