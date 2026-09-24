import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../css/login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate(); // Hook chuyển trang mượt mà

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await axios.post("http://localhost:5000/api/login", {
        email,
        password,
      });

      if (res.data.success) {
        setIsSuccess(true);
        setMessage("Đăng nhập thành công!");

        // Lưu thông tin đồng bộ vào cả sessionStorage và localStorage
        const userData = JSON.stringify(res.data.user);
        sessionStorage.setItem("user", userData);
        localStorage.setItem("user", userData);

        // Chuyển hướng mượt sang /dashboard mà không load lại trang
        setTimeout(() => {
          navigate("/dashboard");
        }, 800);
      }
    } catch (error) {
      console.error(error);
      setIsSuccess(false);

      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setMessage(error.response.data.message);
      } else {
        setMessage("Không thể kết nối đến server!");
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo biểu tượng ly cà phê */}
        <div className="coffee-logo-badge">☕</div>

        <h3 className="login-title">Coffee</h3>
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
              placeholder="Nhập email đăng nhập..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
// ddang xuat
export default Login;
