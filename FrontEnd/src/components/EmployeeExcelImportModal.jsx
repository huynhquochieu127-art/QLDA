import React, { useState, useRef } from "react";
import axios from "axios";
import {
  FileSpreadsheet,
  Download,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCheck,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

export default function EmployeeExcelImportModal({ isOpen, onClose, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // 1. Tải file mẫu .xlsx
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await axios.get(`${API_BASE}/employees/template`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Template_NhanVien.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Lỗi tải file mẫu: " + (err.response?.data?.message || err.message));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // 2. Chọn file
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setErrorMsg("");
    setResult(null);

    if (file) {
      if (!file.name.endsWith(".xlsx")) {
        setErrorMsg("Định dạng file không hợp lệ! Vui lòng chỉ chọn file Excel có đuôi .xlsx");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  // 3. Tải lên và import
  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMsg("Vui lòng chọn một file Excel (.xlsx) trước khi nhấn tải lên!");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await axios.post(`${API_BASE}/employees/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Lỗi khi nhập dữ liệu từ file Excel!";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setErrorMsg("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(3px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: "16px 22px",
            backgroundColor: "#1e293b",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileSpreadsheet size={22} color="#10b981" />
            <div>
              <div style={{ fontWeight: 700, fontSize: "16px" }}>
                Nhập danh sách Nhân viên từ file Excel
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Hỗ trợ định dạng .xlsx · Tự động phát hiện & bỏ qua SĐT trùng lặp
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Modal */}
        <div style={{ padding: "22px", overflowY: "auto", flex: 1 }}>
          {/* Hướng dẫn và tải file mẫu */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "14px 18px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a" }}>
                Chưa có file Excel đúng cấu trúc?
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: 2 }}>
                Các cột bắt buộc: <strong>Họ tên, Số điện thoại, CCCD, Role</strong>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                padding: "7px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: downloadingTemplate ? "not-allowed" : "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              {downloadingTemplate ? (
                <>
                  <Loader2 size={14} className="spin-animation" /> Đang tải...
                </>
              ) : (
                <>
                  <Download size={14} color="#10b981" /> Tải file mẫu (.xlsx)
                </>
              )}
            </button>
          </div>

          {/* Vùng chọn file tải lên */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed " + (selectedFile ? "#10b981" : "#cbd5e1"),
              backgroundColor: selectedFile ? "#f0fdf4" : "#ffffff",
              borderRadius: "10px",
              padding: "26px 18px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              marginBottom: "16px",
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            {selectedFile ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <FileCheck size={36} color="#10b981" />
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB · Nhấn để đổi file khác
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <Upload size={36} color="#64748b" />
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "14px" }}>
                  Nhấn vào đây để chọn file Excel (.xlsx)
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Hệ thống tự động kiểm tra định dạng và dừng tiến trình nếu file sai
                </div>
              </div>
            )}
          </div>

          {/* Thông báo lỗi nghiêm trọng */}
          {errorMsg && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "12px 16px",
                color: "#dc2626",
                fontSize: "13px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Lỗi kiểm tra định dạng:</strong>
                <div style={{ marginTop: 2 }}>{errorMsg}</div>
              </div>
            </div>
          )}

          {/* Kết quả sau khi Import */}
          {result && (
            <div style={{ marginBottom: "16px" }}>
              {/* Hộp tóm tắt chỉ số */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                    padding: "10px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>THÊM THÀNH CÔNG</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#15803d", marginTop: 2 }}>
                    {result.summary?.importedCount || 0}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#fefce8",
                    border: "1px solid #fef08a",
                    borderRadius: "8px",
                    padding: "10px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#854d0e", fontWeight: 600 }}>BỎ QUA (TRÙNG SĐT)</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#a16207", marginTop: 2 }}>
                    {result.summary?.skippedCount || 0}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    padding: "10px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#991b1b", fontWeight: 600 }}>DÒNG LỖI</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
                    {result.summary?.errorCount || 0}
                  </div>
                </div>
              </div>

              {/* Chi tiết dòng bị bỏ qua do trùng SĐT */}
              {result.data?.skipped?.length > 0 && (
                <div
                  style={{
                    backgroundColor: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "12px",
                    color: "#92400e",
                    marginBottom: "12px",
                  }}
                >
                  <strong>⚠️ Các dòng bị bỏ qua do trùng số điện thoại:</strong>
                  <ul style={{ margin: "6px 0 0 0", paddingLeft: "18px" }}>
                    {result.data.skipped.map((s, idx) => (
                      <li key={idx}>
                        Dòng {s.row}: <strong>{s.hoTen}</strong> (SĐT: <code>{s.soDienThoai}</code>) - {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Chi tiết các dòng lỗi */}
              {result.data?.errors?.length > 0 && (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "12px",
                    color: "#b91c1c",
                    marginBottom: "12px",
                  }}
                >
                  <strong>❌ Chi tiết các dòng lỗi:</strong>
                  <ul style={{ margin: "6px 0 0 0", paddingLeft: "18px" }}>
                    {result.data.errors.map((e, idx) => (
                      <li key={idx}>
                        Dòng {e.row}: {e.hoTen} (SĐT: {e.soDienThoai}) - {e.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: "14px 22px",
            backgroundColor: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          {result ? (
            <button
              onClick={() => {
                handleReset();
                onClose();
              }}
              style={{
                padding: "8px 20px",
                backgroundColor: "#1e293b",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Hoàn tất & Đóng
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleUpload}
                disabled={loading || !selectedFile}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 20px",
                  backgroundColor: loading || !selectedFile ? "#94a3b8" : "#10b981",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: loading || !selectedFile ? "not-allowed" : "pointer",
                  boxShadow: loading || !selectedFile ? "none" : "0 2px 6px rgba(16,185,129,0.3)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="spin-animation" /> Đang bóc tách & lưu...
                  </>
                ) : (
                  <>
                    <Upload size={15} /> Bắt đầu nhập dữ liệu
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
