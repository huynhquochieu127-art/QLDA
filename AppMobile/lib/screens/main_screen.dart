import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../providers/auth_provider.dart';
import 'tables_screen.dart';
import 'menu_screen.dart';
import 'timekeeping_screen.dart';
import 'dashboard_screen.dart';
import 'cart_screen.dart';
import 'revenue_report_screen.dart';
import 'orders_screen.dart';
import 'customers_screen.dart';
import 'discounts_screen.dart';
import 'leave_requests_screen.dart';
import 'employees_screen.dart';
import 'login_screen.dart';
import '../widgets/server_config_dialog.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  String _currentTime = '';
  Timer? _clockTimer;

  @override
  void initState() {
    super.initState();
    _updateClock();
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) => _updateClock());
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    super.dispose();
  }

  void _updateClock() {
    final now = DateTime.now();
    final h = now.hour.toString().padLeft(2, '0');
    final m = now.minute.toString().padLeft(2, '0');
    final s = now.second.toString().padLeft(2, '0');
    if (mounted) {
      setState(() => _currentTime = '$h:$m:$s');
    }
  }

  void _onTabChanged(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    // Cấu hình các Tabs chính theo vai trò của người dùng (Phân quyền 100% như Web)
    List<Widget> screens;
    List<String> titles;
    List<BottomNavigationBarItem> navItems;

    if (user?.isAdmin == true || user?.isManager == true) {
      // 1. ADMIN / QUẢN LÝ
      titles = ['Doanh Thu', 'Sơ Đồ Bàn', 'Thực Đơn', 'Đơn Hàng', 'Quản Lý'];
      screens = [
        const RevenueReportScreen(),
        TablesScreen(onNavigateTab: (idx) => _onTabChanged(2)),
        const MenuScreen(),
        const OrdersScreen(),
        const DashboardScreen(),
      ];
      navItems = const [
        BottomNavigationBarItem(icon: Icon(Icons.bar_chart_outlined), activeIcon: Icon(Icons.bar_chart), label: 'Doanh thu'),
        BottomNavigationBarItem(icon: Icon(Icons.table_restaurant_outlined), activeIcon: Icon(Icons.table_restaurant), label: 'Bàn'),
        BottomNavigationBarItem(icon: Icon(Icons.local_cafe_outlined), activeIcon: Icon(Icons.local_cafe), label: 'Thực đơn'),
        BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), activeIcon: Icon(Icons.receipt_long), label: 'Đơn hàng'),
        BottomNavigationBarItem(icon: Icon(Icons.manage_accounts_outlined), activeIcon: Icon(Icons.manage_accounts), label: 'Quản lý'),
      ];
    } else if (user?.isCashier == true) {
      // 2. THU NGÂN
      titles = ['Sơ Đồ Bàn', 'Tạo Đơn (POS)', 'Hóa Đơn', 'Khách Hàng', 'Cá Nhân'];
      screens = [
        TablesScreen(onNavigateTab: (idx) => _onTabChanged(1)),
        const MenuScreen(),
        const OrdersScreen(),
        const CustomersScreen(),
        const DashboardScreen(),
      ];
      navItems = const [
        BottomNavigationBarItem(icon: Icon(Icons.table_restaurant_outlined), activeIcon: Icon(Icons.table_restaurant), label: 'Bàn'),
        BottomNavigationBarItem(icon: Icon(Icons.point_of_sale_outlined), activeIcon: Icon(Icons.point_of_sale), label: 'POS'),
        BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), activeIcon: Icon(Icons.receipt_long), label: 'Hóa đơn'),
        BottomNavigationBarItem(icon: Icon(Icons.people_outline), activeIcon: Icon(Icons.people), label: 'Khách hàng'),
        BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Cá nhân'),
      ];
    } else if (user?.isBarista == true) {
      // 3. PHA CHẾ / BẾP
      titles = ['Thực Đơn & Tình Trạng', 'Đơn Pha Chế', 'Chấm Công', 'Cá Nhân'];
      screens = [
        const MenuScreen(),
        const OrdersScreen(),
        const TimekeepingScreen(),
        const DashboardScreen(),
      ];
      navItems = const [
        BottomNavigationBarItem(icon: Icon(Icons.local_cafe_outlined), activeIcon: Icon(Icons.local_cafe), label: 'Món ăn'),
        BottomNavigationBarItem(icon: Icon(Icons.soup_kitchen_outlined), activeIcon: Icon(Icons.soup_kitchen), label: 'Pha chế'),
        BottomNavigationBarItem(icon: Icon(Icons.fingerprint), activeIcon: Icon(Icons.fingerprint), label: 'Chấm công'),
        BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Cá nhân'),
      ];
    } else {
      // 4. PHỤC VỤ (WAITER) & MẶC ĐỊNH
      titles = ['Sơ Đồ Bàn', 'Gọi Món (POS)', 'Chấm Công', 'Cá Nhân'];
      screens = [
        TablesScreen(onNavigateTab: (idx) => _onTabChanged(1)),
        const MenuScreen(),
        const TimekeepingScreen(),
        const DashboardScreen(),
      ];
      navItems = const [
        BottomNavigationBarItem(icon: Icon(Icons.table_restaurant_outlined), activeIcon: Icon(Icons.table_restaurant), label: 'Bàn'),
        BottomNavigationBarItem(icon: Icon(Icons.local_cafe_outlined), activeIcon: Icon(Icons.local_cafe), label: 'Thực đơn'),
        BottomNavigationBarItem(icon: Icon(Icons.fingerprint), activeIcon: Icon(Icons.fingerprint), label: 'Chấm công'),
        BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Cá nhân'),
      ];
    }

    if (_currentIndex >= screens.length) {
      _currentIndex = 0;
    }

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              titles[_currentIndex],
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
            ),
            Row(
              children: [
                const Icon(Icons.access_time, size: 11, color: Colors.white70),
                const SizedBox(width: 4),
                Text(
                  _currentTime,
                  style: const TextStyle(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.normal),
                ),
                const SizedBox(width: 8),
                Text(
                  '•  ${user?.roleDisplayName ?? ""}',
                  style: const TextStyle(fontSize: 10, color: Color(0xFFFFD54F), fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
        backgroundColor: const Color(0xFF5D4037),
        foregroundColor: Colors.white,
        elevation: 1,
        actions: [
          // Nút giỏ hàng nhanh ở góc trên
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart_outlined, size: 26),
                tooltip: 'Giỏ hàng',
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const CartScreen()),
                  );
                },
              ),
              if (cart.totalItemCount > 0)
                Positioned(
                  top: 6,
                  right: 6,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Color(0xFFFFB300),
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                    child: Text(
                      '${cart.totalItemCount}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFF3E2723),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 6),
        ],
      ),

      // Left Drawer (Sidebar điều hướng giống hệt Web home.jsx)
      drawer: Drawer(
        child: Column(
          children: [
            UserAccountsDrawerHeader(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF3E2723), Color(0xFF5D4037)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              currentAccountPicture: CircleAvatar(
                backgroundColor: Colors.white,
                child: Text(
                  (user?.hoTen.isNotEmpty == true ? user!.hoTen[0] : 'U').toUpperCase(),
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF5D4037)),
                ),
              ),
              accountName: Text(user?.hoTen ?? 'Người dùng', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              accountEmail: Text('${user?.email ?? ""} • ${user?.roleDisplayName ?? ""}'),
            ),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  if (user?.canViewDashboard == true)
                    ListTile(
                      leading: const Icon(Icons.dashboard_outlined, color: Colors.brown),
                      title: const Text('Dashboard & Doanh thu'),
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const RevenueReportScreen()));
                      },
                    ),
                  if (user?.canViewTables == true)
                    ListTile(
                      leading: const Icon(Icons.table_restaurant, color: Colors.brown),
                      title: const Text('Sơ đồ bàn & Gọi món'),
                      onTap: () {
                        Navigator.pop(context);
                        _onTabChanged((user?.isAdmin == true || user?.isManager == true) ? 1 : 0);
                      },
                    ),
                  if (user?.canOrderPos == true)
                    ListTile(
                      leading: const Icon(Icons.point_of_sale, color: Colors.brown),
                      title: const Text('Tạo đơn & Thực đơn (POS)'),
                      onTap: () {
                        Navigator.pop(context);
                        _onTabChanged((user?.isAdmin == true || user?.isManager == true)
                            ? 2
                            : (user?.isBarista == true ? 0 : 1));
                      },
                    ),
                  if (user?.canManageOrders == true)
                    ListTile(
                      leading: const Icon(Icons.receipt_long, color: Colors.brown),
                      title: const Text('Quản lý Hóa đơn & Đơn hàng'),
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const OrdersScreen()));
                      },
                    ),
                  if (user?.canManageCustomers == true)
                    ListTile(
                      leading: const Icon(Icons.people_alt, color: Colors.brown),
                      title: const Text('Quản lý Khách hàng'),
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const CustomersScreen()));
                      },
                    ),
                  if (user?.canManageDiscounts == true)
                    ListTile(
                      leading: const Icon(Icons.local_offer, color: Colors.brown),
                      title: const Text('Chiến dịch Mã giảm giá'),
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const DiscountsScreen()));
                      },
                    ),
                  ListTile(
                    leading: const Icon(Icons.fingerprint, color: Colors.brown),
                    title: const Text('Chấm công hôm nay'),
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const TimekeepingScreen()));
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.event_note, color: Colors.brown),
                    title: Text(user?.canApproveLeave == true ? 'Duyệt đơn nghỉ phép' : 'Đơn xin nghỉ phép'),
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaveRequestsScreen()));
                    },
                  ),
                  if (user?.canManageEmployees == true)
                    ListTile(
                      leading: const Icon(Icons.badge, color: Colors.brown),
                      title: const Text('Quản lý Nhân sự & Phân quyền'),
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const EmployeesScreen()));
                      },
                    ),
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.settings_ethernet, color: Colors.blueGrey),
                    title: const Text('Cấu hình IP Máy chủ'),
                    onTap: () {
                      Navigator.pop(context);
                      ServerConfigDialog.show(context);
                    },
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Đăng xuất', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
              onTap: () async {
                Navigator.pop(context);
                await auth.logout();
                if (context.mounted) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                    (route) => false,
                  );
                }
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),

      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),

      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: _onTabChanged,
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        selectedItemColor: const Color(0xFF5D4037),
        unselectedItemColor: Colors.grey[500],
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
        unselectedLabelStyle: const TextStyle(fontSize: 10),
        items: navItems,
      ),
    );
  }
}
