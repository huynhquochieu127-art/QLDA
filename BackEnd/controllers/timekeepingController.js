// BackEnd/controllers/timekeepingController.js (Hoặc file tương ứng trong dự án của bạn)

// 1. API Lấy danh sách yêu cầu bổ sung điểm danh đang chờ duyệt
exports.getPendingSupplementRequests = async (req, res) => {
  try {
    // Giả sử bạn dùng Sequelize / Prisma / MySQL2 hoặc Mongoose.
    // Dưới đây là cấu trúc truy vấn chuẩn (có thể điều chỉnh theo ORM thực tế của bạn):
    const requests = await SupplementRequest.findAll({
      where: { status: "PENDING" },
      include: [{ model: Employee, attributes: ["id", "fullName", "role"] }],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu:", error);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

// 2. API Duyệt yêu cầu bổ sung & Tự động tạo bản ghi Check-in/out
exports.approveSupplementRequest = async (req, res) => {
  const { id } = req.params; // ID của yêu cầu bổ sung điểm danh

  try {
    // Bước 1: Tìm yêu cầu bổ sung điểm danh
    const request = await SupplementRequest.findByPk(id);
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy yêu cầu!" });
    }

    if (request.status !== "PENDING") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Yêu cầu này đã được xử lý trước đó!",
        });
    }

    // Bước 2: Cập nhật trạng thái yêu cầu thành 'APPROVED'
    request.status = "APPROVED";
    request.approvedAt = new Date();
    await request.save();

    // Bước 3: Tự động sinh hoặc cập nhật bản ghi Check-in/out hợp lệ cho ngày bị thiếu
    // Giả sử request chứa: employeeId, date (YYYY-MM-DD), checkInTime (08:00:00), checkOutTime (17:00:00), shiftId
    let timekeepingRecord = await Timekeeping.findOne({
      where: {
        employeeId: request.employeeId,
        date: request.date,
      },
    });

    if (timekeepingRecord) {
      // Nếu ngày đó đã có bản ghi (VD: có check-in nhưng quên check-out) -> Cập nhật lại cho đủ
      timekeepingRecord.checkIn =
        request.checkInTime || timekeepingRecord.checkIn;
      timekeepingRecord.checkOut =
        request.checkOutTime || timekeepingRecord.checkOut;
      timekeepingRecord.status = "VALID"; // Đánh dấu hợp lệ để tính đủ công/lương
      timekeepingRecord.note = `Đã bổ sung điểm danh (Lý do: ${request.reason})`;
      await timekeepingRecord.save();
    } else {
      // Nếu ngày đó hoàn toàn chưa có bản ghi -> Tự động sinh bản ghi mới hợp lệ
      timekeepingRecord = await Timekeeping.create({
        employeeId: request.employeeId,
        date: request.date,
        shiftId: request.shiftId || null,
        checkIn: request.checkInTime || "08:00:00", // Giờ chuẩn của ca hoặc giờ nhân viên khai báo
        checkOut: request.checkOutTime || "17:00:00",
        status: "VALID", // Hợp lệ, không trừ lương
        isSupplemented: true,
        note: `Tự động sinh từ yêu cầu bổ sung #${request.id} (Lý do: ${request.reason})`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đã duyệt yêu cầu và tự động tạo bản ghi chấm công hợp lệ!",
      data: {
        request,
        timekeepingRecord,
      },
    });
  } catch (error) {
    console.error("Lỗi khi duyệt bổ sung điểm danh:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Lỗi máy chủ khi xử lý duyệt điểm danh",
      });
  }
};

// 3. API Từ chối yêu cầu (Bổ sung để giao diện Quản lý đầy đủ)
exports.rejectSupplementRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const request = await SupplementRequest.findByPk(id);
    if (!request || request.status !== "PENDING") {
      return res
        .status(400)
        .json({ success: false, message: "Yêu cầu không hợp lệ!" });
    }
    request.status = "REJECTED";
    await request.save();

    return res
      .status(200)
      .json({
        success: true,
        message: "Đã từ chối yêu cầu bổ sung điểm danh.",
      });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};
