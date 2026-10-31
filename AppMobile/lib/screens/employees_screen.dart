import 'package:flutter/material.dart';
import '../models/employee.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';

class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key});

  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen> {
  bool _isLoading = true;
  List<EmployeeModel> _employees = [];
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchEmployees();
  }

  Future<void> _fetchEmployees() async {
    setState(() => _isLoading = true);
    final list = await ApiService.getEmployees();
    if (mounted) {
      setState(() {
        _employees = list;
        _isLoading = false;
      });
    }
  }

  List<EmployeeModel> get _filteredEmployees {
    if (_searchQuery.trim().isEmpty) return _employees;
    final q = _searchQuery.toLowerCase().trim();
    return _employees.where((e) {
      return e.name.toLowerCase().contains(q) ||
          e.code.toLowerCase().contains(q) ||
          (e.phone ?? '').contains(q) ||
          e.position.toLowerCase().contains(q);
    }).toList();
  }

  // Dialog Thêm nhân viên mới
  void _showAddEmployeeDialog() {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final cccdCtrl = TextEditingController();
    final salaryCtrl = TextEditingController();
    final passwordCtrl = TextEditingController();

    String selectedPosition = 'Phục vụ';
    String selectedContract = 'Full-time';
    int selectedRoleId = 3;

    final positions = ['Quản lý', 'Thu ngân', 'Pha chế', 'Phục vụ'];

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF5D4037).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.person_add, color: Color(0xFF5D4037)),
                ),
                const SizedBox(width: 12),
                const Text('Thêm Nhân Viên Mới', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              ],
            ),
            content: SizedBox(
              width: MediaQuery.of(context).size.width * 0.9,
              child: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        controller: nameCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Họ và tên *',
                          prefixIcon: Icon(Icons.badge_outlined),
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập họ tên' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: emailCtrl,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Email đăng nhập *',
                          prefixIcon: Icon(Icons.email_outlined),
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Vui lòng nhập email';
                          if (!v.contains('@') || !v.contains('.')) return 'Email không hợp lệ';
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: phoneCtrl,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Số điện thoại',
                          prefixIcon: Icon(Icons.phone_outlined),
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: cccdCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Số CCCD (dùng tạo mật khẩu tự động)',
                          prefixIcon: Icon(Icons.credit_card),
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: selectedPosition,
                              decoration: const InputDecoration(
                                labelText: 'Vị trí công việc',
                                border: OutlineInputBorder(),
                              ),
                              items: positions.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  setDialogState(() {
                                    selectedPosition = val;
                                    if (val == 'Quản lý') {
                                      selectedRoleId = 2;
                                      selectedContract = 'Full-time';
                                    } else {
                                      selectedRoleId = 3;
                                    }
                                  });
                                }
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: selectedContract,
                              decoration: const InputDecoration(
                                labelText: 'Hợp đồng',
                                border: OutlineInputBorder(),
                              ),
                              items: const [
                                DropdownMenuItem(value: 'Full-time', child: Text('Full-time')),
                                DropdownMenuItem(value: 'Part-time', child: Text('Part-time')),
                              ],
                              onChanged: (val) {
                                if (val != null) {
                                  setDialogState(() => selectedContract = val);
                                }
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: salaryCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: selectedContract == 'Full-time' ? 'Lương tháng (VNĐ)' : 'Lương theo giờ (VNĐ/h)',
                          prefixIcon: const Icon(Icons.monetization_on_outlined),
                          border: const OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: passwordCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Mật khẩu khởi tạo (để trống: tự sinh)',
                          prefixIcon: Icon(Icons.lock_outline),
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogCtx),
                child: const Text('Hủy', style: TextStyle(color: Colors.grey)),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF5D4037),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () async {
                  if (!formKey.currentState!.validate()) return;
                  Navigator.pop(dialogCtx);

                  final salaryVal = double.tryParse(salaryCtrl.text.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0;
                  final res = await ApiService.createEmployee(
                    hoTen: nameCtrl.text,
                    email: emailCtrl.text,
                    soDienThoai: phoneCtrl.text,
                    cccd: cccdCtrl.text,
                    chucVu: selectedPosition,
                    loaiNhanVien: selectedContract,
                    luong: salaryVal,
                    maVaiTro: selectedRoleId,
                    password: passwordCtrl.text.isNotEmpty ? passwordCtrl.text : null,
                  );

                  if (!mounted) return;
                  if (res['success'] == true) {
                    final handover = res['data']?['handoverInfo'] ?? {};
                    _showHandoverDialog(
                      code: handover['maNhanVienCode'] ?? 'NV mới',
                      name: nameCtrl.text,
                      email: emailCtrl.text,
                      password: handover['matKhauMacDinh'] ?? 'Cafe@123',
                    );
                    _fetchEmployees();
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(res['message'] ?? 'Thêm nhân viên thất bại!'), backgroundColor: Colors.red),
                    );
                  }
                },
                child: const Text('Tạo nhân viên'),
              ),
            ],
          );
        },
      ),
    );
  }

  // Dialog hiển thị thông tin bàn giao tài khoản sau khi tạo
  void _showHandoverDialog({
    required String code,
    required String name,
    required String email,
    required String password,
  }) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green, size: 28),
            SizedBox(width: 8),
            Text('Tạo Thành Công!', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Vui lòng lưu lại thông tin tài khoản để bàn giao cho nhân viên:'),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.amber.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('• Mã NV: $code', style: const TextStyle(fontWeight: FontWeight.bold)),
                  Text('• Họ tên: $name'),
                  Text('• Email: $email', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF5D4037))),
                  Text('• Mật khẩu mặc định: $password',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Nhắc nhở nhân viên đổi lại mật khẩu sau lần đăng nhập đầu tiên.',
              style: TextStyle(fontSize: 12, color: Colors.black54, fontStyle: FontStyle.italic),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF5D4037), foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Đã hiểu'),
          ),
        ],
      ),
    );
  }

  // Dialog Sửa thông tin nhân viên
  void _showEditEmployeeDialog(EmployeeModel emp) {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController(text: emp.name);
    final phoneCtrl = TextEditingController(text: emp.phone ?? '');
    final cccdCtrl = TextEditingController(text: emp.cccd ?? '');
    final salaryCtrl = TextEditingController(text: emp.salary != null ? emp.salary!.toInt().toString() : '');

    String selectedPosition = emp.position;
    String selectedContract = emp.contractType;
    String selectedStatus = emp.status;

    final positions = ['Quản lý', 'Thu ngân', 'Pha chế', 'Phục vụ', 'Nhân viên'];
    if (!positions.contains(selectedPosition)) {
      positions.add(selectedPosition);
    }

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Text('Sửa: ${emp.name} (${emp.code})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            content: SizedBox(
              width: MediaQuery.of(context).size.width * 0.9,
              child: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        controller: nameCtrl,
                        decoration: const InputDecoration(labelText: 'Họ và tên *', border: OutlineInputBorder()),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập họ tên' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: phoneCtrl,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(labelText: 'Số điện thoại', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: cccdCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'CCCD', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: selectedPosition,
                              decoration: const InputDecoration(labelText: 'Vị trí', border: OutlineInputBorder()),
                              items: positions.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                              onChanged: (val) {
                                if (val != null) setDialogState(() => selectedPosition = val);
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: selectedContract,
                              decoration: const InputDecoration(labelText: 'Hợp đồng', border: OutlineInputBorder()),
                              items: const [
                                DropdownMenuItem(value: 'Full-time', child: Text('Full-time')),
                                DropdownMenuItem(value: 'Part-time', child: Text('Part-time')),
                              ],
                              onChanged: (val) {
                                if (val != null) setDialogState(() => selectedContract = val);
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: salaryCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: selectedContract == 'Full-time' ? 'Lương tháng (VNĐ)' : 'Lương theo giờ (VNĐ/h)',
                          border: const OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: selectedStatus,
                        decoration: const InputDecoration(labelText: 'Trạng thái', border: OutlineInputBorder()),
                        items: const [
                          DropdownMenuItem(value: 'Đang làm việc', child: Text('Đang làm việc')),
                          DropdownMenuItem(value: 'Đã nghỉ việc', child: Text('Đã nghỉ việc')),
                        ],
                        onChanged: (val) {
                          if (val != null) setDialogState(() => selectedStatus = val);
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(dialogCtx), child: const Text('Hủy', style: TextStyle(color: Colors.grey))),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF5D4037), foregroundColor: Colors.white),
                onPressed: () async {
                  if (!formKey.currentState!.validate()) return;
                  Navigator.pop(dialogCtx);

                  final salaryVal = double.tryParse(salaryCtrl.text.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0;
                  final res = await ApiService.updateEmployee(
                    emp.id,
                    hoTen: nameCtrl.text,
                    soDienThoai: phoneCtrl.text,
                    cccd: cccdCtrl.text,
                    chucVu: selectedPosition,
                    loaiNhanVien: selectedContract,
                    luong: salaryVal,
                    trangThai: selectedStatus,
                  );

                  if (!mounted) return;
                  if (res['success'] == true) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Cập nhật nhân viên thành công!'), backgroundColor: Colors.green),
                    );
                    _fetchEmployees();
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(res['message'] ?? 'Cập nhật thất bại!'), backgroundColor: Colors.red),
                    );
                  }
                },
                child: const Text('Lưu thay đổi'),
              ),
            ],
          );
        },
      ),
    );
  }

  // Dialog xác nhận Xóa nhân viên
  void _confirmDeleteEmployee(EmployeeModel emp) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.red, size: 28),
            SizedBox(width: 8),
            Text('Xác Nhận Xóa', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text('Bạn có chắc chắn muốn xóa nhân viên "${emp.name}" (${emp.code})? Tài khoản đăng nhập của nhân viên này cũng sẽ bị xóa.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy', style: TextStyle(color: Colors.grey))),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.pop(ctx);
              final ok = await ApiService.deleteEmployee(emp.id);
              if (!mounted) return;
              if (ok) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã xóa nhân viên thành công!'), backgroundColor: Colors.green),
                );
                _fetchEmployees();
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Xóa nhân viên thất bại!'), backgroundColor: Colors.red),
                );
              }
            },
            child: const Text('Xóa ngay'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final employees = _filteredEmployees;

    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      appBar: AppBar(
        title: const Text('Quản Lý Nhân Sự', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF5D4037),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Làm mới',
            onPressed: _fetchEmployees,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF5D4037),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add),
        label: const Text('Thêm Nhân Viên', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: _showAddEmployeeDialog,
      ),
      body: Column(
        children: [
          // Thanh tìm kiếm
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              onChanged: (val) => setState(() => _searchQuery = val),
              decoration: InputDecoration(
                hintText: 'Tìm kiếm nhân viên (Tên, Mã NV, SĐT)...',
                prefixIcon: const Icon(Icons.search, color: Color(0xFF5D4037)),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(icon: const Icon(Icons.clear), onPressed: () => setState(() => _searchQuery = ''))
                    : null,
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF5D4037)))
                : employees.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.people_outline, size: 64, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            Text(
                              _searchQuery.isNotEmpty ? 'Không tìm thấy nhân viên phù hợp' : 'Chưa có nhân viên nào trong danh sách',
                              style: const TextStyle(color: Colors.black54, fontSize: 15),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchEmployees,
                        color: const Color(0xFF5D4037),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
                          itemCount: employees.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 10),
                          itemBuilder: (ctx, idx) {
                            final emp = employees[idx];
                            final isFullTime = emp.contractType.toLowerCase().contains('full');
                            final isWorking = emp.status.toLowerCase().contains('đang') || emp.status == 'active';

                            return Card(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              elevation: 1,
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  children: [
                                    CircleAvatar(
                                      radius: 24,
                                      backgroundColor: const Color(0xFF5D4037).withValues(alpha: 0.1),
                                      child: Text(
                                        emp.name.isNotEmpty ? emp.name[0].toUpperCase() : 'N',
                                        style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF5D4037), fontSize: 18),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  emp.name,
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              if (emp.code.isNotEmpty)
                                                Container(
                                                  margin: const EdgeInsets.only(left: 6),
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: Colors.grey.shade200,
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                  child: Text(
                                                    emp.code,
                                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54),
                                                  ),
                                                ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'Vị trí: ${emp.position}${emp.phone != null && emp.phone!.isNotEmpty ? " • SĐT: ${emp.phone}" : ""}',
                                            style: const TextStyle(color: Colors.black54, fontSize: 13),
                                          ),
                                          if (emp.salary != null && emp.salary! > 0)
                                            Padding(
                                              padding: const EdgeInsets.only(top: 2),
                                              child: Text(
                                                'Lương: ${Formatters.currency(emp.salary!)}${isFullTime ? "/tháng" : "/giờ"}',
                                                style: const TextStyle(fontSize: 12, color: Color(0xFF5D4037), fontWeight: FontWeight.w600),
                                              ),
                                            ),
                                          const SizedBox(height: 6),
                                          Row(
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: isFullTime ? Colors.blue.withValues(alpha: 0.15) : Colors.orange.withValues(alpha: 0.15),
                                                  borderRadius: BorderRadius.circular(6),
                                                ),
                                                child: Text(
                                                  emp.contractType,
                                                  style: TextStyle(
                                                    color: isFullTime ? Colors.blue.shade800 : Colors.orange.shade800,
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: isWorking ? Colors.green.withValues(alpha: 0.15) : Colors.red.withValues(alpha: 0.15),
                                                  borderRadius: BorderRadius.circular(6),
                                                ),
                                                child: Text(
                                                  isWorking ? 'Đang làm việc' : 'Đã nghỉ việc',
                                                  style: TextStyle(
                                                    color: isWorking ? Colors.green.shade800 : Colors.red.shade800,
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                    // Menu Sửa / Xóa cho Admin
                                    PopupMenuButton<String>(
                                      icon: const Icon(Icons.more_vert, color: Colors.black54),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      onSelected: (val) {
                                        if (val == 'edit') {
                                          _showEditEmployeeDialog(emp);
                                        } else if (val == 'delete') {
                                          _confirmDeleteEmployee(emp);
                                        }
                                      },
                                      itemBuilder: (ctx) => [
                                        const PopupMenuItem(
                                          value: 'edit',
                                          child: Row(
                                            children: [
                                              Icon(Icons.edit_outlined, size: 20, color: Colors.blue),
                                              SizedBox(width: 8),
                                              Text('Sửa thông tin'),
                                            ],
                                          ),
                                        ),
                                        const PopupMenuItem(
                                          value: 'delete',
                                          child: Row(
                                            children: [
                                              Icon(Icons.delete_outline, size: 20, color: Colors.red),
                                              SizedBox(width: 8),
                                              Text('Xóa nhân viên', style: TextStyle(color: Colors.red)),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
