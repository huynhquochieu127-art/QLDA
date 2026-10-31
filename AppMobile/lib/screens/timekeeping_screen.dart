import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/staff_api.dart';
import '../widgets/staff_ui.dart';

/// 3 ca làm việc tiêu chuẩn (đồng bộ với Web: staffWork.js SHIFTS)
class ShiftDef {
  final String id;
  final String name;
  final String start;
  final String end;
  const ShiftDef(this.id, this.name, this.start, this.end);

  int get startMin => _toMin(start);
  int get endMin => _toMin(end);
  String get label => '$name ($start - $end)';

  static int _toMin(String hhmm) {
    final p = hhmm.split(':');
    return int.parse(p[0]) * 60 + int.parse(p[1]);
  }
}

const kShifts = [
  ShiftDef('morning', 'Ca Sáng', '07:00', '12:00'),
  ShiftDef('afternoon', 'Ca Chiều', '12:00', '17:00'),
  ShiftDef('evening', 'Ca Tối', '17:00', '22:30'),
];

/// Đoán ca từ tên ca trong DB (giống Web EmployeeCheckIn)
String shiftIdFromName(String? name) {
  final s = (name ?? '').toLowerCase();
  if (s.contains('chiều') || s.contains('2') || s.contains(' b')) return 'afternoon';
  if (s.contains('tối') || s.contains('3')) return 'evening';
  return 'morning';
}

const _earlyCheckInMinutes = 30;
const _requestTypes = ['Quên check-in', 'Quên check-out', 'Quên cả check-in và check-out'];

/// QH-47 + QH-49: Check-in / Check-out bằng giờ máy chủ và gửi yêu cầu "Quên điểm danh?"
class TimekeepingScreen extends StatefulWidget {
  const TimekeepingScreen({super.key});

  @override
  State<TimekeepingScreen> createState() => _TimekeepingScreenState();
}

class _TimekeepingScreenState extends State<TimekeepingScreen> {
  DateTime _now = DateTime.now();
  Timer? _timer;
  bool _loading = true;
  bool _processing = false;
  List<Map<String, dynamic>> _today = [];
  List<Map<String, dynamic>> _myRequests = [];

