class DiscountModel {
  final int id;
  final String code;
  final String name;
  final String type; // 'PERCENT' / 'FIXED' / 'PHAN_TRAM' / 'SO_TIEN'
  final double value;
  final double minOrder;
  final int minPoints;
  final double discountAmount;
  final String message;
  final bool isActive;

  DiscountModel({
    this.id = 0,
    required this.code,
    required this.name,
    this.type = 'FIXED',
    this.value = 0.0,
    this.minOrder = 0.0,
    this.minPoints = 0,
    required this.discountAmount,
    required this.message,
    this.isActive = true,
  });

  factory DiscountModel.fromJson(Map<String, dynamic> json) {
    final data = json['data'] ?? json['discount'] ?? json;
    final amount = double.tryParse((json['soTienGiam'] ??
            json['giamGia'] ??
            json['discountAmount'] ??
            data['soTienGiam'] ??
            data['discountAmount'] ??
            data['amount'] ??
            0)
        .toString()) ?? 0.0;

    final val = double.tryParse((data['GiaTri'] ?? data['GiaTriGiam'] ?? data['value'] ?? 0).toString()) ?? 0.0;
    final minOrd = double.tryParse((data['DonHangToiThieu'] ?? data['GiaTriToiThieu'] ?? data['minOrder'] ?? 0).toString()) ?? 0.0;
    final pts = int.tryParse((data['DiemToiThieu'] ?? data['minPoints'] ?? 0).toString()) ?? 0;
    final active = (data['TrangThai'] == 1 || data['TrangThai'] == true || data['isActive'] == true);

    return DiscountModel(
      id: data['MaMG'] ?? data['id'] ?? 0,
      code: (data['MaCode'] ?? data['maCode'] ?? data['code'] ?? data['maGiamGia'] ?? '').toString().toUpperCase(),
      name: data['TenMG'] ?? data['tenKhuyenMai'] ?? data['name'] ?? 'Mã giảm giá',
      type: (data['LoaiGiam'] ?? data['type'] ?? 'FIXED').toString(),
      value: val,
      minOrder: minOrd,
      minPoints: pts,
      discountAmount: amount > 0 ? amount : val,
      message: json['message'] ?? 'Áp dụng mã thành công!',
      isActive: active,
    );
  }
}
