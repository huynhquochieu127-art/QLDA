import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../css/login.css";

function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Hàm hỗ trợ đăng nhập Bypass nhanh theo vai trò
  const handleBypassLogin = (role = "admin") => {
    const roleProfiles = {
      admin: {
        name: "Nguyễn Hải Hậu (Admin)",
        role: "admin",
        MaVaiTro: 1,
        email: "admin@coffee.com",
      },
      manager: {
        name: "Quản Lý Cửa Hàng",
        role: "manager",
        MaVaiTro: 2,
        email: "manager@coffee.com",
      },
      cashier: {
        name: "Thu Ngân POS",
        role: "cashier",
        MaVaiTro: 3,
        email: "cashier@coffee.com",
      },
      barista: {
        name: "Nhân Viên Pha Chế",
        role: "barista",
        MaVaiTro: 4,
        email: "barista@coffee.com",
      },
      waiter: {
        name: "Nhân Viên Phục Vụ",
        role: "waiter",
        MaVaiTro: 5,
        email: "waiter@coffee.com",
      },
    };

    const mockUser = roleProfiles[role] || roleProfiles.admin;

    // Lưu thông tin người dùng & token vào Session/Local Storage
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("user", JSON.stringify(mockUser));
    storage.setItem("accessToken", "demo-token-bypass");

    // Đồng bộ lại cả sessionStorage để chắc chắn các trang đọc được
    sessionStorage.setItem("user", JSON.stringify(mockUser));
    sessionStorage.setItem("accessToken", "demo-token-bypass");

    navigate("/home");
  };

  // Xử lý gửi form đăng nhập chính thức sang Backend API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!usernameOrEmail.trim() || !password.trim()) {
      setIsSuccess(false);
      setMessage("Vui lòng nhập tên đăng nhập/email và mật khẩu!");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/api/login", {
        username: usernameOrEmail,
        email: usernameOrEmail,
        password: password,
      });

      if (res.data.success) {
        setIsSuccess(true);
        setMessage("Đăng nhập thành công! Đang chuyển hướng...");

        const userData = JSON.stringify(res.data.user);
        const token = res.data.accessToken || res.data.token || "jwt-token";

        if (rememberMe) {
          localStorage.setItem("user", userData);
          localStorage.setItem("accessToken", token);
        }
        sessionStorage.setItem("user", userData);
        sessionStorage.setItem("accessToken", token);

        setTimeout(() => {
          navigate("/home");
        }, 500);
      } else {
        setIsSuccess(false);
        setMessage(
          res.data.message || "Tên đăng nhập hoặc mật khẩu không chính xác.",
        );
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setIsSuccess(false);
        setMessage(error.response.data.message);
      } else {
        // Nếu Backend chưa bật hoặc ngắt kết nối -> Tự động chuyển qua Demo Mode
        setIsSuccess(true);
        setMessage(
          "Không kết nối được Backend! Đang tự động vào giao diện Demo Admin...",
        );
        setTimeout(() => {
          handleBypassLogin("admin");
        }, 800);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo biểu tượng ly cà phê */}
        <div className="coffee-logo-badge">☕</div>

        <h3 className="login-title">QuanLyCF</h3>
        <p className="login-subtitle">Hệ thống Quản lý Cửa hàng Cà Phê & POS</p>

        <div className="coffee-divider">
          <span>Đăng nhập hệ thống</span>
        </div>

        {message && (
          <div
            className={`alert ${isSuccess ? "alert-success" : "alert-danger"} mb-3`}
            role="alert"
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label font-weight-bold">
              Tên đăng nhập / Email
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Nhập tên đăng nhập hoặc email..."
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label font-weight-bold">Mật khẩu</label>
            <input
              type="password"
              className="form-control"
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-options d-flex justify-content-between align-items-center mb-3">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="rememberCheck"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label
                className="form-check-label text-secondary"
                htmlFor="rememberCheck"
              >
                Ghi nhớ đăng nhập
              </label>
            </div>
            <a
              href="#forgot"
              className="text-decoration-none text-primary small"
            >
              Quên mật khẩu?
            </a>
          </div>

          <button
            type="submit"
            className="btn btn-login w-100 mb-3 text-white font-weight-bold"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Đăng Nhập"}
          </button>

          {/* CHẾ ĐỘ THỬ NGHIỆM BYPASS DEMO */}
          <div className="pt-3 border-top text-center">
            <p className="text-muted small mb-2"></p>
            <div className="d-flex flex-wrap gap-1 justify-content-center">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm flex-fill"
                onClick={() => handleBypassLogin("admin")}
              >
                Admin
              </button>
              <button
                type="button"
                className="btn btn-outline-info btn-sm flex-fill"
                onClick={() => handleBypassLogin("manager")}
              >
                Quản lý
              </button>
              <button
                type="button"
                className="btn btn-outline-success btn-sm flex-fill"
                onClick={() => handleBypassLogin("cashier")}
              >
                Thu ngân
              </button>
              <button
                type="button"
                className="btn btn-outline-warning btn-sm flex-fill"
                onClick={() => handleBypassLogin("barista")}
              >
                Pha chế
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm flex-fill"
                onClick={() => handleBypassLogin("waiter")}
              >
                Phục vụ
              </button>
            </div>
          </div>
        </form>

        <div className="login-footer"></div>
      </div>
    </div>
  );
}

export default Login;
