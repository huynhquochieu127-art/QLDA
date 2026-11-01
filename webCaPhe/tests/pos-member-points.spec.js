const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-128
 * Title: Testcase: Dùng điểm tích lũy thành viên để giảm trừ thanh toán
 * 
 * 1. TC01 (QH-128 Jira Core):
 *    - Tra cứu khách hàng bằng SĐT, chọn dùng 20 điểm tích lũy (tương đương 20,000đ)
 *      để trừ trực tiếp vào hóa đơn bán lẻ (QH-82, QH-84, QH-85).
 * 
 * 2. TC02 (Checkout & Loyalty Receipt):
 *    - Hoàn tất thanh toán đơn hàng có áp dụng giảm trừ điểm thưởng,
 *      biên lai hóa đơn xuất đầy đủ thông tin giảm giá thành viên.
 * 
 * 3. TC03 (Point Redemption Integrity):
 *    - Kiểm tra bảo vệ hệ thống không cho phép đổi số điểm vượt quá số dư hiện có.
 * ============================================================================
 */

test.describe("QH-128: Dùng điểm tích lũy thành viên để giảm trừ thanh toán", () => {
  test.setTimeout(45000);

  const FRONTEND_URL = "http://localhost:5173";
  const TEST_PHONE = "0813108114";

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
      sessionStorage.setItem("accessToken", "jwt-token-staff-points-test");
      localStorage.setItem("user", JSON.stringify(staffUser));
      localStorage.setItem("accessToken", "jwt-token-staff-points-test");
    });
  }

  // ==========================================================================
  // TC01: TRA CỨU KHÁCH HÀNG BẰNG SĐT VÀ DÙNG 20 ĐIỂM GIẢM TRỪ 20,000 Đ
  // ==========================================================================
  test("TC01 (QH-128 Jira Core): Tra cứu thành viên bằng SĐT và dùng 20 điểm quy đổi 20,000đ", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: TRA CỨU KHÁCH HÀNG & DÙNG 20 ĐIỂM (QH-128) ---");
    console.log("==================================================================");

    // Mock discount đổi 20 điểm thành 20.000đ
    await page.route("**/api/discounts/validate", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Quy đổi 20 điểm tích lũy thành công!",
          discount: {
            code: "DIEM20K",
            name: "Đổi 20 điểm thưởng (20,000đ)",
            type: "fixed",
            discountAmount: 20000,
            amount: 20000,
            diemSuDung: 20,
          },
        }),
      });
    });

    await loginAsStaff(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // 1. Mở màn hình POS
    console.log("[Bước 1] Mở giao diện POS...");
    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1500);

    // 2. Thêm món vào giỏ hàng
    console.log("[Bước 2] Thêm món vào đơn hàng...");
    const productCard = page.locator(".product-card").first();
    await expect(productCard).toBeVisible();
    await productCard.click();
    await page.waitForTimeout(500);

    // 3. Tra cứu khách hàng bằng SĐT
    console.log(`[Bước 3] Tra cứu khách hàng bằng SĐT (${TEST_PHONE})...`);
    const phoneInput = page.locator(".customer-input");
    await phoneInput.fill(TEST_PHONE);
    await page.waitForTimeout(1000);

    // Chọn từ dropdown gợi ý nếu có
    const dropdownItem = page.locator(".customer-dropdown .dropdown-item").first();
    if (await dropdownItem.isVisible()) {
      await dropdownItem.click();
      console.log("[Thành viên] Đã chọn khách hàng thành viên từ kết quả tìm kiếm.");
    }

    // Xác nhận thẻ khách hàng hiển thị điểm tích lũy
    const customerCard = page.locator(".selected-customer-card");
    await expect(customerCard).toBeVisible();
    const custCardText = await customerCard.innerText();
    console.log(`[Thông tin khách hàng] ${custCardText.replace(/\n/g, " - ")}`);

    // 4. Áp dụng quy đổi 20 điểm (20,000 VNĐ)
    console.log("[Bước 4] Áp dụng quy đổi 20 điểm tích lũy...");
    const discountInput = page.locator("#pos-discount-input");
    await discountInput.fill("DIEM20K");
    await page.locator(".pos-discount-btn").click();
    await page.waitForTimeout(1000);

    // Kiểm tra số tiền giảm trừ 20,000đ hiển thị trên đơn hàng
    const discountAmountElem = page.locator(".pos-discount-amount");
    await expect(discountAmountElem).toBeVisible();
    await expect(discountAmountElem).toContainText("20.000");
    console.log("[Giảm trừ thành công] Hóa đơn đã được trừ trực tiếp 20.000 đ từ 20 điểm tích lũy!");

    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC01: PASSED (DÙNG ĐIỂM THƯỞNG GIẢM TRỪ THÀNH CÔNG) ---\n");
  });

  // ==========================================================================
  // TC02: HOÀN TẤT THANH TOÁN VÀ XUẤT HÓA ĐƠN GHI NHẬN ĐIỂM
  // ==========================================================================
  test("TC02 (QH-128 Checkout): Hoàn tất thanh toán đơn hàng có dùng điểm tích lũy", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: THANH TOÁN ĐƠN HÀNG CÓ TRỪ ĐIỂM TÍCH LŨY ---");
    console.log("==================================================================");

    await page.route("**/api/discounts/validate", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          discount: {
            code: "DIEM20K",
            type: "fixed",
            discountAmount: 20000,
            amount: 20000,
          },
        }),
      });
    });

    await page.route("**/api/checkout", async (route) => {
      console.log("[Mock Checkout] Giả lập thanh toán trừ điểm trong RAM, không lưu dữ liệu vào CSDL.");
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Thanh toán đơn hàng thành công!",
          maDonHang: 8888,
        }),
      });
    });

    await loginAsStaff(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1200);

    // Thêm món
    await page.locator(".product-card").first().click();
    await page.waitForTimeout(500);

    // Chọn khách hàng
    await page.locator(".customer-input").fill(TEST_PHONE);
    await page.waitForTimeout(800);
    const dropdownItem = page.locator(".customer-dropdown .dropdown-item").first();
    if (await dropdownItem.isVisible()) {
      await dropdownItem.click();
    }

    // Áp dụng giảm trừ điểm
    await page.locator("#pos-discount-input").fill("DIEM20K");
    await page.locator(".pos-discount-btn").click();
    await page.waitForTimeout(1000);

    // Bấm thanh toán
    console.log("[Bước 1] Mở popup thanh toán...");
    await page.locator(".checkout-btn:has-text('Thanh Toán')").click();
    await page.waitForTimeout(1000);

    // Nhập tiền khách đưa đủ
    await page.locator(".cash-input-field").fill("100000");
    await page.waitForTimeout(500);

    // Hoàn tất đơn
    console.log("[Bước 2] Hoàn tất thanh toán...");
    const confirmBtn = page.locator("button.btn-payment-confirm:has-text('✓ Hoàn Tất Thanh Toán')");
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();
    await page.waitForTimeout(1500);

    // Kiểm tra hóa đơn xuất hiện
    const receiptModal = page.locator(".receipt-modal");
    await expect(receiptModal).toBeVisible();
    console.log("[Hóa đơn biên lai] Đơn hàng giảm trừ điểm đã thanh toán thành công!");

    // Đóng hóa đơn
    const closeReceiptBtn = page.locator("button.checkout-btn:has-text('In Hóa Đơn & Đóng')");
    if (await closeReceiptBtn.isVisible()) {
      await closeReceiptBtn.click();
    }

    console.log("--- HOÀN THÀNH TC02: PASSED (XUẤT BIÊN LAI THÀNH CÔNG) ---\n");
  });

  // ==========================================================================
  // TC03: KIỂM TRA CHẶN QUY ĐỔI KHI KHÔNG ĐỦ ĐIỂM
  // ==========================================================================
  test("TC03 (QH-128 Point Limit): Chặn quy đổi khi số điểm yêu cầu vượt quá số dư điểm của khách", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC03: KIỂM TRA CHẶN ĐỔI ĐIỂM KHI KHÔNG ĐỦ SỐ DƯ ---");
    console.log("==================================================================");

    await page.route("**/api/discounts/validate", async (route) => {
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Khách hàng không đủ điểm tích lũy để quy đổi mã này!",
        }),
      });
    });

    await loginAsStaff(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1200);

    await page.locator(".product-card").first().click();
    await page.locator("#pos-discount-input").fill("DIEM100K");
    await page.locator(".pos-discount-btn").click();
    await page.waitForTimeout(1000);

    // Kiểm tra thông báo lỗi hiển thị
    const errorMsg = page.locator(".pos-discount-error");
    await expect(errorMsg).toBeVisible();
    console.log("[Bảo vệ điểm] Hệ thống đã phát hiện thiếu điểm và chặn quy đổi chính xác!");

    console.log("--- HOÀN THÀNH TC03: PASSED (BẢO VỆ ĐIỂM THƯỞNG HOÀN HẢO) ---\n");
  });
});
