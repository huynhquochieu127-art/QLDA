import 'package:flutter/material.dart';
import '../services/staff_api.dart';
import '../widgets/staff_ui.dart';

/// Quản lý Danh mục (giống Web CategoryManagement): thêm / sửa / xóa danh mục đồ uống.
class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final res = await StaffApi.getCategories();
    if (!mounted) return;
    setState(() {
      _items = res.list;
      _loading = false;
    });
  }

  Future<void> _edit([Map<String, dynamic>? item]) async {
    final name = await promptText(
      context,
      title: item == null ? 'Thêm danh mục' : 'Sửa danh mục',
      hint: 'Ví dụ: Cà phê, Trà sữa, Bánh ngọt...',
      initial: '${item?['TenDanhMuc'] ?? ''}',
      confirmText: item == null ? 'Thêm' : 'Lưu',
      minLength: 2,
    );
    if (name == null) return;
    final res = item == null
        ? await StaffApi.createCategory(name)
        : await StaffApi.updateCategory(toDouble(item['MaDanhMuc']).toInt(), name);
    if (!mounted) return;
    showToast(context, res.message.isNotEmpty ? res.message : (res.ok ? 'Đã lưu danh mục.' : 'Lưu thất bại.'),
        error: !res.ok);
    _load();
  }

  Future<void> _delete(Map<String, dynamic> item) async {
    if (!await confirmDialog(context, 'Xóa danh mục', 'Xóa danh mục "${item['TenDanhMuc']}"?')) return;
    final res = await StaffApi.deleteCategory(toDouble(item['MaDanhMuc']).toInt());
    if (!mounted) return;
    showToast(context, res.message.isNotEmpty ? res.message : (res.ok ? 'Đã xóa.' : 'Xóa thất bại.'),
        error: !res.ok);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kCream,
      appBar: AppBar(title: const Text('Quản lý Danh mục')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: kBrown,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Thêm danh mục'),
        onPressed: () => _edit(),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _items.isEmpty
                ? ListView(children: const [EmptyBox(Icons.category_outlined, 'Chưa có danh mục nào.')])
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 90),
                    itemCount: _items.length,
                    itemBuilder: (ctx, i) {
                      final c = _items[i];
                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: kBrown.withValues(alpha: 0.12),
                            child: Text('#${c['MaDanhMuc']}', style: const TextStyle(color: kBrown, fontSize: 12)),
                          ),
                          title: Text('${c['TenDanhMuc'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(icon: const Icon(Icons.edit, color: Colors.blue), onPressed: () => _edit(c)),
                              IconButton(icon: const Icon(Icons.delete, color: Colors.red), onPressed: () => _delete(c)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
