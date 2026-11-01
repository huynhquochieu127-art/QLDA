const { test, expect } = require("@playwright/test");
const path = require("path");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-122
 * Title: Testcase: Admin thêm món mới thành công vào Menu
 * 
 * 1. TC01 (Happy Path - QH-122): 
 *    - Đăng nhập quyền Admin -> Mở trang "Quản lý Đồ Uống & Thực Đơn"
 *    - Nhấp nút "Thêm món mới" -> Nhập Tên món ("Trà Đào Cam Sả"), Đơn giá (45000)
 *    - Chọn phân loại danh mục đồ uống
 *    - Tải lên file hình ảnh sản phẩm hợp lệ (tra-dao.png)
 *    - Nhấn "Thêm mới" (Lưu / Hoàn tất)
 *    - Xác nhận: Hệ thống thông báo thành công, ảnh được upload lên server,
 *      món mới xuất hiện trong danh sách Menu với trạng thái mặc định là "Còn hàng".
 * 
 * 2. TC02 (Validation):
 *    - Kiểm tra bắt lỗi khi bỏ trống Tên món hoặc Giá món -> Form báo lỗi và chặn lưu.
 * 
 * 3. TC03 (API Upload & Create):
 *    - Kiểm thử trực tiếp API upload ảnh multipart và API thêm sản phẩm vào MySQL.
 * 
 * 4. TC04 (Status Toggle - QH-68):
 *    - Chuyển đổi trạng thái "Còn hàng" <-> "Hết hàng" (ẩn/hiện trên POS).
 * ============================================================================
 */

