import 'package:flutter/material.dart';
import '../services/staff_api.dart';
import '../widgets/staff_ui.dart';

/// Bảng lương & Quyết toán cho Admin / Quản lý (giống Web PayrollManagement)
class PayrollScreen extends StatefulWidget {
  const PayrollScreen({super.key});

  @override
  State<PayrollScreen> createState() => _PayrollScreenState();
}

class _PayrollScreenState extends State<PayrollScreen> {
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month - 1);
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final res = await StaffApi.getPayrollList(_month.month, _month.year);
    if (!mounted) return;
    setState(() {
      _rows = res.list;
      _loading = false;
    });
  }

  Future<void> _calculate() async {
    final force = _rows.isNotEmpty &&
        await confirmDialog(context, 'Tính lại bảng lương',
            'Tháng ${_month.month}/${_month.year} đã có bảng lương. Tính lại từ bảng công đã chốt?');
    if (_rows.isNotEmpty && !force) return;
    setState(() => _busy = true);
    final res = await StaffApi.calculatePayroll(_month.month, _month.year, force: force);
    setState(() => _busy = false);
    if (!mounted) return;
    showToast(context, res.message.isNotEmpty ? res.message : 'Đã tính lương.', error: !res.ok);
    _load();
  }

  Future<void> _approveAll() async {
    if (!await confirmDialog(context, 'Duyệt tất cả', 'Duyệt toàn bộ bảng lương tháng ${_month.month}/${_month.year}?')) {
      return;
    }
    setState(() => _busy = true);
    final res = await StaffApi.approveAllPayroll(_month.month, _month.year);
    setState(() => _busy = false);
    if (!mounted) return;
    showToast(context, res.message.isNotEmpty ? res.message : 'Đã duyệt.', error: !res.ok);
    _load();
  }

  Future<void> _setStatus(Map<String, dynamic> row, String status) async {
    final res = await StaffApi.approvePayroll(toDouble(row['MaBangLuong']).toInt(), trangThai: status);
    if (!mounted) return;
    showToast(context, res.message.isNotEmpty ? res.message : 'Đã cập nhật.', error: !res.ok);
    _load();
  }

  Color _statusColor(String s) =>
      s == 'Đã thanh toán' ? Colors.green : (s == 'Đã duyệt' ? Colors.blue : Colors.orange);

  @override
  Widget build(BuildContext context) {
    final total = _rows.fold<double>(0, (s, r) => s + toDouble(r['TongLuong']));
    final paid = _rows.where((r) => '${r['TrangThai']}' == 'Đã thanh toán').length;
    final waiting = _rows.where((r) => '${r['TrangThai']}' == 'Chờ duyệt').length;

    return Scaffold(
      backgroundColor: kCream,
      appBar: AppBar(title: const Text('Bảng lương & Quyết toán')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(12),
          children: [
            MonthSelector(month: _month, onChanged: (m) {
              setState(() => _month = m);
              _load();
            }),
            StatGrid(children: [
              StatTile('Tổng quỹ lương', money(total)),
              StatTile('Số nhân viên', '${_rows.length}'),
              StatTile('Chờ duyệt', '$waiting', color: Colors.orange),
              StatTile('Đã thanh toán', '$paid', color: Colors.green),
            ]),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: kBrown, foregroundColor: Colors.white),
                    icon: const Icon(Icons.calculate),
                    label: const Text('Tính lương'),
                    onPressed: _busy ? null : _calculate,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.green[800]),
                    icon: const Icon(Icons.done_all),
                    label: const Text('Duyệt tất cả'),
                    onPressed: _busy || waiting == 0 ? null : _approveAll,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (_loading)
              const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
            else if (_rows.isEmpty)
              const EmptyBox(Icons.payments_outlined,
                  'Chưa có bảng lương tháng này. Hãy chốt bảng công rồi bấm "Tính lương".')
            else
              ..._rows.map((r) {
                final status = '${r['TrangThai'] ?? 'Chờ duyệt'}';
                final isPartTime = '${r['LoaiNhanVien'] ?? ''}'.toLowerCase().contains('part');
                return Card(
                  child: ListTile(
                    title: Text('${r['HoTen'] ?? ''} (${r['MaNhanVienCode'] ?? ''})',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(
                      '${isPartTime ? 'Part-time · ${r['SoGioLam'] ?? 0} giờ' : 'Full-time · ${r['SoCong'] ?? 0} công'}\n'
                      'Thưởng ${money(r['Thuong'])} · Phạt ${money(r['TienPhat'])}',
                    ),
                    isThreeLine: true,
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(money(r['TongLuong']), style: const TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        StatusChip(status, _statusColor(status)),
                      ],
                    ),
                    onTap: status == 'Đã thanh toán'
                        ? null
                        : () => showModalBottomSheet(
                              context: context,
                              builder: (ctx) => SafeArea(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (status != 'Đã duyệt')
                                      ListTile(
                                        leading: const Icon(Icons.check_circle, color: Colors.blue),
                                        title: const Text('Duyệt bảng lương'),
                                        onTap: () {
                                          Navigator.pop(ctx);
                                          _setStatus(r, 'Đã duyệt');
                                        },
                                      ),
                                    ListTile(
                                      leading: const Icon(Icons.payments, color: Colors.green),
                                      title: const Text('Đánh dấu Đã thanh toán'),
                                      onTap: () {
                                        Navigator.pop(ctx);
                                        _setStatus(r, 'Đã thanh toán');
                                      },
                                    ),
                                  ],
                                ),
                              ),
                            ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}
