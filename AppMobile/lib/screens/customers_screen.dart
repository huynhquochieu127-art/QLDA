import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/customer.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';

class CustomersScreen extends StatefulWidget {
  final Function(CustomerModel)? onSelectCustomer;

  const CustomersScreen({super.key, this.onSelectCustomer});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  bool _isLoading = true;
  List<CustomerModel> _customers = [];
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchCustomers();
  }

  Future<void> _fetchCustomers() async {
    setState(() => _isLoading = true);
    final list = await ApiService.getCustomers(search: _searchQuery);
    if (mounted) {
      setState(() {
        _customers = list;
        _isLoading = false;
      });
    }
  }

  // Dialog Thêm Khách Hàng Mới
  void _showAddCustomerDialog() {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final dobCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Thêm Khách Hàng Mới', style: TextStyle(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Họ và tên *',
                      prefixIcon: Icon(Icons.person),
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập họ tên' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: phoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Số điện thoại *',
                      prefixIcon: Icon(Icons.phone),
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập số điện thoại' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email (tùy chọn)',
                      prefixIcon: Icon(Icons.email),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: dobCtrl,
                    keyboardType: TextInputType.datetime,
                    decoration: const InputDecoration(
                      labelText: 'Ngày sinh (YYYY-MM-DD, tùy chọn)',
                      prefixIcon: Icon(Icons.cake_outlined),
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('HỦY', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF5D4037),
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                Navigator.pop(ctx);

                final success = await ApiService.createCustomer(
                  name: nameCtrl.text.trim(),
                  phone: phoneCtrl.text.trim(),
                  dob: dobCtrl.text.trim().isNotEmpty ? dobCtrl.text.trim() : null,
                  email: emailCtrl.text.trim().isNotEmpty ? emailCtrl.text.trim() : null,
                );

                if (!mounted) return;
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Thêm khách hàng thành công!'), backgroundColor: Colors.green),
                  );
                  _fetchCustomers();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Thêm khách hàng thất bại (có thể trùng SĐT)!'), backgroundColor: Colors.red),
                  );
                }
              },
              child: const Text('LƯU'),
            ),
          ],
        );
      },
    );
  }

  // Dialog Sửa Thông Tin Khách Hàng (Admin / Quản lý)
  void _showEditCustomerDialog(CustomerModel customer) {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController(text: customer.name);
    final phoneCtrl = TextEditingController(text: customer.phone);
    final emailCtrl = TextEditingController(text: customer.email ?? '');
    final dobCtrl = TextEditingController(text: customer.dob ?? '');

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text('Sửa: ${customer.name}', style: const TextStyle(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Họ và tên *', border: OutlineInputBorder()),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập họ tên' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: phoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Số điện thoại *', border: OutlineInputBorder()),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập số điện thoại' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: dobCtrl,
                    decoration: const InputDecoration(labelText: 'Ngày sinh (YYYY-MM-DD)', border: OutlineInputBorder()),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('HỦY', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF5D4037), foregroundColor: Colors.white),
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                Navigator.pop(ctx);

                final ok = await ApiService.updateCustomer(
                  customer.id,
                  name: nameCtrl.text.trim(),
                  phone: phoneCtrl.text.trim(),
                  dob: dobCtrl.text.trim().isNotEmpty ? dobCtrl.text.trim() : null,
                  email: emailCtrl.text.trim().isNotEmpty ? emailCtrl.text.trim() : null,
                );

                if (!mounted) return;
                if (ok) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Cập nhật khách hàng thành công!'), backgroundColor: Colors.green),
                  );
                  _fetchCustomers();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Cập nhật khách hàng thất bại!'), backgroundColor: Colors.red),
                  );
                }
              },
              child: const Text('LƯU'),
            ),
          ],
        );
      },
    );
  }

  // Dialog Xóa Khách Hàng (Admin)
  void _confirmDeleteCustomer(CustomerModel customer) {
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
        content: Text('Bạn có chắc chắn muốn xóa khách hàng "${customer.name}" (${customer.phone})?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy', style: TextStyle(color: Colors.grey))),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.pop(ctx);
              final ok = await ApiService.deleteCustomer(customer.id);
              if (!mounted) return;
              if (ok) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã xóa khách hàng thành công!'), backgroundColor: Colors.green),
                );
                _fetchCustomers();
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Xóa khách hàng thất bại!'), backgroundColor: Colors.red),
                );
              }
            },
            child: const Text('Xóa ngay'),
          ),
        ],
      ),
    );
  }

  Color _getRankColor(String rank) {
    switch (rank.toLowerCase()) {
      case 'kim cương':
        return Colors.blue.shade700;
      case 'vàng':
        return Colors.amber.shade800;
      case 'bạc':
        return Colors.blueGrey;
      default:
        return Colors.brown.shade400;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;
    final canManage = user?.canManageCustomers == true;

    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      appBar: AppBar(
        title: const Text('Quản Lý Khách Hàng', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF5D4037),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Làm mới',
            onPressed: _fetchCustomers,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF5D4037),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add),
        label: const Text('Thêm Khách', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: _showAddCustomerDialog,
      ),
      body: Column(
        children: [
          // Thanh tìm kiếm
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.white,
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Tìm kiếm theo tên hoặc SĐT...',
                prefixIcon: const Icon(Icons.search, color: Color(0xFF5D4037)),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                          _fetchCustomers();
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                filled: true,
                fillColor: const Color(0xFFF5F5F5),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (val) {
                setState(() => _searchQuery = val);
                _fetchCustomers();
              },
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF5D4037)))
                : _customers.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.people_outline, size: 64, color: Colors.grey),
                            const SizedBox(height: 12),
                            Text(
                              _searchQuery.isNotEmpty
                                  ? 'Không tìm thấy khách hàng nào'
                                  : 'Chưa có dữ liệu khách hàng',
                              style: const TextStyle(color: Colors.black54),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchCustomers,
                        color: const Color(0xFF5D4037),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                          itemCount: _customers.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 8),
                          itemBuilder: (ctx, idx) {
                            final c = _customers[idx];
                            final rankColor = _getRankColor(c.rank);

                            return Card(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 1,
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: const Color(0xFF5D4037).withValues(alpha: 0.1),
                                  child: Text(
                                    c.name.isNotEmpty ? c.name[0].toUpperCase() : 'K',
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF5D4037)),
                                  ),
                                ),
                                title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                                subtitle: Text('SĐT: ${c.phone}${c.email != null ? " • ${c.email}" : ""}'),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: rankColor.withValues(alpha: 0.15),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            c.rank,
                                            style: TextStyle(color: rankColor, fontWeight: FontWeight.bold, fontSize: 11),
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${c.points} điểm',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF5D4037)),
                                        ),
                                      ],
                                    ),
                                    if (canManage && widget.onSelectCustomer == null) ...[
                                      const SizedBox(width: 6),
                                      PopupMenuButton<String>(
                                        icon: const Icon(Icons.more_vert, color: Colors.black54),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        onSelected: (val) {
                                          if (val == 'edit') {
                                            _showEditCustomerDialog(c);
                                          } else if (val == 'delete') {
                                            _confirmDeleteCustomer(c);
                                          }
                                        },
                                        itemBuilder: (ctx) => [
                                          const PopupMenuItem(
                                            value: 'edit',
                                            child: Row(
                                              children: [
                                                Icon(Icons.edit_outlined, size: 18, color: Colors.blue),
                                                SizedBox(width: 8),
                                                Text('Sửa thông tin'),
                                              ],
                                            ),
                                          ),
                                          const PopupMenuItem(
                                            value: 'delete',
                                            child: Row(
                                              children: [
                                                Icon(Icons.delete_outline, size: 18, color: Colors.red),
                                                SizedBox(width: 8),
                                                Text('Xóa khách hàng', style: TextStyle(color: Colors.red)),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                                onTap: () {
                                  if (widget.onSelectCustomer != null) {
                                    widget.onSelectCustomer!(c);
                                    Navigator.pop(context);
                                  }
                                },
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
