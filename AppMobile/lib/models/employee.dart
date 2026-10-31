class EmployeeModel {
  final int id;
  final String code;
  final String name;
  final String? email;
  final String? phone;
  final String? cccd;
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
    this.cccd,
    required this.position,
    this.contractType = 'Part-time',
    this.salary,
    this.salaryType,
    this.status = 'active',
  });

  factory EmployeeModel.fromJson(Map<String, dynamic> json) {
    final rawSalary = json['Luong'] ?? json['base_salary'] ?? json['LuongCoBan'] ?? json['salary'];
    return EmployeeModel(
      id: json['MaNhanVien'] ?? json['id'] ?? 0,
      code: json['MaNhanVienCode'] ?? json['code'] ?? '',
      name: json['HoTen'] ?? json['name'] ?? '',
      email: json['Email'] ?? json['email'],
      phone: json['SoDienThoai'] ?? json['phone'],
      cccd: json['CCCD']?.toString() ?? json['cccd']?.toString(),
      position: json['ChucVu'] ?? json['position'] ?? 'Nhân viên',
      contractType: json['LoaiNhanVien'] ?? json['contractType'] ?? 'Part-time',
      salary: rawSalary != null ? double.tryParse(rawSalary.toString()) : null,
      salaryType: json['LoaiLuong'] ?? json['salaryType'],
      status: json['TrangThai'] ?? json['status'] ?? 'active',
    );
  }
}
