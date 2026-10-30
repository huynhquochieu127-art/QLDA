const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const db = require("../config/db");

// ─── Helper ───────────────────────────────────────────────────────────────────

const PAID_LIKE = [
  "Da thanh toan", "Đã thanh toán", "DA_THANH_TOAN", "paid", "completed", "Thanh cong"
];

function isPaid(status) {
  const s = (status || "").toLowerCase().trim();
  return (
    s.includes("thanh to") ||
    s.includes("paid") ||
    s.includes("completed") ||
    PAID_LIKE.map(x => x.toLowerCase()).includes(s)
  );
}

function fmtVND(num) {
  return Number(num || 0).toLocaleString("vi-VN") + " đ";
}

function parseDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// ─── [GET] /api/reports/revenue ───────────────────────────────────────────────
// Query params: from=YYYY-MM-DD & to=YYYY-MM-DD
// Trả về JSON cho biểu đồ / bảng frontend
router.get("/revenue", async (req, res) => {
  try {
    const { from, to } = req.query;
    let sql = `
      SELECT
        DATE(NgayDat)                                   AS Ngay,
        COUNT(*)                                         AS TongDon,
        COALESCE(SUM(TongTien), 0)                       AS TongDoanhThu,
        COALESCE(SUM(GiamGia), 0)                        AS TongChietKhau,
        COALESCE(SUM(ThanhTien), 0)                      AS ThucThu
      FROM donhang
      WHERE 1=1
        AND (TrangThai IN ('Đã thanh toán','DA_THANH_TOAN','paid','completed','Thành công')
             OR LOWER(TrangThai) LIKE '%thanh to%')
    `;
    const params = [];

    if (from) { sql += " AND DATE(NgayDat) >= ?"; params.push(from); }
    if (to)   { sql += " AND DATE(NgayDat) <= ?"; params.push(to);   }

    sql += " GROUP BY DATE(NgayDat) ORDER BY Ngay ASC";

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── [GET] /api/reports/revenue/export ────────────────────────────────────────
// Xuất file .xlsx  |  ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/revenue/export", async (req, res) => {
  try {
    const { from, to } = req.query;

    // 1. Truy vấn dữ liệu
    let sql = `
      SELECT
        DATE(NgayDat)                               AS Ngay,
        COUNT(*)                                     AS TongDon,
        COALESCE(SUM(TongTien), 0)                   AS TongDoanhThu,
        COALESCE(SUM(GiamGia), 0)                    AS TongChietKhau,
        COALESCE(SUM(ThanhTien), 0)                  AS ThucThu
      FROM donhang
      WHERE 1=1
        AND (TrangThai IN ('Đã thanh toán','DA_THANH_TOAN','paid','completed','Thành công')
             OR LOWER(TrangThai) LIKE '%thanh to%')
    `;
    const params = [];
    if (from) { sql += " AND DATE(NgayDat) >= ?"; params.push(from); }
    if (to)   { sql += " AND DATE(NgayDat) <= ?"; params.push(to);   }
    sql += " GROUP BY DATE(NgayDat) ORDER BY Ngay ASC";

    const [rows] = await db.query(sql, params);

    // 2. Tạo workbook ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "QLDA System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Báo cáo doanh thu", {
      pageSetup: { paperSize: 9, orientation: "landscape" },
    });

    // ── Tiêu đề lớn (merge A1:E1) ──────────────────────────────────────────
    sheet.mergeCells("A1:E1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "BÁO CÁO DOANH THU";
    titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 40;

    // ── Dòng khoảng thời gian (merge A2:E2) ───────────────────────────────
    sheet.mergeCells("A2:E2");
    const rangeLabel = from || to
      ? `Từ ngày: ${from || "—"}    Đến ngày: ${to || "—"}`
      : "Toàn bộ thời gian";
    const subCell = sheet.getCell("A2");
    subCell.value = rangeLabel;
    subCell.font = { name: "Arial", size: 11, italic: true, color: { argb: "FF64748B" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    sheet.getRow(2).height = 24;

    // ── Dòng trống ────────────────────────────────────────────────────────
    sheet.addRow([]);

    // ── Header cột (row 4) ────────────────────────────────────────────────
    const HEADER_ROW = 4;
    const headers = [
      { header: "Ngày giao dịch",  key: "Ngay",         width: 18 },
      { header: "Tổng số đơn",     key: "TongDon",      width: 14 },
      { header: "Tổng doanh thu",  key: "TongDoanhThu", width: 20 },
      { header: "Chiết khấu",      key: "TongChietKhau",width: 18 },
      { header: "Thực thu",        key: "ThucThu",      width: 20 },
    ];

    sheet.columns = headers.map(h => ({ key: h.key, width: h.width }));

    const headerRow = sheet.getRow(HEADER_ROW);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h.header;
      cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top:    { style: "thin", color: { argb: "FF334155" } },
        left:   { style: "thin", color: { argb: "FF334155" } },
        bottom: { style: "thin", color: { argb: "FF334155" } },
        right:  { style: "thin", color: { argb: "FF334155" } },
      };
    });
    headerRow.height = 32;

    // ── Dữ liệu ───────────────────────────────────────────────────────────
    let totalDon = 0, totalDT = 0, totalCK = 0, totalThucThu = 0;

    rows.forEach((r, idx) => {
      const isEven = idx % 2 === 0;
      const dataRow = sheet.addRow({
        Ngay:          r.Ngay ? new Date(r.Ngay).toLocaleDateString("vi-VN") : "",
        TongDon:       Number(r.TongDon),
        TongDoanhThu:  Number(r.TongDoanhThu),
        TongChietKhau: Number(r.TongChietKhau),
        ThucThu:       Number(r.ThucThu),
      });

      totalDon     += Number(r.TongDon);
      totalDT      += Number(r.TongDoanhThu);
      totalCK      += Number(r.TongChietKhau);
      totalThucThu += Number(r.ThucThu);

      const rowBg = isEven ? "FFFAFAFA" : "FFFFFFFF";

      dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.border = {
          top:    { style: "hair", color: { argb: "FFE2E8F0" } },
          left:   { style: "hair", color: { argb: "FFE2E8F0" } },
          bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
          right:  { style: "hair", color: { argb: "FFE2E8F0" } },
        };
        // Căn phải cho cột số tiền
        if (colNum === 1) cell.alignment = { horizontal: "left" };
        else if (colNum === 2) cell.alignment = { horizontal: "center" };
        else {
          cell.alignment = { horizontal: "right" };
          cell.numFmt = '#,##0 "đ"';
        }
        cell.font = { name: "Arial", size: 10 };
      });
    });

    // ── Dòng tổng cộng ────────────────────────────────────────────────────
    const sumRow = sheet.addRow({
      Ngay:          "TỔNG CỘNG",
      TongDon:       totalDon,
      TongDoanhThu:  totalDT,
      TongChietKhau: totalCK,
      ThucThu:       totalThucThu,
    });

    sumRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
      cell.border = {
        top:    { style: "medium", color: { argb: "FF4338CA" } },
        left:   { style: "medium", color: { argb: "FF4338CA" } },
        bottom: { style: "medium", color: { argb: "FF4338CA" } },
        right:  { style: "medium", color: { argb: "FF4338CA" } },
      };
      if (colNum === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
      else if (colNum === 2) cell.alignment = { horizontal: "center", vertical: "middle" };
      else {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = '#,##0 "đ"';
      }
    });
    sumRow.height = 28;

    // ── Dòng ghi chú cuối ────────────────────────────────────────────────
    sheet.addRow([]);
    const noteRowNum = sheet.rowCount + 1;
    sheet.mergeCells(`A${noteRowNum}:E${noteRowNum}`);
    const noteCell = sheet.getCell(`A${noteRowNum}`);
    noteCell.value = `Xuất lúc: ${new Date().toLocaleString("vi-VN")}  |  Hệ thống QLDA`;
    noteCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF94A3B8" } };
    noteCell.alignment = { horizontal: "right" };

    // 3. Ghi buffer & gửi về client
    const fileName = `BaoCaoDoanhThu_${(from || "").replace(/-/g, "") || "all"}_${(to || "").replace(/-/g, "") || "all"}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Lỗi xuất Excel:", err);
    res.status(500).json({ success: false, message: "Lỗi xuất Excel: " + err.message });
  }
});

module.exports = router;
