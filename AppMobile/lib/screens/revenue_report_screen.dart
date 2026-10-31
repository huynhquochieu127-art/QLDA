import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';

class RevenueReportScreen extends StatefulWidget {
  const RevenueReportScreen({super.key});

  @override
  State<RevenueReportScreen> createState() => _RevenueReportScreenState();
}

class _RevenueReportScreenState extends State<RevenueReportScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _data;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchRevenue();
  }

  Future<void> _fetchRevenue() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final res = await ApiService.getTodayRevenue();
    if (mounted) {
      setState(() {
        _isLoading = false;
        if (res != null && res['success'] == true) {
          _data = res;
        } else {
          _error = 'Chưa có dữ liệu doanh thu hôm nay hoặc không thể kết nối.';
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final duLieu = _data?['duLieu'];
    final phanBo = (_data?['phanBoPhuongThuc'] as List?) ?? [];
    final danhSach = (_data?['danhSachHoaDon'] as List?) ?? [];

    final double tongTien = double.tryParse((duLieu?['tongTien'] ?? 0).toString()) ?? 0.0;
    final int soDon = int.tryParse((duLieu?['soDonHang'] ?? 0).toString()) ?? 0;
    final double giaTriTB = double.tryParse((duLieu?['giaTriTrungBinh'] ?? 0).toString()) ?? 0.0;

    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      appBar: AppBar(
        title: const Text('Báo Cáo Doanh Thu', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF5D4037),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Làm mới',
            onPressed: _fetchRevenue,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF5D4037)))
          : _data == null && _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.info_outline, size: 48, color: Colors.orange),
                        const SizedBox(height: 12),
                        Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF5D4037), foregroundColor: Colors.white),
                          onPressed: _fetchRevenue,
                          child: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetchRevenue,
                  color: const Color(0xFF5D4037),
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Card Doanh thu hôm nay
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF5D4037), Color(0xFF8D6E63)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.brown.withValues(alpha: 0.3),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'DOANH THU HÔM NAY',
                                style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Row(
                                  children: [
                                    Icon(Icons.calendar_today, color: Colors.white, size: 12),
                                    SizedBox(width: 4),
                                    Text('Hôm nay', style: TextStyle(color: Colors.white, fontSize: 11)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            Formatters.formatCurrency(tongTien),
                            style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Số đơn', style: TextStyle(color: Colors.white70, fontSize: 11)),
                                      const SizedBox(height: 2),
                                      Text('$soDon đơn', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Đơn trung bình', style: TextStyle(color: Colors.white70, fontSize: 11)),
                                      const SizedBox(height: 2),
                                      Text(Formatters.formatCurrency(giaTriTB), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),
                    const Text('Phân Bổ Thanh Toán', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),

                    if (phanBo.isEmpty)
                      Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: const Padding(
                          padding: EdgeInsets.all(16),
                          child: Center(child: Text('Chưa có giao dịch nào trong ngày', style: TextStyle(color: Colors.black54))),
                        ),
                      )
                    else
                      ...phanBo.map((p) {
                        final phuongThuc = (p['phuongThuc'] ?? 'TIEN_MAT').toString();
                        final isCash = phuongThuc.contains('MAT') || phuongThuc.toLowerCase().contains('cash');
                        final amount = double.tryParse((p['tongTien'] ?? 0).toString()) ?? 0.0;
                        final count = p['soLuong'] ?? 0;

                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: isCash ? Colors.green.shade50 : Colors.blue.shade50,
                              child: Icon(
                                isCash ? Icons.payments_outlined : Icons.account_balance_outlined,
                                color: isCash ? Colors.green.shade700 : Colors.blue.shade700,
                              ),
                            ),
                            title: Text(
                              isCash ? 'Tiền mặt' : 'Chuyển khoản / QR',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            subtitle: Text('$count giao dịch'),
                            trailing: Text(
                              Formatters.formatCurrency(amount),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF5D4037)),
                            ),
                          ),
                        );
                      }),

                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Đơn Hàng Gần Nhất', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        Text('${danhSach.length} đơn', style: const TextStyle(color: Colors.black54, fontSize: 13)),
                      ],
                    ),
                    const SizedBox(height: 10),

                    if (danhSach.isEmpty)
                      Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: const Padding(
                          padding: EdgeInsets.all(24),
                          child: Center(child: Text('Hôm nay chưa có đơn hàng nào', style: TextStyle(color: Colors.black54))),
                        ),
                      )
                    else
                      ...danhSach.take(10).map((dh) {
                        final maDon = dh['MaDonHang'] ?? dh['id'] ?? 0;
                        final maBan = dh['MaBan'];
                        final thanhTien = double.tryParse((dh['ThanhTien'] ?? dh['TongTien'] ?? 0).toString()) ?? 0.0;
                        final thoiGian = dh['ThoiGian'] ?? dh['GioDat'] ?? '';

                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          child: ListTile(
                            leading: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFF5D4037).withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '#$maDon',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF5D4037)),
                              ),
                            ),
                            title: Text(
                              maBan != null ? 'Bàn $maBan' : 'Mang về',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            subtitle: Text(thoiGian, style: const TextStyle(fontSize: 12, color: Colors.black54)),
                            trailing: Text(
                              Formatters.formatCurrency(thanhTien),
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2E7D32)),
                            ),
                          ),
                        );
                      }),
                  ],
                ),
              ),
            ),
    );
  }
}
