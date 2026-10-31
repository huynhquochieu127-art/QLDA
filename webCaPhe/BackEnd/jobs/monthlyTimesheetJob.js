/**
 * BackEnd/jobs/monthlyTimesheetJob.js
 * Tiến trình chạy ngầm (Background Job):
 * - Tự động chạy vào NGÀY CUỐI CÙNG CỦA THÁNG.
 * - Lấy toàn bộ dữ liệu Check-in/out hợp lệ của từng nhân viên từ máy chủ.
 * - Tính tổng: Số giờ làm (Part-time) và Số ngày công (Full-time).
 * - Xuất ra "Bảng công nháp" (Draft) lưu vào CSDL bảng `bangcong_thang`.
 */

const timesheetController = require("../controllers/timesheetController");

// Lưu vết tháng đã chạy gần nhất để tránh chạy lặp lại nhiều lần trong cùng ngày cuối tháng
let lastProcessedMonthKey = null;

/**
 * Kiểm tra và thực thi Job nếu hôm nay là ngày cuối cùng của tháng
 */
async function checkAndRunMonthlyTimesheetJob(options = {}) {
  const force = options.force === true;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  // Kiểm tra ngày cuối tháng
  const isLastDay = timesheetController.isLastDayOfMonth(now);

  if (!isLastDay && !force) {
    return {
      ran: false,
      reason: `Hôm nay không phải ngày cuối cùng của tháng (${now.toLocaleDateString("vi-VN")}).`,
    };
  }

  // Nếu trong ngày cuối tháng đã chạy thành công rồi và không có cờ force thì không chạy lại
  if (lastProcessedMonthKey === currentMonthKey && !force) {
    return {
      ran: false,
      reason: `Job tổng hợp Bảng công nháp cho tháng ${currentMonthKey} đã được thực thi trước đó trong ngày.`,
    };
  }

  console.log(`\n======================================================`);
  console.log(`⏳ [JOB TIẾN TRÌNH CHẠY NGẦM] Bắt đầu tổng hợp Bảng công nháp ngày cuối tháng (${currentMonth}/${currentYear})...`);
  console.log(`======================================================`);

  try {
    const result = await timesheetController.generateDraftTimesheetInternal(
      currentMonth,
      currentYear,
      { force: true }
    );

    if (result.success) {
      lastProcessedMonthKey = currentMonthKey;
      console.log(`✅ [JOB TIẾN TRÌNH CHẠY NGẦM] THÀNH CÔNG:`);
      console.log(`   - Tổng số nhân viên: ${result.summary.tongNhanVien}`);
      console.log(`   - Full-time: ${result.summary.nhanVienFullTime} nhân viên (Tổng công: ${result.summary.tongCongFullTime} ngày công)`);
      console.log(`   - Part-time: ${result.summary.nhanVienPartTime} nhân viên (Tổng giờ: ${result.summary.tongGioPartTime} giờ làm)`);
      console.log(`   - Trạng thái: DRAFT (Bảng công nháp)`);
      console.log(`======================================================\n`);
    } else {
      console.warn(`⚠️ [JOB TIẾN TRÌNH CHẠY NGẦM] Cảnh báo: ${result.message}`);
    }

    return { ran: true, result };
  } catch (error) {
    console.error(`❌ [JOB TIẾN TRÌNH CHẠY NGẦM] Lỗi khi tổng hợp:`, error.message);
    return { ran: false, error: error.message };
  }
}

/**
 * Khởi động tiến trình chạy ngầm định kỳ (Kiểm tra mỗi giờ một lần)
 */
function startMonthlyTimesheetJob() {
  console.log("🚀 [Background Job] Đã kích hoạt tiến trình theo dõi Bảng công nháp ngày cuối tháng.");

  // Kiểm tra ngay khi khởi động
  checkAndRunMonthlyTimesheetJob().catch((e) => console.warn("Lỗi kiểm tra ban đầu:", e.message));

  // Kiểm tra định kỳ mỗi 60 phút
  const intervalMs = 60 * 60 * 1000;
  setInterval(() => {
    checkAndRunMonthlyTimesheetJob().catch((e) =>
      console.warn("Lỗi chu kỳ Job bảng công:", e.message)
    );
  }, intervalMs);
}

module.exports = {
  checkAndRunMonthlyTimesheetJob,
  startMonthlyTimesheetJob,
};
