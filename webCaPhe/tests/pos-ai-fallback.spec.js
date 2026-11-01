const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-126
 * Title: Testcase: Xử lý ngoại lệ khi API dịch vụ AI bị ngắt kết nối (Fallback)
 * 
 * Mục tiêu: Đảm bảo giao diện máy POS vẫn hoạt động trơn tru nếu dịch vụ AI
 * gặp sự cố gián đoạn hoặc quá tải (Server timeout / HTTP 500).
 * ============================================================================
 */

test.describe("QH-126: Xử lý ngoại lệ khi API dịch vụ AI bị ngắt kết nối (Fallback)", () => {
  test.setTimeout(45000);

  const FRONTEND_URL = "http://localhost:5173";

  async function loginAsStaff(page) {
    await page.addInitScript(() => {
      const staffUser = {
        id: 2,
        name: "Thu Ngân Test",
        role: "staff",
        chucVu: "Thu Ngân",
        loaiNhanVien: "Full-time",
        MaVaiTro: 2,
        email: "staff@gmail.com",
      };
      sessionStorage.setItem("user", JSON.stringify(staffUser));
      sessionStorage.setItem("accessToken", "jwt-token-staff-fallback-test");
      localStorage.setItem("user", JSON.stringify(staffUser));
      localStorage.setItem("accessToken", "jwt-token-staff-fallback-test");
    });
  }

  // ==========================================================================
  // TC01: XỬ LÝ NGOẠI LỆ KHI API AI PHẢN HỒI HTTP 500 (QH-126 JIRA CORE)
  // ==========================================================================
  test("TC01 (QH-126 Jira Core): API AI phản hồi HTTP 500 -> POS tự động chuyển 'Gợi ý mặc định', không crash", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: MÔ PHỎNG LỖI HTTP 500 TỪ AI SERVICE ---");
    console.log("==================================================================");

    // Giả lập API AI trả về lỗi Server 500 Internal Error
    await page.route("**/api/ai/goi-y-mon", async (route) => {
      console.log("[Mock AI Error] Giả lập server AI gặp sự cố HTTP 500...");
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "AI Service Internal Server Error" }),
      });
    });

    await loginAsStaff(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // Mở màn hình POS
    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1500);

    // Chọn món vào đơn hàng
    console.log("[Bước 1] Chọn món 'Espresso' vào đơn...");
    const productCard = page.locator(".product-card", { hasText: "Espresso" }).first();
    await expect(productCard).toBeVisible();
    await productCard.click();
    await page.waitForTimeout(1500);

    // Kiểm tra POS không bị văng lỗi hoặc crash trắng màn hình
    const suggestWidget = page.locator(".pos-suggest");
    await expect(suggestWidget).toBeVisible();

    // Xác nhận nhãn nguồn tự động chuyển sang "Gợi ý mặc định"
    const sourceBadge = suggestWidget.locator(".pos-suggest-source");
    await expect(sourceBadge).toHaveText("Gợi ý mặc định");
    console.log("[Fallback Hoạt động] Giao diện POS ổn định 100%, tự động hiển thị 'Gợi ý mặc định'.");

    // Các món gợi ý dự phòng theo nhóm món xuất hiện
    const suggestItems = suggestWidget.locator(".pos-suggest-item");
    const count = await suggestItems.count();
    expect(count).toBeGreaterThan(0);
    console.log(`[Gợi ý dự phòng] Đã hiển thị ${count} món gợi ý mặc định.`);

    console.log("--- HOÀN THÀNH TC01: PASSED (XỬ LÝ LỖI 500 XUẤT SẮC) ---\n");
  });

  // ==========================================================================
  // TC02: XỬ LÝ NGOẠI LỆ KHI API AI BỊ TIMEOUT (MẠNG CHẬP CHỜN / QUÁ TẢI)
  // ==========================================================================
  test("TC02 (QH-126 Timeout): API AI phản hồi timeout -> Không đơ giao diện POS", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: MÔ PHỎNG TIMEOUT TỪ AI SERVICE ---");
    console.log("==================================================================");

    // Giả lập network abort / timeout
    await page.route("**/api/ai/goi-y-mon", async (route) => {
      console.log("[Mock AI Timeout] Giả lập kết nối mạng quá hạn...");
      return route.abort("timedout");
    });

    await loginAsStaff(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1500);

    // Chọn món
    await page.locator(".product-card", { hasText: "Espresso" }).first().click();
    await page.waitForTimeout(1500);

    // Kiểm tra widget hiển thị Gợi ý mặc định
    const sourceBadge = page.locator(".pos-suggest .pos-suggest-source");
    await expect(sourceBadge).toHaveText("Gợi ý mặc định");
    console.log("[Timeout Handled] Không đơ POS, tự động fallback mượt mà.");

    console.log("--- HOÀN THÀNH TC02: PASSED (BẢO VỆ UX KHI TIMEOUT THÀNH CÔNG) ---\n");
  });

  // ==========================================================================
  // TC03: TIẾN HÀNH THANH TOÁN BÌNH THƯỜNG KHI DỊCH VỤ AI MẤT KẾT NỐI
  // ==========================================================================
  test("TC03 (QH-126 Checkout Flow): Luồng thanh toán hoàn toàn độc lập, không bị cản trở bởi lỗi AI", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC03: KIỂM TRA THANH TOÁN KHI AI OFFLINE ---");
    console.log("==================================================================");

    await page.route("**/api/ai/goi-y-mon", async (route) => {
      return route.abort("failed");
    });

    // Giả lập thanh toán trong RAM, không ghi bất kỳ dòng dữ liệu nào vào MySQL
    await page.route("**/api/checkout", async (route) => {
      console.log("[Mock Checkout] Giả lập thanh toán thành công trong RAM, không lưu dữ liệu vào CSDL.");
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Thanh toán đơn hàng thành công!",
          maDonHang: 9999,
        }),
      });
    });

    await loginAsStaff(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1200);

    // Thêm món vào giỏ
    await page.locator(".product-card", { hasText: "Espresso" }).first().click();
    await page.waitForTimeout(800);

    // Bấm thanh toán
    console.log("[Bước 1] Mở popup thanh toán...");
    const checkoutBtn = page.locator(".checkout-btn:has-text('Thanh Toán')");
    await checkoutBtn.click();
    await page.waitForTimeout(1000);

    const paymentModal = page.locator(".payment-modal");
    await expect(paymentModal).toBeVisible();

    // Nhập tiền khách đưa đủ
    await page.locator(".cash-input-field").fill("50000");
    await page.waitForTimeout(500);

    // Hoàn tất đơn
    console.log("[Bước 2] Hoàn tất thanh toán...");
    const confirmBtn = page.locator("button.btn-payment-confirm:has-text('✓ Hoàn Tất Thanh Toán')");
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();
    await page.waitForTimeout(1500);

    // Xác nhận hóa đơn xuất hiện
    const receiptModal = page.locator(".receipt-modal");
    await expect(receiptModal).toBeVisible();
    console.log("[Hóa đơn POS] Đơn hàng đã thanh toán thành công suôn sẻ ngay cả khi AI offline!");

    // Đóng hóa đơn
    const closeReceiptBtn = page.locator("button.checkout-btn:has-text('In Hóa Đơn & Đóng')");
    if (await closeReceiptBtn.isVisible()) {
      await closeReceiptBtn.click();
    }
    await page.waitForTimeout(1000);
    console.log("--- HOÀN THÀNH TC03: PASSED (THANH TOÁN ĐỘC LẬP HOÀN TOÀN) ---\n");
  });
});
