const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-129
 * Title: Testcase: Xuất báo cáo doanh thu ra file Excel
 * 
 * 1. TC01 (QH-129 Jira Core):
 *    - Mở trang "Báo cáo doanh thu", chọn khoảng ngày thống kê
 *    - Bấm nút "Xuất Excel" -> Kiểm tra file .xlsx được tải về máy thành công (QH-103).
 * 
 * 2. TC02 (API Direct Export):
 *    - Gửi request trực tiếp tới API GET /api/reports/revenue/export
 *    - Kiểm tra phản hồi trả về binary stream định dạng Excel .xlsx hợp lệ.
 * ============================================================================
 */

test.describe("QH-129: Xuất báo cáo doanh thu ra file Excel", () => {
  test.setTimeout(45000);

  const FRONTEND_URL = "http://localhost:5173";
  const API_URL = "http://localhost:5000/api";

  async function loginAsAdmin(page) {
    await page.addInitScript(() => {
      const adminUser = {
        id: 1,
        name: "Đoàn Admin",
        role: "admin",
        chucVu: "Admin",
        loaiNhanVien: "Full-time",
        MaVaiTro: 1,
        email: "admin@gmail.com",
      };
      sessionStorage.setItem("user", JSON.stringify(adminUser));
      sessionStorage.setItem("accessToken", "jwt-token-admin-report-test");
      localStorage.setItem("user", JSON.stringify(adminUser));
      localStorage.setItem("accessToken", "jwt-token-admin-report-test");
    });
  }

  // ==========================================================================
  // TC01: XUẤT FILE EXCEL BÁO CÁO DOANH THU TỪ GIAO DIỆN (QH-129 JIRA CORE)
  // ==========================================================================
  test("TC01 (QH-129 Jira Core): Bấm 'Xuất Excel' -> Trình duyệt tải về file .xlsx thành công", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: XUẤT FILE EXCEL BÁO CÁO DOANH THU (QH-129) ---");
    console.log("==================================================================");

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // 1. Mở trang Báo cáo doanh thu
    console.log("[Bước 1] Mở trang 'Báo cáo doanh thu'...");
    await page.locator("text=Báo cáo doanh thu").click();
    await page.waitForTimeout(1500);

    // 2. Tìm nút "Xuất Excel"
    console.log("[Bước 2] Tìm nút 'Xuất Excel' trên thanh công cụ...");
    const exportBtn = page.locator("button:has-text('Xuất Excel')");
    await expect(exportBtn).toBeVisible();

    // 3. Bấm nút và lắng nghe sự kiện download file
    console.log("[Bước 3] Nhấn nút 'Xuất Excel' và lắng nghe sự kiện tải về...");
    const downloadPromise = page.waitForEvent("download");
    await exportBtn.click();
    const download = await downloadPromise;

    // 4. Kiểm tra file tải về
    const fileName = download.suggestedFilename();
    console.log(`[Tải về thành công] File được tải về máy: ${fileName}`);
    expect(fileName).toContain(".xlsx");

    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC01: PASSED (XUẤT EXCEL THÀNH CÔNG 100%) ---\n");
  });

  // ==========================================================================
  // TC02: KIỂM THỬ TRỰC TIẾP API GET /api/reports/revenue/export
  // ==========================================================================
  test("TC02 (QH-129 API): Kiểm thử API GET /api/reports/revenue/export trả về định dạng .xlsx", async ({ request }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: KIỂM THỬ TRỰC TIẾP API EXPORT EXCEL ---");
    console.log("==================================================================");

    const res = await request.get(`${API_URL}/reports/revenue/export`);
    expect(res.status()).toBe(200);

    const contentType = res.headers()["content-type"] || "";
    console.log("[API Content-Type]", contentType);
    expect(contentType).toContain("spreadsheetml.sheet");

    const buffer = await res.body();
    expect(buffer.length).toBeGreaterThan(0);
    console.log(`[Dung lượng file] Kích thước file Excel nhận được từ API: ${buffer.length} bytes.`);

    console.log("--- HOÀN THÀNH TC02: PASSED (API XUẤT FILE HOẠT ĐỘNG CHUẨN XÁC) ---\n");
  });
});
