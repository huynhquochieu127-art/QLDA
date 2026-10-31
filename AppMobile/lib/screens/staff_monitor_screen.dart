import 'package:flutter/material.dart';
import '../services/staff_api.dart';
import '../widgets/staff_ui.dart';

/// Giám sát kỷ luật & Trực quầy (giống Web WorkingStaffPanel):
/// doanh thu hôm nay + danh sách nhân viên đi trễ trong ngày (QH-101).
class StaffMonitorScreen extends StatefulWidget {
  const StaffMonitorScreen({super.key});

  @override
  State<StaffMonitorScreen> createState() => _StaffMonitorScreenState();
}

class _StaffMonitorScreenState extends State<StaffMonitorScreen> {
  Map<String, dynamic> _revenue = {};
  List<Map<String, dynamic>> _late = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final results = await Future.wait([StaffApi.getTodayRevenue(), StaffApi.getLateToday()]);
    if (!mounted) return;
    setState(() {
      final body = results[0].body;
      _revenue = body is Map && body['duLieu'] is Map ? Map<String, dynamic>.from(body['duLieu']) : {};
      _late = results[1].list;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kCream,
      appBar: AppBar(title: const Text('Giám sát kỷ luật & Trực quầy')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(12),
          children: [
            // Doanh thu hôm nay
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF0F172A), Color(0xFF1E293B)]),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Doanh thu hôm nay (${viDate(dateKey(DateTime.now()))})',
                      style: const TextStyle(color: Colors.white70)),
                  const SizedBox(height: 6),
                  Text(
                    _loading ? '...' : money(_revenue['tongTien']),
                    style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${_revenue['soDonHang'] ?? 0} hóa đơn · TB ${money(_revenue['giaTriTrungBinh'])}/đơn',
                    style: const TextStyle(color: Color(0xFFFFD54F)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                const Icon(Icons.warning_amber_rounded, color: Colors.orange),
                const SizedBox(width: 6),
                Text('Nhân viên đi trễ hôm nay (${_late.length})',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ],
            ),
            const SizedBox(height: 6),
            if (_loading)
              const Padding(padding: EdgeInsets.all(30), child: Center(child: CircularProgressIndicator()))
            else if (_late.isEmpty)
              const EmptyBox(Icons.verified, 'Tuyệt vời! Hôm nay chưa có nhân viên nào đi trễ.')
            else
              ..._late.map((r) => Card(
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.orange.withValues(alpha: 0.15),
                        child: Text('${r['HoTen'] ?? '?'}'.characters.first.toUpperCase(),
                            style: const TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold)),
                      ),
                      title: Text('${r['HoTen'] ?? ''} (${r['MaNhanVienCode'] ?? ''})',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('${r['ChucVu'] ?? ''} · ${r['TenCaLam'] ?? ''}\n'
                          'Ca bắt đầu ${r['GioBatDau'] ?? '--:--'} · Check-in ${r['GioCheckInThucTe'] ?? '--:--'}'),
                      isThreeLine: true,
                      trailing: StatusChip('Trễ ${r['SoPhutDiTre'] ?? 0}\'', Colors.deepOrange),
                    ),
                  )),
          ],
        ),
      ),
    );
  }
}
