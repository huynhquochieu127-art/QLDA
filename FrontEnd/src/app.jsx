import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/home";

// 1. Kiểm tra nếu chưa đăng nhập thì đẩy về trang /login
const ProtectedRoute = ({ children }) => {
  const user = sessionStorage.getItem("user");
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// 2. Nếu đã đăng nhập rồi thì không cho vào lại /login, tự nhảy sang /dashboard
const PublicRoute = ({ children }) => {
  const user = sessionStorage.getItem("user");
  if (user) {
    return <Navigate to="/home" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Mặc định vào trang chủ /dashboard */}
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* Trang Đăng nhập */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Trang Home / Dashboard */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* Đường dẫn sai tự động điều hướng */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
