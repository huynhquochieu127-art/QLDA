class OrderModel {
  final int id;
  final int? tableId;
  final int? employeeId;
  final int? customerId;
  final double subtotal;
  final double discount;
  final double total;
  final String paymentMethod;
  final String status;
  final String orderDate;

  OrderModel({
    required this.id,
    this.tableId,
    this.employeeId,
    this.customerId,
    required this.subtotal,
    required this.discount,
    required this.total,
    required this.paymentMethod,
    required this.status,
    required this.orderDate,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['MaDonHang'] ?? json['id'] ?? 0,
      tableId: json['MaBan'] != null ? int.tryParse(json['MaBan'].toString()) : null,
      employeeId: json['MaNhanVien'] != null ? int.tryParse(json['MaNhanVien'].toString()) : null,
      customerId: json['MaKhachHang'] != null ? int.tryParse(json['MaKhachHang'].toString()) : null,
      subtotal: double.tryParse((json['TongTien'] ?? json['tongTien'] ?? 0).toString()) ?? 0.0,
      discount: double.tryParse((json['GiamGia'] ?? json['giamGia'] ?? 0).toString()) ?? 0.0,
      total: double.tryParse((json['ThanhTien'] ?? json['thanhTien'] ?? 0).toString()) ?? 0.0,
      paymentMethod: json['PhuongThucThanhToan'] ?? json['phuongThucTT'] ?? 'TIEN_MAT',
      status: json['TrangThai'] ?? json['status'] ?? 'Mới tạo',
      orderDate: json['NgayDat'] ?? json['createdAt'] ?? '',
    );
  }

  String get formattedStatus {
    switch (status.toLowerCase()) {
      case 'da_thanh_toan':
      case 'đã thanh toán':
      case 'completed':
        return 'Đã thanh toán';
      case 'đang pha chế':
      case 'processing':
        return 'Đang pha chế';
      case 'hoàn thành':
        return 'Hoàn thành';
      case 'đã hủy':
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  }

  bool get isPaid =>
      status.toLowerCase().contains('thanh toán') ||
      status == 'DA_THANH_TOAN' ||
      status.toLowerCase() == 'completed';
}
