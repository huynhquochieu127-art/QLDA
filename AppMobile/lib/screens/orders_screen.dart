import 'package:flutter/material.dart';
import '../models/order.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  bool _isLoading = true;
  List<OrderModel> _orders = [];
  String _selectedFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    setState(() => _isLoading = true);
    final list = await ApiService.getOrders(limit: 60);
    if (mounted) {
      setState(() {
        _orders = list;
        _isLoading = false;
      });
    }
  }

  Future<void> _changeStatus(OrderModel order, String newStatus) async {
    final success = await ApiService.updateOrderStatus(order.id, newStatus);
    if (success) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã cập nhật đơn #${order.id} sang "$newStatus"'),
            backgroundColor: Colors.green,
          ),
        );
      }
      _fetchOrders();
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cập nhật trạng thái thất bại!'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showStatusDialog(OrderModel order) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cập nhật đơn hàng #${order.id}',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                ListTile(
                  leading: const Icon(Icons.soup_kitchen, color: Colors.orange),
                  title: const Text('Đang pha chế'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _changeStatus(order, 'Đang pha chế');
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.check_circle_outline, color: Colors.blue),
                  title: const Text('Hoàn thành'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _changeStatus(order, 'Hoàn thành');
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.done_all, color: Colors.green),
                  title: const Text('Đã thanh toán'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _changeStatus(order, 'Đã thanh toán');
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.cancel_outlined, color: Colors.red),
                  title: const Text('Đã hủy'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _changeStatus(order, 'Đã hủy');
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    List<OrderModel> filtered = _orders;
    if (_selectedFilter == 'PENDING') {
      filtered = _orders.where((o) => o.status == 'Mới tạo' || o.status == 'Đang pha chế').toList();
    } else if (_selectedFilter == 'PAID') {
      filtered = _orders.where((o) => o.isPaid).toList();
    } else if (_selectedFilter == 'CANCELLED') {
      filtered = _orders.where((o) => o.status == 'Đã hủy').toList();
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      appBar: AppBar(
        title: const Text('Quản Lý Đơn Hàng', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF5D4037),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchOrders,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('Tất cả', 'ALL'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Chờ xử lý / Pha chế', 'PENDING'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Đã thanh toán', 'PAID'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Đã hủy', 'CANCELLED'),
                ],
              ),
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF5D4037)))
                : filtered.isEmpty
                    ? const Center(
                        child: Text('Không có đơn hàng nào', style: TextStyle(color: Colors.black54)),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchOrders,
                        color: const Color(0xFF5D4037),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: filtered.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 10),
                          itemBuilder: (ctx, idx) {
                            final order = filtered[idx];
                            return _buildOrderCard(order);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedFilter == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => setState(() => _selectedFilter = value),
      selectedColor: const Color(0xFF5D4037),
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : Colors.black87,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
      backgroundColor: Colors.grey.shade100,
    );
  }

  Widget _buildOrderCard(OrderModel order) {
    Color statusColor = Colors.orange;
    if (order.isPaid) {
      statusColor = Colors.green;
    } else if (order.status == 'Đã hủy') {
      statusColor = Colors.red;
    } else if (order.status == 'Đang pha chế') {
      statusColor = Colors.amber.shade800;
    }

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 1,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => _showStatusDialog(order),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF5D4037).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '#${order.id}',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF5D4037), fontSize: 13),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        order.tableId != null ? 'Bàn ${order.tableId}' : 'Mang về',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      order.formattedStatus,
                      style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 11),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'PT: ${order.paymentMethod == "TIEN_MAT" ? "Tiền mặt" : "Chuyển khoản"}',
                    style: const TextStyle(color: Colors.black54, fontSize: 13),
                  ),
                  Text(
                    Formatters.formatCurrency(order.total),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF5D4037)),
                  ),
                ],
              ),
              if (order.discount > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    'Đã giảm: ${Formatters.formatCurrency(order.discount)}',
                    style: TextStyle(color: Colors.green.shade700, fontSize: 12),
                  ),
                ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    order.orderDate,
                    style: const TextStyle(color: Colors.black38, fontSize: 11),
                  ),
                  const Text(
                    'Chạm để đổi trạng thái',
                    style: TextStyle(color: Colors.blue, fontSize: 11, fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
