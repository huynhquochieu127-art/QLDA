import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/table_provider.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _voucherController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _validatingVoucher = false;
  String _voucherMessage = '';
  bool _voucherSuccess = false;
  String _paymentMethod = 'TIEN_MAT';
  bool _submitting = false;

  @override
  void dispose() {
    _voucherController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _applyVoucher(String code) async {
    final cart = Provider.of<CartProvider>(context, listen: false);
    final cleanCode = code.trim().toUpperCase();
    if (cleanCode.isEmpty) return;

    setState(() {
      _validatingVoucher = true;
      _voucherMessage = '';
    });

    try {
      final discount = await ApiService.validateDiscount(
        code: cleanCode,
        subtotal: cart.subtotal,
        customerId: cart.customerId,
        customerPoints: cart.customerPoints,
      );

      if (discount != null) {
        cart.applyDiscount(discount);
        setState(() {
          _voucherSuccess = true;
          _voucherMessage = discount.message;
          _voucherController.text = cleanCode;
        });
      }
    } catch (e) {
      setState(() {
        _voucherSuccess = false;
        _voucherMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      setState(() => _validatingVoucher = false);
    }
  }

  void _handleCheckout() async {
    final cart = Provider.of<CartProvider>(context, listen: false);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final tableProvider = Provider.of<TableProvider>(context, listen: false);

    if (cart.items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Giỏ hàng đang trống!')),
      );
      return;
    }

    setState(() => _submitting = true);

    final res = await cart.checkout(
      employeeId: auth.currentUser?.id ?? 1,
      paymentMethod: _paymentMethod,
    );

    setState(() => _submitting = false);

    if (res['success'] == true && mounted) {
      // Làm mới danh sách bàn
      tableProvider.fetchTables();

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 28),
              SizedBox(width: 8),
              Text('Thanh Toán Thành Công!'),
            ],
          ),
          content: Text(
            'Đơn hàng đã được lưu vào hệ thống cơ sở dữ liệu.\nTrạng thái bàn đã được cập nhật.',
            style: TextStyle(color: Colors.grey[800]),
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF5D4037),
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                Navigator.pop(ctx); // Đóng modal
                Navigator.pop(context); // Quay về màn hình trước
              },
              child: const Text('Xác nhận & Quay lại'),
            ),
          ],
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res['message'] ?? 'Thanh toán thất bại'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);
    final tableProvider = Provider.of<TableProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      appBar: AppBar(
        title: const Text('Giỏ Hàng & Thanh Toán'),
        backgroundColor: const Color(0xFF5D4037),
        foregroundColor: Colors.white,
        actions: [
          if (cart.items.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep),
              tooltip: 'Xóa giỏ hàng',
              onPressed: () => cart.clear(),
            ),
        ],
      ),
      body: cart.items.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.remove_shopping_cart_outlined, size: 80, color: Colors.brown[200]),
                  const SizedBox(height: 16),
                  const Text('Giỏ hàng đang trống', style: TextStyle(fontSize: 18, color: Colors.black54)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF5D4037),
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Xem Thực Đơn Gọi Món'),
                  ),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Chọn bàn phục vụ
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          const Icon(Icons.table_bar, color: Colors.brown),
                          const SizedBox(width: 12),
                          const Text('Bàn phục vụ:', style: TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: DropdownButton<int?>(
                              value: cart.selectedTable?.id,
                              isExpanded: true,
                              hint: const Text('Mang về / Chưa gán bàn'),
                              underline: const SizedBox(),
                              items: [
                                const DropdownMenuItem<int?>(
                                  value: null,
                                  child: Text('Mang về (Take-away)'),
                                ),
                                ...tableProvider.tables.map(
                                  (t) => DropdownMenuItem<int?>(
                                    value: t.id,
                                    child: Text('Bàn ${t.name} (${t.areaName})'),
                                  ),
                                ),
                              ],
                              onChanged: (tableId) {
                                if (tableId == null) {
                                  cart.setTable(null);
                                } else {
                                  final match = tableProvider.tables.firstWhere((t) => t.id == tableId);
                                  cart.setTable(match);
                                }
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),
                  const Text('Món đã chọn:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),

                  // Danh sách các món trong giỏ
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: cart.itemList.length,
                    separatorBuilder: (_, index) => const Divider(height: 1),
                    itemBuilder: (ctx, idx) {
                      final item = cart.itemList[idx];
                      return Container(
                        color: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.product.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  const SizedBox(height: 2),
                                  Text(
                                    Formatters.formatCurrency(item.product.price),
                                    style: TextStyle(color: Colors.brown[700], fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline, size: 22, color: Colors.red),
                                  onPressed: () => cart.decreaseQuantity(item.product.id),
                                ),
                                Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline, size: 22, color: Color(0xFF5D4037)),
                                  onPressed: () => cart.addItem(item.product),
                                ),
                              ],
                            ),
                            SizedBox(
                              width: 80,
                              child: Text(
                                Formatters.formatCurrency(item.totalPrice),
                                textAlign: TextAlign.right,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 20),

                  // Ô nhập mã giảm giá Voucher
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.confirmation_number_outlined, color: Colors.orange, size: 20),
                              SizedBox(width: 8),
                              Text('Mã Giảm Giá (Voucher)', style: TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _voucherController,
                                  textCapitalization: TextCapitalization.characters,
                                  decoration: InputDecoration(
                                    hintText: 'Nhập mã (VD: GIAMGIA20K)',
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.brown[700],
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                onPressed: _validatingVoucher ? null : () => _applyVoucher(_voucherController.text),
                                child: _validatingVoucher
                                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                    : const Text('Áp Dụng'),
                              ),
                            ],
                          ),

                          if (_voucherMessage.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                _voucherMessage,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: _voucherSuccess ? Colors.green[700] : Colors.redAccent,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),

                          const SizedBox(height: 10),
                          const Text('Mã voucher gợi ý nhanh:', style: TextStyle(fontSize: 12, color: Colors.black54)),
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 6,
                            children: [
                              _buildVoucherChip('GIAMGIA20K', 'Giảm 20K'),
                              _buildVoucherChip('WELCOME10', 'Giảm 10%'),
                              _buildVoucherChip('GIAM10', 'Giảm 10K'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Phương thức thanh toán
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Phương thức thanh toán:', style: TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: ChoiceChip(
                                  avatar: const Icon(Icons.money, size: 18),
                                  label: const Center(child: Text('Tiền mặt')),
                                  selected: _paymentMethod == 'TIEN_MAT',
                                  selectedColor: Colors.brown[700],
                                  labelStyle: TextStyle(
                                    color: _paymentMethod == 'TIEN_MAT' ? Colors.white : Colors.black87,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  onSelected: (_) => setState(() => _paymentMethod = 'TIEN_MAT'),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: ChoiceChip(
                                  avatar: const Icon(Icons.qr_code, size: 18),
                                  label: const Center(child: Text('Chuyển khoản')),
                                  selected: _paymentMethod == 'CHUYEN_KHOAN',
                                  selectedColor: Colors.brown[700],
                                  labelStyle: TextStyle(
                                    color: _paymentMethod == 'CHUYEN_KHOAN' ? Colors.white : Colors.black87,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  onSelected: (_) => setState(() => _paymentMethod = 'CHUYEN_KHOAN'),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Bảng tổng hợp hóa đơn
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          _buildSummaryRow('Tạm tính:', Formatters.formatCurrency(cart.subtotal)),
                          if (cart.discountAmount > 0) ...[
                            const SizedBox(height: 8),
                            _buildSummaryRow(
                              'Giảm giá (${cart.appliedDiscount?.code}):',
                              '- ${Formatters.formatCurrency(cart.discountAmount)}',
                              valueColor: Colors.green[700],
                            ),
                          ],
                          const Divider(height: 20),
                          _buildSummaryRow(
                            'TỔNG THANH TOÁN:',
                            Formatters.formatCurrency(cart.finalTotal),
                            isBold: true,
                            fontSize: 18,
                            valueColor: const Color(0xFFBF360C),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Nút thanh toán
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF5D4037),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: _submitting
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.check_circle_outline, size: 22),
                      label: Text(
                        _submitting ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN THANH TOÁN',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      onPressed: _submitting ? null : _handleCheckout,
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  Widget _buildVoucherChip(String code, String desc) {
    return ActionChip(
      backgroundColor: Colors.orange[50],
      label: Text('$code ($desc)', style: const TextStyle(fontSize: 11)),
      onPressed: () => _applyVoucher(code),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isBold = false, double fontSize = 14, Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            color: Colors.black87,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            color: valueColor ?? Colors.black87,
          ),
        ),
      ],
    );
  }
}