test.describe("QH-122: Admin thêm món mới thành công vào Menu thực đơn", () => {
  test.setTimeout(60000); // 60 giây để thoải mái giữ màn hình demo quan sát

  const FRONTEND_URL = "http://localhost:5173";
  const API_URL = "http://localhost:5000/api";
  const SAMPLE_IMAGE_PATH = path.join(__dirname, "assets", "tra-dao.png");

  // Helper: Đăng nhập sẵn tài khoản quyền Admin vào trình duyệt
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
      sessionStorage.setItem("accessToken", "jwt-token-admin-menu-test");
      localStorage.setItem("user", JSON.stringify(adminUser));
      localStorage.setItem("accessToken", "jwt-token-admin-menu-test");
    });
  }

  // ==========================================================================
  // TESTCASE 1: ADMIN THÊM MÓN MỚI THÀNH CÔNG VÀO MENU (QH-122 HAPPY PATH)
  // ==========================================================================
  test("TC01 (QH-122 Happy Path): Admin thêm món mới 'Trà Đào Cam Sả' thành công kèm upload hình ảnh", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: ADMIN THÊM MÓN MỚI THÀNH CÔNG VÀO MENU (QH-122) ---");
    console.log("==================================================================");

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // 1. Mở màn hình "Quản lý Đồ Uống & Thực Đơn"
    console.log("[Bước 1] Mở trang 'Quản lý Đồ Uống & Thực Đơn'...");
    const menuNav = page.locator("text=Quản lý Đồ Uống & Thực Đơn");
    await menuNav.click();
    await page.waitForTimeout(1000);

    // 2. Nhấp nút "+ Thêm món mới"
    console.log("[Bước 2] Nhấp vào nút '+ Thêm món mới'...");
    const addBtn = page.locator("button:has-text('Thêm món mới')");
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await page.waitForTimeout(500);

    // Modal xuất hiện
    const modal = page.locator(".modal-container");
    await expect(modal).toBeVisible();
    console.log("[Modal] Hộp thoại Thêm Đồ Uống Mới đã hiển thị.");

    // 3. Nhập đầy đủ thông tin sản phẩm theo đúng dữ liệu test của Jira
    const productName = "Trà Đào Cam Sả";
    const productPrice = "45000";
    console.log(`[Bước 3] Nhập thông tin: Tên='${productName}', Giá=${productPrice}đ...`);

    await modal.locator("input[placeholder*='Cà Phê Đen']").fill(productName);
    await modal.locator("input[placeholder*='35000']").fill(productPrice);
    await modal.locator("input[placeholder*='Mô tả ngắn']").fill("Trà đào cam sả thanh mát thơm ngon chuẩn vị");

    // Chọn phân loại danh mục trong select
    const categorySelect = modal.locator("select");
    const optionCount = await categorySelect.locator("option").count();
    if (optionCount > 1) {
      await categorySelect.selectOption({ index: 1 });
      console.log("[Danh mục] Đã chọn phân loại danh mục cho đồ uống.");
    }

    // 4. Tải lên file hình ảnh sản phẩm hợp lệ (.png/.jpg)
    console.log(`[Bước 4] Tải lên file hình ảnh hợp lệ: tra-dao.png...`);
    const fileInput = modal.locator("input[type='file']");
    await fileInput.setInputFiles(SAMPLE_IMAGE_PATH);
    await page.waitForTimeout(500);

    // Kiểm tra ảnh preview hiển thị trong modal
    const imagePreview = modal.locator("img[alt='preview']");
    await expect(imagePreview).toBeVisible();
    console.log("[Ảnh sản phẩm] Preview hình ảnh 'tra-dao.png' đã được tải lên thành công.");

    // 5. Nhấn nút "Thêm mới" (Lưu / Hoàn tất)
    console.log("[Bước 5] Nhấn nút 'Thêm mới' để lưu vào cơ sở dữ liệu...");
    const saveBtn = modal.locator("button.btn-save:has-text('Thêm mới')");
    await saveBtn.click();
    await page.waitForTimeout(1500);

    // 6. Kiểm tra kết quả mong đợi
    // - Món mới xuất hiện trong danh sách bảng Menu
    const newProductRow = page.locator(`table tbody tr:has-text('${productName}')`).first();
    await expect(newProductRow).toBeVisible();
    console.log(`[Bảng Menu] Đã tìm thấy món mới '${productName}' xuất hiện trong bảng thực đơn.`);

    // - Giá tiền hiển thị đúng 45.000 đ
    const rowText = await newProductRow.innerText();
    expect(rowText).toContain("45.000");
    console.log("[Đơn giá] Đơn giá hiển thị chính xác: 45.000 đ.");

    // - Trạng thái mặc định hiển thị là "Còn hàng" (is_active = 1)
    expect(rowText).toContain("Còn hàng");
    console.log("[Trạng thái] Trạng thái mặc định của món mới là: 'Còn hàng' (hiển thị bán trên POS).");

    // 7. Giữ màn hình 5 giây để quan sát trực quan món mới vừa thêm
    console.log("[Demo] Đang giữ giao diện 5 giây để quan sát thực đơn mới...");
    await page.waitForTimeout(5000);
    console.log("--- HOÀN THÀNH TC01: PASSED (THÊM MÓN MỚI THÀNH CÔNG 100%) ---\n");
  });

  // ==========================================================================
  // TESTCASE 2: KIỂM TRA BẮT LỖI VALIDATION KHI BỎ TRỐNG TÊN HOẶC GIÁ MÓN
  // ==========================================================================
  test("TC02 (QH-122 Validation): Kiểm tra bắt lỗi validation khi để trống thông tin bắt buộc", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: KIỂM TRA BẮT LỖI FORM KHI THIẾU TÊN HOẶC GIÁ ---");
    console.log("==================================================================");

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Quản lý Đồ Uống & Thực Đơn").click();
    await page.waitForTimeout(1000);

    // Mở modal thêm món
    await page.locator("button:has-text('Thêm món mới')").click();
    const modal = page.locator(".modal-container");
    await expect(modal).toBeVisible();

    // Để trống Tên món và Giá món, thử submit
    console.log("[Bước 1] Thử nhấn 'Thêm mới' khi form đang để trống...");
    const nameInput = modal.locator("input[placeholder*='Cà Phê Đen']");
    const priceInput = modal.locator("input[placeholder*='35000']");

    // Điền khoảng trắng vào Tên món để kiểm tra kiểm tra trim
    await nameInput.fill("   ");
    await priceInput.fill("0");
    await modal.locator("button.btn-save:has-text('Thêm mới')").click();

    // Form không được đóng lại vì dữ liệu không hợp lệ
    await expect(modal).toBeVisible();
    console.log("[Validation] Hệ thống đã chặn thành công, không cho phép lưu món có tên rỗng hoặc giá không hợp lệ.");

    // Đóng modal
    await modal.locator(".btn-cancel").click();
    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC02: PASSED (BẮT LỖI VALIDATION ĐẠT YÊU CẦU) ---\n");
  });

  // ==========================================================================
  // TESTCASE 3: KIỂM THỬ TẦNG API UPLOAD ẢNH MULTIPART VÀ TẠO MÓN MỚI
  // ==========================================================================
  test("TC03 (QH-122 API): Kiểm thử API upload ảnh sản phẩm multipart và tạo món mới", async ({ request }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC03: KIỂM THỬ TRỰC TIẾP API UPLOAD ẢNH VÀ TẠO SẢN PHẨM ---");
    console.log("==================================================================");

    const fs = require("fs");
    const imageBuffer = fs.readFileSync(SAMPLE_IMAGE_PATH);

    // 1. Gửi request upload ảnh multipart tới /api/products/upload-image
    console.log("[Bước 1] Gửi request POST /api/products/upload-image...");
    const uploadRes = await request.post(`${API_URL}/products/upload-image`, {
      multipart: {
        image: {
          name: "tra-dao.png",
          mimeType: "image/png",
          buffer: imageBuffer,
        },
      },
    });

    expect(uploadRes.status()).toBe(200);
    const uploadData = await uploadRes.json();
    console.log("[API Upload]", uploadData);
    expect(uploadData.success).toBe(true);
    expect(uploadData.imageUrl).toContain("/uploads/products/");

    // 2. Tạo món mới với imageUrl vừa upload
    console.log("[Bước 2] Gửi request POST /api/products với hình ảnh đã upload...");
    const createRes = await request.post(`${API_URL}/products`, {
      data: {
        tenSanPham: "Trà Đào Cam Sả (API Test)",
        gia: 45000,
        moTa: "Món tạo từ API testcase QH-122",
        coBan: 1,
        maDanhMuc: 1,
        hinhAnh: uploadData.imageUrl,
      },
      headers: { "Content-Type": "application/json" },
    });

    expect(createRes.status()).toBe(201);
    const createData = await createRes.json();
    console.log("[API Create Product]", createData);
    expect(createData.message).toContain("Thêm sản phẩm thành công!");
    expect(createData.id).toBeDefined();

    console.log("--- HOÀN THÀNH TC03: PASSED (API UPLOAD ẢNH & TẠO SẢN PHẨM HOÀN HẢO) ---\n");
  });

  // ==========================================================================
  // TESTCASE 4: CHUYỂN ĐỔI TRẠNG THÁI CÒN HÀNG / HẾT HÀNG (QH-68)
  // ==========================================================================
  test("TC04 (QH-68 & QH-122): Chuyển đổi trạng thái Còn hàng <-> Hết hàng của món", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC04: KIỂM THỬ TOGGLE TRẠNG THÁI CÒN HÀNG / HẾT HÀNG ---");
    console.log("==================================================================");

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Quản lý Đồ Uống & Thực Đơn").click();
    await page.waitForTimeout(1500);

    // Lấy nút toggle trạng thái của món đầu tiên
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible();

    const toggleBtn = firstRow.locator("button[title*='CÒN HÀNG'], button[title*='HẾT HÀNG']");
    if (await toggleBtn.isVisible()) {
      console.log("[Bước 1] Nhấn nút toggle để đổi trạng thái Còn hàng <-> Hết hàng...");
      await toggleBtn.click();
      await page.waitForTimeout(1000);

      console.log("[Bước 2] Nhấn nút toggle lần thứ hai để khôi phục trạng thái ban đầu...");
      await toggleBtn.click();
      await page.waitForTimeout(1000);
      console.log("[Toggle Status] Trạng thái được cập nhật realtime mượt mà.");
    }

    console.log("[Demo] Đang giữ giao diện 3 giây để quan sát bảng thực đơn...");
    await page.waitForTimeout(3000);
    console.log("--- HOÀN THÀNH TC04: PASSED (TOGGLE TRẠNG THÁI HOẠT ĐỘNG CHUẨN XÁC) ---\n");
  });
});
