class LeaveRequestModel {
  final int id;
  final int employeeId;
  final String? employeeCode;
  final String employeeName;
  final String? position;
  final String startDate;
  final String? endDate;
  final String reason;
  final String leaveType;
  final String status;
  final String? managerNote;
  final String? createdAt;
  final String? shiftWarning;

  LeaveRequestModel({
    required this.id,
    required this.employeeId,
    this.employeeCode,
    required this.employeeName,
    this.position,
    required this.startDate,
    this.endDate,
    required this.reason,
    this.leaveType = 'Nghỉ phép',
    required this.status,
    this.managerNote,
    this.createdAt,
    this.shiftWarning,
  });

  factory LeaveRequestModel.fromJson(Map<String, dynamic> json) {
    return LeaveRequestModel(
      id: json['MaDon'] ?? json['id'] ?? 0,
      employeeId: json['MaNhanVien'] ?? json['employeeId'] ?? 0,
      employeeCode: json['MaNhanVienCode'] ?? json['employeeCode'],
      employeeName: json['TenNhanVien'] ?? json['HoTen'] ?? json['employeeName'] ?? 'Nhân viên',
      position: json['ChucVu'] ?? json['position'],
      startDate: json['NgayNghi'] ?? json['startDate'] ?? '',
      endDate: json['NgayNghiDen'] ?? json['endDate'],
      reason: json['LyDo'] ?? json['reason'] ?? '',
      leaveType: json['LoaiNghi'] ?? json['leaveType'] ?? 'Nghỉ phép',
      status: json['TrangThai'] ?? json['status'] ?? 'pending',
      managerNote: json['GhiChuQL'] ?? json['managerNote'],
      createdAt: json['NgayTao'] ?? json['createdAt'],
      shiftWarning: json['shiftWarning'],
    );
  }

  bool get isPending => status == 'pending';
  bool get isApproved => status == 'approved';
  bool get isRejected => status == 'rejected';

  String get statusText {
    switch (status) {
      case 'approved':
        return 'Đã duyệt';
      case 'rejected':
        return 'Từ chối';
      default:
        return 'Chờ duyệt';
    }
  }
}
