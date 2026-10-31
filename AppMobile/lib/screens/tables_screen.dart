import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/table.dart';
import '../providers/table_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
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

  // Dialog Thêm Bàn Mới (Admin)
  void _showAddTableDialog() {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final seatsCtrl = TextEditingController(text: '4');
    int selectedArea = 1;

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Row(
              children: [
                Icon(Icons.table_restaurant, color: Color(0xFF5D4037)),
                SizedBox(width: 8),
                Text('Thêm Bàn Mới', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              ],
            ),
            content: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Tên bàn (ví dụ: Bàn 09, VIP 1) *',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập tên bàn' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: seatsCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Số chỗ ngồi',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int>(
                    initialValue: selectedArea,
                    decoration: const InputDecoration(labelText: 'Khu vực', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 1, child: Text('Tầng 1 (Khu vực chính)')),
                      DropdownMenuItem(value: 2, child: Text('Tầng 2 (Yên tĩnh)')),
                      DropdownMenuItem(value: 3, child: Text('Ngoài trời (Sân vườn)')),
                    ],
                    onChanged: (val) {
                      if (val != null) setDialogState(() => selectedArea = val);
                    },
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(dialogCtx), child: const Text('Hủy', style: TextStyle(color: Colors.grey))),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF5D4037), foregroundColor: Colors.white),
                onPressed: () async {
                  if (!formKey.currentState!.validate()) return;
                  Navigator.pop(dialogCtx);

                  final seats = int.tryParse(seatsCtrl.text) ?? 4;
                  final res = await ApiService.createTable(
                    tenBan: nameCtrl.text,
                    soChoNgoi: seats,
                    maKhuVuc: selectedArea,
                  );

                  if (!mounted) return;
                  if (res['success'] == true) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Thêm bàn thành công!'), backgroundColor: Colors.green),
                    );
                    Provider.of<TableProvider>(context, listen: false).fetchTables();
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(res['message'] ?? 'Thêm bàn thất bại!'), backgroundColor: Colors.red),
                    );
                  }
                },
                child: const Text('Tạo bàn'),
              ),
            ],
          );
        },
      ),
    );
  }

  // Dialog Sửa Bàn (Admin)
  void _showEditTableDialog(TableModel table) {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController(text: table.name);
    final seatsCtrl = TextEditingController(text: table.seats.toString());
    int selectedArea = table.areaId;
    if (selectedArea < 1 || selectedArea > 3) selectedArea = 1;

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Text('Sửa: Bàn ${table.name}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            content: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Tên bàn *', border: OutlineInputBorder()),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập tên bàn' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: seatsCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Số chỗ ngồi', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int>(
                    initialValue: selectedArea,
                    decoration: const InputDecoration(labelText: 'Khu vực', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 1, child: Text('Tầng 1 (Khu vực chính)')),
                      DropdownMenuItem(value: 2, child: Text('Tầng 2 (Yên tĩnh)')),
                      DropdownMenuItem(value: 3, child: Text('Ngoài trời (Sân vườn)')),
                    ],
                    onChanged: (val) {
                      if (val != null) setDialogState(() => selectedArea = val);
                    },
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(dialogCtx), child: const Text('Hủy', style: TextStyle(color: Colors.grey))),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF5D4037), foregroundColor: Colors.white),
                onPressed: () async {
                  if (!formKey.currentState!.validate()) return;
                  Navigator.pop(dialogCtx);

                  final seats = int.tryParse(seatsCtrl.text) ?? table.seats;
                  final ok = await ApiService.updateTable(
                    table.id,
                    tenBan: nameCtrl.text,
                    soChoNgoi: seats,
                    maKhuVuc: selectedArea,
                  );

                  if (!mounted) return;
                  if (ok) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Cập nhật bàn thành công!'), backgroundColor: Colors.green),
                    );
                    Provider.of<TableProvider>(context, listen: false).fetchTables();
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Cập nhật bàn thất bại!'), backgroundColor: Colors.red),
                    );
                  }
                },
                child: const Text('Lưu thay đổi'),
              ),
            ],
          );
        },
      ),
    );
  }

  // Dialog Xóa Bàn (Admin)
  void _confirmDeleteTable(TableModel table) {
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
        content: Text('Bạn có chắc chắn muốn xóa "${table.name}" không?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy', style: TextStyle(color: Colors.grey))),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.pop(ctx);
              final ok = await ApiService.deleteTable(table.id);
              if (!mounted) return;
              if (ok) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã xóa bàn thành công!'), backgroundColor: Colors.green),
                );
                Provider.of<TableProvider>(context, listen: false).fetchTables();
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Xóa bàn thất bại!'), backgroundColor: Colors.red),
                );
              }
            },
            child: const Text('Xóa ngay'),
          ),
        ],
      ),
    );
  }

  void _showTableActionDialog(TableModel table) {
    final cartProvider = Provider.of<CartProvider>(context, listen: false);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final isAdmin = auth.currentUser?.isAdmin == true;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
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
              const Divider(height: 24),

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

              // Action 3: Sửa bàn (Admin)
              if (isAdmin)
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.orange[50], shape: BoxShape.circle),
                    child: const Icon(Icons.edit, color: Colors.orange),
                  ),
                  title: const Text('Sửa thông tin bàn (Admin)', style: TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: const Text('Đổi tên bàn, số chỗ ngồi, khu vực'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _showEditTableDialog(table);
                  },
                ),

              // Action 4: Xóa bàn (Admin)
              if (isAdmin)
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.red[50], shape: BoxShape.circle),
                    child: const Icon(Icons.delete_outline, color: Colors.red),
                  ),
                  title: const Text('Xóa bàn (Admin)', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
                  subtitle: const Text('Xóa hoàn toàn bàn khỏi hệ thống'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _confirmDeleteTable(table);
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
    final auth = Provider.of<AuthProvider>(context);
    final isAdmin = auth.currentUser?.isAdmin == true;
    final tables = tableProvider.filteredTables;

    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      floatingActionButton: isAdmin
          ? FloatingActionButton.extended(
              backgroundColor: const Color(0xFF5D4037),
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: const Text('Thêm Bàn', style: TextStyle(fontWeight: FontWeight.bold)),
              onPressed: _showAddTableDialog,
            )
          : null,
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
                          padding: const EdgeInsets.fromLTRB(12, 12, 12, 80),
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
      //nguyen hai hau
      
    );
  }
}
