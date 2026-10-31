import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/leave_request.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class LeaveRequestsScreen extends StatefulWidget {
  const LeaveRequestsScreen({super.key});

  @override
  State<LeaveRequestsScreen> createState() => _LeaveRequestsScreenState();
}

class _LeaveRequestsScreenState extends State<LeaveRequestsScreen> {
  bool _isLoading = true;
  List<LeaveRequestModel> _requests = [];
  String _selectedStatus = 'all';

  @override
  void initState() {
    super.initState();
    _fetchRequests();
  }

  Future<void> _fetchRequests() async {
    setState(() => _isLoading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.currentUser;

    // Nếu không phải Admin/Manager thì chỉ xem đơn của chính mình
    final empId = (user?.canApproveLeave == true) ? null : user?.maNhanVien;
    final list = await ApiService.getLeaveRequests(
      employeeId: empId,
      status: _selectedStatus == 'all' ? null : _selectedStatus,
    );

    if (mounted) {
      setState(() {
        _requests = list;
        _isLoading = false;
      });
    }
  }

  Future<void> _updateStatus(LeaveRequestModel req, String status) async {
    final success = await ApiService.updateLeaveRequestStatus(req.id, status);
    if (success) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã ${status == "approved" ? "phê duyệt" : "từ chối"} đơn #${req.id}'),
            backgroundColor: status == 'approved' ? Colors.green : Colors.red,
          ),
        );
      }
      _fetchRequests();
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cập nhật thất bại!'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showCreateDialog() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.currentUser;
    final reasonCtrl = TextEditingController();
    DateTime selectedDate = DateTime.now().add(const Duration(days: 1));
    String leaveType = 'Nghỉ phép';

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text('Gửi Đơn Xin Nghỉ Phép', style: TextStyle(fontWeight: FontWeight.bold)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.calendar_today, color: Color(0xFF5D4037)),
                      title: const Text('Ngày nghỉ:'),
                      subtitle: Text(
                        '${selectedDate.day}/${selectedDate.month}/${selectedDate.year}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      trailing: TextButton(
                        child: const Text('Chọn ngày'),
                        onPressed: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: selectedDate,
                            firstDate: DateTime.now(),
                            lastDate: DateTime.now().add(const Duration(days: 90)),
                          );
                          if (picked != null) {
                            setDialogState(() => selectedDate = picked);
                          }
                        },
                      ),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: leaveType,
                      decoration: const InputDecoration(
                        labelText: 'Loại nghỉ',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'Nghỉ phép', child: Text('Nghỉ phép thường')),
                        DropdownMenuItem(value: 'Nghỉ ốm', child: Text('Nghỉ ốm / Khám bệnh')),
                        DropdownMenuItem(value: 'Việc bận', child: Text('Việc gia đình đột xuất')),
                      ],
                      onChanged: (val) {
                        if (val != null) setDialogState(() => leaveType = val);
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: reasonCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Lý do xin nghỉ *',
                        hintText: 'Nhập chi tiết lý do...',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('HỦY'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF5D4037),
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () async {
                    final reason = reasonCtrl.text.trim();
                    if (reason.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Vui lòng nhập lý do xin nghỉ!')),
                      );
                      return;
                    }

                    final empId = user?.maNhanVien ?? user?.id ?? 0;
                    final dateStr =
                        '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, "0")}-${selectedDate.day.toString().padLeft(2, "0")}';

                    final messenger = ScaffoldMessenger.of(context);
                    Navigator.pop(ctx);
                    final success = await ApiService.createLeaveRequest(
                      employeeId: empId,
                      reason: reason,
                      startDate: dateStr,
                      leaveType: leaveType,
                    );

                    if (success) {
                      messenger.showSnackBar(
                        const SnackBar(
                          content: Text('Đã gửi đơn xin nghỉ thành công!'),
                          backgroundColor: Colors.green,
                        ),
                      );
                      _fetchRequests();
                    } else {
                      messenger.showSnackBar(
                        const SnackBar(
                          content: Text('Gửi đơn thất bại! Vui lòng thử lại.'),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  },
                  child: const Text('GỬI ĐƠN'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;
    final canApprove = user?.canApproveLeave == true;

    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      appBar: AppBar(
        title: Text(
          canApprove ? 'Duyệt Đơn Nghỉ Phép' : 'Đơn Xin Nghỉ Phép Của Tôi',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF5D4037),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchRequests,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF5D4037),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_task),
        label: const Text('Tạo Đơn Nghỉ'),
        onPressed: _showCreateDialog,
      ),
      body: Column(
        children: [
          // Filter trạng thái
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildStatusChip('Tất cả', 'all'),
                  const SizedBox(width: 8),
                  _buildStatusChip('Chờ duyệt (Pending)', 'pending'),
                  const SizedBox(width: 8),
                  _buildStatusChip('Đã duyệt', 'approved'),
                  const SizedBox(width: 8),
                  _buildStatusChip('Từ chối', 'rejected'),
                ],
              ),
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF5D4037)))
                : _requests.isEmpty
                    ? Center(
                        child: Text(
                          canApprove ? 'Không có đơn xin nghỉ nào' : 'Bạn chưa có đơn xin nghỉ nào',
                          style: const TextStyle(color: Colors.black54),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchRequests,
                        color: const Color(0xFF5D4037),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                          itemCount: _requests.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 10),
                          itemBuilder: (ctx, idx) {
                            final req = _requests[idx];
                            return _buildRequestCard(req, canApprove);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String label, String value) {
    final isSelected = _selectedStatus == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) {
        setState(() => _selectedStatus = value);
        _fetchRequests();
      },
      selectedColor: const Color(0xFF5D4037),
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : Colors.black87,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
      backgroundColor: Colors.grey.shade100,
    );
  }

  Widget _buildRequestCard(LeaveRequestModel req, bool canApprove) {
    Color statusColor = Colors.orange;
    if (req.isApproved) {
      statusColor = Colors.green;
    } else if (req.isRejected) {
      statusColor = Colors.red;
    }

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: const Color(0xFF5D4037).withValues(alpha: 0.1),
                      child: Text(
                        req.employeeName.isNotEmpty ? req.employeeName[0].toUpperCase() : 'N',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF5D4037)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      req.employeeName,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    req.statusText,
                    style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.calendar_today, size: 14, color: Colors.black54),
                const SizedBox(width: 6),
                Text(
                  'Ngày nghỉ: ${req.startDate} (${req.leaveType})',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.notes, size: 14, color: Colors.black54),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Lý do: ${req.reason}',
                    style: const TextStyle(fontSize: 13, color: Colors.black87),
                  ),
                ),
              ],
            ),
            if (req.shiftWarning != null && req.shiftWarning!.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.amber.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 16),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        req.shiftWarning!,
                        style: TextStyle(color: Colors.orange.shade900, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),

            // Nút duyệt đơn dành cho Admin / Quản lý
            if (canApprove && req.isPending) ...[
              const Divider(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      visualDensity: VisualDensity.compact,
                    ),
                    icon: const Icon(Icons.close, size: 16),
                    label: const Text('Từ chối'),
                    onPressed: () => _updateStatus(req, 'rejected'),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      visualDensity: VisualDensity.compact,
                    ),
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Phê duyệt'),
                    onPressed: () => _updateStatus(req, 'approved'),
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
