import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/server_config_dialog.dart';
import 'login_screen.dart';
import 'revenue_report_screen.dart';
import 'orders_screen.dart';
import 'customers_screen.dart';
import 'discounts_screen.dart';
import 'leave_requests_screen.dart';
import 'employees_screen.dart';
import 'timekeeping_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thông tin tài khoản
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: const Color(0xFF5D4037),
                      child: Text(
                        (user?.hoTen.isNotEmpty == true ? user!.hoTen[0] : 'U').toUpperCase(),
                        style: const TextStyle(fontSize: 26, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.hoTen ?? 'Người dùng',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            'Email: ${user?.email ?? user?.username ?? ""}',
                            style: const TextStyle(color: Colors.black54, fontSize: 13),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: Colors.orange.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  user?.roleDisplayName ?? 'NHÂN VIÊN',
                                  style: const TextStyle(
                                    color: Colors.deepOrange,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: Colors.blue.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  user?.loaiNhanVien ?? 'Full-time',
                                  style: TextStyle(
                                    color: Colors.blue.shade800,
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
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),
            const Text('Chức Năng & Phân Quyền', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),

            // Lưới các chức năng theo vai trò người dùng (Giống Web 100%)
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.45,
              children: [
                if (user?.canViewRevenue == true)
                  _buildFeatureCard(
                    context,
                    title: 'Báo Cáo Doanh Thu',
                    subtitle: 'Thống kê theo ngày',
                    icon: Icons.bar_chart,
                    color: Colors.indigo,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RevenueReportScreen())),
                  ),
                if (user?.canManageOrders == true)
                  _buildFeatureCard(
                    context,
                    title: 'Hóa Đơn & Đơn Hàng',
                    subtitle: 'Lịch sử & trạng thái',
                    icon: Icons.receipt_long,
                    color: Colors.teal,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OrdersScreen())),
                  ),
                if (user?.canManageCustomers == true)
                  _buildFeatureCard(
                    context,
                    title: 'Khách Hàng',
                    subtitle: 'Tích điểm & hạng thẻ',
                    icon: Icons.people_alt_outlined,
                    color: Colors.purple,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CustomersScreen())),
                  ),
                if (user?.canManageDiscounts == true)
                  _buildFeatureCard(
                    context,
                    title: 'Mã Giảm Giá',
                    subtitle: 'Chiến dịch Voucher',
                    icon: Icons.local_offer_outlined,
                    color: Colors.amber.shade900,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DiscountsScreen())),
                  ),
                _buildFeatureCard(
                  context,
                  title: user?.canApproveLeave == true ? 'Duyệt Nghỉ Phép' : 'Đơn Xin Nghỉ Phép',
                  subtitle: user?.canApproveLeave == true ? 'Phê duyệt nghỉ làm' : 'Gửi đơn xin nghỉ',
                  icon: Icons.event_note,
                  color: Colors.blueGrey,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaveRequestsScreen())),
                ),
                _buildFeatureCard(
                  context,
                  title: 'Chấm Công Hôm Nay',
                  subtitle: 'Vào ca / Tan ca',
                  icon: Icons.fingerprint,
                  color: const Color(0xFF5D4037),
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TimekeepingScreen())),
                ),
                if (user?.canManageEmployees == true)
                  _buildFeatureCard(
                    context,
                    title: 'Quản Lý Nhân Sự',
                    subtitle: 'Danh sách & vai trò',
                    icon: Icons.badge_outlined,
                    color: Colors.deepOrange,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const EmployeesScreen())),
                  ),
              ],
            ),

            const SizedBox(height: 20),
            const Text('Hệ Thống & Cài Đặt', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),

            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.settings_ethernet, color: Colors.brown),
                    title: const Text('Cấu hình IP Server Backend'),
                    subtitle: const Text('Đổi cổng kết nối máy chủ hoặc Render domain'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => ServerConfigDialog.show(context),
                  ),
                  const Divider(height: 1),
                  const ListTile(
                    leading: Icon(Icons.cloud_done, color: Colors.green),
                    title: Text('Cơ sở dữ liệu đám mây'),
                    subtitle: Text('Clever Cloud MySQL (Đồng bộ 2 chiều cùng Web)'),
                  ),
                  const Divider(height: 1),
                  const ListTile(
                    leading: Icon(Icons.info_outline, color: Colors.blue),
                    title: Text('Phiên bản ứng dụng'),
                    subtitle: Text('v1.0.0 (Flutter Coffee Shop Management)'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Nút Đăng xuất
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red[700],
                  side: BorderSide(color: Colors.red.shade300, width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.logout),
                label: const Text('ĐĂNG XUẤT TÀI KHOẢN', style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () async {
                  await auth.logout();
                  if (context.mounted) {
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                      (route) => false,
                    );
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(color: Colors.black54, fontSize: 11),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
