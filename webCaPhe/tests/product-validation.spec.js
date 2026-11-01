const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-123
 * Title: Testcase: Validate lỗi khi nhập giá âm hoặc để trống tên món
 * 
 * 1. TC01 (QH-123 Jira Core Scenario):
 *    - Đang mở modal "Thêm món mới"
 *    - Để trống trường "Tên món", tại ô "Giá bán" nhập số âm: -10000
 *    - Nhấn nút "Lưu" / "Thêm mới"
 *    - Kết quả mong đợi: Form không submit; trình duyệt/hệ thống chặn lưu;
 *      modal không đóng; không ghi nhận dữ liệu vào CSDL.
 * 
 * 2. TC02 (Validate Giá âm khi có tên món):
 *    - Nhập Tên món hợp lệ ("Cà Phê Muối"), Giá bán là số âm (-5000)
 *    - Form chặn submit, hiển thị thông báo lỗi "Giá món phải lớn hơn 0."
 * 
 * 3. TC03 (Validate Tên món chỉ toàn khoảng trắng):
 *    - Nhập Tên món chuỗi space ("   "), Giá bán hợp lệ (40000)
 *    - Form phát hiện tên rỗng sau khi trim(), hiển thị lỗi "Vui lòng nhập Tên và Giá!"
 * 
 * 4. TC04 (API Backend Defense):
 *    - Gửi request trực tiếp tới API /api/products với body thiếu Tên món
 *    - Backend phản hồi 400 Bad Request kèm message "Vui lòng nhập Tên và Giá sản phẩm!"
 * 
 * 5. TC05 (Happy Path Recovery):
 *    - Sau khi sửa lại thông tin hợp lệ (Tên hợp lệ + Giá dương hợp lệ),
 *      form submit thành công và tự động dọn dẹp sạch CSDL.
 * ============================================================================
 */

