import 'package:flutter/material.dart';
import '../utils/formatters.dart';

/// Các widget dùng chung cho những màn hình nhân sự / chấm công / lương.
const kBrown = Color(0xFF5D4037);
const kCream = Color(0xFFF9F6F0);

double toDouble(dynamic v) => v is num ? v.toDouble() : double.tryParse('${v ?? 0}') ?? 0;

String money(dynamic v) => Formatters.formatCurrency(toDouble(v));

/// Đổi 'YYYY-MM-DD' (hoặc ISO) sang 'dd/MM/yyyy'.
String viDate(dynamic raw) {
  final s = '${raw ?? ''}';
  if (s.length < 10) return s.isEmpty ? '-' : s;
  final p = s.substring(0, 10).split('-');
  return p.length == 3 ? '${p[2]}/${p[1]}/${p[0]}' : s;
}

const _weekdays = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

String viWeekday(DateTime d) => _weekdays[d.weekday - 1];

String dateKey(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

void showToast(BuildContext context, String message, {bool error = false}) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(message),
    backgroundColor: error ? Colors.redAccent : Colors.green[700],
  ));
}

/// Nhãn trạng thái màu (Chờ duyệt / Đã duyệt / Từ chối ...).
class StatusChip extends StatelessWidget {
  final String text;
  final Color color;
  const StatusChip(this.text, this.color, {super.key});

  /// Map các trạng thái hay gặp của backend sang nhãn tiếng Việt + màu.
  factory StatusChip.of(String? raw) {
    final s = (raw ?? '').toLowerCase();
    if (s == 'approved' || s.contains('đã duyệt') || s == 'confirmed' || s.contains('đã thanh toán')) {
      return StatusChip(s == 'confirmed' ? 'Đã xác nhận' : (raw!.contains('Đã') ? raw : 'Đã duyệt'), Colors.green);
    }
    if (s == 'rejected' || s.contains('từ chối')) return const StatusChip('Từ chối', Colors.red);
    if (s == 'emp_replied') return const StatusChip('Đang khiếu nại', Colors.deepOrange);
    if (s == 'submitted_to_admin') return const StatusChip('Đã chốt gửi Admin', Colors.indigo);
    if (s == 'sent_to_emp') return const StatusChip('Chờ NV xác nhận', Colors.blue);
    if (s == 'draft') return const StatusChip('Nháp', Colors.blueGrey);
    return StatusChip(raw == null || raw.isEmpty || s == 'pending' ? 'Chờ duyệt' : raw, Colors.orange);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }
}

/// Thanh chọn tháng: ‹  Tháng 10/2026  ›
class MonthSelector extends StatelessWidget {
  final DateTime month;
  final ValueChanged<DateTime> onChanged;
  const MonthSelector({super.key, required this.month, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () => onChanged(DateTime(month.year, month.month - 1)),
          ),
          Expanded(
            child: Text(
              'Tháng ${month.month}/${month.year}',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () => onChanged(DateTime(month.year, month.month + 1)),
          ),
        ],
      ),
    );
  }
}

/// Ô số liệu nhỏ (dùng trong lưới thống kê).
class StatTile extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const StatTile(this.label, this.value, {super.key, this.color = kBrown});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(label, style: const TextStyle(color: Colors.black54, fontSize: 12)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}

/// Lưới 2 cột cho các StatTile.
class StatGrid extends StatelessWidget {
  final List<Widget> children;
  const StatGrid({super.key, required this.children});

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 2.3,
      mainAxisSpacing: 6,
      crossAxisSpacing: 6,
      children: children,
    );
  }
}

/// Dòng "nhãn ........ giá trị".
class InfoLine extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final bool bold;
  const InfoLine(this.label, this.value, {super.key, this.valueColor, this.bold = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: Colors.black54, fontSize: 13))),
          Text(
            value,
            style: TextStyle(
              color: valueColor ?? Colors.black87,
              fontSize: bold ? 15 : 13,
              fontWeight: bold ? FontWeight.bold : FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Khung thông báo trống / lỗi ở giữa màn hình.
class EmptyBox extends StatelessWidget {
  final IconData icon;
  final String text;
  const EmptyBox(this.icon, this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
      child: Column(
        children: [
          Icon(icon, size: 48, color: Colors.brown.shade200),
          const SizedBox(height: 10),
          Text(text, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54)),
        ],
      ),
    );
  }
}

/// Hộp thoại nhập văn bản (lý do, ghi chú...). Trả về null nếu bấm Hủy.
Future<String?> promptText(
  BuildContext context, {
  required String title,
  String hint = '',
  String initial = '',
  String confirmText = 'Gửi',
  int minLength = 0,
}) {
  final ctrl = TextEditingController(text: initial);
  return showDialog<String>(
    context: context,
    builder: (ctx) {
      String? error;
      return StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: Text(title),
          content: TextField(
            controller: ctrl,
            maxLines: 4,
            autofocus: true,
            decoration: InputDecoration(hintText: hint, errorText: error, border: const OutlineInputBorder()),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: kBrown, foregroundColor: Colors.white),
              onPressed: () {
                if (ctrl.text.trim().length < minLength) {
                  setState(() => error = 'Vui lòng nhập tối thiểu $minLength ký tự.');
                  return;
                }
                Navigator.pop(ctx, ctrl.text.trim());
              },
              child: Text(confirmText),
            ),
          ],
        ),
      );
    },
  );
}

Future<bool> confirmDialog(BuildContext context, String title, String message) async {
  final res = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: kBrown, foregroundColor: Colors.white),
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('Đồng ý'),
        ),
      ],
    ),
  );
  return res == true;
}
