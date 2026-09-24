import React, { useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../css/login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/login", {
        username,
        password,
      });

      if (res.data.success) {
        setIsSuccess(true);
        setMessage("Đăng nhập thành công!");
        localStorage.setItem("user", JSON.stringify(res.data.user));

        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      } else {
        setIsSuccess(false);
        setMessage(res.data.message);
      }
    } catch (error) {
      console.error(error);
      setIsSuccess(false);
      setMessage("Không thể kết nối đến server!");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo biểu tượng ly cà phê */}
        <div className="coffee-logo-badge">☕</div>

        <h3 className="login-title">Coffee </h3>
        <p className="login-subtitle">Hệ thống Quản lý Cửa hàng Cà Phê</p>

        <div className="coffee-divider">
          <span>Hệ thống đăng nhập</span>
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
            <label className="form-label">Tên đăng nhập / Email</label>
            <input
              type="text"
              className="form-control"
              placeholder="Nhập tên đăng nhập..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Mật khẩu</label>
            <input
              type="password"
              className="form-control"
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-options">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="rememberCheck"
              />
              <label className="form-check-label" htmlFor="rememberCheck">
                Ghi nhớ
              </label>
            </div>
            <a href="#forgot">Quên mật khẩu?</a>
          </div>

          <button type="submit" className="btn btn-login w-100">
            Đăng Nhập Ngay
          </button>
        </form>

        <div className="login-footer"></div>
      </div>
    </div>
  );
}

export default Login;
