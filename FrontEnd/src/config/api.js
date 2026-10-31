/**
 * FrontEnd/src/config/api.js
 * Cấu hình tập trung API URL & Socket URL cho môi trường Local và Production (Render / Vercel)
 */

const resolveBaseUrl = () => {
  // 1. Nếu có biến môi trường build (ví dụ VITE_API_URL khi tách FE và BE riêng)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }

  // 2. Chạy trên trình duyệt
  if (typeof window !== "undefined") {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    // Khi dev ở local (máy cá nhân), mặc định trỏ về cổng backend 5000
    if (isLocal) {
      return "http://localhost:5000";
    }

    // Khi đã deploy lên server/Render (dùng chung 1 service hoặc cùng domain)
    return window.location.origin;
  }

  return "http://localhost:5000";
};

export const API_ORIGIN = resolveBaseUrl();
export const API_BASE = `${API_ORIGIN}/api`;
export const SOCKET_URL = API_ORIGIN;

/**
 * Chuẩn hóa URL hình ảnh sản phẩm (hỗ trợ cả ảnh upload và link ngoài)
 */
export const getFullImageUrl = (path) => {
  if (!path) return "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${cleanPath}`;
};

export default {
  API_ORIGIN,
  API_BASE,
  SOCKET_URL,
  getFullImageUrl,
};
