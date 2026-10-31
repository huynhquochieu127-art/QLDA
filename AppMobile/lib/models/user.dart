class UserModel {
  final int id;
  final int? maNhanVien;
  final String? maNhanVienCode;
  final String username;
  final String email;
  final String hoTen;
  final String role; // Chuỗi vai trò gốc từ server
  final int? maVaiTro;
  final String? chucVu;
  final String? loaiNhanVien;
  final String? token;

  UserModel({
    required this.id,
    this.maNhanVien,
    this.maNhanVienCode,
    required this.username,
    required this.email,
    required this.hoTen,
    required this.role,
    this.maVaiTro,
    this.chucVu,
    this.loaiNhanVien,
    this.token,
  });

  factory UserModel.fromJson(Map<String, dynamic> json, {String? token}) {
    final rawRole = (json['chucVu'] ??
            json['ChucVu'] ??
            json['position'] ??
            json['role'] ??
            json['VaiTro'] ??
            json['TenVaiTro'] ??
            '')
        .toString();

    final mv = json['maVaiTro'] ?? json['MaVaiTro'];
    final parsedMaVaiTro = mv != null ? int.tryParse(mv.toString()) : null;

    final mn = json['maNhanVien'] ?? json['MaNhanVien'];
    final parsedMaNhanVien = mn != null ? int.tryParse(mn.toString()) : null;

    final idVal = json['id'] ?? json['MaTaiKhoan'] ?? 0;
    final parsedId = idVal is int ? idVal : int.tryParse(idVal.toString()) ?? 0;

    return UserModel(
      id: parsedId,
      maNhanVien: parsedMaNhanVien,
      maNhanVienCode: json['maNhanVienCode'] ?? json['MaNhanVienCode'],
      username: json['username'] ?? json['TenDangNhap'] ?? json['email'] ?? '',
      email: json['email'] ?? json['Email'] ?? '',
      hoTen: json['hoTen'] ?? json['name'] ?? json['HoTen'] ?? '',
      role: rawRole,
      maVaiTro: parsedMaVaiTro,
      chucVu: json['chucVu'] ?? json['ChucVu'],
      loaiNhanVien: json['loaiNhanVien'] ?? json['LoaiNhanVien'] ?? 'Part-time',
      token: token ?? json['token'] ?? json['accessToken'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'maNhanVien': maNhanVien,
      'maNhanVienCode': maNhanVienCode,
      'username': username,
      'email': email,
      'hoTen': hoTen,
      'role': role,
      'maVaiTro': maVaiTro,
      'chucVu': chucVu,
      'loaiNhanVien': loaiNhanVien,
      'token': token,
    };
  }

  /// Chuẩn hóa vai trò giống hệt thuật toán của Web (home.jsx)
  String get normalizedRole {
    final lower = (chucVu ?? role).toLowerCase();
    if (lower.contains('admin') || lower == '1' || maVaiTro == 1) {
      return 'admin';
    } else if (lower.contains('quản lý') ||
        lower.contains('quan ly') ||
        lower.contains('manager') ||
        lower == '2' ||
        maVaiTro == 2) {
      return 'manager';
    } else if (lower.contains('pha chế') ||
        lower.contains('pha che') ||
        lower.contains('barista') ||
        lower == '3' ||
        maVaiTro == 3) {
      return 'barista';
    } else if (lower.contains('phục vụ') ||
        lower.contains('phuc vu') ||
        lower.contains('waiter') ||
        lower == '4' ||
        maVaiTro == 4) {
      return 'waiter';
    } else if (lower.contains('thu ngân') ||
        lower.contains('thu ngan') ||
        lower.contains('cashier')) {
      return 'cashier';
    }
    // Mặc định nhân viên là cashier/nhân viên bán hàng
    return 'cashier';
  }

  /// Tên vai trò hiển thị thân thiện tiếng Việt
  String get roleDisplayName {
    switch (normalizedRole) {
      case 'admin':
        return 'ADMIN QUẢN TRỊ';
      case 'manager':
        return 'QUẢN LÝ CỬA HÀNG';
      case 'cashier':
        return 'THU NGÂN';
      case 'barista':
        return 'PHA CHẾ / BẾP';
      case 'waiter':
        return 'NHÂN VIÊN PHỤC VỤ';
      default:
        return 'NHÂN VIÊN';
    }
  }

  // --- Kiểm tra vai trò nhanh ---
  bool get isAdmin => normalizedRole == 'admin';
  bool get isManager => normalizedRole == 'manager';
  bool get isCashier => normalizedRole == 'cashier';
  bool get isBarista => normalizedRole == 'barista';
  bool get isWaiter => normalizedRole == 'waiter';

  // --- Kiểm tra phân quyền chức năng chuẩn 100% như Web ---
  bool get canViewDashboard => isAdmin || isManager;
  bool get canViewRevenue => isAdmin || isManager;
  bool get canManageOrders => isAdmin || isManager || isCashier;
  bool get canViewTables => isAdmin || isManager || isCashier || isWaiter;
  bool get canOrderPos => isAdmin || isManager || isCashier || isWaiter;
  bool get canManageCustomers => isAdmin || isManager || isCashier;
  bool get canManageCategories => isAdmin || isManager;
  bool get canManageMenu => isAdmin || isManager || isBarista;
  bool get canEditProducts => isAdmin || isManager;
  bool get canToggleProductStatus => isAdmin || isManager || isBarista;
  bool get canManageDiscounts => isAdmin || isManager;
  bool get canApproveLeave => isAdmin || isManager;
  bool get canManageEmployees => isAdmin;
  bool get canViewAllTimekeeping => isAdmin || isManager;
}
