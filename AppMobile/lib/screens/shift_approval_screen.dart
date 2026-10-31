import 'package:flutter/material.dart';
import '../services/staff_api.dart';
import '../widgets/staff_ui.dart';

/// QH-39: Quản lý xem toàn bộ đăng ký ca theo tuần, Duyệt / Từ chối / Xóa (giống Web ShiftApprovalManagement)
class ShiftApprovalScreen extends StatefulWidget {
  const ShiftApprovalScreen({super.key});

  @override
  State<ShiftApprovalScreen> createState() => _ShiftApprovalScreenState();
}

class _ShiftApprovalScreenState extends State<ShiftApprovalScreen> {
  late DateTime _weekStart;
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _weekStart = DateTime(now.year, now.month, now.day).subtract(Duration(days: now.weekday - 1));
    _load();
  }

  List<String> get _weekKeys => List.generate(7, (i) => dateKey(_weekStart.add(Duration(days: i))));

  Future<void> _load() async {
    setState(() => _loading = true);
    final keys = _weekKeys;
    final res = await StaffApi.getShiftRegistrations(startDate: keys.first, endDate: keys.last);
    if (!mounted) return;
    setState(() {
      _items = res.list.where((r) => keys.contains('${r['dateKey']}')).toList();
      _loading = false;
    });
  }

  Future<void> _setStatus(Map<String, dynamic> r, String status) async {
    final res = await StaffApi.updateShiftRegistrationStatus(toDouble(r['id']).toInt(), status);
    if (!mounted) return;
    showToast(context, res.message.isNotEmpty ? res.message : 'Đã cập nhật.', error: !res.ok);
    _load();
  }

  Future<void> _delete(Map<String, dynamic> r) async {
    if (!await confirmDialog(context, 'Hủy ca đăng ký', 'Hủy ca đăng ký của "${r['staffName']}"?')) return;
    final res = await StaffApi.deleteShiftRegistration(toDouble(r['id']).toInt());
    if (!mounted) return;
    showToast(context, res.message.isNotEmpty ? res.message : 'Đã xóa.', error: !res.ok);
    _load();
  }

  Future<void> _approveAll() async {
    final pending = _items.where((r) => '${r['status']}' == 'pending').length;
    if (pending == 0) {
      showToast(context, 'Không có ca nào đang chờ duyệt trong tuần này.');
      return;
    }
    if (!await confirmDialog(context, 'Duyệt tất cả', 'Duyệt đồng loạt $pending ca đang chờ trong tuần?')) return;
    final res = await StaffApi.approveAllShifts(_weekKeys);
    if (!mounted) return;
    showToast(context, res.message.isNotEmpty ? res.message : 'Đã duyệt.', error: !res.ok);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final keys = _weekKeys;
    final pending = _items.where((r) => '${r['status']}' == 'pending').length;
    final approved = _items.where((r) => '${r['status']}' == 'approved').length;

    return Scaffold(
      backgroundColor: kCream,
      appBar: AppBar(title: const Text('Duyệt ca làm & Lịch trình')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Colors.green[700],
        foregroundColor: Colors.white,
        icon: const Icon(Icons.done_all),
        label: Text('Duyệt tất cả ($pending)'),
        onPressed: _approveAll,
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 90),
          children: [
            Card(
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left),
                    onPressed: () {
                      _weekStart = _weekStart.subtract(const Duration(days: 7));
                      _load();
                    },
                  ),
                  Expanded(
                    child: Text('${viDate(keys.first)} — ${viDate(keys.last)}',
                        textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.bold)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: () {
                      _weekStart = _weekStart.add(const Duration(days: 7));
                      _load();
                    },
                  ),
                ],
              ),
            ),
            StatGrid(children: [
              StatTile('Tổng lượt đăng ký', '${_items.length}'),
              StatTile('Đang chờ duyệt', '$pending', color: Colors.orange),
              StatTile('Đã phê duyệt', '$approved', color: Colors.green),
              StatTile('Từ chối', '${_items.length - pending - approved}', color: Colors.red),
            ]),
            if (_loading)
              const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
            else
              for (var i = 0; i < 7; i++) _buildDay(keys[i], i),
          ],
        ),
      ),
    );
  }

  Widget _buildDay(String key, int index) {
    const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    final dayItems = _items.where((r) => '${r['dateKey']}' == key).toList()
      ..sort((a, b) => '${a['gioBatDau']}'.compareTo('${b['gioBatDau']}'));
    final isToday = key == dateKey(DateTime.now());

    return Card(
      margin: const EdgeInsets.only(top: 8),
      child: ExpansionTile(
        initiallyExpanded: dayItems.isNotEmpty,
        title: Text('${dayNames[index]} · ${viDate(key)}${isToday ? '  (Hôm nay)' : ''}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(dayItems.isEmpty ? 'Chưa có ai đăng ký' : '${dayItems.length} lượt đăng ký'),
        children: dayItems
            .map((r) => ListTile(
                  dense: true,
                  leading: CircleAvatar(
                    radius: 16,
                    backgroundColor: kBrown.withValues(alpha: 0.12),
                    child: Text('${r['staffName'] ?? '?'}'.characters.first.toUpperCase(),
                        style: const TextStyle(color: kBrown, fontWeight: FontWeight.bold)),
                  ),
                  title: Text('${r['staffName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text('${r['tenCaLam'] ?? ''} '
                      '(${'${r['gioBatDau'] ?? ''}'.padRight(5).substring(0, 5)} - '
                      '${'${r['gioKetThuc'] ?? ''}'.padRight(5).substring(0, 5)}) · ${r['role'] ?? ''}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      StatusChip.of('${r['status']}'),
                      PopupMenuButton<String>(
                        onSelected: (v) => v == 'delete' ? _delete(r) : _setStatus(r, v),
                        itemBuilder: (_) => [
                          if ('${r['status']}' != 'approved')
                            const PopupMenuItem(value: 'approved', child: Text('✅ Duyệt')),
                          if ('${r['status']}' != 'rejected')
                            const PopupMenuItem(value: 'rejected', child: Text('❌ Từ chối')),
                          const PopupMenuItem(value: 'delete', child: Text('🗑️ Hủy ca')),
                        ],
                      ),
                    ],
                  ),
                ))
            .toList(),
      ),
    );
  }
}
