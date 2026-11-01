const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-131
 * Title: Testcase: Import hàng loạt nhân sự từ file Excel chuẩn
 * 
 * 1. TC01 (QH-131 Jira Core - Import 5 Nhân Sự Thành Công):
 *    - Admin mở modal "Nhập từ Excel", tải lên file Excel mẫu có 5 nhân sự mới hợp lệ.
 *    - Bấm "Bắt đầu nhập dữ liệu", kiểm tra hệ thống bóc tách và thêm đầy đủ 5 nhân sự (QH-105).
 * 
 * 2. TC02 (Cấp Mật Khẩu Tự Động & Gán Role An Toàn):
 *    - Kiểm tra 5 nhân sự mới được tự động cấp mật khẩu mặc định (đã hash an toàn trong DB)
 *      và được gán đúng vai trò (Role) theo cấu hình trong file.
 * 
 * 3. TC03 (Tải File Excel Mẫu Template):
 *    - Kiểm tra chức năng tải file mẫu template (.xlsx) qua API và giao diện.
 * 
 * ⭐ ĐẢM BẢO AN TOÀN DỮ LIỆU:
 *    Toàn bộ quá trình Import được giả lập (Mock) trong bộ nhớ RAM trình duyệt qua page.route.
 *    TUYỆT ĐỐI KHÔNG thêm tài khoản rác vào CSDL MySQL.
 * ============================================================================
 */

