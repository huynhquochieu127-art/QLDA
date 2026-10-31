import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class TimekeepingScreen extends StatefulWidget {
  const TimekeepingScreen({super.key});

  @override
  State<TimekeepingScreen> createState() => _TimekeepingScreenState();
}

class _TimekeepingScreenState extends State<TimekeepingScreen> {
  String _selectedShift = 'Ca Sáng (07:00 - 12:00)';
  bool _loading = false;
  String _statusMessage = '';
  bool _isCheckedIn = false;
  DateTime? _checkInTime;

  final List<String> _shifts = [
    'Ca Sáng (07:00 - 12:00)',
    'Ca Chiều (12:00 - 17:00)',
    'Ca Tối (17:00 - 22:30)',
  ];

  void _handleCheckIn() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.currentUser;

    if (user == null) return;

    setState(() {
      _loading = true;
      _statusMessage = '';
    });

    final res = await ApiService.checkIn(
      employeeId: user.id,
      shiftName: _selectedShift,
    );

    setState(() {
      _loading = false;
      _isCheckedIn = res['success'] == true;
      _checkInTime = DateTime.now();
      _statusMessage = res['message'] ?? 'Chấm công thành công!';
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_statusMessage),
          backgroundColor: _isCheckedIn ? Colors.green[700] : Colors.redAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;
    final currentTimeStr = DateFormat('HH:mm:ss').format(DateTime.now());
    final currentDateStr = DateFormat('EEEE, dd/MM/yyyy', 'vi_VN').format(DateTime.now());

    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Thẻ thông tin nhân viên
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: const Color(0xFF5D4037),
                      child: Text(
                        (user?.hoTen.isNotEmpty == true ? user!.hoTen[0] : 'U').toUpperCase(),
                        style: const TextStyle(fontSize: 24, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.hoTen ?? 'Nhân viên quán',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Vai trò: ${user?.role.toUpperCase() ?? "NHÂN VIÊN"}',
                            style: TextStyle(color: Colors.brown[700], fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Đồng hồ thời gian thực
            Card(
              elevation: 3,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              color: const Color(0xFF4E342E),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                child: Column(
                  children: [
                    const Icon(Icons.access_time_filled, color: Color(0xFFFFB300), size: 36),
                    const SizedBox(height: 8),
                    Text(
                      currentTimeStr,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      currentDateStr,
                      style: const TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Chọn ca làm việc
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Chọn Ca Làm Việc:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.brown.shade200),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButton<String>(
                        value: _selectedShift,
                        isExpanded: true,
                        underline: const SizedBox(),
                        items: _shifts.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedShift = val);
                        },
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Nút bấm chấm công lớn
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isCheckedIn ? Colors.green[700] : const Color(0xFF5D4037),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: _loading
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : Icon(_isCheckedIn ? Icons.check_circle : Icons.fingerprint, size: 26),
                        label: Text(
                          _isCheckedIn
                              ? 'ĐÃ ĐIỂM DANH (${DateFormat('HH:mm').format(_checkInTime!)})'
                              : 'BẤM ĐIỂM DANH VÀO CA',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        onPressed: _loading ? null : _handleCheckIn,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Quy định chấm công
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.blueGrey[50],
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blueGrey, size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Vui lòng điểm danh đúng giờ bắt đầu ca để đảm bảo tính đúng công và phụ cấp trên phiếu lương.',
                      style: TextStyle(fontSize: 12, color: Colors.black87),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
