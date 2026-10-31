import 'package:flutter/material.dart';
import '../services/staff_api.dart';
import '../widgets/staff_ui.dart';

/// QH-99: Báo cáo doanh thu theo ngày, lọc "Tuần này" / "Tháng này" (giống Web RevenueReport).
class RevenuePeriodScreen extends StatefulWidget {
  const RevenuePeriodScreen({super.key});

  @override
  State<RevenuePeriodScreen> createState() => _RevenuePeriodScreenState();
}

class _RevenuePeriodScreenState extends State<RevenuePeriodScreen> {
  String _range = 'week'; // 'week' | 'month'
  Map<String, Map<String, double>> _byDay = {};
  bool _loading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  List<DateTime> get _days {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    if (_range == 'week') {
      final monday = today.subtract(Duration(days: today.weekday - 1));
      return List.generate(7, (i) => monday.add(Duration(days: i)));
    }
    final last = DateTime(now.year, now.month + 1, 0).day;
    return List.generate(last, (i) => DateTime(now.year, now.month, i + 1));
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    final days = _days;
    final res = await StaffApi.getRevenueByDay(dateKey(days.first), dateKey(days.last));
    if (!mounted) return;
    final map = <String, Map<String, double>>{};
    for (final r in res.list) {
      final parsed = DateTime.tryParse('${r['Ngay']}');
      if (parsed == null) continue;
      final key = '${r['Ngay']}'.length == 10 ? '${r['Ngay']}' : dateKey(parsed.toLocal());
      map[key] = {
        'revenue': toDouble(r['ThucThu']) > 0 ? toDouble(r['ThucThu']) : toDouble(r['TongDoanhThu']),
        'orders': toDouble(r['TongDon']),
        'discount': toDouble(r['TongChietKhau']),
      };
    }
    setState(() {
      _byDay = map;
      _error = res.ok ? '' : (res.message.isNotEmpty ? res.message : 'Không tải được báo cáo.');
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final days = _days;
    final todayKey = dateKey(DateTime.now());
    final values = days.map((d) => _byDay[dateKey(d)]?['revenue'] ?? 0).toList();
    final total = values.fold<double>(0, (s, v) => s + v);
    final orders = _byDay.values.fold<double>(0, (s, v) => s + (v['orders'] ?? 0));
    final passed = days.where((d) => dateKey(d).compareTo(todayKey) <= 0).length;
    final maxV = values.fold<double>(0, (m, v) => v > m ? v : m);
    final bestIndex = maxV > 0 ? values.indexOf(maxV) : -1;

    return Scaffold(
      backgroundColor: kCream,
      appBar: AppBar(title: const Text('Báo cáo doanh thu')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(12),
          children: [
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'week', label: Text('Tuần này'), icon: Icon(Icons.view_week)),
                ButtonSegment(value: 'month', label: Text('Tháng này'), icon: Icon(Icons.calendar_month)),
              ],
              selected: {_range},
              onSelectionChanged: (s) {
                setState(() => _range = s.first);
                _load();
              },
            ),
            const SizedBox(height: 8),
            StatGrid(children: [
              StatTile('Tổng doanh thu', money(total)),
              StatTile('Trung bình / ngày', money(passed == 0 ? 0 : total / passed)),
              StatTile('Số đơn hàng', orders.toInt().toString()),
              StatTile('Ngày cao nhất',
                  bestIndex < 0 ? '-' : '${days[bestIndex].day}/${days[bestIndex].month}',
                  color: Colors.indigo),
            ]),
            if (_error.isNotEmpty)
              Card(color: const Color(0xFFFFEBEE), child: ListTile(title: Text(_error))),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: _loading
                    ? const Padding(padding: EdgeInsets.all(30), child: Center(child: CircularProgressIndicator()))
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Doanh thu theo ngày (VNĐ)', style: TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 10),
                          for (var i = 0; i < days.length; i++)
                            _bar(days[i], values[i], maxV, isBest: i == bestIndex,
                                isFuture: dateKey(days[i]).compareTo(todayKey) > 0),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bar(DateTime d, double value, double maxV, {bool isBest = false, bool isFuture = false}) {
    const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    final label = _range == 'week' ? '${weekdays[d.weekday - 1]} ${d.day}/${d.month}' : '${d.day}/${d.month}';
    final ratio = maxV <= 0 ? 0.0 : value / maxV;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          SizedBox(width: 62, child: Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54))),
          Expanded(
            child: LayoutBuilder(
              builder: (ctx, c) => Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  height: 16,
                  width: value > 0 ? (c.maxWidth * ratio).clamp(4.0, c.maxWidth) : 0,
                  decoration: BoxDecoration(
                    color: isBest ? const Color(0xFF3730A3) : const Color(0xFF4F46E5),
                    borderRadius: const BorderRadius.horizontal(right: Radius.circular(4)),
                  ),
                ),
              ),
            ),
          ),
          SizedBox(
            width: 92,
            child: Text(
              isFuture ? '-' : money(value),
              textAlign: TextAlign.right,
              style: TextStyle(fontSize: 12, fontWeight: isBest ? FontWeight.bold : FontWeight.normal),
            ),
          ),
        ],
      ),
    );
  }
}
