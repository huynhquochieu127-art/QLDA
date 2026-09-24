import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";

function App() {
  return (
    <Router>
      <Routes>
        {/* Đặt trang Đăng nhập làm trang gốc (hiển thị đầu tiên) */}
        <Route path="/" element={<Login />} />

        {/* Nếu người dùng vào /login cũng hiển thị trang Login */}
        <Route path="/login" element={<Login />} />

        {/* Trang chủ / Dashboard sau khi đăng nhập thành công */}
        <Route
          path="/dashboard"
          element={
            <div className="container text-center mt-5">
              <h1>Chào mừng bạn đến với Trang Chủ Quản Lý Cà Phê!</h1>
            </div>
          }
        />

        {/* Nhập đường dẫn sai sẽ tự động chuyển hướng về trang Đăng nhập */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
