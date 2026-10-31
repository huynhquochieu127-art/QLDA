import 'package:flutter/material.dart';
import '../services/staff_api.dart';
import '../widgets/staff_ui.dart';

/// Quản lý: Điểm danh & Chấm công (giống Web TimekeepingManagement + MonthlyTimesheetManager)
class AttendanceManagementScreen extends StatelessWidget {
  const AttendanceManagementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: kCream,
        appBar: AppBar(
          title: const Text('Điểm danh & Chấm công'),
          bottom: const TabBar(
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            indicatorColor: Color(0xFFFFB300),
            tabs: [Tab(text: 'Yêu cầu bổ sung'), Tab(text: 'Bảng công tháng')],
          ),
        ),
        body: const TabBarView(children: [_SupplementRequestsTab(), _MonthlyTimesheetTab()]),
      ),
    );
  }
}

// ───────────────────── TAB 1: DUYỆT YÊU CẦU BỔ SUNG ĐIỂM DANH (QH-50) ─────────────────────
class _SupplementRequestsTab extends StatefulWidget {
  const _SupplementRequestsTab();

  @override
  State<_SupplementRequestsTab> createState() => _SupplementRequestsTabState();
}

class _SupplementRequestsTabState extends State<_SupplementRequestsTab> {
  static const _filters = {'pending': 'Chờ duyệt', 'approved': 'Đã duyệt', 'rejected': 'Từ chối', 'all': 'Tất cả'};
  String _status = 'pending';
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final res = await StaffApi.getAttendanceRequests(status: _status);
    if (!mounted) return;
    setState(() {
      _items = res.list;
      _loading = false;
    });
  }

  Future<void> _decide(Map<String, dynamic> yc, bool approve) async {
    final note = await promptText(
      context,
      title: approve ? 'Đồng ý bổ sung điểm danh' : 'Từ chối yêu cầu',
      hint: approve ? 'Ghi chú (không bắt buộc)' : 'Lý do từ chối',
      confirmText: approve ? 'Đồng ý' : 'Từ chối',
      minLength: approve ? 0 : 5,
    );
    if (note == null) return;
    final id = toDouble(yc['MaYeuCau']).toInt();
    final res = approve
        ? await StaffApi.approveAttendanceRequest(id, note)
        : await StaffApi.rejectAttendanceRequest(id, note);
    if (!mounted) return;
    showToast(context, res.message.isNotEmpty ? res.message : (res.ok ? 'Đã xử lý yêu cầu.' : 'Xử lý thất bại.'),
        error: !res.ok);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
          child: Row(
            children: _filters.entries
                .map((e) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(e.value),
                        selected: _status == e.key,
                        onSelected: (_) {
                          setState(() => _status = e.key);
                          _load();
                        },
                      ),
                    ))
                .toList(),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _items.isEmpty
                    ? ListView(children: const [
                        EmptyBox(Icons.inbox, 'Không có yêu cầu bổ sung điểm danh nào ở trạng thái này.')
                      ])
                    : ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: _items.length,
                        itemBuilder: (ctx, i) {
                          final yc = _items[i];
                          final pending = '${yc['TrangThai']}' == 'pending';
                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          '${yc['HoTen'] ?? ''} (${yc['MaNhanVienCode'] ?? ''})',
                                          style: const TextStyle(fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                      StatusChip.of(yc['TrangThai']),
                                    ],
                                  ),
                                  Text('${yc['TenChucVu'] ?? ''}', style: const TextStyle(color: Colors.black54)),
                                  const SizedBox(height: 6),
                                  Text('📅 ${viDate(yc['Ngay'])} · ${yc['CaLam'] ?? ''} · ${yc['ThoiGian'] ?? ''}'),
                                  Text('📝 ${yc['Loai'] ?? ''}: ${yc['LyDo'] ?? ''}'),
                                  if ('${yc['GhiChuQL'] ?? ''}'.isNotEmpty)
                                    Text('QL: ${yc['GhiChuQL']}', style: const TextStyle(color: Colors.blueGrey)),
                                  if (pending) ...[
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        TextButton.icon(
                                          style: TextButton.styleFrom(foregroundColor: Colors.red),
                                          icon: const Icon(Icons.close),
                                          label: const Text('Từ chối'),
                                          onPressed: () => _decide(yc, false),
                                        ),
                                        const SizedBox(width: 6),
                                        ElevatedButton.icon(
                                          style: ElevatedButton.styleFrom(
                                              backgroundColor: Colors.green[700], foregroundColor: Colors.white),
                                          icon: const Icon(Icons.check),
                                          label: const Text('Đồng ý'),
                                          onPressed: () => _decide(yc, true),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ),
      ],
    );
  }
}

// ───────────────────── TAB 2: BẢNG CÔNG THÁNG (QH-52/53/55) ─────────────────────
class _MonthlyTimesheetTab extends StatefulWidget {
  const _MonthlyTimesheetTab();

  @override
  State<_MonthlyTimesheetTab> createState() => _MonthlyTimesheetTabState();
}