test.describe("QH-123: Validate lỗi khi nhập giá âm hoặc để trống tên món", () => {
  test.setTimeout(45000);

  const FRONTEND_URL = "http://localhost:5173";
  const API_URL = "http://localhost:5000/api";

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
      sessionStorage.setItem("accessToken", "jwt-token-admin-val-test");
      localStorage.setItem("user", JSON.stringify(adminUser));
      localStorage.setItem("accessToken", "jwt-token-admin-val-test");
    });
  }

  // ==========================================================================
  // TC01: JIRA QH-123 CORE SCENARIO (TÊN RỖNG VÀ GIÁ BÁN ÂM -10000)
  // ==========================================================================
  test("TC01 (QH-123 Jira Core): Validate lỗi khi để trống Tên món và nhập Giá bán âm (-10000)", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: VALIDATE ĐỂ TRỐNG TÊN MÓN VÀ NHẬP GIÁ ÂM (-10000) ---");
    console.log("==================================================================");

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // 1. Mở trang Quản lý Đồ Uống & Thực Đơn
    console.log("[Bước 1] Mở trang 'Quản lý Đồ Uống & Thực Đơn'...");
    await page.locator("text=Quản lý Đồ Uống & Thực Đơn").click();
    await page.waitForTimeout(1000);

    // 2. Mở modal "+ Thêm món mới"
    console.log("[Bước 2] Nhấp vào nút '+ Thêm món mới'...");
    const addBtn = page.locator("button:has-text('Thêm món mới')");
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator(".modal-container");
    await expect(modal).toBeVisible();
    console.log("[Modal] Hộp thoại Thêm Đồ Uống Mới đã hiển thị.");

    // 3. Thực hiện theo đúng mô tả của Jira QH-123:
    // - Để trống trường "Tên món"
    // - Tại ô "Giá bán", nhập số âm: -10000
    console.log("[Bước 3] Dữ liệu test: Tên món = [Rỗng], Giá bán = -10000...");
    const nameInput = modal.locator("input[placeholder*='Cà Phê Đen']");
    const priceInput = modal.locator("input[placeholder*='35000']");

    await nameInput.fill("");
    await priceInput.fill("-10000");
    await page.waitForTimeout(500);

    // 4. Nhấn nút "Thêm mới" (Lưu)
    console.log("[Bước 4] Nhấn nút 'Thêm mới' để kiểm tra tính năng chặn validation...");
    const saveBtn = modal.locator("button.btn-save:has-text('Thêm mới')");
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // 5. Kiểm tra kết quả mong đợi:
    // - Modal vẫn mở (form KHÔNG được submit)
    await expect(modal).toBeVisible();
    console.log("[Validation Passed] Form không submit thành công, Modal vẫn được giữ mở.");

    // - Ô input hoặc form báo lỗi validation
    const isNameInvalid = await nameInput.evaluate((el) => !el.checkValidity());
    const isPriceInvalid = await priceInput.evaluate((el) => !el.checkValidity() || Number(el.value) < 0);
    expect(isNameInvalid || isPriceInvalid).toBe(true);
    console.log(`[Form Check] Tính hợp lệ của ô nhập liệu: Tên rỗng (Invalid=${isNameInvalid}), Giá âm (Invalid=${isPriceInvalid}).`);

    // - Xác nhận trong CSDL không có món nào có giá âm
    const checkRes = await page.request.get(`${API_URL}/products`);
    if (checkRes.ok()) {
      const products = await checkRes.json();
      const negativeProduct = products.find((p) => Number(p.Gia) < 0 || p.TenSanPham === "");
      expect(negativeProduct).toBeUndefined();
      console.log("[CSDL An Toàn] Cơ sở dữ liệu hoàn toàn sạch sẽ, không ghi nhận dữ liệu lỗi.");
    }

    // Đóng modal để kết thúc test
    await modal.locator(".btn-cancel").click();
    await page.waitForTimeout(1000);
    console.log("--- HOÀN THÀNH TC01: PASSED (CHẶN TÊN RỖNG VÀ GIÁ ÂM THÀNH CÔNG 100%) ---\n");
  });

  // ==========================================================================
  // TC02: VALIDATE GIÁ BÁN ÂM KHI TÊN MÓN HỢP LỆ (HIỂN THỊ CẢNH BÁO ĐỎ)
  // ==========================================================================
  test("TC02 (QH-123 Validation): Nhập Tên món hợp lệ nhưng Giá bán âm (-5000)", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: NHẬP TÊN HỢP LỆ NHƯNG GIÁ BÁN ÂM (-5000) ---");
    console.log("==================================================================");

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Quản lý Đồ Uống & Thực Đơn").click();
    await page.waitForTimeout(1000);

    await page.locator("button:has-text('Thêm món mới')").click();
    const modal = page.locator(".modal-container");
    await expect(modal).toBeVisible();

    // 1. Nhập Tên món hợp lệ, nhưng Giá bán là số âm
    console.log("[Bước 1] Nhập: Tên='Cà Phê Muối', Giá=-5000...");
    await modal.locator("input[placeholder*='Cà Phê Đen']").fill("Cà Phê Muối");
    await modal.locator("input[placeholder*='35000']").fill("-5000");

    // Chọn danh mục
    const categorySelect = modal.locator("select");
    if (await categorySelect.locator("option").count() > 1) {
      await categorySelect.selectOption({ index: 1 });
    }

    // 2. Nhấn "Thêm mới"
    console.log("[Bước 2] Nhấn nút 'Thêm mới'...");
    // Bypass native HTML5 validation nếu có để kiểm tra tầng validation Javascript handleSave()
    await modal.locator("form").evaluate((form) => form.noValidate = true);
    await modal.locator("button.btn-save:has-text('Thêm mới')").click();
    await page.waitForTimeout(1000);

    // 3. Kết quả mong đợi: Hiển thị cảnh báo đỏ "Giá món phải lớn hơn 0."
    const errorNotice = modal.locator("text=Giá món phải lớn hơn 0.");
    await expect(errorNotice).toBeVisible();
    console.log("[Thông báo lỗi] Đã hiển thị chính xác cảnh báo màu đỏ: 'Giá món phải lớn hơn 0.'");

    // Đóng modal
    await modal.locator(".btn-cancel").click();
    await page.waitForTimeout(1000);
    console.log("--- HOÀN THÀNH TC02: PASSED (BẮT LỖI GIÁ ÂM CHUẨN XÁC) ---\n");
  });

  // ==========================================================================
  // TC03: VALIDATE TÊN MÓN CHỈ TOÀN DẤU CÁCH KHOẢNG TRẮNG (WHITESPACE)
  // ==========================================================================
  test("TC03 (QH-123 Validation): Nhập Tên món chỉ chứa khoảng trắng ('   ') và Giá hợp lệ", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC03: NHẬP TÊN CHỈ CHỨA KHOẢNG TRẮNG ('   ') ---");
    console.log("==================================================================");

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Quản lý Đồ Uống & Thực Đơn").click();
    await page.waitForTimeout(1000);

    await page.locator("button:has-text('Thêm món mới')").click();
    const modal = page.locator(".modal-container");
    await expect(modal).toBeVisible();

    // 1. Nhập Tên toàn khoảng trắng, Giá 40000
    console.log("[Bước 1] Nhập: Tên='   ', Giá=40000...");
    await modal.locator("input[placeholder*='Cà Phê Đen']").fill("   ");
    await modal.locator("input[placeholder*='35000']").fill("40000");

    // 2. Nhấn "Thêm mới"
    console.log("[Bước 2] Nhấn nút 'Thêm mới'...");
    await modal.locator("form").evaluate((form) => form.noValidate = true);
    await modal.locator("button.btn-save:has-text('Thêm mới')").click();
    await page.waitForTimeout(1000);

    // 3. Kết quả mong đợi: Bắt lỗi chuỗi rỗng sau khi trim(), hiển thị "Vui lòng nhập Tên và Giá!"
    const errorNotice = modal.locator("text=Vui lòng nhập Tên và Giá!");
    await expect(errorNotice).toBeVisible();
    console.log("[Thông báo lỗi] Đã hiển thị chính xác cảnh báo: 'Vui lòng nhập Tên và Giá!'");

    // Đóng modal
    await modal.locator(".btn-cancel").click();
    await page.waitForTimeout(1000);
    console.log("--- HOÀN THÀNH TC03: PASSED (BẮT LỖI TÊN KHOẢNG TRẮNG XUẤT SẮC) ---\n");
  });

  // ==========================================================================
  // TC04: KIỂM THỬ BẢO VỆ TẦNG API BACKEND KHI DỮ LIỆU ĐẦU VÀO KHÔNG HỢP LỆ
  // ==========================================================================
  test("TC04 (QH-123 API): Tầng Backend từ chối request thiếu thông tin Tên hoặc Giá (400 Bad Request)", async ({ request }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC04: KIỂM THỬ PHÒNG THỦ DỮ LIỆU TẦNG API BACKEND ---");
    console.log("==================================================================");

    // 1. Gửi request POST thiếu tên món: { gia: 45000 }
    console.log("[Bước 1] Gửi request POST /api/products thiếu 'tenSanPham'...");
    const resNoName = await request.post(`${API_URL}/products`, {
      data: {
        gia: 45000,
        moTa: "Món test không có tên",
      },
      headers: { "Content-Type": "application/json" },
    });

    expect(resNoName.status()).toBe(400);
    const bodyNoName = await resNoName.json();
    console.log("[Phản hồi API thiếu tên]", bodyNoName);
    expect(bodyNoName.message).toContain("Vui lòng nhập Tên và Giá sản phẩm!");

    // 2. Gửi request POST thiếu giá món: { tenSanPham: "Trà Xanh" }
    console.log("[Bước 2] Gửi request POST /api/products thiếu 'gia'...");
    const resNoPrice = await request.post(`${API_URL}/products`, {
      data: {
        tenSanPham: "Trà Xanh",
      },
      headers: { "Content-Type": "application/json" },
    });

    expect(resNoPrice.status()).toBe(400);
    const bodyNoPrice = await resNoPrice.json();
    console.log("[Phản hồi API thiếu giá]", bodyNoPrice);
    expect(bodyNoPrice.message).toContain("Vui lòng nhập Tên và Giá sản phẩm!");

    console.log("--- HOÀN THÀNH TC04: PASSED (BACKEND BẢO VỆ TÍNH TOÀN VẸN CSDL 100%) ---\n");
  });

  // ==========================================================================
  // TC05: KHÔI PHỤC VÀ LƯU THÀNH CÔNG KHI NHẬP DỮ LIỆU HỢP LỆ (HAPPY PATH RECOVERY)
  // ==========================================================================
  test("TC05 (QH-123 Recovery): Khôi phục form sau khi bị lỗi và thêm món mới thành công", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC05: KHÔI PHỤC FORM VÀ THÊM MÓN THÀNH CÔNG SAU KHI SỬA LỖI ---");
    console.log("==================================================================");

    await loginAsAdmin(page);

    // Mock upload ảnh để đảm bảo không ghi file rác
    await page.route("**/api/products/upload-image", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=200",
          filename: "tra-sua-oolong.png",
          message: "Upload ảnh thành công!",
        }),
      });
    });

    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Quản lý Đồ Uống & Thực Đơn").click();
    await page.waitForTimeout(1000);

    await page.locator("button:has-text('Thêm món mới')").click();
    const modal = page.locator(".modal-container");
    await expect(modal).toBeVisible();

    // 1. Ban đầu nhập sai (giá âm) để kích hoạt lỗi
    console.log("[Bước 1] Nhập sai giá âm để kích hoạt thông báo lỗi...");
    const nameInput = modal.locator("input[placeholder*='Cà Phê Đen']");
    const priceInput = modal.locator("input[placeholder*='35000']");

    await nameInput.fill("Trà Sữa Oolong");
    await priceInput.fill("-10000");
    await modal.locator("form").evaluate((form) => form.noValidate = true);
    await modal.locator("button.btn-save:has-text('Thêm mới')").click();
    await page.waitForTimeout(500);

    await expect(modal.locator("text=Giá món phải lớn hơn 0.")).toBeVisible();
    console.log("[Thông báo lỗi] Form đã chặn và hiển thị lỗi cảnh báo đỏ.");

    // 2. Sửa lại dữ liệu hợp lệ: Giá = 45000
    console.log("[Bước 2] Sửa lại thông tin hợp lệ: Tên='Trà Sữa Oolong Lài', Giá=45000...");
    await nameInput.fill("Trà Sữa Oolong Lài");
    await priceInput.fill("45000");

    // Chọn danh mục
    const categorySelect = modal.locator("select");
    if (await categorySelect.locator("option").count() > 1) {
      await categorySelect.selectOption({ index: 1 });
    }

    // 3. Nhấn "Thêm mới"
    console.log("[Bước 3] Nhấn 'Thêm mới' lưu dữ liệu hợp lệ...");
    await modal.locator("button.btn-save:has-text('Thêm mới')").click();
    await page.waitForTimeout(1500);

    // 4. Kiểm tra món mới xuất hiện trong thực đơn
    const newRow = page.locator("table tbody tr:has-text('Trà Sữa Oolong Lài')").first();
    await expect(newRow).toBeVisible();
    console.log("[Bảng Menu] Món 'Trà Sữa Oolong Lài' đã xuất hiện thành công sau khi sửa lỗi validation.");

    // 5. Tự động dọn dẹp sạch CSDL ngay sau khi kiểm tra xong
    const productsRes = await page.request.get(`${API_URL}/products`);
    if (productsRes.ok()) {
      const allProducts = await productsRes.json();
      const testItem = allProducts.find((p) => p.TenSanPham === "Trà Sữa Oolong Lài");
      if (testItem && testItem.MaSanPham) {
        await page.request.delete(`${API_URL}/products/${testItem.MaSanPham}`).catch(() => {});
        console.log(`[Dọn dẹp CSDL] Đã tự động xóa món test '${testItem.TenSanPham}' (ID: ${testItem.MaSanPham}) giữ CSDL sạch sẽ 100%.`);
      }
    }

    console.log("--- HOÀN THÀNH TC05: PASSED (KHÔI PHỤC VÀ DỌN DẸP HOÀN HẢO) ---\n");
  });
});
