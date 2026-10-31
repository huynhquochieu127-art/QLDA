import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../models/discount.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../utils/formatters.dart';

class DiscountsScreen extends StatefulWidget {
  final Function(String code)? onSelectCode;

  const DiscountsScreen({super.key, this.onSelectCode});

  @override
  State<DiscountsScreen> createState() => _DiscountsScreenState();
}

class _DiscountsScreenState extends State<DiscountsScreen> {
  bool _isLoading = true;
  List<DiscountModel> _discounts = [];

  @override
  void initState() {
    super.initState();
    _fetchDiscounts();
  }

  Future<void> _fetchDiscounts() async {
    setState(() => _isLoading = true);
    final list = await ApiService.getDiscounts();
    if (mounted) {
      setState(() {
        _discounts = list;
        _isLoading = false;
      });
    }
  }

  // Dialog Thêm Voucher mới (Admin / Quản lý)
  void _showAddDiscountDialog() {
    final formKey = GlobalKey<FormState>();
    final codeCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final valueCtrl = TextEditingController();
    final minOrderCtrl = TextEditingController(text: '0');
    final minPointsCtrl = TextEditingController(text: '0');
    final maxDiscountCtrl = TextEditingController();

    String discountType = 'percent'; // 'percent' hoặc 'fixed'

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Row(
              children: [
                Icon(Icons.local_offer, color: Color(0xFF5D4037)),
                SizedBox(width: 8),
                Text('Tạo Mã Giảm Giá Mới', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              ],
            ),
            content: SizedBox(
              width: MediaQuery.of(context).size.width * 0.9,
              child: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        controller: codeCtrl,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(
                          labelText: 'Mã Code (ví dụ: BANMOI, CAFE10) *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập mã code' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: nameCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Tên chiến dịch khuyến mãi *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập tên' : null,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: discountType,
                        decoration: const InputDecoration(labelText: 'Loại giảm giá', border: OutlineInputBorder()),
                        items: const [
                          DropdownMenuItem(value: 'percent', child: Text('Giảm theo phần trăm (%)')),
                          DropdownMenuItem(value: 'fixed', child: Text('Giảm số tiền cố định (VNĐ)')),
                        ],
                        onChanged: (val) {
                          if (val != null) setDialogState(() => discountType = val);
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: valueCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: discountType == 'percent' ? 'Phần trăm giảm (1 - 100) *' : 'Số tiền giảm (VNĐ) *',
                          border: const OutlineInputBorder(),
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Vui lòng nhập giá trị giảm';
                          final numVal = double.tryParse(v);
                          if (numVal == null || numVal <= 0) return 'Giá trị phải lớn hơn 0';
                          if (discountType == 'percent' && numVal > 100) return 'Phần trăm tối đa là 100%';
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: minOrderCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Đơn hàng tối thiểu (VNĐ)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: minPointsCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Điểm tích lũy tối thiểu (0 nếu không cần)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      if (discountType == 'percent') ...[
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: maxDiscountCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Số tiền giảm tối đa (VNĐ, tùy chọn)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(dialogCtx), child: const Text('Hủy', style: TextStyle(color: Colors.grey))),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF5D4037), foregroundColor: Colors.white),
                onPressed: () async {
                  if (!formKey.currentState!.validate()) return;
                  Navigator.pop(dialogCtx);

                  final val = double.tryParse(valueCtrl.text) ?? 0;
                  final minOrder = double.tryParse(minOrderCtrl.text) ?? 0;
                  final minPts = int.tryParse(minPointsCtrl.text) ?? 0;
                  final maxDisc = double.tryParse(maxDiscountCtrl.text);

                  final res = await ApiService.createDiscount(
                    maCode: codeCtrl.text,
                    tenMG: nameCtrl.text,
                    loaiGiam: discountType,
                    giaTriGiam: val,
                    donHangToiThieu: minOrder,
                    diemToiThieu: minPts,
                    giaTriToiDa: maxDisc,
                  );

                  if (!mounted) return;
                  if (res['success'] == true) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Tạo mã giảm giá thành công!'), backgroundColor: Colors.green),
                    );
                    _fetchDiscounts();
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(res['message'] ?? 'Tạo mã giảm giá thất bại!'), backgroundColor: Colors.red),
                    );
                  }
                },
                child: const Text('Tạo mã'),
              ),
            ],
          );
        },
      ),
    );
  }

  // Xác nhận Xóa Voucher (Admin)
  void _confirmDeleteDiscount(DiscountModel item) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.red, size: 28),
            SizedBox(width: 8),
            Text('Xác Nhận Xóa', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text('Bạn có chắc chắn muốn xóa mã voucher "${item.code}" (${item.name})?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy', style: TextStyle(color: Colors.grey))),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.pop(ctx);
              final ok = await ApiService.deleteDiscount(item.id);
              if (!mounted) return;
              if (ok) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã xóa mã voucher thành công!'), backgroundColor: Colors.green),
                );
                _fetchDiscounts();
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Xóa mã voucher thất bại!'), backgroundColor: Colors.red),
                );
              }
            },
            child: const Text('Xóa ngay'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;
    final canManage = user?.canManageDiscounts == true;

    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      appBar: AppBar(
        title: const Text('Chiến Dịch Khuyến Mãi', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF5D4037),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Làm mới',
            onPressed: _fetchDiscounts,
          ),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              backgroundColor: const Color(0xFF5D4037),
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: const Text('Thêm Voucher', style: TextStyle(fontWeight: FontWeight.bold)),
              onPressed: _showAddDiscountDialog,
            )
          : null,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF5D4037)))
          : _discounts.isEmpty
              ? const Center(
                  child: Text('Hiện không có mã giảm giá nào', style: TextStyle(color: Colors.black54)),
                )
              : RefreshIndicator(
                  onRefresh: _fetchDiscounts,
                  color: const Color(0xFF5D4037),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                    itemCount: _discounts.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (ctx, idx) {
                      final item = _discounts[idx];
                      final isPercent = item.type.toUpperCase().contains('PERCENT') || item.type.toUpperCase().contains('PHAN_TRAM');
                      final discountDisplay = isPercent ? '${item.value.toInt()}%' : Formatters.formatCurrency(item.value);

                      return Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 2,
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.amber.shade200, width: 1),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.amber.shade50,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(Icons.local_offer, color: Colors.amber.shade800, size: 28),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF5D4037),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              item.code,
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontWeight: FontWeight.bold,
                                                letterSpacing: 1,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Giảm $discountDisplay',
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              color: Colors.green.shade700,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        item.name,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Đơn tối thiểu: ${Formatters.formatCurrency(item.minOrder)}'
                                        '${item.minPoints > 0 ? " • Cần ${item.minPoints} điểm" : ""}',
                                        style: const TextStyle(color: Colors.black54, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                                // Sao chép mã
                                IconButton(
                                  icon: const Icon(Icons.copy, color: Color(0xFF5D4037)),
                                  tooltip: 'Sao chép mã',
                                  onPressed: () {
                                    Clipboard.setData(ClipboardData(text: item.code));
                                    if (widget.onSelectCode != null) {
                                      widget.onSelectCode!(item.code);
                                      Navigator.pop(context);
                                    } else {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('Đã sao chép mã: ${item.code}'),
                                          backgroundColor: Colors.green,
                                          duration: const Duration(seconds: 2),
                                        ),
                                      );
                                    }
                                  },
                                ),
                                // Xóa mã nếu là Admin
                                if (canManage)
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                                    tooltip: 'Xóa mã voucher',
                                    onPressed: () => _confirmDeleteDiscount(item),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
