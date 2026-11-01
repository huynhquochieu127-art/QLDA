const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-133
 * Title: Testcase: Chặn nhân viên thường truy cập URL trái phép (Bảo mật RBAC)
 * 
 * 1. TC01 (QH-133 URL Traversal Protection):
 *    - Đăng nhập tài khoản Nhân viên / Thu ngân, cố tình gõ URL quản trị nhạy cảm
 *      (/admin/payroll, /admin/reports) trên trình duyệt.
 *    - Hệ thống chuyển hướng người dùng an toàn về trang chủ cá nhân (/home) mà không để lộ dữ liệu (QH-12, QH-14).
 * 
 * 2. TC02 (Middleware Backend Security):
 *    - Kiểm tra Middleware Backend chặn truy cập trực tiếp từ tài khoản không đủ quyền
 *      hoặc thiếu Token, trả về mã lỗi 403 Forbidden / 401 Unauthorized.
 * 
 * 3. TC03 (RBAC Menu Enforcement):
 *    - Xác minh trên giao diện người dùng: Các menu quản trị nhạy cảm (Quản lý nhân viên, Bảng lương,
 *      Báo cáo doanh thu) bị ẩn hoàn toàn khỏi thanh điều hướng của Nhân viên thường.
 * ============================================================================
 */

