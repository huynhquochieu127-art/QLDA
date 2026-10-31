import 'product.dart';

class CartItem {
  final ProductModel product;
  int quantity;
  String note;

  CartItem({
    required this.product,
    this.quantity = 1,
    this.note = '',
  });

  double get totalPrice => product.price * quantity;

  Map<String, dynamic> toJson() {
    return {
      'maSanPham': product.id,
      'tenSanPham': product.name,
      'soLuong': quantity,
      'donGia': product.price,
      'ghiChu': note,
    };
  }
}
