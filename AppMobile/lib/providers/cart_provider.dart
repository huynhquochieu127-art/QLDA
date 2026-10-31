import 'dart:math';
import 'package:flutter/material.dart';
import '../models/cart_item.dart';
import '../models/product.dart';
import '../models/table.dart';
import '../models/discount.dart';
import '../services/api_service.dart';

class CartProvider extends ChangeNotifier {
  final Map<int, CartItem> _items = {};
  TableModel? _selectedTable;
  DiscountModel? _appliedDiscount;
  String? _customerPhone;
  int _customerPoints = 0;
  int? _customerId;

  Map<int, CartItem> get items => _items;
  List<CartItem> get itemList => _items.values.toList();
  TableModel? get selectedTable => _selectedTable;
  DiscountModel? get appliedDiscount => _appliedDiscount;
  String? get customerPhone => _customerPhone;
  int get customerPoints => _customerPoints;
  int? get customerId => _customerId;

  int get totalItemCount =>
      _items.values.fold(0, (sum, item) => sum + item.quantity);

  double get subtotal =>
      _items.values.fold(0.0, (sum, item) => sum + item.totalPrice);

  double get discountAmount => _appliedDiscount?.discountAmount ?? 0.0;

  double get finalTotal => max(0.0, subtotal - discountAmount);
  double get total => finalTotal;

  int getItemQuantity(int productId) => _items[productId]?.quantity ?? 0;

  void setTable(TableModel? table) {
    _selectedTable = table;
    notifyListeners();
  }

  void setCustomer({int? id, String? phone, int points = 0}) {
    _customerId = id;
    _customerPhone = phone;
    _customerPoints = points;
    notifyListeners();
  }

  void clearCustomer() {
    _customerId = null;
    _customerPhone = null;
    _customerPoints = 0;
    notifyListeners();
  }

  void addItem(ProductModel product) {
    if (_items.containsKey(product.id)) {
      _items[product.id]!.quantity += 1;
    } else {
      _items[product.id] = CartItem(product: product, quantity: 1);
    }
    // Tự động kiểm tra lại giảm giá nếu cần
    notifyListeners();
  }

  void removeItem(int productId) {
    _items.remove(productId);
    if (_items.isEmpty) {
      _appliedDiscount = null;
    }
    notifyListeners();
  }

  void decreaseQuantity(int productId) {
    if (!_items.containsKey(productId)) return;
    if (_items[productId]!.quantity > 1) {
      _items[productId]!.quantity -= 1;
    } else {
      _items.remove(productId);
    }
    if (_items.isEmpty) {
      _appliedDiscount = null;
    }
    notifyListeners();
  }

  void applyDiscount(DiscountModel discount) {
    _appliedDiscount = discount;
    notifyListeners();
  }

  void removeDiscount() {
    _appliedDiscount = null;
    notifyListeners();
  }

  void clear() {
    _items.clear();
    _selectedTable = null;
    _appliedDiscount = null;
    _customerPhone = null;
    _customerPoints = 0;
    _customerId = null;
    notifyListeners();
  }

  Future<Map<String, dynamic>> checkout({
    required int employeeId,
    String paymentMethod = 'TIEN_MAT',
    double? customerCash,
  }) async {
    if (_items.isEmpty) {
      return {'success': false, 'message': 'Giỏ hàng đang trống!'};
    }

    final itemsPayload = _items.values.map((item) => item.toJson()).toList();

    final res = await ApiService.checkout(
      tableId: _selectedTable?.id,
      employeeId: employeeId,
      customerId: _customerId,
      items: itemsPayload,
      subtotal: subtotal,
      discount: discountAmount,
      total: finalTotal,
      discountCode: _appliedDiscount?.code,
      paymentMethod: paymentMethod,
      customerCash: customerCash,
    );

    if (res['success'] == true) {
      clear();
    }
    return res;
  }
}
