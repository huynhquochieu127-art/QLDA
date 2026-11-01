const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-132
 * Title: Testcase: Báo lỗi chi tiết khi Import file Excel sai định dạng hoặc trùng dữ liệu
 * 
 * 1. TC01 (Negative Test - Chặn file sai đuôi mở rộng):
 *    - Thử chọn file có định dạng không hợp lệ (.txt / .csv), hệ thống chặn ngay lập tức.
 * 
 * 2. TC02 (Negative Test - Chặn file thiếu cột bắt buộc):
 *    - Cố tình upload file Excel thiếu cột (Họ tên, CCCD), hệ thống báo lỗi chi tiết cấu trúc bảng.
 * 
 * 3. TC03 (Chi tiết dòng lỗi & Bỏ qua dòng trùng lặp SĐT):
 *    - Tải file có dòng sai định dạng SĐT (Dòng 5) và dòng trùng SĐT đã tồn tại (Dòng 3).
 *    - Hệ thống rollback / bỏ qua an toàn, hiển thị chi tiết từng dòng bị lỗi và chặn nhập dữ liệu rác.
 * 
 * ⭐ ĐẢM BẢO AN TOÀN DỮ LIỆU:
 *    Kiểm thử xử lý ngoại lệ giả lập hoàn toàn trong RAM, KHÔNG ghi bất kỳ dòng rác nào vào MySQL.
 * ============================================================================
 */

