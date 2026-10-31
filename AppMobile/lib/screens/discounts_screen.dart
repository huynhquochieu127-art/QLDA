import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/discount.dart';
import '../services/api_service.dart';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      appBar: AppBar(
        title: const Text('Chiến Dịch Khuyến Mãi', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF5D4037),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchDiscounts,
          ),
        ],
      ),
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
                    padding: const EdgeInsets.all(16),
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
                            padding: const EdgeInsets.all(16),
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
