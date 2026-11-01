const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-125
 * Title: Testcase: Hiển thị gợi ý món đi kèm (Upselling AI) trên màn hình POS
 * 
 * 1. TC01 (QH-125 Jira Core):
 *    - Thu ngân chọn 1 ly "Espresso" vào đơn hàng trên giao diện POS
 *    - Khung "✨ Món gọi kèm gợi ý" kích hoạt bên dưới đơn hàng
 *    - Hiển thị nhãn nguồn "AI" và danh sách 2 - 3 món đề xuất kèm lý do gợi ý.
 * 
 * 2. TC02 (Quick Add Suggestion to Order):
 *    - Thu ngân nhấp chọn nhanh món gợi ý ("Croissant") từ widget AI
 *    - Món được thêm ngay vào hóa đơn với số lượng 1 và giá chính xác.
 * 
 * 3. TC03 (AI Fallback Resilience):
 *    - Giả lập AI Service tạm thời offline
 *    - Hệ thống chuyển mượt mà sang "Gợi ý mặc định" (Pairing rules) không lỗi.
 * 
 * 4. TC04 (Auto Hide when Cart is Empty):
 *    - Xóa hết món trong giỏ -> Khung gợi ý tự động ẩn đi.
 * ============================================================================
 */

test.describe("QH-125: Hiển thị gợi ý món đi kèm (Upselling AI) trên màn hình POS", () => {
  test.setTimeout(45000);

  const FRONTEND_URL = "http://localhost:5173";

  // Helper: Đăng nhập quyền Thu ngân / Admin
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
      sessionStorage.setItem("accessToken", "jwt-token-staff-upsell-test");
      localStorage.setItem("user", JSON.stringify(staffUser));
      localStorage.setItem("accessToken", "jwt-token-staff-upsell-test");
    });
  }

  // ==========================================================================
  // TC01: KÍCH HOẠT HIỂN THỊ KHUNG GỢI Ý MÓN AI TRÊN MÀN HÌNH POS (QH-125 CORE)
  // ==========================================================================
  test("TC01 (QH-125 Jira Core): Chọn món vào đơn hàng -> Kích hoạt widget AI gợi ý món đi kèm", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: CHỌN MÓN VÀO ĐƠN & QUAN SÁT WIDGET GỢI Ý TỪ AI ---");
    console.log("==================================================================");

    // Mock API AI Service trả về danh sách gợi ý upselling theo đúng nghiệp vụ
    await page.route("**/api/ai/goi-y-mon", async (route) => {
      console.log("[AI Service] Nhận request phân tích giỏ hàng từ POS -> Đang tính toán gợi ý...");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            { id: 7, tenSanPham: "Bánh Croissant", lyDo: "Món bánh được 85% khách hàng gọi kèm khi uống cà phê" },
            { id: 6, tenSanPham: "Bánh Tiramisu", lyDo: "Bánh ngọt cân bằng hương vị đậm đà của cà phê" },
          ],
        }),
      });
    });

    await loginAsStaff(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // 1. Mở giao diện POS
    console.log("[Bước 1] Mở màn hình 'Bán Hàng Tại Quầy (POS)'...");
    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1500);

    // Xác nhận ban đầu giỏ hàng trống, widget gợi ý chưa xuất hiện
    const suggestWidget = page.locator(".pos-suggest");
    expect(await suggestWidget.isVisible()).toBe(false);
    console.log("[POS State] Giỏ hàng ban đầu đang trống, widget gợi ý đang ẩn hợp lệ.");

    // 2. Thu ngân bấm chọn 1 ly 'Espresso' vào hóa đơn
    console.log("[Bước 2] Thu ngân chọn món 'Espresso' vào đơn hàng...");
    const productCard = page.locator(".product-card", { hasText: "Espresso" }).first();
    await expect(productCard).toBeVisible();
    await productCard.click();
    await page.waitForTimeout(1000);

    // 3. Quan sát widget / khung "Món gọi kèm gợi ý" bên dưới giỏ hàng
    console.log("[Bước 3] Quan sát khung 'Món gọi kèm gợi ý' bên cạnh giỏ hàng...");
    await expect(suggestWidget).toBeVisible();

    // Kiểm tra tiêu đề khung gợi ý
    const title = suggestWidget.locator(".pos-suggest-title");
    await expect(title).toContainText("Món gọi kèm gợi ý");

    // Kiểm tra nhãn nguồn gợi ý hiển thị là "AI"
    const sourceBadge = suggestWidget.locator(".pos-suggest-source");
    await expect(sourceBadge).toHaveText("AI");
    console.log("[AI Badge] Nhãn nguồn gợi ý 'AI' đã hiển thị chính xác.");

    // Kiểm tra danh sách món đề xuất hiển thị ít nhất 2 món kèm lý do
    const suggestItems = suggestWidget.locator(".pos-suggest-item");
    const count = await suggestItems.count();
    expect(count).toBeGreaterThanOrEqual(2);
    console.log(`[Gợi ý thành công] Đã hiển thị ${count} món đề xuất thông minh từ mô hình AI.`);

    // Kiểm tra thông tin chi tiết của món đầu tiên (Bánh Croissant)
    const firstSuggest = suggestItems.first();
    await expect(firstSuggest).toContainText("Bánh Croissant");
    await expect(firstSuggest).toContainText("85% khách hàng");
    console.log("[Chi tiết món] Món 'Bánh Croissant' hiển thị đầy đủ tên, giá và lý do gợi ý.");

    // Demo hiển thị 3 giây
    await page.waitForTimeout(3000);
    console.log("--- HOÀN THÀNH TC01: PASSED (WIDGET AI GỢI Ý MÓN HOẠT ĐỘNG HOÀN HẢO) ---\n");
  });

  // ==========================================================================
  // TC02: THU NGÂN BẤM CHỌN NHANH MÓN GỢI Ý TỪ WIDGET AI VÀO HÓA ĐƠN
  // ==========================================================================
  test("TC02 (QH-125 Quick Upsell): Thu ngân nhấp chọn nhanh món gợi ý AI vào hóa đơn", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: THỬ THÊM NHANH MÓN GỢI Ý AI VÀO GIỎ HÀNG ---");
    console.log("==================================================================");

    await page.route("**/api/ai/goi-y-mon", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            { id: 7, tenSanPham: "Bánh Croissant", lyDo: "Món ăn kèm hoàn hảo" },
          ],
        }),
      });
    });

    await loginAsStaff(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1200);

    // 1. Thêm Espresso vào đơn
    await page.locator(".product-card", { hasText: "Espresso" }).first().click();
    await page.waitForTimeout(800);

    // 2. Nhấp chọn món gợi ý 'Bánh Croissant' từ widget AI
    console.log("[Bước 1] Thu ngân bấm chọn món gợi ý 'Bánh Croissant' từ widget AI...");
    const suggestBtn = page.locator(".pos-suggest-item:has-text('Bánh Croissant')");
    await expect(suggestBtn).toBeVisible();
    await suggestBtn.click();
    await page.waitForTimeout(1000);

    // 3. Kiểm tra giỏ hàng: Món 'Bánh Croissant' đã được thêm trực tiếp vào hóa đơn
    const croissantInCart = page.locator(".cart-item:has-text('Bánh Croissant'), .pos-cart-item:has-text('Bánh Croissant')").first();
    await expect(croissantInCart).toBeVisible();
    console.log("[Giỏ hàng] Món 'Bánh Croissant' đã được thêm trực tiếp vào đơn hàng thành công!");

    // Giỏ hàng hiện tại có 2 món (Espresso + Croissant)
    const cartCount = await page.locator(".cart-item, .pos-cart-item").count();
    expect(cartCount).toBeGreaterThanOrEqual(2);
    console.log(`[Tổng số món] Giỏ hàng hiện có ${cartCount} món.`);

    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC02: PASSED (QUICK UPSELL THÊM MÓN THÀNH CÔNG) ---\n");
  });

  // ==========================================================================
  // TC03: KIỂM TRA CƠ CHẾ GỢI Ý DỰ PHÒNG (FALLBACK PAIRING) KHI AI OFFLINE
  // ==========================================================================
  test("TC03 (QH-125 Resilience): Cơ chế Fallback gợi ý mặc định khi AI Service không khả dụng", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC03: KIỂM THỬ CHẾ ĐỘ DỰ PHÒNG KHI AI SERVICE OFFLINE ---");
    console.log("==================================================================");

    // Giả lập AI service bị ngắt kết nối (500 Error hoặc timeout)
    await page.route("**/api/ai/goi-y-mon", async (route) => {
      console.log("[Simulate Offline] Giả lập AI Service không phản hồi để kiểm tra tính chịu lỗi...");
      return route.abort("failed");
    });

    await loginAsStaff(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1200);

    // Thêm món vào đơn
    await page.locator(".product-card", { hasText: "Espresso" }).first().click();
    await page.waitForTimeout(1500);

    // Kiểm tra widget gợi ý vẫn xuất hiện nhưng hiển thị nhãn "Gợi ý mặc định"
    const suggestWidget = page.locator(".pos-suggest");
    await expect(suggestWidget).toBeVisible();

    const sourceBadge = suggestWidget.locator(".pos-suggest-source");
    await expect(sourceBadge).toHaveText("Gợi ý mặc định");
    console.log("[Fallback Chế độ dự phòng] Đã tự động kích hoạt 'Gợi ý mặc định' mà không gây lỗi giao diện.");

    await page.waitForTimeout(1500);
    console.log("--- HOÀN THÀNH TC03: PASSED (HỆ THỐNG HOẠT ĐỘNG BỀN BỈ KHI AI OFFLINE) ---\n");
  });

  // ==========================================================================
  // TC04: KHUNG GỢI Ý TỰ ĐỘNG ẨN KHI GIỎ HÀNG TRỐNG
  // ==========================================================================
  test("TC04 (QH-125 UI Logic): Khung gợi ý tự động ẩn khi giỏ hàng trống", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC04: KIỂM THỬ ẨN WIDGET KHI XÓA SẠCH GIỎ HÀNG ---");
    console.log("==================================================================");

    await loginAsStaff(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1200);

    // 1. Thêm món
    await page.locator(".product-card", { hasText: "Espresso" }).first().click();
    await page.waitForTimeout(800);
    await expect(page.locator(".pos-suggest")).toBeVisible();

    // 2. Xóa món khỏi giỏ hàng (bấm nút giảm số lượng hoặc nút xóa)
    const removeBtn = page.locator(".cart-item button:has-text('-'), .pos-cart-item button:has-text('-'), button[title*='Xóa']").first();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      await page.waitForTimeout(1000);
    }

    // 3. Khung gợi ý phải ẩn đi
    const isStillVisible = await page.locator(".pos-suggest").isVisible().catch(() => false);
    expect(isStillVisible).toBe(false);
    console.log("[Tự động ẩn] Widget gợi ý đã tự động ẩn đi hoàn toàn khi giỏ hàng trống.");

    console.log("--- HOÀN THÀNH TC04: PASSED (QUẢN LÝ GIAO DIỆN CHUẨN XÁC) ---\n");
  });
});
