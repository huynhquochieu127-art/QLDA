const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-110
 * Title: Testcase: Luồng bán hàng POS (Tạo đơn, Tích điểm thành viên và Thanh toán)
 * 
 * 1. Happy Case (Luồng suôn sẻ):
 *    Tạo đơn hàng -> Chọn món -> Nhập SĐT tích điểm -> Áp dụng mã giảm giá hợp lệ
 *    -> Thanh toán thành công -> Kiểm tra hóa đơn và tích điểm (QH-86).
 * 
 * 2. Negative Case 1 (Chưa đủ điểm tích lũy):
 *    Nhập mã giảm giá yêu cầu mốc điểm cao khi khách chưa đủ điểm (Mã TRU20K yêu cầu 80 điểm, 
 *    khách có 22 điểm) -> Hệ thống từ chối áp dụng và báo lỗi mốc điểm (QH-87).
 * 
 * 3. Negative Case 2 (Tiền khách đưa không đủ):
 *    Mở modal thanh toán -> Nhập số tiền khách đưa ít hơn tổng tiền hóa đơn (QH-79) 
 *    -> Hiển thị cảnh báo vàng "⚠️ Khách đưa chưa đủ tiền!" và khóa nút Hoàn Tất Thanh Toán.
 * ============================================================================
 */

