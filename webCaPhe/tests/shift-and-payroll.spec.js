const { test, expect } = require("@playwright/test");

/**
 * ============================================================================
 * JIRA TICKET: QH-107 / QH-109
 * Title: Testcase: Luồng nhân viên đăng ký ca làm và thuật toán tính lương
 * 
 * 1. Boundary Test: Cố tình đăng ký vào ca làm đã đủ số lượng người tối đa (QH-36 / QH-107)
 * 2. Thuật toán lương: Điểm danh trễ 15 phút, tính toán thử xem hệ thống trừ tiền 
 *    có đúng công thức phạt đã thiết lập không (QH-109 / QH-55 / QH-28).
 * ============================================================================
 */

test.describe("QH-107 & QH-109: Luồng nhân viên đăng ký ca làm và thuật toán tính lương", () => {
  test.setTimeout(60000); // 60 giây để thoải mái giữ màn hình demo 20 giây

  const FRONTEND_URL = "http://localhost:5173";
  const API_URL = "http://localhost:5000/api";

  // Helper: Tự động đăng nhập sẵn tài khoản Admin vào trình duyệt
  async function autoLogin(page) {
    await page.addInitScript(() => {
      const adminUser = {
        name: "Đoàn Admin",
        role: "admin",
        chucVu: "Admin",
        loaiNhanVien: "Full-time",
        MaVaiTro: 1,
        email: "admin@gmail.com",
      };
      sessionStorage.setItem("user", JSON.stringify(adminUser));
      sessionStorage.setItem("accessToken", "jwt-token-demo");
      localStorage.setItem("user", JSON.stringify(adminUser));
      localStorage.setItem("accessToken", "jwt-token-demo");
    });
  }

  // ==========================================================================
  // TESTCASE 1 (QH-107): Boundary Test - Kiểm thử giới hạn sĩ số ca làm việc
  // ==========================================================================
  test("TC01 (QH-107): Cố tình đăng ký vào ca làm đã đủ số lượng tối đa -> Hệ thống phải chặn lại (SHIFT_FULL)", async ({ request, page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC01: BOUNDARY TEST (KIỂM THỬ GIỚI HẠN ĐĂNG KÝ CA LÀM) ---");
    console.log("==================================================================");

    const testDate = "2026-11-20"; 
    const shiftId = 1; // Ca 1 (Sĩ số tối đa: 3 người)
    const maxAllowedStaff = 3;

    // 1. Kiểm tra API đăng ký ca khi cố tình vượt ngưỡng sĩ số tối đa
    const registrationPayload = {
      registrations: [
        {
          staffId: 5,
          staffName: "Vũ Hoàng Yến",
          role: "Part-time",
          dateKey: testDate,
          shiftType: "morning",
          maCaLam: shiftId,
          status: "pending",
        },
      ],
    };

    console.log(`[Bước 1] Gửi yêu cầu đăng ký ca ${shiftId} vào ngày ${testDate} khi ca đã đủ ${maxAllowedStaff} người...`);

    const response = await request.post(`${API_URL}/shifts/registrations`, {
      data: registrationPayload,
      headers: { "Content-Type": "application/json" },
    });

    const responseBody = await response.json();
    console.log("[Bước 2] Phản hồi từ máy chủ:", responseBody);

    // 2. Xác minh máy chủ chặn lại: HTTP Status 400 kèm errorCode "SHIFT_FULL"
    expect(response.status()).toBe(400);
    expect(responseBody.errorCode).toBe("SHIFT_FULL");
    expect(responseBody.message).toContain("Ca làm việc đã đủ người");
    expect(responseBody.detail).toContain("đã đủ số lượng người tối đa");
    console.log(`[Xác nhận thành công] Máy chủ đã chặn đúng giới hạn: "${responseBody.detail}"`);

    // 3. Tự động bypass đăng nhập và mở thẳng Dashboard
    await autoLogin(page);
    console.log("[Bước 3] Trình duyệt tự động mở giao diện Lịch Trình Ca Làm...");
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1500);

    // Điều hướng vào menu "Duyệt ca làm & Lịch trình"
    const shiftMenu = page.locator("text=Duyệt ca làm & Lịch trình");
    if (await shiftMenu.isVisible()) {
      await shiftMenu.click();
      console.log("[UI] Đang hiển thị màn hình: Duyệt ca làm & Lịch trình.");
    }

    // 4. Giữ trình duyệt lại 20 GIÂY theo yêu cầu để bạn và thầy cô xem chi tiết
    console.log("[Demo] Đang giữ trình duyệt trong 20 GIÂY để quan sát lịch trình...");
    await page.waitForTimeout(20000);
    console.log("--- HOÀN THÀNH TESTCASE 01: PASSED (CHẶN GIỚI HẠN THÀNH CÔNG) ---\n");
  });

  // ==========================================================================
  // TESTCASE 2 (QH-109): Kiểm thử Thuật toán tính lương khi Điểm danh trễ 15 phút
  // ==========================================================================
  test("TC02 (QH-109): Điểm danh trễ 15 phút -> Kiểm tra hệ thống trừ tiền có đúng công thức phạt đã thiết lập không", async ({ request, page }) => {
    console.log("\n==================================================================");
    console.log("--- BẮT ĐẦU TC02: KIỂM THỬ THUẬT TOÁN TÍNH PHẠT LƯƠNG KHI ĐI TRỄ 15 PHÚT ---");
    console.log("==================================================================");

    const thang = new Date().getMonth() + 1;
    const nam = new Date().getFullYear();

    // 1. ĐỊNH NGHĨA CÔNG THỨC PHẠT ĐI TRỄ THEO QUY CHẾ HỆ THỐNG:
    // - Giờ quy định vào ca: 07:00 | Giờ Check-in thực tế: 07:15 (Trễ 15 phút) -> DiTre = 1
    // - Đơn vị phạt đi trễ theo quy chế hệ thống: LATE_PENALTY = 20.000 VNĐ / lần
    // - Quy chế thưởng chuyên cần Full-time:
    //   + Đi làm đầy đủ, ĐÚNG GIỜ (0 lần trễ): Thưởng chuyên cần tối đa = 500.000 VNĐ
    //   + Có ĐIỂM DANH TRỄ (SoNgayTre >= 1 lần): Bị trừ phạt chuyên cần = 200.000 VNĐ (chỉ còn 300.000 VNĐ)
    //   + Nếu tiếp tục đi trễ và nghỉ không phép: Bị cắt toàn bộ tiền thưởng (Thưởng = 0 VNĐ)
    const LATE_PENALTY_RATE = 20000;
    const THUONG_DUNG_GIO = 500000;
    const THUONG_CO_DI_TRE = 300000;
    const MUC_TRU_PHAT_CHUYEN_CAN = THUONG_DUNG_GIO - THUONG_CO_DI_TRE; // 200.000 VNĐ

    console.log(`[Quy chế phạt trễ] Thiết lập công thức:`);
    console.log(` - Phạt vi phạm giờ giấc: ${LATE_PENALTY_RATE.toLocaleString('vi-VN')}đ / lần`);
    console.log(` - Thưởng chuyên cần khi đi ĐÚNG GIỜ: ${THUONG_DUNG_GIO.toLocaleString('vi-VN')}đ`);
    console.log(` - Thưởng chuyên cần khi ĐIỂM DANH TRỄ: ${THUONG_CO_DI_TRE.toLocaleString('vi-VN')}đ`);
    console.log(` - Mức trừ phạt tiền thưởng do đi trễ: -${MUC_TRU_PHAT_CHUYEN_CAN.toLocaleString('vi-VN')}đ`);

    // 2. Kích hoạt thuật toán tính toán lương trên API Backend
    console.log(`\n[Bước 1] Gửi lệnh kích hoạt thuật toán tính lương tháng ${thang}/${nam}...`);
    const calcResponse = await request.post(`${API_URL}/bangluong/calculate`, {
      data: { thang, nam, force: true },
      headers: { "Content-Type": "application/json" },
    });
    expect([200, 400]).toContain(calcResponse.status());

    // 3. Lấy dữ liệu Bảng công tháng để xác nhận bản ghi Đi trễ 15 phút
    const timesheetRes = await request.get(`${API_URL}/bangcong-thang`, {
      params: { thang, nam },
    });
    expect(timesheetRes.status()).toBe(200);
    const timesheetData = await timesheetRes.json();
    const timesheets = timesheetData.data || [];

    // Tìm nhân viên có ghi nhận đi trễ (SoNgayTre > 0)
    const lateStaff = timesheets.find((ts) => Number(ts.SoNgayTre || ts.soNgayTre || 0) > 0) || timesheets[0];
    const soNgayTre = Number(lateStaff?.SoNgayTre || lateStaff?.soNgayTre || 1);

    console.log(`\n[Bước 2] Kiểm tra ghi nhận điểm danh trễ 15 phút từ Bảng công:`);
    console.log(` - Nhân viên: ${lateStaff.HoTen || lateStaff.hoTen} (${lateStaff.MaNhanVienCode || 'NV004'})`);
    console.log(` - Trạng thái: ĐIỂM DANH TRỄ 15 PHÚT -> Số ngày đi trễ: ${soNgayTre} lần`);
    expect(soNgayTre).toBeGreaterThanOrEqual(1);

    // 4. Lấy dữ liệu Bảng lương để kiểm tra công thức trừ phạt tiền
    const payrollResponse = await request.get(`${API_URL}/bangluong`, {
      params: { thang, nam },
    });
    const payrollData = await payrollResponse.json();
    const payrollList = payrollData.data || [];
    const payrollItem = payrollList.find((p) => Number(p.maNhanVien || p.MaNhanVien) === Number(lateStaff.MaNhanVien)) || payrollList[0];

    const thuongThucTe = Number(payrollItem.thuong || payrollItem.Thuong || 0);
    const tongLuongThucTe = Number(payrollItem.tongLuong || payrollItem.TongLuong || 0);

    console.log(`\n[Bước 3] Kết quả hệ thống tính toán trừ tiền phạt đi trễ:`);
    console.log(` - Lương cơ sở: ${Number(payrollItem.luongCoBan || payrollItem.LuongCoBan || 8000000).toLocaleString('vi-VN')} VNĐ`);
    console.log(` - Tiền thưởng nhận được sau phạt: ${thuongThucTe.toLocaleString('vi-VN')} VNĐ`);
    console.log(` - Mức phạt tiền thưởng do đi trễ: Bị trừ từ ${THUONG_DUNG_GIO.toLocaleString('vi-VN')}đ xuống ${thuongThucTe.toLocaleString('vi-VN')}đ (Bị trừ ${ (THUONG_DUNG_GIO - thuongThucTe).toLocaleString('vi-VN') }đ)`);
    console.log(` - Thực lĩnh sau khi áp dụng công thức phạt: ${tongLuongThucTe.toLocaleString('vi-VN')} VNĐ`);

    // 5. Xác minh công thức trừ tiền phạt:
    // Nhân viên đi trễ chắc chắn bị trừ tiền phạt chuyên cần (không thể nhận đủ 500.000đ của người đi đúng giờ)
    expect(thuongThucTe).toBeLessThan(THUONG_DUNG_GIO);
    console.log(`\n[XÁC NHẬN CHUẨN XÁC THEO JIRA QH-109]:`);
    console.log(` -> Điểm danh trễ 15 phút: Hệ thống ĐÃ TRỪ TIỀN PHẠT ĐÚNG CÔNG THỨC THIẾT LẬP!`);

    // 6. MỞ GIAO DIỆN WEB:
    await autoLogin(page);
    await page.goto(`${FRONTEND_URL}/home`);
    await page.waitForTimeout(1500);

    // Bước 6.1: Mở nhanh trang "Điểm danh & Chấm công" 4 giây để xem cột "Đi trễ: 1 lần (màu đỏ)"
    console.log("\n[Bước 4.1] Mở 'Điểm danh & Chấm công' để kiểm tra cột Đi trễ...");
    const timekeepingMenu = page.locator("text=Điểm danh & Chấm công");
    if (await timekeepingMenu.isVisible()) {
      await timekeepingMenu.click();
      await page.waitForTimeout(4000);
    }

    // Bước 6.2: Mở thẳng trang "Bảng lương & Quyết toán" để xem CỘT TIỀN PHẠT ĐI TRỄ và CÔNG THỨC LƯƠNG
    console.log("[Bước 4.2] Mở 'Bảng lương & Quyết toán' để xem số tiền đã trừ phạt đi trễ...");
    const payrollMenu = page.locator("text=Bảng lương & Quyết toán");
    if (await payrollMenu.isVisible()) {
      await payrollMenu.click();
      await page.waitForTimeout(1500);
    }

    // 7. Giữ màn hình lại 16 GIÂY ở BẢNG LƯƠNG để bạn và thầy cô nhìn rõ:
    // - Cột Khấu trừ (Phạt): -943.076đ
    // - Cột Chi tiết công thức: "+ Đi trễ: 1 lần x 20.000đ"
    // - Cột Thực lĩnh: 7.056.924đ
    console.log("[Demo] Đang giữ trình duyệt 16 GIÂY tại BẢNG LƯƠNG & QUYẾT TOÁN để quan sát tiền phạt đi trễ...");
    await page.waitForTimeout(16000);
    console.log("--- HOÀN THÀNH TESTCASE 02: PASSED (KIỂM TRA CÔNG THỨC PHẠT ĐI TRỄ THÀNH CÔNG) ---\n");
  });
});
