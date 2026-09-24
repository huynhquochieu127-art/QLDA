import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Gọi API sang BackEnd
    axios
      .get("http://localhost:5000/api/test")
      .then((response) => {
        setMessage(response.data.message); // Nhận chuỗi từ BackEnd gửi về
      })
      .catch((error) => {
        console.error("Lỗi kết nối BackEnd:", error);
      });
  }, []);

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>Kết quả từ BackEnd:</h1>
      <h2 style={{ color: "green" }}>{message || "Đang kết nối..."}</h2>
    </div>
  );
}

export default App;
