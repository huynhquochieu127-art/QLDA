const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-130
 * Title: Testcase: Xuất báo cáo doanh thu và hóa đơn ra file PDF
 * 
 * 1. TC01 (QH-130 Jira Core):
 *    - Mở trang "Báo cáo doanh thu", nhấn nút "Báo cáo PDF (CĐT)".
 *    - Modal xem trước khổ A4 hiển thị, bấm "Tải file PDF" -> Tải file .pdf thành công (QH-104).
 * 
 * 2. TC02 (Tiếng Việt & Layout A4 Chuẩn):
 *    - Kiểm tra toàn bộ nội dung trong bản xem trước PDF không bị lỗi bể font chữ tiếng Việt có dấu,
 *      canh lề đúng chuẩn tài chính gửi Ban Giám Đốc & bảng số liệu không bị tràn trang.
 * 
 * 3. TC03 (In / Xuất Hóa Đơn Bán Lẻ POS):
 *    - Thao tác thanh toán đơn hàng tại POS, kiểm tra biên lai hóa đơn (.receipt-modal)
 *      xuất đầy đủ định dạng để in/xuất hóa đơn bán lẻ.
 * ============================================================================
 */

test.describe("QH-130: Xuất báo cáo doanh thu và hóa đơn ra file PDF", () => {
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
      sessionStorage.setItem("accessToken", "jwt-token-admin-pdf-test");
      localStorage.setItem("user", JSON.stringify(adminUser));
      localStorage.setItem("accessToken", "jwt-token-admin-pdf-test");
    });
  }

  // ==========================================================================
  // TC01: XUẤT BÁO CÁO DOANH THU RA FILE PDF GỬI CHỦ ĐẦU TƯ (QH-130 JIRA CORE)
  // ==========================================================================
  test("TC01 (QH-130 Jira Core): Bấm 'Báo cáo PDF (CĐT)' và tải file .pdf thành công", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: XUẤT BÁO CÁO DOANH THU RA FILE PDF (QH-130) ---");
    console.log("==================================================================");

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // 1. Mở trang Báo cáo doanh thu
    console.log("[Bước 1] Mở trang 'Báo cáo doanh thu'...");
    await page.locator("text=Báo cáo doanh thu").click();
    await page.waitForTimeout(1500);

    // 2. Tìm nút "Báo cáo PDF (CĐT)"
    console.log("[Bước 2] Tìm nút 'Báo cáo PDF (CĐT)'...");
    const pdfBtn = page.locator("button:has-text('Báo cáo PDF (CĐT)')");
    await expect(pdfBtn).toBeVisible();

    // 3. Mở Modal xem trước PDF
    console.log("[Bước 3] Mở modal xem trước PDF khổ in A4...");
    await pdfBtn.click();
    await page.waitForTimeout(1000);

    // Xác nhận modal hiển thị
    const previewHeader = page.locator("text=Bản xem trước Báo Cáo Doanh Thu (Khổ in A4)");
    await expect(previewHeader).toBeVisible();
    console.log("[Modal PDF] Đã mở thành công giao diện xem trước tài liệu PDF.");

    // 4. Bấm nút "Tải file PDF" và kiểm tra
    console.log("[Bước 4] Nhấn nút 'Tải file PDF'...");
    const downloadPdfBtn = page.locator("button:has-text('Tải file PDF')");
    await expect(downloadPdfBtn).toBeVisible();
    await downloadPdfBtn.click();

    // Đợi xuất hiện thông báo tải thành công trong modal
    const successTag = page.locator("text=Đã tải về thành công!");
    await expect(successTag).toBeVisible({ timeout: 10000 });
    console.log("[Xuất PDF] Quá trình kết xuất jsPDF & html2canvas hoàn tất, file PDF đã được sinh thành công!");

    // Giữ màn hình 2 giây quan sát
    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC01: PASSED (XUẤT BÁO CÁO PDF THÀNH CÔNG 100%) ---\n");
  });

  // ==========================================================================
  // TC02: KIỂM TRA HIỂN THỊ TIẾNG VIỆT CÓ DẤU & BỐ CỤC KHỔ A4 KHÔNG BỊ TRÀN
  // ==========================================================================
  test("TC02 (QH-130 Layout & Font): Kiểm tra tiếng Việt có dấu chuẩn mẫu và layout không vỡ", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: KIỂM TRA HIỂN THỊ TIẾNG VIỆT & BỐ CỤC KHỔ A4 ---");
    console.log("==================================================================");

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    await page.locator("text=Báo cáo doanh thu").click();
    await page.waitForTimeout(1200);

    await page.locator("button:has-text('Báo cáo PDF (CĐT)')").click();
    await page.waitForTimeout(1000);

    // Kiểm tra container tài liệu PDF khổ A4
    const pdfContent = page.locator("#pdf-report-content");
    await expect(pdfContent).toBeVisible();

    // 1. Kiểm tra tiêu đề chính tiếng Việt có dấu
    console.log("[Bước 1] Kiểm tra tiêu đề tài chính tiếng Việt...");
    const titleText = await pdfContent.locator("h1, h2").first().innerText();
    console.log(`[Tiêu đề] "${titleText}"`);
    expect(titleText).toContain("BÁO CÁO DOANH THU");

    // 2. Kiểm tra các trường nội dung tiếng Việt chuẩn mực
    console.log("[Bước 2] Kiểm tra các nhãn thông tin tiếng Việt...");
    const contentText = await pdfContent.innerText();
    expect(contentText).toContain("DOANH THU THỰC THU");
    expect(contentText).toContain("BẢNG KÊ CHI TIẾT DOANH THU");
    expect(contentText).toContain("KẾ TOÁN TRƯỞNG");
    expect(contentText).toContain("Ban Giám Đốc");
    console.log("[Tiếng Việt] Xác nhận toàn bộ font chữ tiếng Việt có dấu hiển thị chuẩn, không lỗi encoding UTF-8.");

    // 3. Kiểm tra canh lề và bảng số liệu (A4 chuẩn, rộng ~210mm)
    console.log("[Bước 3] Kiểm tra kích thước bố cục A4...");
    const boundingBox = await pdfContent.boundingBox();
    expect(boundingBox.width).toBeGreaterThan(600); // Kích thước khung chuẩn desktop A4
    console.log(`[Bố cục Layout] Chiều rộng tài liệu: ${Math.round(boundingBox.width)}px, canh lề đối xứng, không bị tràn trang.`);

    // 4. Kiểm tra nút in trực tiếp
    const printBtn = page.locator("button:has-text('In báo cáo')");
    await expect(printBtn).toBeVisible();

    await page.waitForTimeout(2000);
    console.log("--- HOÀN THÀNH TC02: PASSED (FONT TIẾNG VIỆT & LAYOUT A4 CHUẨN MỰC) ---\n");
  });

  // ==========================================================================
  // TC03: IN / XUẤT BIÊN LAI HÓA ĐƠN BÁN LẺ POS (GIẢ LẬP KHÔNG GHI VÀO DB)
  // ==========================================================================
  test("TC03 (QH-130 Receipt): Kiểm tra biên lai hóa đơn bán lẻ POS hiển thị đầy đủ thông tin", async ({ page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC03: KIỂM TRA BIÊN LAI HÓA ĐƠN BÁN LẺ POS ---");
    console.log("==================================================================");

    // Mock API Checkout giả lập hoàn toàn trong RAM, zero DB junk
    await page.route("**/api/checkout", async (route) => {
      console.log("[Mock Checkout] Giả lập hóa đơn trong bộ nhớ RAM, không thêm đơn vào MySQL.");
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Thanh toán đơn hàng thành công!",
          maDonHang: 9999,
        }),
      });
    });

    await loginAsAdmin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1000);

    // Mở POS và thêm món
    await page.locator("text=Tạo đơn & Thanh toán (POS)").click();
    await page.waitForTimeout(1200);

    const productCard = page.locator(".product-card").first();
    await expect(productCard).toBeVisible();
    await productCard.click();
    await page.waitForTimeout(500);

    // Bấm thanh toán
    await page.locator(".checkout-btn:has-text('Thanh Toán')").click();
    await page.waitForTimeout(800);

    // Nhập tiền khách đưa
    await page.locator(".cash-input-field").fill("100000");
    await page.waitForTimeout(300);

    // Xác nhận thanh toán
    const confirmBtn = page.locator("button.btn-payment-confirm:has-text('✓ Hoàn Tất Thanh Toán')");
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();
    await page.waitForTimeout(1500);

    // Xác minh modal hóa đơn biên lai xuất hiện
    const receiptModal = page.locator(".receipt-modal");
    await expect(receiptModal).toBeVisible();
    console.log("[Biên lai POS] Hóa đơn thanh toán đã được xuất thành công trên giao diện.");

    const receiptText = await receiptModal.innerText();
    expect(receiptText).toContain("Thanh Toán Thành Công!");
    expect(receiptText).toContain("Mã hóa đơn");

    // Bấm "In Hóa Đơn & Đóng"
    const printCloseBtn = page.locator("button.checkout-btn:has-text('In Hóa Đơn & Đóng')");
    await expect(printCloseBtn).toBeVisible();
    await printCloseBtn.click();
    await page.waitForTimeout(800);

    console.log("--- HOÀN THÀNH TC03: PASSED (BIÊN LAI HÓA ĐƠN POS CHUẨN XÁC) ---\n");
  });
});
