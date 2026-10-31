import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/staff_api.dart';
import '../widgets/staff_ui.dart';

Object? _notifEmpId(BuildContext context) {
  final u = Provider.of<AuthProvider>(context, listen: false).currentUser;
  return u?.maNhanVien;
}

/// Nút chuông trên thanh tiêu đề, hiện số thông báo chưa đọc (giống Web NotificationBell).
class NotificationBellButton extends StatefulWidget {
  const NotificationBellButton({super.key});

  @override
  State<NotificationBellButton> createState() => _NotificationBellButtonState();
}

class _NotificationBellButtonState extends State<NotificationBellButton> {
  int _unread = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
    _timer = Timer.periodic(const Duration(seconds: 60), (_) => _refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _refresh() async {
    if (!mounted) return;
    final res = await StaffApi.getNotifications(_notifEmpId(context));
    if (!mounted || !res.ok) return;
    final count = res.body is Map && res.body['unreadCount'] != null
        ? toDouble(res.body['unreadCount']).toInt()
        : res.list.where((n) => n['DaXem'] != 1 && n['DaXem'] != true).length;
    setState(() => _unread = count);
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_none, size: 26),
          tooltip: 'Thông báo',
          onPressed: () async {
            await Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
            _refresh();
          },
        ),
        if (_unread > 0)
          Positioned(
            top: 6,
            right: 6,
            child: Container(
              padding: const EdgeInsets.all(4),
              constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
              decoration: const BoxDecoration(color: Colors.redAccent, shape: BoxShape.circle),
              child: Text(
                _unread > 99 ? '99+' : '$_unread',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
              ),
            ),
          ),
      ],
    );
  }
}

/// Danh sách thông báo của người dùng: bấm để đánh dấu đã đọc, hoặc "Đọc tất cả".
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final res = await StaffApi.getNotifications(_notifEmpId(context));
    if (!mounted) return;
    setState(() {
      _items = res.list;
      _loading = false;
    });
  }

  bool _isRead(Map<String, dynamic> n) => n['DaXem'] == 1 || n['DaXem'] == true;

  IconData _icon(String? type) {
    final t = (type ?? '').toLowerCase();
    if (t.contains('luong') || t.contains('lương') || t.contains('payroll')) return Icons.payments;
    if (t.contains('ca') || t.contains('shift')) return Icons.calendar_month;
    if (t.contains('nghi') || t.contains('nghỉ') || t.contains('leave')) return Icons.event_note;
    if (t.contains('cong') || t.contains('công') || t.contains('timesheet')) return Icons.fact_check;
    return Icons.notifications;
  }

  @override
  Widget build(BuildContext context) {
    final unread = _items.where((n) => !_isRead(n)).length;
    return Scaffold(
      backgroundColor: kCream,
      appBar: AppBar(
        title: const Text('Thông báo'),
        actions: [
          if (unread > 0)
            TextButton(
              onPressed: () async {
                await StaffApi.markAllNotificationsRead(_notifEmpId(context));
                _load();
              },
              child: const Text('Đọc tất cả', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _items.isEmpty
                ? ListView(children: const [EmptyBox(Icons.notifications_off_outlined, 'Chưa có thông báo nào.')])
                : ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 6),
                    itemBuilder: (ctx, i) {
                      final n = _items[i];
                      final read = _isRead(n);
                      return Card(
                        color: read ? Colors.white : const Color(0xFFFFF8E1),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: kBrown.withValues(alpha: 0.12),
                            child: Icon(_icon(n['Loai']?.toString()), color: kBrown),
                          ),
                          title: Text('${n['TieuDe'] ?? 'Thông báo'}',
                              style: TextStyle(fontWeight: read ? FontWeight.normal : FontWeight.bold)),
                          subtitle: Text('${n['NoiDung'] ?? ''}\n${viDate(n['NgayTao'])}'),
                          isThreeLine: true,
                          trailing: read ? null : const Icon(Icons.circle, size: 10, color: Colors.redAccent),
                          onTap: read
                              ? null
                              : () async {
                                  await StaffApi.markNotificationRead(toDouble(n['MaTB']).toInt());
                                  setState(() => n['DaXem'] = 1);
                                },
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
