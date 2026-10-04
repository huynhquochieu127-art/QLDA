const { test, expect } = require("@playwright/test");

test.describe("Kiểm thử chức năng Thêm bàn trong quản lý khu vực", () => {
  test("TC01: Thêm Bàn 11 mới vào Khu Máy Lạnh", async ({ page }) => {
    // 1. Truy cập vào trang web ứng dụng
    await page.goto("http://localhost:5173");

    // 2. Click vào menu "Sơ đồ bàn & Gọi món" ở thanh bên trái
    await page.click("text=Sơ đồ bàn & Gọi món");

    // 3. Click vào tab "Quản lý Khu vực & Bàn (Admin)"
    await page.click("text=Quản lý Khu vực & Bàn (Admin)");

    // 4. Chọn đúng khu vực "Khu Máy Lạnh" ở danh sách bên trái
    await page.click("text=Khu Máy Lạnh");

    // 5. Click nút "Thêm 1 Bàn"
    await page.click('button:has-text("Thêm 1 Bàn")');

    // 6. Định vị chính xác popup modal
    const modal = page.locator(".modal-content");
    await modal.waitFor({ state: "visible" });

    // Điền "Bàn 11" vào ô Tên bàn (tìm đúng trong modal)
    await modal.getByPlaceholder("Ví dụ: Bàn 01, Bàn VIP 1...").fill("Bàn 12");

    // Điền "4" vào ô Số ghế (input number trong modal)
    await modal.locator('input[type="number"]').fill("4");

    // 7. Nhấn nút "Lưu Bàn" ngay trên popup
    await modal.locator('button:has-text("Lưu Bàn")').click();

    // 8. Chờ popup đóng lại
    await modal.waitFor({ state: "hidden" });

    // 9. Kiểm tra kết quả: "Bàn 11" xuất hiện trong danh sách
    const newTable = page.locator("text=Bàn 12");
    await expect(newTable).toBeVisible();

    // 10. Giữ trình duyệt lại 5 giây để bạn nhìn rõ kết quả trước khi tự đóng
    await page.waitForTimeout(5000);
  });
});
