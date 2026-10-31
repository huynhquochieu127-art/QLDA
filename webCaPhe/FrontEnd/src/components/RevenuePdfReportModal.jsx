import React, { useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  FileText, Download, Printer, X, Loader2, CheckCircle2,
} from "lucide-react";

const fmtVND = (v) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v || 0);

export default function RevenuePdfReportModal({
  isOpen,
  onClose,
  data = [],
  from,
  to,
  rangeLabel = "Toàn bộ thời gian",
}) {
  const printRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  // Tính toán số liệu tổng
  const totalDon = data.reduce((s, r) => s + (Number(r.TongDon) || 0), 0);
  const totalDT = data.reduce((s, r) => s + (Number(r.TongDoanhThu) || 0), 0);
  const totalCK = data.reduce((s, r) => s + (Number(r.TongChietKhau) || 0), 0);
  const totalThucThu = data.reduce((s, r) => s + (Number(r.ThucThu) || 0), 0);
  const discountRate = totalDT > 0 ? ((totalCK / totalDT) * 100).toFixed(1) : 0;
  const avgPerDay = data.length > 0 ? Math.round(totalThucThu / data.length) : 0;
  const bestDay = data.reduce(
    (best, r) => ((Number(r.ThucThu) || 0) > (Number(best?.ThucThu) || 0) ? r : best),
    null
  );

  const now = new Date();
  const printTimeString = now.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const printDateOnly = now.toLocaleDateString("vi-VN");

  // Xuất file PDF bằng jspdf + html2canvas
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    setExportSuccess(false);

    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5, // Độ phân giải cao cho bản in sắc nét
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Trang 1
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      // Các trang sau nếu dữ liệu dài
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      const fileName = `BaoCaoDoanhThu_ChuDauTu_${from || "all"}_${to || "all"}.pdf`;
      pdf.save(fileName);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error("Lỗi xuất PDF:", err);
      alert("Không thể tạo file PDF: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // In trực tiếp
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "20px 10px",
        overflowY: "auto",
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #pdf-report-content, #pdf-report-content * {
            visibility: visible !important;
          }
          #pdf-report-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10mm 15mm !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Toolbar điều khiển trên đầu ── */}
      <div
        className="no-print"
        style={{
          width: "100%",
          maxWidth: "860px",
          backgroundColor: "#1e293b",
          borderRadius: "12px",
          padding: "12px 20px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FileText size={22} color="#f59e0b" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Bản xem trước Báo Cáo Doanh Thu (Khổ in A4)
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Định dạng chuẩn tài chính gửi Ban Giám Đốc & Chủ Đầu Tư
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {exportSuccess && (
            <span style={{ color: "#10b981", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={16} /> Đã tải về thành công!
            </span>
          )}

          {/* Nút In */}
          <button
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#334155",
              color: "#fff",
              border: "1px solid #475569",
              padding: "7px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Printer size={16} /> In báo cáo
          </button>

          {/* Nút Tải PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#fff",
              border: "none",
              padding: "7px 18px",
              borderRadius: "8px",
              cursor: downloading ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: 13,
              boxShadow: "0 4px 12px rgba(245, 158, 11, 0.35)",
            }}
          >
            {downloading ? (
              <>
                <Loader2 size={16} className="spin-animation" /> Đang tạo PDF...
              </>
            ) : (
              <>
                <Download size={16} /> Tải file PDF (.pdf)
              </>
            )}
          </button>

          {/* Nút Đóng */}
          <button
            onClick={onClose}
            style={{
              backgroundColor: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "6px",
              display: "flex",
              alignItems: "center",
              borderRadius: "6px",
            }}
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Khung tờ A4 Báo Cáo (Được render sang PDF) ── */}
      <div
        id="pdf-report-content"
        ref={printRef}
        style={{
          width: "100%",
          maxWidth: "800px",
          backgroundColor: "#ffffff",
          color: "#0f172a",
          padding: "36px 44px",
          borderRadius: "4px",
          boxShadow: "0 15px 40px rgba(0,0,0,0.4)",
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* ── HEADER CÔNG TY & QUÁN ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "2px solid #0f172a",
            paddingBottom: "16px",
            marginBottom: "20px",
          }}
        >
          {/* Logo & Tên quán */}
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: "14px",
                background: "linear-gradient(135deg, #1e293b, #0f172a)",
                border: "2px solid #f59e0b",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#f59e0b",
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              }}
            >
              <span style={{ fontSize: 26, lineHeight: 1 }}>☕</span>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, marginTop: 2 }}>CF-POS</span>
            </div>
            <div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 900,
                  letterSpacing: "0.5px",
                  color: "#0f172a",
                  textTransform: "uppercase",
                }}
              >
                QUANLYCF COFFEE & RESTAURANT
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                Đơn vị: <strong>Hệ thống Chuỗi Ẩm thực & Cà phê QLDA</strong>
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
                Địa chỉ: 123 Đường Ẩm Thực, Quận 1, TP. Hồ Chí Minh · Hotline: 1900 6868
              </div>
            </div>
          </div>

          {/* Thông tin chứng từ / Mã số */}
          <div
            style={{
              textAlign: "right",
              borderLeft: "2px solid #e2e8f0",
              paddingLeft: "16px",
            }}
          >
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#fef3c7",
                color: "#92400e",
                fontWeight: 700,
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: "4px",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Tài liệu nội bộ / CĐT
            </div>
            <div style={{ fontSize: 11, color: "#475569" }}>
              Số: <strong>BC-DT/{now.getFullYear()}/QLDA</strong>
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
              Xuất lúc: <strong>{printTimeString}</strong>
            </div>
          </div>
        </div>

        {/* ── TIÊU ĐỀ BÁO CÁO ── */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#0f172a",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              margin: "0 0 6px 0",
            }}
          >
            BÁO CÁO DOANH THU HOẠT ĐỘNG KINH DOANH
          </h1>
          <div style={{ fontSize: 13, fontStyle: "italic", color: "#334155", marginBottom: 4 }}>
            Kính gửi: <strong>Ban Giám Đốc & Quý Chủ Đầu Tư</strong>
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#4f46e5",
              display: "inline-block",
              backgroundColor: "#e0e7ff",
              padding: "4px 14px",
              borderRadius: "20px",
            }}
          >
            Kỳ báo cáo: {from && to ? `${from} đến ${to}` : rangeLabel}
          </div>
        </div>

        {/* ── KHỐI CHỈ SỐ TÀI CHÍNH TỔNG QUÁT (KPI SUMMARY) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "10px 14px",
              backgroundColor: "#f8fafc",
              borderTop: "3px solid #6366f1",
            }}
          >
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
              Tổng số đơn hàng
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
              {totalDon.toLocaleString("vi-VN")} <span style={{ fontSize: 12, fontWeight: 500 }}>đơn</span>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "10px 14px",
              backgroundColor: "#f8fafc",
              borderTop: "3px solid #0284c7",
            }}
          >
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
              Doanh thu niêm yết
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0284c7", marginTop: 4 }}>
              {fmtVND(totalDT)}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "10px 14px",
              backgroundColor: "#f8fafc",
              borderTop: "3px solid #f43f5e",
            }}
          >
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
              Chiết khấu / Ưu đãi
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f43f5e", marginTop: 4 }}>
              {fmtVND(totalCK)} <span style={{ fontSize: 11, fontWeight: 500 }}>({discountRate}%)</span>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "10px 14px",
              backgroundColor: "#f8fafc",
              borderTop: "3px solid #10b981",
            }}
          >
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
              Doanh thu thực thu
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#059669", marginTop: 4 }}>
              {fmtVND(totalThucThu)}
            </div>
          </div>
        </div>

        {/* ── BẢNG SỐ LIỆU CHI TIẾT ── */}
        <div style={{ marginBottom: "22px" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            Bảng kê chi tiết doanh thu theo ngày
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11,
              border: "1px solid #cbd5e1",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#1e293b", color: "#ffffff" }}>
                <th style={{ padding: "8px 10px", textAlign: "center", width: "40px", borderRight: "1px solid #334155" }}>
                  STT
                </th>
                <th style={{ padding: "8px 10px", textAlign: "left", width: "110px", borderRight: "1px solid #334155" }}>
                  Ngày giao dịch
                </th>
                <th style={{ padding: "8px 10px", textAlign: "center", width: "80px", borderRight: "1px solid #334155" }}>
                  Số đơn
                </th>
                <th style={{ padding: "8px 10px", textAlign: "right", borderRight: "1px solid #334155" }}>
                  Doanh thu niêm yết
                </th>
                <th style={{ padding: "8px 10px", textAlign: "right", borderRight: "1px solid #334155" }}>
                  Chiết khấu
                </th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>
                  Thực thu (VNĐ)
                </th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "18px", color: "#64748b" }}>
                    Không có giao dịch thanh toán trong giai đoạn này.
                  </td>
                </tr>
              ) : (
                data.map((r, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <td style={{ padding: "7px 10px", textAlign: "center", color: "#64748b", borderRight: "1px solid #e2e8f0" }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "7px 10px", fontWeight: 600, borderRight: "1px solid #e2e8f0" }}>
                      {r.NgayLabel || (r.Ngay ? new Date(r.Ngay).toLocaleDateString("vi-VN") : "—")}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "center", borderRight: "1px solid #e2e8f0" }}>
                      {Number(r.TongDon).toLocaleString("vi-VN")}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "right", borderRight: "1px solid #e2e8f0" }}>
                      {fmtVND(r.TongDoanhThu)}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: "#e11d48", borderRight: "1px solid #e2e8f0" }}>
                      {fmtVND(r.TongChietKhau)}
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "#047857" }}>
                      {fmtVND(r.ThucThu)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr
                style={{
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  fontWeight: 700,
                  borderTop: "2px solid #0f172a",
                }}
              >
                <td colSpan={2} style={{ padding: "9px 10px", textAlign: "center", textTransform: "uppercase" }}>
                  TỔNG CỘNG
                </td>
                <td style={{ padding: "9px 10px", textAlign: "center" }}>
                  {totalDon.toLocaleString("vi-VN")}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right" }}>
                  {fmtVND(totalDT)}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right", color: "#fda4af" }}>
                  {fmtVND(totalCK)}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right", color: "#6ee7b7", fontSize: 12 }}>
                  {fmtVND(totalThucThu)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── NHẬN XÉT & PHÂN TÍCH TỔNG QUAN ── */}
        <div
          style={{
            backgroundColor: "#f1f5f9",
            borderLeft: "4px solid #f59e0b",
            padding: "10px 14px",
            borderRadius: "0 6px 6px 0",
            fontSize: 11,
            lineHeight: 1.6,
            marginBottom: "28px",
            color: "#334155",
          }}
        >
          <strong>Đánh giá nhanh hiệu quả hoạt động:</strong>
          <ul style={{ margin: "4px 0 0 0", paddingLeft: "18px" }}>
            <li>
              Bình quân thực thu đạt <strong>{fmtVND(avgPerDay)} / ngày</strong> trong tổng số {data.length} ngày ghi nhận doanh thu.
            </li>
            {bestDay && (
              <li>
                Ngày đạt đỉnh doanh thu: <strong>{bestDay.NgayLabel || bestDay.Ngay}</strong> với thực thu đạt{" "}
                <strong>{fmtVND(bestDay.ThucThu)}</strong> ({bestDay.TongDon} đơn hàng).
              </li>
            )}
            <li>
              Chi phí chiết khấu/khuyến mãi chiếm <strong>{discountRate}%</strong> trên tổng doanh thu niêm yết, đảm bảo biên độ an toàn theo kế hoạch tài chính đã phê duyệt.
            </li>
          </ul>
        </div>

        {/* ── KHỐI CHỮ KÝ XÁC NHẬN 3 BÊN ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            textAlign: "center",
            marginTop: "16px",
            pageBreakInside: "avoid",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#0f172a" }}>
              Người Lập Báo Cáo
            </div>
            <div style={{ fontSize: 10, fontStyle: "italic", color: "#64748b", marginTop: 2 }}>
              (Ký & ghi rõ họ tên)
            </div>
            <div style={{ height: "65px" }}></div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Ban Quản Lý Quán</div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#0f172a" }}>
              Kế Toán Trưởng
            </div>
            <div style={{ fontSize: 10, fontStyle: "italic", color: "#64748b", marginTop: 2 }}>
              (Ký & ghi rõ họ tên)
            </div>
            <div style={{ height: "65px" }}></div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Bộ Phận Kế Toán QLDA</div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#0f172a" }}>
              Đại Diện Chủ Đầu Tư
            </div>
            <div style={{ fontSize: 10, fontStyle: "italic", color: "#64748b", marginTop: 2 }}>
              (Ký, đóng dấu & ghi rõ họ tên)
            </div>
            <div style={{ height: "65px" }}></div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Ban Giám Đốc Phê Duyệt</div>
          </div>
        </div>

        {/* ── FOOTER CHÂN TRANG ── */}
        <div
          style={{
            borderTop: "1px dashed #cbd5e1",
            marginTop: "30px",
            paddingTop: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 9,
            color: "#94a3b8",
          }}
        >
          <div>Hệ thống phần mềm Quản lý Cà phê & Nhà hàng QLDA · Bảo mật cấp độ 1</div>
          <div>Ngày in: {printDateOnly} · Trang 1/1</div>
        </div>
      </div>
    </div>
  );
}
