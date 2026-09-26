const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // Lấy token từ header Authorization với format: "Bearer <token>"
  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Không tìm thấy Token, truy cập bị từ chối!" 
    });
  }

  try {
    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key");
    req.user = decoded; // Lưu thông tin user vào request để các middleware/route sau sử dụng
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: "Token không hợp lệ hoặc đã hết hạn!" 
    });
  }
};

// Middleware kiểm tra quyền (VD: chặn nếu không đúng role)
const verifyRole = (roles) => {
  return (req, res, next) => {
    // Giả sử bảng tài khoản có cột 'Quyen' hoặc 'Role'
    const userRole = req.user.Quyen || req.user.Role || req.user.role;
    
    if (!req.user || !roles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: "Bạn không có quyền (sai quyền) truy cập API này!" 
      });
    }
    next();
  };
};

module.exports = { verifyToken, verifyRole };
