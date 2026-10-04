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

  const handleBypassLogin = (role = "admin") => {
    const mockUser = {
      name: role === "admin" ? "Quản Trị Viên (Demo)" : "Thu Ngân (Demo)",
      role: role,
      MaVaiTro: role === "admin" ? 1 : 3,
      email: "demo@coffee.com",
    };
    sessionStorage.setItem("user", JSON.stringify(mockUser));
    localStorage.setItem("user", JSON.stringify(mockUser));
    sessionStorage.setItem("accessToken", "demo-token");
    localStorage.setItem("accessToken", "demo-token");
    navigate("/home");
  };

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

        // Lưu cả JWT token để gắn vào header khi gọi các API sau
        if (res.data.accessToken) {
          localStorage.setItem("accessToken", res.data.accessToken);
          sessionStorage.setItem("accessToken", res.data.accessToken);
        }

        // Chuyển hướng sang /home
        setTimeout(() => {
          navigate("/home");
        }, 500);
      }
    } catch (error) {
      console.error(error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setIsSuccess(false);
        setMessage(error.response.data.message);
      } else {
        // Backend offline -> tự động vào chế độ demo
        setIsSuccess(true);
        setMessage("Không có Backend: Đang tự động vào hệ thống với tài khoản Demo...");
        setTimeout(() => {
          handleBypassLogin("admin");
        }, 600);
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

          <button type="submit" className="btn btn-login w-100 mb-3">
            Đăng Nhập Ngay
          </button>

          <div className="pt-3 border-top text-center">
            <p className="text-muted small mb-2">⚡ Chưa có backend? Vào thẳng giao diện:</p>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm flex-fill"
                onClick={() => handleBypassLogin("admin")}
              >
                Admin (Đầy đủ tính năng)
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm flex-fill"
                onClick={() => handleBypassLogin("staff")}
              >
                Nhân viên (POS)
              </button>
            </div>
          </div>
        </form>

        <div className="login-footer"></div>
      </div>
    </div>
  );
}
// ddang xuat
export default Login;
//push tong tien hang
