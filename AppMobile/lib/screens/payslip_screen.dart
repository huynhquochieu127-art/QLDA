import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/staff_api.dart';
import '../widgets/staff_ui.dart';

/// QH-59: Phiếu lương chi tiết (giống Web Payslip). Admin được chọn nhân viên để xem.
class PayslipScreen extends StatefulWidget {
  const PayslipScreen({super.key});

  @override
  State<PayslipScreen> createState() => _PayslipScreenState();
}

class _PayslipScreenState extends State<PayslipScreen> {
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month - 1);
  Map<String, dynamic>? _slip;
  String _message = '';
  bool _loading = true;
  List<Map<String, dynamic>> _employees = [];
  Object? _selectedEmpId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final u = Provider.of<AuthProvider>(context, listen: false).currentUser;
      _selectedEmpId = u?.maNhanVien ?? u?.maNhanVienCode;
      if (u?.isAdmin == true) {
        final res = await StaffApi.getEmployees();
        _employees = res.list;
        if (_selectedEmpId == null && _employees.isNotEmpty) _selectedEmpId = _employees.first['MaNhanVien'];
      }
      _load();
    });
  }

  Future<void> _load() async {
    if (_selectedEmpId == null) {
      setState(() => _loading = false);
      return;
    }
    setState(() => _loading = true);
    final res = await StaffApi.getMyPayslip(_selectedEmpId!, _month.month, _month.year);
    if (!mounted) return;
    setState(() {
      _slip = res.data is Map ? Map<String, dynamic>.from(res.data) : null;
      _message = res.message.isNotEmpty ? res.message : 'Chưa có phiếu lương tháng này.';
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = Provider.of<AuthProvider>(context).currentUser?.isAdmin == true;
    final s = _slip;

    return Scaffold(
      backgroundColor: kCream,
      appBar: AppBar(title: const Text('Phiếu lương')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (isAdmin && _employees.isNotEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: DropdownButtonFormField<String>(
                    initialValue: '$_selectedEmpId',
                    decoration: const InputDecoration(labelText: 'Nhân viên', border: InputBorder.none),
                    items: _employees
                        .map((e) => DropdownMenuItem(
                              value: '${e['MaNhanVien']}',
                              child: Text('${e['HoTen']} (${e['MaNhanVienCode'] ?? 'NV${e['MaNhanVien']}'})'),
                            ))
                        .toList(),
                    onChanged: (v) {
                      _selectedEmpId = v;
                      _load();
                    },
                  ),
                ),
              ),
            MonthSelector(month: _month, onChanged: (m) {
              setState(() => _month = m);
              _load();
            }),
            const SizedBox(height: 8),
            if (_selectedEmpId == null)
              const EmptyBox(Icons.badge_outlined, 'Tài khoản này không gắn với mã nhân viên.')
            else if (_loading)
              const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
            else if (s == null)
              EmptyBox(Icons.receipt_long, _message)
            else
              _buildSlip(s),
          ],
        ),
      ),
    );
  }

  Widget _buildSlip(Map<String, dynamic> s) {
    final isPartTime = '${s['LoaiNhanVien'] ?? ''}'.toLowerCase().contains('part');
    final rate = toDouble(s['LuongCoBan']);
    final hours = toDouble(s['SoGioLam']);
    final basePay = isPartTime ? (hours * rate).roundToDouble() : rate;
    final bonus = toDouble(s['Thuong']);
    // Giống Web Payslip: phạt nghỉ không phép (chỉ Full-time) + phạt đi trễ 20.000đ/lần
    const latePenalty = 20000;
    const standardWorkDays = 26;
    final leaveDays = toDouble(s['SoNgayNghiKhongPhep']).toInt();
    final lateCount = toDouble(s['SoNgayTre']).toInt();
    final leavePenalty = isPartTime ? 0.0 : leaveDays * (rate / standardWorkDays).roundToDouble();
    final lateFine = lateCount * latePenalty.toDouble();
    final net = toDouble(s['TongLuong']);

    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: [Color(0xFF3E2723), kBrown]),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('PHIẾU LƯƠNG THÁNG ${_month.month.toString().padLeft(2, '0')}/${_month.year}',
                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('${s['HoTen'] ?? ''} · ${s['MaNhanVienCode'] ?? ''} · ${s['ChucVu'] ?? ''}',
                    style: const TextStyle(color: Colors.white70)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                InfoLine('Hợp đồng', isPartTime ? 'Part-time (Lương giờ)' : 'Full-time (Lương cứng)'),
                InfoLine('Mức lương', '${money(rate)} / ${isPartTime ? 'giờ' : 'tháng'}'),
                InfoLine(isPartTime ? 'Giờ công' : 'Ngày công',
                    isPartTime ? '${s['SoGioLam'] ?? 0} giờ' : '${s['SoCong'] ?? 0} ngày'),
                InfoLine('Trạng thái', '${s['TrangThai'] ?? 'Chờ duyệt'}'),
                const Divider(height: 24),
                const Text('LƯƠNG CHÍNH', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black54)),
                InfoLine(isPartTime ? 'Lương theo giờ công' : 'Lương cơ bản', money(basePay)),
                const SizedBox(height: 8),
                const Text('CÁC KHOẢN CỘNG', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
                InfoLine('Thưởng', '+ ${money(bonus)}', valueColor: Colors.green[700]),
                const SizedBox(height: 8),
                const Text('CÁC KHOẢN TRỪ', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
                if (leavePenalty > 0)
                  InfoLine('Phạt nghỉ không phép ($leaveDays ngày)', '- ${money(leavePenalty)}',
                      valueColor: Colors.red[700]),
                if (lateFine > 0)
                  InfoLine('Phạt đi trễ ($lateCount lần × ${money(latePenalty)})', '- ${money(lateFine)}',
                      valueColor: Colors.red[700]),
                if (leavePenalty <= 0 && lateFine <= 0)
                  const InfoLine('Không có khoản trừ', '0 đ'),
                if ('${s['GhiChu'] ?? ''}'.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text('Ghi chú: ${s['GhiChu']}', style: const TextStyle(color: Colors.black54, fontSize: 12)),
                ],
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F5E9),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text('THỰC LĨNH', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
                      ),
                      Text(money(net),
                          style: TextStyle(color: Colors.green[800], fontSize: 22, fontWeight: FontWeight.w800)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
