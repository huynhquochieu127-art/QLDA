class CustomerModel {
  final int id;
  final String name;
  final String phone;
  final String? dob;
  final String? email;
  final int points;
  final String rank;

  CustomerModel({
    required this.id,
    required this.name,
    required this.phone,
    this.dob,
    this.email,
    this.points = 0,
    this.rank = 'Đồng',
  });

  factory CustomerModel.fromJson(Map<String, dynamic> json) {
    return CustomerModel(
      id: json['id'] ?? json['MaKhachHang'] ?? 0,
      name: json['name'] ?? json['HoTen'] ?? '',
      phone: json['phone'] ?? json['SoDienThoai'] ?? '',
      dob: json['dob'] ?? json['NgaySinh'],
      email: json['email'] ?? json['Email'],
      points: json['points'] ?? json['DiemTichLuy'] ?? 0,
      rank: json['rank'] ?? json['rank_level'] ?? 'Đồng',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'dob': dob,
      'email': email,
      'points': points,
      'rank': rank,
    };
  }
}