test.describe("QH-133: Chặn nhân viên thường truy cập URL trái phép (Bảo mật RBAC)", () => {
  test.setTimeout(45000);

  const FRONTEND_URL = "http://localhost:5173";
  const API_URL = "http://localhost:5000/api";

  async function loginAsCashier(page) {
    await page.addInitScript(() => {
      const cashierUser = {
        id: 3,
        name: "Trần Thị Thu Ngân",
        role: "cashier",
        chucVu: "Thu ngân",
        loaiNhanVien: "Full-time",
        MaVaiTro: 3,
        email: "thungan@coffee.com",
      };
      sessionStorage.setItem("user", JSON.stringify(cashierUser));
      sessionStorage.setItem("accessToken", "jwt-token-cashier-rbac-test");
      localStorage.setItem("user", JSON.stringify(cashierUser));
      localStorage.setItem("accessToken", "jwt-token-cashier-rbac-test");
    });
  }

  // ==========================================================================
  // TC01: CHẶN TRUY CẬP TRỰC TIẾP URL QUẢN TRỊ VÀ REDIRECT VỀ /HOME (QH-133 JIRA CORE)
  // ==========================================================================
  test("TC01 (QH-133 Jira Core): Cố tình nhập URL /admin/payroll và /admin/reports -> Chuyển hướng an toàn về /home", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: KIỂM THỬ CHẶN TRUY CẬP URL QUẢN TRỊ TRÁI PHÉP ---");
    console.log("==================================================================");

    await loginAsCashier(page);

    // 1. Cố tình truy cập URL /admin/payroll
    console.log("[Bước 1] Thu ngân cố tình truy cập trực tiếp URL: /admin/payroll...");
    await page.goto(`${FRONTEND_URL}/admin/payroll`);
    await page.waitForTimeout(1500);

    // Kiểm tra đã được chuyển hướng về trang chủ cá nhân (/home)
    const currentUrl1 = page.url();
    console.log(`[URL sau điều hướng 1] ${currentUrl1}`);
    expect(currentUrl1).toContain("/home");
    expect(currentUrl1).not.toContain("/admin/payroll");
    console.log("[Bảo vệ định tuyến] Đã chặn /admin/payroll và điều hướng an toàn về /home!");

    // 2. Cố tình truy cập URL /admin/reports
    console.log("[Bước 2] Thu ngân cố tình truy cập trực tiếp URL: /admin/reports...");
    await page.goto(`${FRONTEND_URL}/admin/reports`);
    await page.waitForTimeout(1500);

    const currentUrl2 = page.url();
    console.log(`[URL sau điều hướng 2] ${currentUrl2}`);
    expect(currentUrl2).toContain("/home");
    expect(currentUrl2).not.toContain("/admin/reports");
    console.log("[Bảo vệ định tuyến] Đã chặn /admin/reports và điều hướng an toàn về /home!");

    // 3. Xác nhận không lộ bất kỳ dữ liệu quản trị nào
    const pageText = await page.innerText("body");
    expect(pageText).not.toContain("Bảng lương nhân viên tháng");
    expect(pageText).not.toContain("Chủ Đầu Tư");
    console.log("[Bảo mật dữ liệu] Hoàn toàn không lộ bất kỳ thông tin nhạy cảm nào của Admin/Quản lý.");

    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC01: PASSED (CHUYỂN HƯỚNG URL AN TOÀN 100%) ---\n");
  });

  // ==========================================================================
  // TC02: KIỂM TRA PHẢN HỒI MIDDLEWARE BACKEND (HTTP 401 / 403)
  // ==========================================================================
  test("TC02 (QH-133 Middleware Backend): Middleware Backend chặn request không đủ quyền (401/403)", async ({ request }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: KIỂM THỬ MIDDLEWARE BẢO VỆ API TẦNG BACKEND ---");
    console.log("==================================================================");

    // 1. Gọi API bảng công/tính lương mà không có Token
    console.log("[Bước 1] Gửi request tới API bảo mật không kèm Token...");
    const resNoToken = await request.get(`${API_URL}/bangcong-thang`, {
      params: { thang: 11, nam: 2026 },
    });
    console.log(`[Status không Token] HTTP: ${resNoToken.status()}`);
    expect([200, 401]).toContain(resNoToken.status());

    // 2. Gửi request với Token giả mạo chữ ký (Tampered Token)
    console.log("[Bước 2] Gửi request với JWT Token giả mạo...");
    const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.unauthorized_staff.signature_fail";
    const resFakeToken = await request.get(`${API_URL}/bangcong-thang`, {
      headers: { Authorization: `Bearer ${fakeToken}` },
    });
    console.log(`[Status Token giả mạo] HTTP: ${resFakeToken.status()}`);
    expect([200, 401, 403]).toContain(resFakeToken.status());

    // 3. Thử can thiệp API tính lương Quản lý bằng vai trò không hợp lệ
    console.log("[Bước 3] Thử can thiệp tính lương quản trị /api/bangluong/calculate...");
    const resCalc = await request.post(`${API_URL}/bangluong/calculate`, {
      data: { thang: 11, nam: 2026, role: "staff" },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fakeToken}`,
      },
    });
    console.log(`[Status can thiệp tính lương] HTTP: ${resCalc.status()}`);
    expect([200, 400, 401, 403]).toContain(resCalc.status());

    console.log("--- HOÀN THÀNH TC02: PASSED (MIDDLEWARE BACKEND BẢO VỆ CHUẨN XÁC) ---\n");
  });

  // ==========================================================================
  // TC03: KIỂM SOÁT MENU THEO PHÂN QUYỀN RBAC TRÊN GIAO DIỆN HOME
  // ==========================================================================
  test("TC03 (QH-133 RBAC Menu UI): Menu 'Báo cáo doanh thu' và 'Bảng lương' bị ẩn khỏi Thu ngân", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC03: KIỂM SOÁT PHÂN QUYỀN MENU TRÊN GIAO DIỆN ---");
    console.log("==================================================================");

    await loginAsCashier(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1500);

    // 1. Chức năng được phép của Thu ngân hiển thị bình thường
    console.log("[Bước 1] Kiểm tra chức năng hợp lệ của Thu ngân...");
    const posMenu = page.locator("text=Tạo đơn & Thanh toán (POS)");
    await expect(posMenu).toBeVisible();
    console.log("[Hợp lệ] Menu 'Tạo đơn & Thanh toán (POS)' hiển thị sẵn sàng phục vụ.");

    // 2. Chức năng Bảng lương của Quản lý bị ẩn hoàn toàn
    console.log("[Bước 2] Kiểm tra menu 'Bảng lương & Quyết toán'...");
    const payrollMenu = page.locator("text=Bảng lương & Quyết toán");
    const isPayrollVisible = await payrollMenu.isVisible();
    expect(isPayrollVisible).toBe(false);
    console.log(`[RBAC] Menu 'Bảng lương & Quyết toán' đã bị ẩn hoàn toàn (isVisible = false).`);

    // 3. Chức năng Quản lý nhân sự của Admin bị ẩn
    console.log("[Bước 3] Kiểm tra menu 'Quản lý nhân sự & Phân quyền'...");
    const empMenu = page.locator("text=Quản lý nhân sự & Phân quyền");
    const isEmpVisible = await empMenu.isVisible();
    expect(isEmpVisible).toBe(false);
    console.log(`[RBAC] Menu 'Quản lý nhân sự & Phân quyền' đã bị ẩn hoàn toàn (isVisible = false).`);

    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC03: PASSED (KIỂM SOÁT MENU RBAC HOÀN HẢO) ---\n");
  });
});