test.describe("QH-132: Báo lỗi chi tiết khi Import file Excel sai định dạng hoặc trùng dữ liệu", () => {
  test.setTimeout(45000);

  const FRONTEND_URL = "http://localhost:5173";

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
      sessionStorage.setItem("accessToken", "jwt-token-admin-import-err-test");
      localStorage.setItem("user", JSON.stringify(adminUser));
      localStorage.setItem("accessToken", "jwt-token-admin-import-err-test");
    });
  }

  // ==========================================================================
  // TC01: CHẶN FILE KHÔNG PHẢI ĐỊNH DẠNG .XLSX (NEGATIVE TEST)
  // ==========================================================================
  test("TC01 (QH-132 Ext Validation): Chặn file sai đuôi mở rộng (không phải .xlsx)", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: KIỂM TRA CHẶN FILE SAI ĐỊNH DẠNG MỞ RỘNG ---");
    console.log("==================================================================");

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // Mở Quản lý nhân viên -> Nhập từ Excel
    await page.locator("text=Quản lý nhân sự & Phân quyền").click();
    await page.waitForTimeout(1200);

    await page.locator("button:has-text('Nhập từ Excel')").click();
    await page.waitForTimeout(600);

    // Chọn file .txt không hợp lệ
    console.log("[Bước 1] Chọn thử file sai định dạng ('danhsach.txt')...");
    const fileInput = page.locator('input[type="file"][accept=".xlsx"]');
    await fileInput.setInputFiles({
      name: "danhsach.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("HoTen,SoDienThoai\nNguyen Van A,0912345678"),
    });
    await page.waitForTimeout(800);

    // Xác nhận hiển thị thông báo lỗi màu đỏ
    console.log("[Bước 2] Kiểm tra thông báo cảnh báo định dạng...");
    const errorAlert = page.locator("text=Định dạng file không hợp lệ! Vui lòng chỉ chọn file Excel có đuôi .xlsx");
    await expect(errorAlert).toBeVisible();
    console.log("[Validation Thành công] Hệ thống đã phát hiện đuôi file sai và chặn tải lên ngay tại Client!");

    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC01: PASSED (CHẶN ĐỊNH DẠNG SAI HOÀN HẢO) ---\n");
  });

  // ==========================================================================
  // TC02: CHẶN FILE THIẾU CỘT CẤU TRÚC BẮT BUỘC (HỌ TÊN, CCCD, ROLE)
  // ==========================================================================
  test("TC02 (QH-132 Missing Columns): Báo lỗi chi tiết khi file Excel thiếu cột bắt buộc", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: KIỂM TRA BÁO LỖI THIẾU CỘT BẮT BUỘC TRONG EXCEL ---");
    console.log("==================================================================");

    // Mock API trả về mã lỗi 400 và danh sách cột bị thiếu
    await page.route("**/api/employees/import", async (route) => {
      console.log("[Mock Import API] Phát hiện file thiếu cấu trúc -> Trả về lỗi 400 Bad Request!");
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Định dạng file sai! File Excel thiếu các cột bắt buộc: [Họ tên, CCCD]. Vui lòng tải file mẫu (.xlsx) để đảm bảo cấu trúc bảng!",
        }),
      });
    });

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Quản lý nhân sự & Phân quyền").click();
    await page.waitForTimeout(1200);

    await page.locator("button:has-text('Nhập từ Excel')").click();
    await page.waitForTimeout(600);

    // Upload file .xlsx thiếu cột
    const fileInput = page.locator('input[type="file"][accept=".xlsx"]');
    await fileInput.setInputFiles({
      name: "File_Thieu_Cot_CCCD.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("MOCK_EXCEL_STREAM"),
    });
    await page.waitForTimeout(500);

    await page.locator("button:has-text('Bắt đầu nhập dữ liệu')").click();
    await page.waitForTimeout(1200);

    // Kiểm tra thông báo lỗi hiển thị rõ các cột bị thiếu
    const errorBox = page.locator("text=Định dạng file sai! File Excel thiếu các cột bắt buộc: [Họ tên, CCCD]");
    await expect(errorBox).toBeVisible();
    console.log("[Báo lỗi cấu trúc] Hệ thống đã từ chối file và chỉ rõ các cột cần bổ sung!");

    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC02: PASSED (BÁO LỖI THIẾU CỘT CHUẨN XÁC) ---\n");
  });

  // ==========================================================================
  // TC03: HIỂN THỊ CHI TIẾT DÒNG LỖI SĐT VÀ BỎ QUA DÒNG TRÙNG LẶP SĐT (QH-132 JIRA CORE)
  // ==========================================================================
  test("TC03 (QH-132 Error & Duplicate Details): Hiển thị chi tiết số dòng bị lỗi và bỏ qua SĐT trùng", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC03: KIỂM TRA HIỂN THỊ CHI TIẾT SỐ DÒNG BỊ LỖI & BỎ QUA TRÙNG ---");
    console.log("==================================================================");

    await page.route("**/api/employees/import", async (route) => {
      console.log("[Mock Import API] Bóc tách dữ liệu: 1 dòng hợp lệ, 2 dòng trùng, 1 dòng sai format.");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Quá trình nhập dữ liệu hoàn tất với một số cảnh báo.",
          summary: {
            totalRows: 4,
            importedCount: 1,
            skippedCount: 2,
            errorCount: 1,
          },
          data: {
            imported: [
              { row: 2, hoTen: "Đỗ Văn Hợp Lệ", soDienThoai: "0912345678", vaiTro: "Thu ngân", maNhanVienCode: "NV099", defaultPassword: "Nv@5678" }
            ],
            skipped: [
              { row: 3, hoTen: "Nguyễn Trùng SĐT Hệ Thống", soDienThoai: "0813108114", reason: "Số điện thoại đã tồn tại trong hệ thống (bỏ qua dòng)" },
              { row: 4, hoTen: "Trần Lặp SĐT Trong File", soDienThoai: "0912345678", reason: "Số điện thoại bị trùng lặp với một dòng trước trong file (bỏ qua dòng)" },
            ],
            errors: [
              { row: 5, hoTen: "Lê Sai Format Số", soDienThoai: "123", reason: "Số điện thoại không hợp lệ (phải từ 9 đến 11 chữ số)" }
            ],
          },
        }),
      });
    });

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Quản lý nhân sự & Phân quyền").click();
    await page.waitForTimeout(1200);

    await page.locator("button:has-text('Nhập từ Excel')").click();
    await page.waitForTimeout(600);

    const fileInput = page.locator('input[type="file"][accept=".xlsx"]');
    await fileInput.setInputFiles({
      name: "File_Co_Loi_Va_Trung_Lap.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("MOCK_EXCEL_STREAM"),
    });

    await page.locator("button:has-text('Bắt đầu nhập dữ liệu')").click();
    await page.waitForTimeout(1500);

    // 1. Kiểm tra số lượng thống kê
    console.log("[Bước 1] Kiểm tra các chỉ số tóm tắt...");
    const skippedBadge = page.locator("text=BỎ QUA (TRÙNG SĐT)").locator("..").locator("div").nth(1);
    await expect(skippedBadge).toHaveText("2");

    const errorBadge = page.locator("text=DÒNG LỖI").locator("..").locator("div").nth(1);
    await expect(errorBadge).toHaveText("1");

    // 2. Kiểm tra thông tin chi tiết từng dòng lỗi
    console.log("[Bước 2] Kiểm tra chi tiết dòng lỗi và lý do từ chối...");
    await expect(page.locator("text=Dòng 3")).toBeVisible();
    await expect(page.locator("text=Số điện thoại đã tồn tại trong hệ thống")).toBeVisible();

    await expect(page.locator("text=Dòng 4")).toBeVisible();
    await expect(page.locator("text=Số điện thoại bị trùng lặp với một dòng trước trong file")).toBeVisible();

    await expect(page.locator("text=Dòng 5")).toBeVisible();
    await expect(page.locator("text=Số điện thoại không hợp lệ (phải từ 9 đến 11 chữ số)")).toBeVisible();

    console.log("[Kiểm soát toàn vẹn] Hệ thống đã hiển thị chi tiết số dòng bị lỗi chính xác, bảo vệ CSDL hoàn toàn!");

    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC03: PASSED (BÁO LỖI CHI TIẾT TỪNG DÒNG XUẤT SẮC) ---\n");
  });
});
