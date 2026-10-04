/**
 * useTableSocket.js
 * Custom hook - Lắng nghe realtime trạng thái bàn qua Socket.IO
 * Dùng trong component nào cần cập nhật bàn real-time
 */
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

// Singleton socket - tránh tạo nhiều connection
let socketInstance = null;

function getSocket() {
  if (!socketInstance || socketInstance.disconnected) {
    socketInstance = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
  }
  return socketInstance;
}

/**
 * Hook lắng nghe sự kiện bàn realtime
 * @param {Object} callbacks
 * @param {Function} callbacks.onStatusChanged - (data) => void  -- khi bàn đổi trạng thái
 * @param {Function} callbacks.onTableAdded   - (data) => void  -- khi thêm bàn mới
 * @param {Function} callbacks.onTableDeleted - (data) => void  -- khi xóa bàn
 */
export function useTableSocket({ onStatusChanged, onTableAdded, onTableDeleted } = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    if (onStatusChanged) socket.on("table:statusChanged", onStatusChanged);
    if (onTableAdded)    socket.on("table:added",         onTableAdded);
    if (onTableDeleted)  socket.on("table:deleted",       onTableDeleted);

    socket.on("connect", () => console.log("🟢 Socket.IO kết nối thành công:", socket.id));
    socket.on("disconnect", () => console.log("🔴 Socket.IO mất kết nối"));

    // Cleanup: bỏ lắng nghe khi component unmount
    return () => {
      if (onStatusChanged) socket.off("table:statusChanged", onStatusChanged);
      if (onTableAdded)    socket.off("table:added",         onTableAdded);
      if (onTableDeleted)  socket.off("table:deleted",       onTableDeleted);
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  return socketRef.current;
}
