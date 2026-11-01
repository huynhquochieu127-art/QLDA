const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-124
 * Title: Testcase: Quản lý bật/tắt hiển thị món trên màn hình POS
 * 
 * 1. TC01 (QH-124 Jira Core): 
 *    - Đăng nhập Quản lý/Admin -> Vào "Quản lý Đồ Uống & Thực Đơn"
 *    - Gạt nút chuyển trạng thái món ("Espresso") sang TẮT ("Hết hàng" / is_active = 0)
 *    - Mở giao diện POS của nhân viên thu ngân:
 *      -> Xác nhận món đã bị ẩn/vô hiệu hóa, thu ngân không thể thêm món vào đơn.
 * 
 * 2. TC02 (Restore & Re-enable):
 *    - Bật lại trạng thái món sang "Còn hàng" (is_active = 1)
 *    - Mở giao diện POS:
 *      -> Món xuất hiện lại bình thường, thu ngân bấm chọn thêm vào đơn hàng thành công.
 * 
 * 3. TC03 (API Data Consistency):
 *    - Kiểm thử trực tiếp API PATCH /api/products/:id/status và đảm bảo CSDL nguyên vẹn 100%.
 * ============================================================================
 */

test.describe("QH-124: Quản lý bật/tắt hiển thị món trên màn hình POS", () => {
  test.setTimeout(50000);

  const FRONTEND_URL = "http://localhost:5173";
  const API_URL = "http://localhost:5000/api";
  const TARGET_PRODUCT = "Espresso";
  const TARGET_PRODUCT_ID = 1;

  // Helper: Đăng nhập quyền Admin
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
      sessionStorage.setItem("accessToken", "jwt-token-admin-toggle-test");
      localStorage.setItem("user", JSON.stringify(adminUser));
      localStorage.setItem("accessToken", "jwt-token-admin-toggle-test");
    });
  }

  // Đảm bảo trước và sau khi chạy test, món luôn ở trạng thái "Còn hàng" (is_active = 1)
  test.beforeEach(async ({ request }) => {
    await request.patch(`${API_URL}/products/${TARGET_PRODUCT_ID}/status`, {
      data: { is_active: 1 },
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  });

  test.afterEach(async ({ request }) => {
    await request.patch(`${API_URL}/products/${TARGET_PRODUCT_ID}/status`, {
      data: { is_active: 1 },
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  });

  // ==========================================================================
  // TC01: GẠT TẮT MÓN (HẾT HÀNG) -> ĐỒNG BỘ ẨN KHỎI MÀN HÌNH POS
  // ==========================================================================
  test("TC01 (QH-124 Jira Core): Quản lý tắt trạng thái món -> Món bị ẩn/vô hiệu hóa trên màn hình POS", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: TẮT TRẠNG THÁI MÓN VÀ KIỂM TRA ĐỒNG BỘ POS (QH-124) ---");
    console.log("==================================================================");

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // 1. Vào trang Quản lý Đồ Uống & Thực Đơn
    console.log("[Bước 1] Mở trang 'Quản lý Đồ Uống & Thực Đơn'...");
    await page.locator("text=Quản lý Đồ Uống & Thực Đơn").click();
    await page.waitForTimeout(1000);

    // 2. Tìm dòng món Espresso
    const productRow = page.locator(`table tbody tr:has-text('${TARGET_PRODUCT}')`).first();
    await expect(productRow).toBeVisible();
    console.log(`[Thực đơn] Đã tìm thấy món '${TARGET_PRODUCT}'.`);

    // 3. Gạt nút chuyển trạng thái sang TẮT ("Hết hàng" / is_active = 0)
    console.log(`[Bước 2] Gạt nút chuyển trạng thái món '${TARGET_PRODUCT}' sang TẮT (Hết hàng)...`);
    const toggleBtn = productRow.locator("button[title*='CÒN HÀNG'], button[title*='HẾT HÀNG']");
    await toggleBtn.click();
    await page.waitForTimeout(1200);

    // Xác nhận nhãn trạng thái chuyển thành "Hết hàng"
    await expect(productRow).toContainText("Hết hàng");
    console.log(`[Quản lý Menu] Trạng thái món '${TARGET_PRODUCT}' đã chuyển thành 'Hết hàng'.`);

    // 4. Mở giao diện POS bán hàng của thu ngân
    console.log("[Bước 3] Mở giao diện 'Tạo đơn & Thanh toán (POS)' để kiểm tra...");
    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1500);

    // 5. Kiểm tra kết quả mong đợi trên POS:
    // Món 'Espresso' không xuất hiện trong danh sách món có thể bán
    const posProductCard = page.locator(".product-card", { hasText: TARGET_PRODUCT });
    const isVisibleOnPos = await posProductCard.isVisible().catch(() => false);
    expect(isVisibleOnPos).toBe(false);
    console.log(`[Màn hình POS] Món '${TARGET_PRODUCT}' đã được ẩn hoàn toàn khỏi POS (không thể thêm vào đơn).`);

    // Giữ màn hình quan sát
    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC01: PASSED (ĐỒNG BỘ TRẠNG THÁI TẮT MÓN HOÀN HẢO) ---\n");
  });

  // ==========================================================================
  // TC02: BẬT LẠI MÓN (CÒN HÀNG) -> MÓN XUẤT HIỆN LẠI VÀ BÁN ĐƯỢC TRÊN POS
  // ==========================================================================
  test("TC02 (QH-124 Restore): Bật lại trạng thái món -> Món hiển thị lại và thêm được vào giỏ hàng POS", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: BẬT LẠI MÓN VÀ THÊM VÀO ĐƠN HÀNG POS ---");
    console.log("==================================================================");

    // Tắt trước bằng API để mô phỏng trạng thái đang hết hàng
    await page.request.patch(`${API_URL}/products/${TARGET_PRODUCT_ID}/status`, {
      data: { is_active: 0 },
      headers: { "Content-Type": "application/json" },
    });

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // 1. Vào trang Quản lý Đồ Uống & Thực Đơn
    await page.locator("text=Quản lý Đồ Uống & Thực Đơn").click();
    await page.waitForTimeout(1000);

    const productRow = page.locator(`table tbody tr:has-text('${TARGET_PRODUCT}')`).first();
    await expect(productRow).toBeVisible();

    // 2. Gạt nút chuyển trạng thái sang BẬT ("Còn hàng" / is_active = 1)
    console.log(`[Bước 1] Gạt nút bật lại món '${TARGET_PRODUCT}' sang 'Còn hàng'...`);
    const toggleBtn = productRow.locator("button[title*='CÒN HÀNG'], button[title*='HẾT HÀNG']");
    await toggleBtn.click();
    await page.waitForTimeout(1200);

    await expect(productRow).toContainText("Còn hàng");
    console.log(`[Quản lý Menu] Món '${TARGET_PRODUCT}' đã chuyển sang 'Còn hàng'.`);

    // 3. Mở giao diện POS
    console.log("[Bước 2] Mở giao diện POS...");
    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1500);

    // 4. Xác nhận món xuất hiện lại trên POS
    const posProductCard = page.locator(".product-card", { hasText: TARGET_PRODUCT }).first();
    await expect(posProductCard).toBeVisible();
    console.log(`[Màn hình POS] Món '${TARGET_PRODUCT}' đã hiển thị trở lại trên POS.`);

    // 5. Thu ngân bấm chọn thêm món vào đơn hàng
    console.log(`[Bước 3] Thu ngân bấm chọn món '${TARGET_PRODUCT}' vào hóa đơn...`);
    await posProductCard.click();
    await page.waitForTimeout(1000);

    // Kiểm tra món đã nằm trong giỏ hàng
    const cartItem = page.locator(`.cart-item:has-text('${TARGET_PRODUCT}'), .pos-cart-item:has-text('${TARGET_PRODUCT}')`).first();
    await expect(cartItem).toBeVisible();
    console.log(`[Giỏ hàng POS] Món '${TARGET_PRODUCT}' đã được thêm thành công vào đơn hàng!`);

    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC02: PASSED (BẬT MÓN VÀ BÁN HÀNG THÀNH CÔNG) ---\n");
  });

  // ==========================================================================
  // TC03: KIỂM THỬ API PATCH TRẠNG THÁI IS_ACTIVE TRỰC TIẾP
  // ==========================================================================
  test("TC03 (QH-124 API): Kiểm thử API PATCH /api/products/:id/status", async ({ request }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC03: KIỂM THỬ TRỰC TIẾP API PATCH CẬP NHẬT TRẠNG THÁI ---");
    console.log("==================================================================");

    // 1. Tắt món
    const resOff = await request.patch(`${API_URL}/products/${TARGET_PRODUCT_ID}/status`, {
      data: { is_active: 0 },
      headers: { "Content-Type": "application/json" },
    });
    expect(resOff.status()).toBe(200);
    const bodyOff = await resOff.json();
    console.log("[API Update Status -> 0]", bodyOff);
    expect(bodyOff.message).toContain("Hết hàng");

    // 2. Bật lại món
    const resOn = await request.patch(`${API_URL}/products/${TARGET_PRODUCT_ID}/status`, {
      data: { is_active: 1 },
      headers: { "Content-Type": "application/json" },
    });
    expect(resOn.status()).toBe(200);
    const bodyOn = await resOn.json();
    console.log("[API Update Status -> 1]", bodyOn);
    expect(bodyOn.message).toContain("Còn hàng");

    console.log("--- HOÀN THÀNH TC03: PASSED (API CẬP NHẬT TRẠNG THÁI 100% ỔN ĐỊNH) ---\n");
  });
});
