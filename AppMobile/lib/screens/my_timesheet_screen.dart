import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/staff_api.dart';
import '../widgets/staff_ui.dart';

/// QH-54: Nhân viên xem bảng công tháng và bấm Xác nhận đúng / Báo cáo sai sót (giống Web MyTimesheet)
class MyTimesheetScreen extends StatefulWidget {
  const MyTimesheetScreen({super.key});

  @override
  State<MyTimesheetScreen> createState() => _MyTimesheetScreenState();
}

class _MyTimesheetScreenState extends State<MyTimesheetScreen> {
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month);
  Map<String, dynamic>? _data;
  String _message = '';
  bool _loading = true;
  bool _sending = false;

  Object? get _empId {
    final u = Provider.of<AuthProvider>(context, listen: false).currentUser;
    return u?.maNhanVien ?? u?.maNhanVienCode;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (_empId == null) {
      setState(() => _loading = false);
      return;
    }
    setState(() => _loading = true);
    final res = await StaffApi.getMyTimesheet(_empId!, _month.month, _month.year);
    if (!mounted) return;
    setState(() {
      _data = res.data is Map ? Map<String, dynamic>.from(res.data) : null;
      _message = res.ok ? res.message : (res.message.isNotEmpty ? res.message : 'Không tải được bảng công.');
      _loading = false;
    });
  }

  Future<void> _confirm() async {
    if (!await confirmDialog(context, 'Xác nhận bảng công',
        'Xác nhận bảng công tháng ${_month.month}/${_month.year} là chính xác?')) {
      return;
    }
    setState(() => _sending = true);
    final res = await StaffApi.confirmMyTimesheet(_empId!, _month.month, _month.year);
    setState(() => _sending = false);
    if (!mounted) return;
    showToast(context, res.message.isNotEmpty ? res.message : 'Đã xác nhận bảng công.', error: !res.ok);
    _load();
  }

  Future<void> _dispute() async {
    final reason = await promptText(
      context,
      title: 'Báo cáo sai sót bảng công',
      hint: 'Ví dụ: Ngày 15 em có đi làm nhưng hệ thống không ghi nhận...',
      initial: '${_data?['PhanHoiNV'] ?? ''}',
      minLength: 10,
      confirmText: 'Gửi báo cáo',
    );
    if (reason == null) return;
    setState(() => _sending = true);
    final res = await StaffApi.disputeMyTimesheet(_empId!, _month.month, _month.year, reason);
    setState(() => _sending = false);
    if (!mounted) return;
    showToast(context, res.message.isNotEmpty ? res.message : 'Đã gửi báo cáo sai sót.', error: !res.ok);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final d = _data;
    final status = '${d?['TrangThai'] ?? ''}';
    final locked = d?['isLocked'] == true || status == 'submitted_to_admin';
    final confirmed = status == 'confirmed';

    return Scaffold(
      backgroundColor: kCream,
      appBar: AppBar(title: const Text('Bảng công của tôi')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            MonthSelector(month: _month, onChanged: (m) {
              setState(() => _month = m);
              _load();
            }),
            const SizedBox(height: 8),
            if (_empId == null)
              const EmptyBox(Icons.badge_outlined, 'Tài khoản này không gắn với mã nhân viên.')
            else if (_loading)
              const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
            else if (d == null)
              EmptyBox(Icons.event_busy, _message.isNotEmpty ? _message : 'Chưa có bảng công tháng này.')
            else ...[
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text('Trạng thái bảng công', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                      StatusChip.of(status),
                    ],
                  ),
                ),
              ),
              StatGrid(children: [
                StatTile('Số công', '${d['SoCong'] ?? 0}'),
                StatTile('Tổng giờ làm', '${d['SoGioLam'] ?? 0} giờ'),
                StatTile('Số lần đi trễ', '${d['SoNgayTre'] ?? 0}',
                    color: toDouble(d['SoNgayTre']) > 0 ? Colors.orange : Colors.green),
                StatTile('Số ngày nghỉ', '${d['SoNgayNghi'] ?? 0}',
                    color: toDouble(d['SoNgayNghi']) > 0 ? Colors.red : Colors.green),
              ]),
              if ('${d['GhiChuQL'] ?? ''}'.isNotEmpty)
                Card(
                  color: const Color(0xFFE3F2FD),
                  child: ListTile(
                    leading: const Icon(Icons.comment, color: Colors.blue),
                    title: const Text('Ghi chú của Quản lý'),
                    subtitle: Text('${d['GhiChuQL']}'),
                  ),
                ),
              if ('${d['PhanHoiNV'] ?? ''}'.isNotEmpty)
                Card(
                  color: const Color(0xFFFFF8E1),
                  child: ListTile(
                    leading: const Icon(Icons.report_problem, color: Colors.orange),
                    title: const Text('Phản hồi bạn đã gửi'),
                    subtitle: Text('${d['PhanHoiNV']}'),
                  ),
                ),
              if (locked)
                const Card(
                  child: ListTile(
                    leading: Icon(Icons.lock, color: Colors.indigo),
                    title: Text('Bảng công đã được Quản lý chốt gửi Admin, không thể chỉnh sửa.'),
                  ),
                ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.orange[800],
                        minimumSize: const Size.fromHeight(48),
                      ),
                      icon: const Icon(Icons.report_problem_outlined),
                      label: const Text('Báo cáo sai sót'),
                      onPressed: locked || _sending ? null : _dispute,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green[700],
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(48),
                      ),
                      icon: const Icon(Icons.check_circle),
                      label: const Text('Xác nhận đúng'),
                      onPressed: locked || confirmed || _sending ? null : _confirm,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
