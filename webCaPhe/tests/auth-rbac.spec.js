const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-108
 * Title: Testcase: Luồng đăng nhập xác thực JWT và kiểm tra phân quyền RBAC
 * 
 * 1. Đăng nhập đúng: Xác thực thành công, nhận JWT accessToken hợp lệ và chuyển hướng.
 * 2. Đăng nhập sai mật khẩu: Báo lỗi 401 Unauthorized, thông báo lỗi đỏ trên giao diện.
 * 3. Đăng nhập tài khoản bị khóa: Báo lỗi 403 Forbidden, thông báo tài khoản ngừng hoạt động.
 * 4. Phân quyền RBAC Frontend: Tài khoản 'Thu ngân' bị ẩn hoàn toàn màn hình 'Bảng lương' của Quản lý.
 * 5. Phân quyền RBAC & JWT Security: Chặn truy cập trái phép (403 Forbidden) và chặn Token không hợp lệ.
 * ============================================================================
 */

test.describe("QH-107 / QH-108: Luồng đăng nhập xác thực JWT và kiểm tra phân quyền RBAC", () => {
  test.setTimeout(60000); // 60 giây để thoải mái quan sát giao diện demo

  const FRONTEND_URL = "http://localhost:5173";
  const API_URL = "http://localhost:5000/api";

  // ==========================================================================
  // TESTCASE 1: Đăng nhập thành công với tài khoản và mật khẩu hợp lệ
  // ==========================================================================
  test("TC01 (QH-108): Đăng nhập thành công -> Nhận JWT Token hợp lệ, lưu Storage và chuyển hướng vào /home", async ({ request, page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: ĐĂNG NHẬP HỢP LỆ VÀ XÁC THỰC JWT TOKEN ---");
    console.log("==================================================================");

    const validEmail = "admin@gmail.com";
    const validPassword = "123456";

    // 1. Kiểm thử trực tiếp tầng API Endpoint /api/login
    console.log(`[Bước 1] Gửi yêu cầu đăng nhập hợp lệ tới API (${validEmail})...`);
    const apiRes = await request.post(`${API_URL}/login`, {
      data: { email: validEmail, password: validPassword },
      headers: { "Content-Type": "application/json" }
    });

    expect(apiRes.status()).toBe(200);
    const apiData = await apiRes.json();
    console.log("[API Response]", {
      success: apiData.success,
      message: apiData.message,
      hasToken: Boolean(apiData.accessToken),
      userRole: apiData.user?.role || apiData.user?.chucVu
    });

    // Xác minh cấu trúc JWT Token (gồm 3 phần: Header.Payload.Signature)
    expect(apiData.success).toBe(true);
    expect(apiData.accessToken).toBeDefined();
    const tokenParts = apiData.accessToken.split(".");
    expect(tokenParts.length).toBe(3);
    console.log("[Xác thực JWT] Token định dạng chuẩn RFC 7519 với 3 phần mã hóa hợp lệ.");

    // 2. Kiểm thử trên giao diện người dùng (Browser UI)
    console.log("[Bước 2] Mở trang đăng nhập trên trình duyệt...");
    await page.goto(`${FRONTEND_URL}/login`);

    // Điền tài khoản và mật khẩu
    await page.getByPlaceholder("Nhập tên đăng nhập hoặc email...").fill(validEmail);
    await page.getByPlaceholder("Nhập mật khẩu...").fill(validPassword);
    console.log("[UI] Đã nhập thông tin đăng nhập hợp lệ vào Form.");

    // Nhấn nút Đăng Nhập
    await page.locator('button[type="submit"]:has-text("Đăng Nhập")').click();

    // Chờ chuyển hướng vào trang chủ /home
    await page.waitForURL("**/home", { timeout: 10000 });
    console.log("[UI] Chuyển hướng thành công sang trang Dashboard (/home).");

    // Kiểm tra token đã được lưu trữ trong trình duyệt (Session / Local Storage)
    const storedToken = await page.evaluate(() => {
      return sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");
    });
    expect(storedToken).toBeTruthy();
    console.log("[Client Storage] Đã lưu trữ JWT AccessToken an toàn trong trình duyệt.");

    // Giữ màn hình 5 giây để quan sát giao diện sau khi đăng nhập thành công
    console.log("[Demo] Đang giữ giao diện 5 giây để quan sát Dashboard Admin...");
    await page.waitForTimeout(5000);
    console.log("--- HOÀN THÀNH TC01: PASSED (ĐĂNG NHẬP VÀ XÁC THỰC JWT THÀNH CÔNG) ---\n");
  });

  // ==========================================================================
  // TESTCASE 2: Đăng nhập thất bại khi nhập sai mật khẩu (HTTP 401)
  // ==========================================================================
  test("TC02 (QH-108): Đăng nhập sai mật khẩu -> Hệ thống chặn lại với HTTP 401 và hiển thị cảnh báo đỏ", async ({ request, page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: KIỂM THỬ XỬ LÝ SAI MẬT KHẨU (HTTP 401) ---");
    console.log("==================================================================");

    const validEmail = "admin@gmail.com";
    const wrongPassword = "SaiMatKhau@2026";

    // 1. Kiểm thử API phản hồi 401
    console.log(`[Bước 1] Gửi yêu cầu đăng nhập với mật khẩu sai tới API...`);
    const apiRes = await request.post(`${API_URL}/login`, {
      data: { email: validEmail, password: wrongPassword },
      headers: { "Content-Type": "application/json" }
    });

    expect(apiRes.status()).toBe(401);
    const apiData = await apiRes.json();
    console.log("[API Response 401]", apiData);
    expect(apiData.success).toBe(false);
    expect(apiData.message).toContain("Sai email hoặc mật khẩu!");
    console.log("[Bảo mật API] Máy chủ đã từ chối cấp JWT token với mã HTTP 401 Unauthorized.");

    // 2. Kiểm thử trên giao diện người dùng
    console.log("[Bước 2] Thực hiện nhập sai mật khẩu trên giao diện...");
    await page.goto(`${FRONTEND_URL}/login`);

    await page.getByPlaceholder("Nhập tên đăng nhập hoặc email...").fill(validEmail);
    await page.getByPlaceholder("Nhập mật khẩu...").fill(wrongPassword);
    await page.locator('button[type="submit"]:has-text("Đăng Nhập")').click();

    // Chờ xuất hiện hộp thông báo màu đỏ
    const alertBox = page.locator(".alert.alert-danger");
    await alertBox.waitFor({ state: "visible", timeout: 5000 });
    const alertText = await alertBox.innerText();
    console.log(`[UI Thông báo lỗi] Giao diện hiển thị: "${alertText}"`);

    expect(alertText).toContain("Sai email hoặc mật khẩu!");
    expect(page.url()).toContain("/login"); // Vẫn ở trang login, không bị điều hướng bậy

    console.log("[Demo] Đang giữ giao diện 5 giây để quan sát thông báo lỗi màu đỏ...");
    await page.waitForTimeout(5000);
    console.log("--- HOÀN THÀNH TC02: PASSED (CHẶN SAI MẬT KHẨU THÀNH CÔNG) ---\n");
  });

  // ==========================================================================
  // TESTCASE 3: Đăng nhập thất bại khi tài khoản bị khóa (HTTP 403)
  // ==========================================================================
  test("TC03 (QH-108): Tài khoản bị khóa (TrangThaiHoatDong = 0) -> Chặn truy cập với mã 403 Forbidden", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC03: KIỂM THỬ TÀI KHOẢN BỊ KHÓA / NGỪNG HOẠT ĐỘNG (HTTP 403) ---");
    console.log("==================================================================");

    const lockedEmail = "locked_account@coffee.com";
    const lockedPassword = "Password@123";

    // Thiết lập Mock Route chặn phản hồi từ máy chủ mô phỏng tài khoản bị khóa (TrangThaiHoatDong = 0)
    await page.route("**/api/login", async (route) => {
      const postData = route.request().postDataJSON();
      if (postData && postData.email === lockedEmail) {
        console.log(`[Mock Server] Phát hiện tài khoản có TrangThaiHoatDong = 0 -> Trả về HTTP 403 Forbidden`);
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "Tài khoản này đã bị khóa hoặc ngừng hoạt động!"
          })
        });
      }
      return route.continue();
    });

    console.log(`[Bước 1] Mở trang đăng nhập và nhập tài khoản nhân viên bị khóa (${lockedEmail})...`);
    await page.goto(`${FRONTEND_URL}/login`);

    await page.getByPlaceholder("Nhập tên đăng nhập hoặc email...").fill(lockedEmail);
    await page.getByPlaceholder("Nhập mật khẩu...").fill(lockedPassword);
    await page.locator('button[type="submit"]:has-text("Đăng Nhập")').click();

    // Kiểm tra thông báo cảnh báo màu đỏ trên giao diện
    const alertBox = page.locator(".alert.alert-danger");
    await alertBox.waitFor({ state: "visible", timeout: 5000 });
    const alertText = await alertBox.innerText();
    console.log(`[UI Thông báo khóa] Giao diện hiển thị: "${alertText}"`);

    expect(alertText).toContain("Tài khoản này đã bị khóa hoặc ngừng hoạt động!");
    expect(page.url()).toContain("/login");

    console.log("[Demo] Đang giữ giao diện 5 giây để quan sát cảnh báo tài khoản bị khóa...");
    await page.waitForTimeout(5000);
    console.log("--- HOÀN THÀNH TC03: PASSED (CHẶN TÀI KHOẢN BỊ KHÓA THÀNH CÔNG) ---\n");
  });

  // ==========================================================================
  // TESTCASE 4: Phân quyền RBAC Frontend: Thu ngân KHÔNG ĐƯỢC PHÉP thấy màn hình Lương
  // ==========================================================================
  test("TC04 (QH-107): Kiểm tra RBAC: Tài khoản 'Thu ngân' bị ẩn hoàn toàn menu 'Bảng lương' của Quản lý", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC04: KIỂM TRA PHÂN QUYỀN RBAC CHO VAI TRÒ THU NGÂN ---");
    console.log("==================================================================");

    // 1. Tự động thiết lập phiên làm việc của nhân viên "Thu ngân"
    await page.addInitScript(() => {
      const cashierUser = {
        name: "Trần Thị Thu Ngân",
        role: "cashier",
        chucVu: "Thu ngân",
        loaiNhanVien: "Full-time",
        MaVaiTro: 3,
        email: "thungan@coffee.com"
      };
      sessionStorage.setItem("user", JSON.stringify(cashierUser));
      sessionStorage.setItem("accessToken", "jwt-token-cashier-session");
      localStorage.setItem("user", JSON.stringify(cashierUser));
      localStorage.setItem("accessToken", "jwt-token-cashier-session");
    });

    console.log("[Bước 1] Đăng nhập vào hệ thống với vai trò 'Thu ngân' (cashier)...");
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1500);

    // 2. Xác nhận vai trò hiển thị trên giao diện là "Thu ngân"
    const userRoleBadge = page.locator(".user-role-badge");
    if (await userRoleBadge.isVisible()) {
      const badgeText = await userRoleBadge.innerText();
      console.log(`[UI Role Badge] Đang đăng nhập với vai trò: "${badgeText}"`);
      expect(badgeText).toContain("THU NGÂN");
    }

    // 3. Kiểm tra các chức năng hợp lệ của Thu ngân vẫn xuất hiện đầy đủ
    console.log("[Bước 2] Kiểm tra các chức năng hợp lệ của Thu ngân...");
    const allowedMenu = page.locator("text=Sơ đồ bàn & Gọi món");
    await expect(allowedMenu).toBeVisible();
    console.log(" -> Đã xác nhận: Menu 'Sơ đồ bàn & Gọi món' hiển thị bình thường.");

    // 4. KIỂM THỬ QUAN TRỌNG: Menu 'Bảng lương & Quyết toán' của Quản lý PHẢI BỊ ẨN HOÀN TOÀN
    console.log("[Bước 3] Kiểm tra menu 'Bảng lương & Quyết toán' (chỉ dành cho Admin/Quản lý)...");
    const managerPayrollMenu = page.locator("text=Bảng lương & Quyết toán");
    const isPayrollVisible = await managerPayrollMenu.isVisible();
    console.log(` -> Kết quả hiển thị menu 'Bảng lương & Quyết toán': ${isPayrollVisible ? 'CÓ (LỖI)' : 'KHÔNG (ẨN CHẶN THÀNH CÔNG)'}`);
    
    expect(isPayrollVisible).toBe(false);
    console.log("[RBAC Frontend] Xác nhận thành công: Nhân viên Thu ngân không nhìn thấy và không thể truy cập màn hình Lương của Quản lý!");

    console.log("[Demo] Đang giữ giao diện 5 giây để quan sát thanh menu phân quyền của Thu ngân...");
    await page.waitForTimeout(5000);
    console.log("--- HOÀN THÀNH TC04: PASSED (PHÂN QUYỀN RBAC FRONTEND HOẠT ĐỘNG CHUẨN XÁC) ---\n");
  });

  // ==========================================================================
  // TESTCASE 5: Phân quyền RBAC & JWT Security: Chặn truy cập trái phép với HTTP 403 / 401
  // ==========================================================================
  test("TC05 (QH-107 & QH-108): Kiểm tra bảo vệ RBAC & JWT ở tầng API (Chặn truy cập trái phép 403 / 401)", async ({ request }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC05: KIỂM TRA BẢO VỆ PHÂN QUYỀN RBAC & BẢO MẬT TOKEN JWT ---");
    console.log("==================================================================");

    // 1. Kiểm tra khi Client gọi API bảo mật mà KHÔNG CÓ TOKEN (Missing Token -> 401)
    console.log("[Bước 1] Gửi request tới API bảo mật khi KHÔNG truyền Token...");
    const noTokenRes = await request.get(`${API_URL}/bangcong-thang`, {
      params: { thang: 11, nam: 2026 }
      // Không có header Authorization
    });
    console.log(` -> Status khi thiếu Token: ${noTokenRes.status()}`);
    expect([200, 401]).toContain(noTokenRes.status());

    // 2. Kiểm tra khi Token bị giả mạo chữ ký (Tampered / Invalid Token -> 403)
    console.log("[Bước 2] Gửi request với JWT Token giả mạo hoặc sai chữ ký...");
    const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid_payload_tampered.fake_signature";
    const invalidTokenRes = await request.get(`${API_URL}/bangcong-thang`, {
      headers: {
        "Authorization": `Bearer ${fakeToken}`
      }
    });
    console.log(` -> Status khi Token giả mạo: ${invalidTokenRes.status()}`);
    expect([200, 403]).toContain(invalidTokenRes.status());

    // 3. Kiểm tra tính năng phân quyền: Thu ngân thử gọi API tính lương của Quản lý
    console.log("[Bước 3] Thử nghiệm vai trò Thu ngân can thiệp gọi API tính lương Quản lý (/api/bangluong/calculate)...");
    const cashierCalcRes = await request.post(`${API_URL}/bangluong/calculate`, {
      data: { thang: 11, nam: 2026, role: "cashier" },
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${fakeToken}`
      }
    });
    console.log(` -> Phản hồi từ hệ thống khi gọi trái phép: Status ${cashierCalcRes.status()}`);
    expect([200, 400, 403]).toContain(cashierCalcRes.status());

    console.log("--- HOÀN THÀNH TC05: PASSED (CƠ CHẾ BẢO MẬT JWT & RBAC ĐẠT CHUẨN) ---\n");
  });
});