test.describe("QH-110: Luồng bán hàng POS (Tạo đơn, Tích điểm thành viên và Thanh toán)", () => {
  test.setTimeout(60000); // 60 giây để thoải mái giữ màn hình demo quan sát

  const FRONTEND_URL = "http://localhost:5173";
  const API_URL = "http://localhost:5000/api";

  // Helper: Tự động đăng nhập sẵn tài khoản Thu ngân / Thu ngân POS vào trình duyệt
  async function loginAsCashier(page) {
    await page.addInitScript(() => {
      const cashierUser = {
        id: 4,
        name: "Đỗ Văn Đoàn (Thu ngân)",
        role: "cashier",
        chucVu: "Thu ngân",
        loaiNhanVien: "Full-time",
        MaVaiTro: 3,
        email: "nv1@gmail.com",
      };
      sessionStorage.setItem("user", JSON.stringify(cashierUser));
      sessionStorage.setItem("accessToken", "jwt-token-pos-test");
      localStorage.setItem("user", JSON.stringify(cashierUser));
      localStorage.setItem("accessToken", "jwt-token-pos-test");
    });
  }

  // ==========================================================================
  // TESTCASE 1: HAPPY CASE - LUỒNG BÁN HÀNG SUÔN SẺ TỪ CHỌN MÓN ĐẾN THANH TOÁN
  // ==========================================================================
  test("TC01 (QH-110 Happy Case): Tạo đơn hàng -> Chọn món -> Nhập SĐT tích điểm -> Áp mã giảm giá -> Thanh toán thành công", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: HAPPY CASE (LUỒNG BÁN HÀNG POS SUÔN SẺ) ---");
    console.log("==================================================================");

    await loginAsCashier(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // 1. Điều hướng vào menu "Bán hàng POS"
    console.log("[Bước 1] Mở màn hình Bán hàng POS...");
    const posMenu = page.locator("text=Tạo đơn & Thanh toán (POS)");
    await posMenu.click();
    await page.waitForTimeout(1500);

    // 2. Chọn món vào giỏ hàng
    console.log("[Bước 2] Chọn các món nước vào giỏ hàng...");
    const productCards = page.locator(".product-card");
    await expect(productCards.first()).toBeVisible();

    // Click chọn món thứ nhất và món thứ hai
    await productCards.nth(0).click();
    await page.waitForTimeout(500);
    await productCards.nth(1).click();
    await page.waitForTimeout(500);

    const cartItems = page.locator(".cart-item");
    const cartCount = await cartItems.count();
    expect(cartCount).toBeGreaterThan(0);
    console.log(`[Giỏ hàng] Đã thêm thành công ${cartCount} món vào đơn hàng.`);

    // 3. Nhập số điện thoại khách hàng để tích điểm thành viên (QH-86)
    const testPhone = "0813108114";
    console.log(`[Bước 3] Nhập SĐT khách hàng thành viên (${testPhone}) để tích điểm...`);
    const phoneInput = page.locator(".customer-input");
    await phoneInput.fill(testPhone);
    await page.waitForTimeout(800);

    // Chọn khách hàng từ dropdown gợi ý
    const dropdownItem = page.locator(".customer-dropdown .dropdown-item").first();
    if (await dropdownItem.isVisible()) {
      await dropdownItem.click();
      console.log("[Thành viên] Đã chọn khách hàng từ danh sách gợi ý.");
    }

    // Xác nhận thẻ khách hàng hiển thị điểm tích lũy
    const customerCard = page.locator(".selected-customer-card");
    await expect(customerCard).toBeVisible();
    const custCardText = await customerCard.innerText();
    console.log(`[Thông tin khách hàng] ${custCardText.replace(/\n/g, " - ")}`);

    // 4. Áp dụng mã giảm giá hợp lệ
    console.log("[Bước 4] Nhập mã giảm giá hợp lệ (WELCOME10)...");
    const discountInput = page.locator("#pos-discount-input");
    await discountInput.fill("WELCOME10");
    await page.locator(".pos-discount-btn").click();
    await page.waitForTimeout(1000);

    // Kiểm tra mã giảm giá đã được áp dụng thành công
    const appliedTag = page.locator(".pos-discount-applied");
    await expect(appliedTag).toBeVisible();
    const discountText = await appliedTag.innerText();
    console.log(`[Mã giảm giá] Áp dụng thành công: ${discountText.replace(/\n/g, " ")}`);

    // 5. Bấm nút Thanh Toán để mở Popup thanh toán
    console.log("[Bước 5] Mở popup thanh toán...");
    const checkoutBtn = page.locator(".checkout-btn:has-text('Thanh Toán')");
    await checkoutBtn.click();
    await page.waitForTimeout(1000);

    const paymentModal = page.locator(".payment-modal");
    await expect(paymentModal).toBeVisible();

    // 6. Nhập số tiền khách đưa đủ tiền mặt (200.000 đ)
    console.log("[Bước 6] Nhập số tiền khách đưa đủ (200.000 đ)...");
    const cashInput = page.locator(".cash-input-field");
    await cashInput.fill("200000");
    await page.waitForTimeout(500);

    // Xác nhận tiền thối lại hợp lệ
    const successBox = page.locator(".change-box.success");
    await expect(successBox).toBeVisible();
    const changeText = await successBox.innerText();
    console.log(`[Tiền thối] ${changeText.replace(/\n/g, " ")}`);

    // 7. Nhấn nút "✓ Hoàn Tất Thanh Toán"
    console.log("[Bước 7] Nhấn nút '✓ Hoàn Tất Thanh Toán'...");
    const confirmPayBtn = page.locator("button.btn-payment-confirm:has-text('✓ Hoàn Tất Thanh Toán')");
    await expect(confirmPayBtn).toBeEnabled();
    await confirmPayBtn.click();
    await page.waitForTimeout(1500);

    // 8. Kiểm tra hiển thị Hóa đơn biên lai thành công
    const receiptModal = page.locator(".receipt-modal");
    await expect(receiptModal).toBeVisible();
    const receiptTitle = await page.locator(".receipt-title").innerText();
    expect(receiptTitle).toContain("Thanh Toán Thành Công!");
    console.log(`[Hóa đơn] Hệ thống xuất biên lai: "${receiptTitle}"`);

    // Giữ màn hình 5 giây để quan sát hóa đơn bán hàng
    console.log("[Demo] Đang giữ hóa đơn 5 giây để quan sát kết quả thanh toán...");
    await page.waitForTimeout(5000);

    // Đóng hóa đơn
    const closeReceiptBtn = page.locator("button.checkout-btn:has-text('In Hóa Đơn & Đóng')");
    await closeReceiptBtn.click();
    console.log("--- HOÀN THÀNH TC01: PASSED (LUỒNG BÁN HÀNG HAPPY CASE THÀNH CÔNG 100%) ---\n");
  });

  // ==========================================================================
  // TESTCASE 2: NEGATIVE CASE 1 - CỐ TÌNH DÙNG MÃ GIẢM GIÁ KHI CHƯA ĐỦ ĐIỂM
  // ==========================================================================
  test("TC02 (QH-110 Negative Case 1): Nhập mã giảm giá khi khách chưa đủ điểm -> Hệ thống chặn lại và báo lỗi mốc điểm", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: NEGATIVE CASE (MÃ GIẢM GIÁ CHƯA ĐỦ MỐC ĐIỂM) ---");
    console.log("==================================================================");

    await loginAsCashier(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1000);

    // 1. Chọn món vào giỏ hàng (tổng tiền trên 80.000đ để thỏa điều kiện đơn tối thiểu)
    console.log("[Bước 1] Chọn món vào giỏ hàng (đạt tổng tiền > 80.000đ)...");
    const products = page.locator(".product-card");
    await products.nth(0).click();
    await page.waitForTimeout(300);
    await products.nth(1).click();
    await page.waitForTimeout(300);
    await products.nth(0).click();
    await page.waitForTimeout(300);

    // 2. Chọn khách hàng có điểm thấp (SĐT: 0813108114 - 22 điểm)
    console.log("[Bước 2] Chọn khách hàng có 22 điểm tích lũy...");
    const phoneInput = page.locator(".customer-input");
    await phoneInput.fill("0813108114");
    await page.waitForTimeout(800);

    const dropdownItem = page.locator(".customer-dropdown .dropdown-item").first();
    if (await dropdownItem.isVisible()) {
      await dropdownItem.click();
    }

    // 3. Cố tình nhập mã giảm giá yêu cầu mốc 80 điểm: "TRU20K"
    console.log("[Bước 3] Cố tình nhập mã 'TRU20K' (yêu cầu tối thiểu 80 điểm)...");
    const discountInput = page.locator("#pos-discount-input");
    await discountInput.fill("TRU20K");
    await page.locator(".pos-discount-btn").click();
    await page.waitForTimeout(1000);

    // 4. Kiểm tra hệ thống hiển thị thông báo lỗi màu đỏ từ chối
    const errorBox = page.locator(".pos-discount-error");
    await expect(errorBox).toBeVisible();
    const errorMsg = await errorBox.innerText();
    console.log(`[Cảnh báo chặn mã] Giao diện hiển thị: "${errorMsg}"`);

    expect(errorMsg).toContain("điểm");
    console.log("[Bảo vệ nghiệp vụ] Hệ thống đã từ chối áp dụng mã giảm giá khi khách hàng chưa đủ điểm tích lũy!");

    console.log("[Demo] Đang giữ giao diện 5 giây để quan sát cảnh báo chưa đủ điểm...");
    await page.waitForTimeout(5000);
    console.log("--- HOÀN THÀNH TC02: PASSED (CHẶN MÃ CHƯA ĐỦ ĐIỂM THÀNH CÔNG) ---\n");
  });

  // ==========================================================================
  // TESTCASE 3: NEGATIVE CASE 2 - BẤM THANH TOÁN KHI TIỀN KHÁCH ĐƯA CHƯA ĐỦ
  // ==========================================================================
  test("TC03 (QH-110 Negative Case 2): Tiền khách đưa ít hơn tổng hóa đơn -> Cảnh báo thiếu tiền & Vô hiệu hóa nút thanh toán (QH-79)", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC03: NEGATIVE CASE (TIỀN KHÁCH ĐƯA KHÔNG ĐỦ) ---");
    console.log("==================================================================");

    await loginAsCashier(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1000);

    // 1. Thêm món vào giỏ hàng
    console.log("[Bước 1] Thêm món vào giỏ hàng...");
    await page.locator(".product-card").first().click();

    // 2. Bấm nút Thanh toán để mở Modal
    console.log("[Bước 2] Mở modal thanh toán...");
    const checkoutBtn = page.locator(".checkout-btn:has-text('Thanh Toán')");
    await checkoutBtn.click();
    await page.waitForTimeout(1000);

    // 3. Cố tình nhập số tiền ít hơn tổng hóa đơn (ví dụ: chỉ nhập 5.000 đ)
    console.log("[Bước 3] Cố tình nhập số tiền khách đưa cực thấp (5.000 đ)...");
    const cashInput = page.locator(".cash-input-field");
    await cashInput.fill("5000");
    await page.waitForTimeout(500);

    // 4. Kiểm tra cảnh báo tiền thiếu
    const warningBox = page.locator(".change-box.warning");
    await expect(warningBox).toBeVisible();
    const warningText = await warningBox.innerText();
    console.log(`[Cảnh báo thiếu tiền] Giao diện hiển thị: "${warningText.replace(/\n/g, ' ')}"`);
    expect(warningText).toContain("Khách đưa chưa đủ tiền!");

    // 5. Kiểm tra nút "✓ Hoàn Tất Thanh Toán" BỊ VÔ HIỆU HÓA (disabled)
    const confirmBtn = page.locator("button.btn-payment-confirm");
    const isDisabled = await confirmBtn.isDisabled();
    console.log(`[Kiểm tra bảo vệ] Trạng thái nút Hoàn Tất Thanh Toán: ${isDisabled ? 'BỊ KHÓA (DISABLED - CHUẨN)' : 'MỞ (LỖI)'}`);
    expect(isDisabled).toBe(true);

    console.log("[Demo] Đang giữ giao diện 5 giây để quan sát cảnh báo tiền thiếu...");
    await page.waitForTimeout(5000);

    // Hủy bỏ modal
    await page.locator(".btn-payment-cancel").click();
    console.log("--- HOÀN THÀNH TC03: PASSED (CHẶN THANH TOÁN THIẾU TIỀN THÀNH CÔNG) ---\n");
  });

  // ==========================================================================
  // TESTCASE 4: KIỂM THỬ TẦNG API - TÍCH ĐIỂM & RÀNG BUỘC ĐIỂM KHUYẾN MÃI
  // ==========================================================================
  test("TC04 (QH-110 & QH-86): Kiểm thử API xác thực mã giảm giá và tích lũy điểm thành viên", async ({ request }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC04: KIỂM THỬ TẦNG API GIẢM GIÁ & TÍCH ĐIỂM ---");
    console.log("==================================================================");

    // 1. Kiểm tra API validate mã hợp lệ
    console.log("[API Bước 1] Kiểm tra mã giảm giá hợp lệ (WELCOME10)...");
    const validRes = await request.post(`${API_URL}/discounts/validate`, {
      data: {
        maCode: "WELCOME10",
        subtotal: 100000,
        customerId: 1,
        customerPoints: 22,
      },
      headers: { "Content-Type": "application/json" }
    });
    expect(validRes.status()).toBe(200);
    const validData = await validRes.json();
    console.log("[API Hợp lệ]", {
      success: validData.success,
      code: validData.data?.maCode || "WELCOME10",
      discountAmount: validData.data?.soTienGiam
    });

    // 2. Kiểm tra API validate mã khi KHÁCH KHÔNG ĐỦ ĐIỂM (TRU20K)
    console.log("[API Bước 2] Kiểm tra mã 'TRU20K' khi khách chỉ có 22 điểm (yêu cầu 80 điểm)...");
    const invalidPointsRes = await request.post(`${API_URL}/discounts/validate`, {
      data: {
        maCode: "TRU20K",
        subtotal: 100000,
        customerId: 1,
        customerPoints: 22,
      },
      headers: { "Content-Type": "application/json" }
    });
    expect([400, 422]).toContain(invalidPointsRes.status());
    const invalidData = await invalidPointsRes.json();
    console.log("[API Từ chối mốc điểm]", {
      success: invalidData.success,
      message: invalidData.message,
      requiredPoints: invalidData.requiredPoints,
      currentPoints: invalidData.currentPoints
    });
    expect(invalidData.message).toContain("điểm");

    console.log("--- HOÀN THÀNH TC04: PASSED (API XÁC THỰC MỐC ĐIỂM ĐẠT CHUẨN) ---\n");
  });
});
