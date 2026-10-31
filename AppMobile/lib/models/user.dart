class UserModel {
  final int id;
  final String username;
  final String email;
  final String hoTen;
  final String role; // 'admin', 'manager', 'staff'
  final String? token;

  UserModel({
    required this.id,
    required this.username,
    required this.email,
    required this.hoTen,
    required this.role,
    this.token,
  });

  factory UserModel.fromJson(Map<String, dynamic> json, {String? token}) {
    return UserModel(
      id: json['MaTaiKhoan'] ?? json['id'] ?? 0,
      username: json['TenDangNhap'] ?? json['username'] ?? '',
      email: json['Email'] ?? json['email'] ?? '',
      hoTen: json['HoTen'] ?? json['name'] ?? '',
      role: (json['VaiTro'] ?? json['role'] ?? 'staff').toString().toLowerCase(),
      token: token ?? json['token'] ?? json['accessToken'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'hoTen': hoTen,
      'role': role,
      'token': token,
    };
  }

  bool get isAdmin => role == 'admin';
  bool get isManager => role == 'manager' || role == 'quanly' || role == 'quản lý';
}