  Object? get _empId {
    final user = Provider.of<AuthProvider>(context, listen: false).currentUser;
    return user?.maNhanVien ?? user?.maNhanVienCode;
  }

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => setState(() => _now = DateTime.now()));
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final empId = _empId;
    if (empId == null) {
      setState(() => _loading = false);
      return;
    }
    final results = await Future.wait([
      StaffApi.getMyToday(empId),
      StaffApi.getAttendanceRequests(status: 'all'),
    ]);
    if (!mounted) return;
    setState(() {
      _today = results[0].list;
      _myRequests = results[1].list.where((r) => '${r['MaNhanVien']}' == '$empId').toList();
      _loading = false;
    });
  }

  int get _nowMin => _now.hour * 60 + _now.minute;

  Map<String, dynamic>? get _openRecord =>
      _today.where((r) => r['GioCheckIn'] != null && r['GioCheckOut'] == null).firstOrNull;

  ShiftDef? get _currentShift => kShifts
      .where((s) => _nowMin >= s.startMin - _earlyCheckInMinutes && _nowMin < s.endMin)
      .firstOrNull;

  bool _shiftDone(ShiftDef s) => _today.any((r) => shiftIdFromName(r['TenCaLam']) == s.id);

  ShiftDef? get _nextShift => kShifts
      .where((s) => s.startMin - _earlyCheckInMinutes > _nowMin && !_shiftDone(s))
      .firstOrNull;

  String _hhmm(dynamic iso) {
    final s = '${iso ?? ''}';
    if (s.length >= 16) return s.substring(11, 16);
    return '--:--';
  }

  Future<void> _checkIn(ShiftDef shift) async {
    setState(() => _processing = true);
    final res = await StaffApi.checkIn(_empId!, shift.id);
    setState(() => _processing = false);
    if (!mounted) return;
    final isLate = res.body is Map && res.body['isLate'] == true;
    showToast(
      context,
      res.message.isNotEmpty
          ? res.message
          : (res.ok ? 'Check-in ${shift.name} thành công!' : 'Check-in thất bại, vui lòng thử lại.'),
      error: !res.ok || isLate,
    );
    _load();
  }

  Future<void> _checkOut() async {
    final shiftName = _openRecord?['TenCaLam'] ?? 'ca làm';
    if (!await confirmDialog(context, 'Check-out', 'Xác nhận Check-out $shiftName?')) return;
    setState(() => _processing = true);
    final res = await StaffApi.checkOut(_empId!);
    setState(() => _processing = false);
    if (!mounted) return;
    showToast(
      context,
      res.message.isNotEmpty ? res.message : (res.ok ? 'Check-out thành công!' : 'Check-out thất bại.'),
      error: !res.ok,
    );
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).currentUser;
    final open = _openRecord;
    final current = _currentShift;

    return Scaffold(
      backgroundColor: kCream,
      // Khi mở từ menu (màn hình đè lên) thì có thanh tiêu đề + nút quay lại; khi là tab thì không
      appBar: Navigator.canPop(context) ? AppBar(title: const Text('Chấm công hôm nay')) : null,
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Lời chào + nút Quên điểm danh?
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Xin chào ${user?.hoTen ?? ''}',
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                      Text(user?.chucVu ?? user?.roleDisplayName ?? '',
                          style: const TextStyle(color: Colors.black54, fontSize: 13)),
                    ],
                  ),
                ),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.orange[800],
                    side: BorderSide(color: Colors.orange.shade300),
                  ),
                  icon: const Icon(Icons.help_outline, size: 18),
                  label: const Text('Quên điểm danh?'),
                  onPressed: _empId == null ? null : _openSupplementForm,
                ),
              ],
            ),
            const SizedBox(height: 12),

            if (_empId == null)
              const Card(
                color: Color(0xFFFFF8E1),
                child: Padding(
                  padding: EdgeInsets.all(14),
                  child: Text(
                    'Tài khoản này không gắn với mã nhân viên nên không chấm công được. '
                    'Vui lòng đăng nhập bằng tài khoản nhân viên.',
                    style: TextStyle(color: Color(0xFF8D6E00)),
                  ),
                ),
              ),

            // Đồng hồ + nút lớn
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                child: Column(
                  children: [
                    Text(DateFormat('HH:mm:ss').format(_now),
                        style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800, letterSpacing: 1)),
                    Text('${viWeekday(_now)}, ${DateFormat('dd/MM/yyyy').format(_now)}',
                        style: const TextStyle(color: Colors.black54)),
                    const SizedBox(height: 18),
                    if (_loading)
                      const Padding(padding: EdgeInsets.all(30), child: CircularProgressIndicator())
                    else if (open != null) ...[
                      Text('Đang làm ${open['TenCaLam'] ?? ''} · vào lúc ${_hhmm(open['GioCheckIn'])}',
                          style: const TextStyle(fontSize: 14)),
                      const SizedBox(height: 16),
                      _bigButton('Check-out', 'Bấm khi kết thúc ca', Icons.logout, Colors.red, _checkOut),
                    ] else if (current != null && !_shiftDone(current) && _empId != null) ...[
                      Text('Ca hiện tại: ${current.label}', style: const TextStyle(fontSize: 14)),
                      const SizedBox(height: 16),
                      _bigButton('Check-in', 'Bấm để vào ca', Icons.login, Colors.green, () => _checkIn(current)),
                    ] else
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300, width: 2),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(
                          children: [
                            const Icon(Icons.check_circle, color: Colors.green, size: 34),
                            const SizedBox(height: 6),
                            Text(
                              current != null && _shiftDone(current)
                                  ? 'Bạn đã hoàn thành ${current.name} hôm nay'
                                  : 'Hiện không trong giờ ca làm việc',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Nút Check-in sẽ hiện lại khi tới ca tiếp theo: '
                              '${_nextShift != null ? '${_nextShift!.label} hôm nay' : '${kShifts.first.label} ngày mai'}.',
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 13, color: Colors.black54),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),

            // Lịch sử chấm công hôm nay
            const SizedBox(height: 8),
            const Text('Lịch sử chấm công hôm nay', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 6),
            if (!_loading && _today.isEmpty)
              const EmptyBox(Icons.history, 'Chưa có lượt check-in nào hôm nay.')
            else
              ..._today.map((r) => Card(
                    child: ListTile(
                      leading: const Icon(Icons.schedule, color: kBrown),
                      title: Text('${r['TenCaLam'] ?? 'Ca làm'}', style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('Vào: ${_hhmm(r['GioCheckIn'])}  ·  Ra: ${_hhmm(r['GioCheckOut'])}'),
                      trailing: r['GioCheckOut'] == null
                          ? const StatusChip('Đang làm', Colors.blue)
                          : (r['DiTre'] == 1 || r['DiTre'] == true)
                              ? const StatusChip('Đi trễ', Colors.orange)
                              : const StatusChip('Đúng giờ', Colors.green),
                    ),
                  )),

            // Yêu cầu bổ sung điểm danh của tôi
            const SizedBox(height: 12),
            const Text('Yêu cầu bổ sung điểm danh của tôi',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 6),
            if (!_loading && _myRequests.isEmpty)
              const EmptyBox(Icons.assignment_late_outlined,
                  'Bạn chưa gửi yêu cầu nào. Nếu quên check-in, bấm "Quên điểm danh?" ở trên.')
            else
              ..._myRequests.map((r) => Card(
                    child: ListTile(
                      title: Text('${viDate(r['Ngay'])} · ${r['CaLam'] ?? ''}',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('${r['Loai'] ?? ''} · ${r['ThoiGian'] ?? ''}\n${r['LyDo'] ?? ''}'
                          '${(r['GhiChuQL'] ?? '').toString().isNotEmpty ? '\nQL: ${r['GhiChuQL']}' : ''}'),
                      isThreeLine: true,
                      trailing: StatusChip.of(r['TrangThai']),
                    ),
                  )),
          ],
        ),
      ),
    );
  }

  Widget _bigButton(String title, String sub, IconData icon, MaterialColor color, VoidCallback onTap) {
    return SizedBox(
      width: 190,
      height: 190,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          shape: const CircleBorder(),
          backgroundColor: color.shade600,
          foregroundColor: Colors.white,
          elevation: 8,
        ),
        onPressed: _processing ? null : onTap,
        child: _processing
            ? const CircularProgressIndicator(color: Colors.white)
            : Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 40),
                  const SizedBox(height: 6),
                  Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                  Text(sub, style: const TextStyle(fontSize: 12)),
                ],
              ),
      ),
    );
  }

  /// Form "Quên điểm danh?" (QH-49)
  Future<void> _openSupplementForm() async {
    DateTime ngay = DateTime.now();
    ShiftDef shift = kShifts.first;
    String loai = _requestTypes.first;
    String gioVao = shift.start;
    String gioRa = shift.end;
    final lyDoCtrl = TextEditingController();
    String? error;
    bool sending = false;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) {
          Future<void> pickTime(bool isIn) async {
            final cur = (isIn ? gioVao : gioRa).split(':');
            final t = await showTimePicker(
              context: ctx,
              initialTime: TimeOfDay(hour: int.parse(cur[0]), minute: int.parse(cur[1])),
            );
            if (t == null) return;
            final v = '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
            setSheet(() => isIn ? gioVao = v : gioRa = v);
          }

          return Padding(
            padding: EdgeInsets.fromLTRB(18, 18, 18, MediaQuery.of(ctx).viewInsets.bottom + 18),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Yêu cầu bổ sung điểm danh',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  const Text('Yêu cầu sẽ gửi tới Quản lý với trạng thái Chờ duyệt.',
                      style: TextStyle(color: Colors.black54, fontSize: 13)),
                  const SizedBox(height: 14),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.event),
                    title: const Text('Ngày làm việc'),
                    trailing: Text(DateFormat('dd/MM/yyyy').format(ngay),
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    onTap: () async {
                      final d = await showDatePicker(
                        context: ctx,
                        initialDate: ngay,
                        firstDate: DateTime.now().subtract(const Duration(days: 60)),
                        lastDate: DateTime.now(),
                      );
                      if (d != null) setSheet(() => ngay = d);
                    },
                  ),
                  DropdownButtonFormField<ShiftDef>(
                    initialValue: shift,
                    decoration: const InputDecoration(labelText: 'Ca làm việc bị quên'),
                    items: kShifts.map((s) => DropdownMenuItem(value: s, child: Text(s.label))).toList(),
                    onChanged: (s) => setSheet(() {
                      shift = s!;
                      gioVao = s.start;
                      gioRa = s.end;
                    }),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: loai,
                    decoration: const InputDecoration(labelText: 'Loại yêu cầu'),
                    items: _requestTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                    onChanged: (t) => setSheet(() => loai = t!),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.login, size: 18),
                          label: Text('Vào $gioVao'),
                          onPressed: () => pickTime(true),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.logout, size: 18),
                          label: Text('Ra $gioRa'),
                          onPressed: () => pickTime(false),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: lyDoCtrl,
                    maxLines: 3,
                    decoration: InputDecoration(
                      labelText: 'Lý do *',
                      hintText: 'Ví dụ: Em quên bấm check-in vì điện thoại hết pin, đã có mặt từ 07:00...',
                      errorText: error,
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    height: 48,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: kBrown, foregroundColor: Colors.white),
                      icon: sending
                          ? const SizedBox(
                              width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.send),
                      label: const Text('Gửi yêu cầu', style: TextStyle(fontWeight: FontWeight.bold)),
                      onPressed: sending
                          ? null
                          : () async {
                              if (gioRa.compareTo(gioVao) <= 0) {
                                setSheet(() => error = 'Giờ ra phải sau giờ vào.');
                                return;
                              }
                              if (lyDoCtrl.text.trim().length < 10) {
                                setSheet(() => error = 'Vui lòng mô tả lý do rõ ràng (tối thiểu 10 ký tự).');
                                return;
                              }
                              setSheet(() {
                                error = null;
                                sending = true;
                              });
                              final res = await StaffApi.submitAttendanceRequest(
                                maNhanVien: _empId!,
                                ngay: dateKey(ngay),
                                caLam: shift.name,
                                loai: loai,
                                thoiGian: '$gioVao - $gioRa',
                                lyDo: lyDoCtrl.text.trim(),
                              );
                              setSheet(() => sending = false);
                              if (!ctx.mounted) return;
                              if (res.ok) {
                                Navigator.pop(ctx);
                                if (mounted) showToast(context, 'Đã gửi yêu cầu bổ sung điểm danh. Vui lòng chờ Quản lý duyệt.');
                                _load();
                              } else {
                                setSheet(() => error = res.message.isNotEmpty ? res.message : 'Gửi thất bại.');
                              }
                            },
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
