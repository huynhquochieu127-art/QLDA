import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/table.dart';
import '../providers/table_provider.dart';
import '../providers/cart_provider.dart';
import 'cart_screen.dart';

class TablesScreen extends StatefulWidget {
  final Function(int tabIndex)? onNavigateTab;

  const TablesScreen({super.key, this.onNavigateTab});

  @override
  State<TablesScreen> createState() => _TablesScreenState();
}

class _TablesScreenState extends State<TablesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TableProvider>(context, listen: false).fetchTables();
    });
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'CO_KHACH':
        return const Color(0xFFE53935); // Red
      case 'DAT_TRUOC':
        return const Color(0xFFFB8C00); // Amber
      default:
        return const Color(0xFF43A047); // Green
    }
  }

  void _showTableActionDialog(TableModel table) {
    final cartProvider = Provider.of<CartProvider>(context, listen: false);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Bàn ${table.name}',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor(table.status).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      table.statusDisplay,
                      style: TextStyle(
                        color: _getStatusColor(table.status),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Khu vực: ${table.areaName} • Sức chứa: ${table.seats} người',
                style: const TextStyle(color: Colors.black54),
              ),
              const Divider(height: 28),

              // Action 1: Gọi món cho bàn này
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.brown[50], shape: BoxShape.circle),
                  child: const Icon(Icons.restaurant_menu, color: Colors.brown),
                ),
                title: const Text('Gọi món cho bàn này', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('Mở thực đơn và tự động gán đơn hàng vào bàn'),
                onTap: () {
                  Navigator.pop(ctx);
                  cartProvider.setTable(table);
                  if (widget.onNavigateTab != null) {
                    widget.onNavigateTab!(1); // Tab 1 là Menu Order
                  }
                },
              ),

              // Action 2: Đổi trạng thái bàn
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.blue[50], shape: BoxShape.circle),
                  child: const Icon(Icons.sync_alt, color: Colors.blue),
                ),
                title: const Text('Cập nhật trạng thái bàn'),
                subtitle: const Text('Trống • Có khách • Đặt trước'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showChangeStatusDialog(table);
                },
              ),

              if (table.isOccupied)
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.green[50], shape: BoxShape.circle),
                    child: const Icon(Icons.payment, color: Colors.green),
                  ),
                  title: const Text('Thanh toán / Trả bàn', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
                  onTap: () {
                    Navigator.pop(ctx);
                    cartProvider.setTable(table);
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CartScreen()));
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  void _showChangeStatusDialog(TableModel table) {
    final tableProvider = Provider.of<TableProvider>(context, listen: false);

    showDialog(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: Text('Đổi trạng thái: Bàn ${table.name}'),
        children: [
          SimpleDialogOption(
            onPressed: () async {
              Navigator.pop(ctx);
              await tableProvider.changeTableStatus(table.id, 'TRONG');
            },
            child: const Row(
              children: [
                Icon(Icons.check_circle, color: Color(0xFF43A047)),
                SizedBox(width: 10),
                Text('Bàn trống (Sẵn sàng đón khách)'),
              ],
            ),
          ),
          SimpleDialogOption(
            onPressed: () async {
              Navigator.pop(ctx);
              await tableProvider.changeTableStatus(table.id, 'CO_KHACH');
            },
            child: const Row(
              children: [
                Icon(Icons.people, color: Color(0xFFE53935)),
                SizedBox(width: 10),
                Text('Có khách (Đang phục vụ)'),
              ],
            ),
          ),
          SimpleDialogOption(
            onPressed: () async {
              Navigator.pop(ctx);
              await tableProvider.changeTableStatus(table.id, 'DAT_TRUOC');
            },
            child: const Row(
              children: [
                Icon(Icons.bookmark, color: Color(0xFFFB8C00)),
                SizedBox(width: 10),
                Text('Đặt trước (Khách đã hẹn)'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tableProvider = Provider.of<TableProvider>(context);
    final tables = tableProvider.filteredTables;

    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      body: RefreshIndicator(
        onRefresh: tableProvider.fetchTables,
        color: Colors.brown[700],
        child: Column(
          children: [
            // Thanh thống kê trạng thái nhanh
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: Colors.white,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildStatItem('Tổng bàn', '${tableProvider.totalTables}', Colors.blueGrey),
                  _buildStatItem('Bàn trống', '${tableProvider.availableCount}', const Color(0xFF43A047)),
                  _buildStatItem('Có khách', '${tableProvider.occupiedCount}', const Color(0xFFE53935)),
                ],
              ),
            ),

            // Bộ lọc khu vực (Tất cả, Tầng 1, Tầng 2, Ngoài trời)
            Container(
              height: 48,
              margin: const EdgeInsets.symmetric(vertical: 8),
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  _buildAreaChip('Tất cả khu vực', 0, tableProvider),
                  _buildAreaChip('Tầng 1', 1, tableProvider),
                  _buildAreaChip('Tầng 2', 2, tableProvider),
                  _buildAreaChip('Ngoài trời', 3, tableProvider),
                ],
              ),
            ),

            // Lưới hiển thị các bàn
            Expanded(
              child: tableProvider.isLoading
                  ? const Center(child: CircularProgressIndicator(color: Colors.brown))
                  : tables.isEmpty
                      ? const Center(child: Text('Không có bàn nào trong khu vực này.'))
                      : GridView.builder(
                          padding: const EdgeInsets.all(12),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 1.25,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                          itemCount: tables.length,
                          itemBuilder: (ctx, index) {
                            final table = tables[index];
                            final color = _getStatusColor(table.status);

                            return InkWell(
                              onTap: () => _showTableActionDialog(table),
                              borderRadius: BorderRadius.circular(14),
                              child: Card(
                                elevation: 2,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  side: BorderSide(color: color.withValues(alpha: 0.5), width: 1.5),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            table.name,
                                            style: const TextStyle(
                                              fontSize: 20,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF3E2723),
                                            ),
                                          ),
                                          Container(
                                            width: 12,
                                            height: 12,
                                            decoration: BoxDecoration(
                                              color: color,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                        ],
                                      ),
                                      Row(
                                        children: [
                                          const Icon(Icons.people_outline, size: 16, color: Colors.black54),
                                          const SizedBox(width: 4),
                                          Text('${table.seats} chỗ', style: const TextStyle(fontSize: 13, color: Colors.black54)),
                                          const Spacer(),
                                          Text(table.areaName, style: const TextStyle(fontSize: 12, color: Colors.black45)),
                                        ],
                                      ),
                                      Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.symmetric(vertical: 4),
                                        decoration: BoxDecoration(
                                          color: color.withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Center(
                                          child: Text(
                                            table.statusDisplay,
                                            style: TextStyle(
                                              color: color,
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
      ],
    );
  }

  Widget _buildAreaChip(String label, int areaId, TableProvider provider) {
    final isSelected = provider.selectedArea == areaId;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        selectedColor: Colors.brown[700],
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : Colors.brown[800],
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        onSelected: (_) => provider.selectArea(areaId),
      ),
    );
  }
}