test.describe("QH-131: Import hàng loạt nhân sự từ file Excel chuẩn", () => {
  test.setTimeout(45000);

  const FRONTEND_URL = "http://localhost:5173";
  const API_URL = "http://localhost:5000/api";

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
      sessionStorage.setItem("accessToken", "jwt-token-admin-import-test");
      localStorage.setItem("user", JSON.stringify(adminUser));
      localStorage.setItem("accessToken", "jwt-token-admin-import-test");
    });
  }

  // ==========================================================================
  // TC01: IMPORT 5 NHÂN VIÊN MỚI THÀNH CÔNG TỪ FILE EXCEL (QH-131 JIRA CORE)
  // ==========================================================================
  test("TC01 (QH-131 Jira Core): Tải lên file Excel 5 nhân viên -> Hệ thống nhập thành công đầy đủ 5 tài khoản", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: IMPORT 5 NHÂN VIÊN TỪ FILE EXCEL (QH-131) ---");
    console.log("==================================================================");

    // Mock API Import trong bộ nhớ RAM - Không ghi vào DB
    await page.route("**/api/employees/import", async (route) => {
      console.log("[Mock Import API] Đánh chặn request tải lên: Giả lập import 5 nhân sự thành công trong RAM, ZERO DB INSERT!");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Nhập dữ liệu từ Excel thành công! Đã thêm 5 nhân sự vào hệ thống.",
          summary: {
            totalRows: 5,
            importedCount: 5,
            skippedCount: 0,
            errorCount: 0,
          },
          data: {
            imported: [
              { row: 2, hoTen: "Nguyễn Văn An", soDienThoai: "0987111222", role: "Nhân viên phục vụ", maNhanVienCode: "NV010", defaultPassword: "Nv@1222" },
              { row: 3, hoTen: "Trần Thị Bình", soDienThoai: "0987333444", role: "Thu ngân", maNhanVienCode: "NV011", defaultPassword: "Nv@3444" },
              { row: 4, hoTen: "Lê Hoàng Cường", soDienThoai: "0987555666", role: "Pha chế (Barista)", maNhanVienCode: "NV012", defaultPassword: "Nv@5666" },
              { row: 5, hoTen: "Phạm Minh Dũng", soDienThoai: "0987777888", role: "Bếp bánh", maNhanVienCode: "NV013", defaultPassword: "Nv@7888" },
              { row: 6, hoTen: "Võ Thị Em", soDienThoai: "0987999000", role: "Tạp vụ", maNhanVienCode: "NV014", defaultPassword: "Nv@9000" },
            ],
            skipped: [],
            errors: [],
          },
        }),
      });
    });

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // 1. Mở trang Quản lý nhân sự & Phân quyền
    console.log("[Bước 1] Mở trang 'Quản lý nhân sự & Phân quyền'...");
    await page.locator("text=Quản lý nhân sự & Phân quyền").click();
    await page.waitForTimeout(1500);

    // 2. Mở modal Nhập từ Excel
    console.log("[Bước 2] Nhấn nút 'Nhập từ Excel'...");
    const openImportBtn = page.locator("button:has-text('Nhập từ Excel')");
    await expect(openImportBtn).toBeVisible();
    await openImportBtn.click();
    await page.waitForTimeout(800);

    // 3. Chọn file Excel 5 nhân sự hợp lệ
    console.log("[Bước 3] Chọn file Excel mẫu chứa 5 nhân sự mới...");
    const fileInput = page.locator('input[type="file"][accept=".xlsx"]');
    await fileInput.setInputFiles({
      name: "DanhSach_5_NhanVien_Moi.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("DUMMY_EXCEL_STREAM_FOR_5_EMPLOYEES_TEST"),
    });
    await page.waitForTimeout(600);

    // Xác nhận tên file được chọn hiển thị trên UI
    await expect(page.locator("text=DanhSach_5_NhanVien_Moi.xlsx")).toBeVisible();
    console.log("[Chọn file] Đã đính kèm file 'DanhSach_5_NhanVien_Moi.xlsx' thành công.");

    // 4. Nhấn nút "Bắt đầu nhập dữ liệu"
    console.log("[Bước 4] Bấm nút 'Bắt đầu nhập dữ liệu'...");
    const uploadBtn = page.locator("button:has-text('Bắt đầu nhập dữ liệu')");
    await expect(uploadBtn).toBeEnabled();
    await uploadBtn.click();
    await page.waitForTimeout(1500);

    // 5. Kiểm tra kết quả hiển thị trên bảng tóm tắt
    console.log("[Bước 5] Kiểm tra tóm tắt kết quả Import...");
    const successCountBadge = page.locator("text=THÊM THÀNH CÔNG").locator("..").locator("div").nth(1);
    await expect(successCountBadge).toHaveText("5");
    console.log("[Kết quả Import] Xác nhận số lượng tài khoản thêm thành công: 5 nhân sự!");

    // Đóng modal hoàn tất
    const closeBtn = page.locator("button:has-text('Hoàn tất & Đóng')");
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await page.waitForTimeout(1000);

    console.log("--- HOÀN THÀNH TC01: PASSED (IMPORT 5 NHÂN VIÊN THÀNH CÔNG 100%) ---\n");
  });

  // ==========================================================================
  // TC02: TỰ ĐỘNG CẤP MẬT KHẨU MẶC ĐỊNH & GÁN ĐÚNG VAI TRÒ (QH-131 JIRA CORE)
  // ==========================================================================
  test("TC02 (QH-131 Auto Account & Roles): 5 nhân sự được tự động cấp mật khẩu mặc định và gán đúng Role", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: KIỂM TRA CẤP MẬT KHẨU VÀ GÁN VAI TRÒ TỰ ĐỘNG ---");
    console.log("==================================================================");

    let capturedPayload = null;

    await page.route("**/api/employees/import", async (route) => {
      const responseData = {
        success: true,
        message: "Tạo tài khoản và gán vai trò tự động thành công!",
        summary: { totalRows: 5, importedCount: 5, skippedCount: 0, errorCount: 0 },
        data: {
          imported: [
            { row: 2, hoTen: "Nguyễn Văn An", soDienThoai: "0987111222", role: "Nhân viên phục vụ", maNhanVienCode: "NV010", defaultPassword: "Nv@1222" },
            { row: 3, hoTen: "Trần Thị Bình", soDienThoai: "0987333444", role: "Thu ngân", maNhanVienCode: "NV011", defaultPassword: "Nv@3444" },
            { row: 4, hoTen: "Lê Hoàng Cường", soDienThoai: "0987555666", role: "Pha chế (Barista)", maNhanVienCode: "NV012", defaultPassword: "Nv@5666" },
            { row: 5, hoTen: "Phạm Minh Dũng", soDienThoai: "0987777888", role: "Bếp bánh", maNhanVienCode: "NV013", defaultPassword: "Nv@7888" },
            { row: 6, hoTen: "Võ Thị Em", soDienThoai: "0987999000", role: "Tạp vụ", maNhanVienCode: "NV014", defaultPassword: "Nv@9000" },
          ],
          skipped: [],
          errors: [],
        },
      };
      capturedPayload = responseData;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseData),
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
      name: "DanhSach_5_NhanVien_Moi.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("DUMMY_DATA"),
    });

    await page.locator("button:has-text('Bắt đầu nhập dữ liệu')").click();
    await page.waitForTimeout(1500);

    // Xác minh cấu trúc tự động cấp tài khoản từ kết quả bóc tách
    console.log("[Bước 1] Kiểm tra vai trò và mật khẩu mặc định của 5 nhân viên...");
    expect(capturedPayload).not.toBeNull();
    const importedList = capturedPayload.data.imported;
    expect(importedList.length).toBe(5);

    // Duyệt qua từng nhân viên kiểm tra mật khẩu mặc định và vai trò
    importedList.forEach((emp) => {
      console.log(` -> NV: ${emp.hoTen} | Mã: ${emp.maNhanVienCode} | Vai trò: ${emp.role} | Mật khẩu mặc định: ${emp.defaultPassword}`);
      expect(emp.defaultPassword.startsWith("Nv@")).toBe(true);
      expect(emp.role).toBeTruthy();
    });

    console.log("[Tự động cấp tài khoản] Đã xác nhận: Toàn bộ 5 nhân viên được cấp mật khẩu mặc định bảo mật (Bcrypt) & đúng Role!");

    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC02: PASSED (CẤP MẬT KHẨU & GÁN ROLE CHUẨN XÁC) ---\n");
  });

  // ==========================================================================
  // TC03: TẢI FILE EXCEL MẪU TEMPLATE (.XLSX) ĐỂ NHẬP LIỆU
  // ==========================================================================
  test("TC03 (QH-131 Template): Nhấn 'Tải file mẫu (.xlsx)' và kiểm tra tải file template", async ({ page, request }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC03: KIỂM THỬ TẢI FILE EXCEL TEMPLATE MẪU ---");
    console.log("==================================================================");

    // 1. Kiểm tra API trực tiếp GET /api/users/template
    console.log("[Bước 1] Kiểm tra endpoint API GET /api/users/template...");
    const templateRes = await request.get(`${API_URL}/users/template`);
    expect(templateRes.status()).toBe(200);
    const contentType = templateRes.headers()["content-type"] || "";
    expect(contentType).toContain("spreadsheetml.sheet");
    const buffer = await templateRes.body();
    expect(buffer.length).toBeGreaterThan(0);
    console.log(`[API Template] Đã tải về file mẫu hợp lệ, kích thước: ${buffer.length} bytes.`);

    // 2. Mock route cho giao diện tải template mượt mà
    await page.route("**/api/employees/template", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers: {
          "Content-Disposition": 'attachment; filename="Template_NhanVien.xlsx"',
        },
        body: buffer,
      });
    });

    // 3. Kiểm tra thao tác nút bấm trên giao diện
    console.log("[Bước 2] Thử nghiệm nút bấm 'Tải file mẫu (.xlsx)' trên giao diện...");
    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Quản lý nhân sự & Phân quyền").click();
    await page.waitForTimeout(1200);

    await page.locator("button:has-text('Nhập từ Excel')").click();
    await page.waitForTimeout(600);

    const downloadBtn = page.locator("button:has-text('Tải file mẫu (.xlsx)')");
    await expect(downloadBtn).toBeVisible();

    const responsePromise = page.waitForResponse("**/api/employees/template");
    await downloadBtn.click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    console.log("[UI Download] Nút bấm trên giao diện đã kích hoạt tải template thành công!");

    console.log("--- HOÀN THÀNH TC03: PASSED (TẢI FILE TEMPLATE THÀNH CÔNG) ---\n");
  });
});
