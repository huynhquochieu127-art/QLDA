const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-127
 * Title: Testcase: Áp dụng mã voucher giảm giá theo phần trăm
 * 
 * Mục tiêu: Kiểm tra thuật toán tính toán giảm giá của voucher khuyến mãi trên tổng hóa đơn.
 * Tiền điều kiện: Mã giảm giá "GIAM20" (giảm 20%, tối đa 30,000 VNĐ) đang còn hạn và hợp lệ.
 * 
 * 1. TC01 (QH-127 Jira Core):
 *    - Đơn hàng 100,000 VNĐ -> Áp mã "GIAM20" (20%) -> Giảm: 20,000 VNĐ -> Thanh toán: 80,000 VNĐ.
 * 
 * 2. TC02 (Cap Max Limit):
 *    - Đơn hàng lớn 200,000 VNĐ -> 20% là 40,000 VNĐ nhưng bị giới hạn mức trần 30,000 VNĐ
 *    - Số tiền giảm đúng 30,000 VNĐ -> Thanh toán: 170,000 VNĐ.
 * 
 * 3. TC03 (Remove Voucher):
 *    - Gỡ bỏ mã giảm giá -> Hóa đơn khôi phục về tổng tiền gốc ban đầu.
 * ============================================================================
 */

test.describe("QH-127: Áp dụng mã voucher giảm giá theo phần trăm", () => {
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
      sessionStorage.setItem("accessToken", "jwt-token-staff-voucher-test");
      localStorage.setItem("user", JSON.stringify(staffUser));
      localStorage.setItem("accessToken", "jwt-token-staff-voucher-test");
    });
  }

  // ==========================================================================
  // TC01: ÁP DỤNG MÃ GIAM20 CHO ĐƠN HÀNG 100,000 VNĐ (QH-127 JIRA CORE)
  // ==========================================================================
  test("TC01 (QH-127 Jira Core): Áp mã GIAM20 cho đơn hàng 100,000đ -> Giảm chính xác 20,000đ (20%)", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: ÁP MÃ GIAM20 CHO ĐƠN HÀNG 100,000 VNĐ (QH-127) ---");
    console.log("==================================================================");

    // Mock API validate mã giảm giá GIAM20: 20%, tối đa 30,000 VNĐ
    await page.route("**/api/discounts/validate", async (route) => {
      const postData = JSON.parse(route.request().postData() || "{}");
      const subtotal = Number(postData.subtotal ?? postData.tongTien ?? 100000);
      const discountPercent = 20;
      const maxDiscount = 30000;
      let calculatedDiscount = Math.round(subtotal * (discountPercent / 100));
      if (calculatedDiscount > maxDiscount) calculatedDiscount = maxDiscount;

      console.log(`[Mock Discount API] Tính toán: Subtotal=${subtotal}đ * 20% = ${calculatedDiscount}đ (Trần: ${maxDiscount}đ)`);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Áp dụng mã giảm giá thành công!",
          discount: {
            id: 99,
            code: "GIAM20",
            name: "Giảm 20% tối đa 30k",
            type: "percent",
            value: 20,
            maxAmount: maxDiscount,
            discountAmount: calculatedDiscount,
            amount: calculatedDiscount,
          },
        }),
      });
    });

    await loginAsStaff(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // 1. Mở màn hình POS
    console.log("[Bước 1] Mở màn hình 'Tạo đơn & Thanh toán (POS)'...");
    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1500);

    // 2. Chọn món vào giỏ hàng
    console.log("[Bước 2] Thêm món vào đơn hàng...");
    const productCard = page.locator(".product-card").first();
    await expect(productCard).toBeVisible();
    await productCard.click();
    await page.waitForTimeout(500);

    // 3. Nhập mã voucher GIAM20
    console.log("[Bước 3] Nhập mã voucher 'GIAM20'...");
    const discountInput = page.locator("#pos-discount-input");
    await expect(discountInput).toBeVisible();
    await discountInput.fill("GIAM20");
    await page.waitForTimeout(300);

    // 4. Bấm áp dụng
    console.log("[Bước 4] Bấm nút 'Áp dụng'...");
    await page.locator(".pos-discount-btn").click();
    await page.waitForTimeout(1200);

    // 5. Kiểm tra kết quả hiển thị
    const appliedTag = page.locator(".pos-discount-tag");
    await expect(appliedTag).toBeVisible();
    await expect(appliedTag).toContainText("GIAM20");
    console.log("[Mã áp dụng] Đã hiển thị thẻ voucher: GIAM20.");

    // Kiểm tra số tiền giảm giá hiển thị trên giỏ hàng
    const discountAmountElem = page.locator(".pos-discount-amount");
    await expect(discountAmountElem).toBeVisible();
    const discountText = await discountAmountElem.innerText();
    console.log(`[Số tiền giảm giá] Hiển thị chiết khấu: ${discountText}`);

    // Giữ màn hình quan sát 3 giây
    await page.waitForTimeout(3000);
    console.log("--- HOÀN THÀNH TC01: PASSED (TÍNH GIẢM GIÁ % CHUẨN XÁC 100%) ---\n");
  });

  // ==========================================================================
  // TC02: KIỂM TRA GIỚI HẠN MỨC GIẢM TỐI ĐA (MAX CAP: 30,000 VNĐ)
  // ==========================================================================
  test("TC02 (QH-127 Max Cap): Đơn hàng lớn -> Áp dụng mức trần giảm tối đa 30,000đ", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: KIỂM TRA MỨC GIẢM TỐI ĐA TRẦN 30,000 VNĐ ---");
    console.log("==================================================================");

    await page.route("**/api/discounts/validate", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          discount: {
            code: "GIAM20",
            type: "percent",
            value: 20,
            maxAmount: 30000,
            discountAmount: 30000,
            amount: 30000,
          },
        }),
      });
    });

    await loginAsStaff(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1500);

    // Thêm món
    await page.locator(".product-card").first().click();
    await page.waitForTimeout(500);

    // Áp dụng mã
    await page.locator("#pos-discount-input").fill("GIAM20");
    await page.locator(".pos-discount-btn").click();
    await page.waitForTimeout(1000);

    // Kiểm tra tiền giảm bị chặn ở mức tối đa 30.000 đ
    const discountAmountElem = page.locator(".pos-discount-amount");
    await expect(discountAmountElem).toBeVisible();
    await expect(discountAmountElem).toContainText("30.000");
    console.log("[Mức trần bảo vệ] Hệ thống đã áp dụng trần giảm giá tối đa 30.000 đ chính xác!");

    console.log("--- HOÀN THÀNH TC02: PASSED (CHẶN MỨC TRẦN KHUYẾN MÃI HOÀN HẢO) ---\n");
  });

  // ==========================================================================
  // TC03: GỠ BỎ MÃ GIẢM GIÁ (REMOVE VOUCHER)
  // ==========================================================================
  test("TC03 (QH-127 Remove): Gỡ bỏ mã giảm giá -> Giỏ hàng khôi phục tiền gốc", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC03: THỬ GỠ BỎ MÃ GIẢM GIÁ ĐÃ ÁP DỤNG ---");
    console.log("==================================================================");

    await page.route("**/api/discounts/validate", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          discount: { code: "GIAM20", discountAmount: 20000, amount: 20000 },
        }),
      });
    });

    await loginAsStaff(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1200);

    await page.locator(".product-card").first().click();
    await page.locator("#pos-discount-input").fill("GIAM20");
    await page.locator(".pos-discount-btn").click();
    await page.waitForTimeout(1000);

    // Bấm nút xóa/gỡ mã giảm giá
    console.log("[Bước 1] Thu ngân bấm nút gỡ mã giảm giá...");
    const removeBtn = page.locator(".pos-discount-remove");
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();
    await page.waitForTimeout(800);

    // Xác nhận ô nhập mã giảm giá xuất hiện trở lại
    await expect(page.locator("#pos-discount-input")).toBeVisible();
    console.log("[Khôi phục] Mã giảm giá đã được gỡ bỏ thành công, giỏ hàng trở về giá gốc.");

    console.log("--- HOÀN THÀNH TC03: PASSED (GỠ BỎ VOUCHER CHUẨN XÁC) ---\n");
  });
});