class _MonthlyTimesheetTabState extends State<_MonthlyTimesheetTab> {
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month);
  List<Map<String, dynamic>> _rows = [];
  Map<String, dynamic> _summary = {};
  bool _loading = true;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final res = await StaffApi.getMonthlyTimesheets(_month.month, _month.year);
    if (!mounted) return;
    setState(() {
      _rows = res.list;
      _summary = res.body is Map && res.body['summary'] is Map ? Map<String, dynamic>.from(res.body['summary']) : {};
      _loading = false;
    });
  }

  Future<void> _run(String title, Future<ApiResult> Function() action) async {
    if (!await confirmDialog(context, title, '$title cho tháng ${_month.month}/${_month.year}?')) return;
    setState(() => _busy = true);
    final res = await action();
    setState(() => _busy = false);
    if (!mounted) return;
    showToast(context, res.message.isNotEmpty ? res.message : (res.ok ? 'Đã thực hiện.' : 'Thất bại.'),
        error: !res.ok);
    _load();
  }

  Future<void> _edit(Map<String, dynamic> row) async {
    final isComplaint = '${row['TrangThai']}' == 'emp_replied';
    final ctrls = {
      'soCong': TextEditingController(text: '${row['SoCong'] ?? 0}'),
      'soGioLam': TextEditingController(text: '${row['SoGioLam'] ?? 0}'),
      'soNgayTre': TextEditingController(text: '${row['SoNgayTre'] ?? 0}'),
      'soNgayNghi': TextEditingController(text: '${row['SoNgayNghi'] ?? 0}'),
      'ghiChuQL': TextEditingController(text: '${row['GhiChuQL'] ?? ''}'),
    };
    const labels = {
      'soCong': 'Số công',
      'soGioLam': 'Số giờ làm',
      'soNgayTre': 'Số lần đi trễ',
      'soNgayNghi': 'Số ngày nghỉ',
      'ghiChuQL': 'Ghi chú của Quản lý',
    };
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isComplaint ? 'Xử lý khiếu nại' : 'Cập nhật bảng công'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('${row['HoTen'] ?? ''} (${row['MaNhanVienCode'] ?? ''})',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              if (isComplaint)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text('💬 Nhân viên phản ánh: "${row['PhanHoiNV'] ?? ''}"',
                      style: const TextStyle(color: Colors.deepOrange)),
                ),
              for (final key in ctrls.keys)
                TextField(
                  controller: ctrls[key],
                  keyboardType: key == 'ghiChuQL' ? TextInputType.text : TextInputType.number,
                  decoration: InputDecoration(labelText: labels[key]),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: kBrown, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final res = await StaffApi.updateTimesheet(
      toDouble(row['MaBangCong']).toInt(),
      {
        'soCong': toDouble(ctrls['soCong']!.text),
        'soGioLam': toDouble(ctrls['soGioLam']!.text),
        'soNgayTre': toDouble(ctrls['soNgayTre']!.text).toInt(),
        'soNgayNghi': toDouble(ctrls['soNgayNghi']!.text).toInt(),
        'ghiChuQL': ctrls['ghiChuQL']!.text.trim(),
      },
      resolveComplaint: isComplaint,
    );
    if (!mounted) return;
    showToast(context, res.message.isNotEmpty ? res.message : 'Đã cập nhật.', error: !res.ok);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final m = _month.month, y = _month.year;
    final complaints = _rows.where((r) => '${r['TrangThai']}' == 'emp_replied').length;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          MonthSelector(month: _month, onChanged: (v) {
            setState(() => _month = v);
            _load();
          }),
          StatGrid(children: [
            StatTile('Số bảng công', '${_summary['total'] ?? _rows.length}'),
            StatTile('Đang khiếu nại', '${_summary['complaintCount'] ?? complaints}',
                color: complaints > 0 ? Colors.deepOrange : Colors.green),
          ]),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _action('Tạo bảng công nháp', Icons.auto_fix_high, () => StaffApi.generateTimesheetDraft(m, y)),
              _action('Gửi NV xác nhận', Icons.send, () => StaffApi.sendTimesheetsForReview(m, y)),
              _action('Xác nhận tất cả', Icons.done_all, () => StaffApi.confirmAllTimesheets(m, y)),
              _action('Chốt gửi Admin', Icons.lock, () => StaffApi.closeTimesheetsToAdmin(m, y)),
            ],
          ),
          const SizedBox(height: 10),
          if (_loading)
            const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
          else if (_rows.isEmpty)
            const EmptyBox(Icons.fact_check_outlined, 'Chưa có bảng công tháng này. Bấm "Tạo bảng công nháp".')
          else
            ..._rows.map((r) => Card(
                  color: '${r['TrangThai']}' == 'emp_replied' ? const Color(0xFFFFF8E1) : null,
                  child: ListTile(
                    title: Text('${r['HoTen'] ?? ''} (${r['MaNhanVienCode'] ?? ''})',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('${r['SoCong'] ?? 0} công · ${r['SoGioLam'] ?? 0} giờ · '
                        'trễ ${r['SoNgayTre'] ?? 0} · nghỉ ${r['SoNgayNghi'] ?? 0}'),
                    trailing: StatusChip.of(r['TrangThai']),
                    onTap: '${r['TrangThai']}' == 'submitted_to_admin' ? null : () => _edit(r),
                  ),
                )),
        ],
      ),
    );
  }

  Widget _action(String label, IconData icon, Future<ApiResult> Function() fn) {
    return OutlinedButton.icon(
      style: OutlinedButton.styleFrom(foregroundColor: kBrown),
      icon: Icon(icon, size: 18),
      label: Text(label),
      onPressed: _busy ? null : () => _run(label, fn),
    );
  }
}
