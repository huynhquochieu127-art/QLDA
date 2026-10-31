class EmployeeModel {
  final int id;
  final String code;
  final String name;
  final String? email;
  final String? phone;
  final String position;
  final String contractType; // Full-time / Part-time
  final double? salary;
  final String? salaryType; // HOURLY / MONTHLY
  final String status;

  EmployeeModel({
    required this.id,
    required this.code,
    required this.name,
    this.email,
    this.phone,
    required this.position,
    this.contractType = 'Part-time',
    this.salary,
    this.salaryType,
    this.status = 'active',
  });

  factory EmployeeModel.fromJson(Map<String, dynamic> json) {
    return EmployeeModel(
      id: json['MaNhanVien'] ?? json['id'] ?? 0,
      code: json['MaNhanVienCode'] ?? json['code'] ?? '',
      name: json['HoTen'] ?? json['name'] ?? '',
      email: json['Email'] ?? json['email'],
      phone: json['SoDienThoai'] ?? json['phone'],
      position: json['ChucVu'] ?? json['position'] ?? 'Nhân viên',
      contractType: json['LoaiNhanVien'] ?? json['contractType'] ?? 'Part-time',
      salary: json['LuongCoBan'] != null ? double.tryParse(json['LuongCoBan'].toString()) : null,
      salaryType: json['LoaiLuong'] ?? json['salaryType'],
      status: json['TrangThai'] ?? json['status'] ?? 'active',
    );
  }
}
