class DiscountModel {
  final String code;
  final String name;
  final double discountAmount;
  final String message;

  DiscountModel({
    required this.code,
    required this.name,
    required this.discountAmount,
    required this.message,
  });

  factory DiscountModel.fromJson(Map<String, dynamic> json) {
    final data = json['data'] ?? json['discount'] ?? json;
    final amount = (json['soTienGiam'] ??
            json['giamGia'] ??
            json['discountAmount'] ??
            data['soTienGiam'] ??
            data['discountAmount'] ??
            data['amount'] ??
            0)
        .toDouble();

    return DiscountModel(
      code: (data['maCode'] ?? data['code'] ?? data['maGiamGia'] ?? '').toString().toUpperCase(),
      name: data['tenKhuyenMai'] ?? data['name'] ?? 'Mã giảm giá',
      discountAmount: amount,
      message: json['message'] ?? 'Áp dụng mã thành công!',
    );
  }
}
