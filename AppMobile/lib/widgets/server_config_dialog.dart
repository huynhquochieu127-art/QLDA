import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ServerConfigDialog extends StatefulWidget {
  const ServerConfigDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      builder: (ctx) => const ServerConfigDialog(),
    );
  }

  @override
  State<ServerConfigDialog> createState() => _ServerConfigDialogState();
}

class _ServerConfigDialogState extends State<ServerConfigDialog> {
  late TextEditingController _controller;
  bool _loading = true;
  bool _testing = false;
  String? _testResult;
  bool _testSuccess = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
    _loadCurrentUrl();
  }

  Future<void> _loadCurrentUrl() async {
    final url = await ApiService.getBaseUrl();
    setState(() {
      _controller.text = url;
      _loading = false;
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _testConnectionNow() async {
    setState(() {
      _testing = true;
      _testResult = null;
    });

    final tempUrl = _controller.text.trim().replaceAll(RegExp(r'/+$'), '');
    await ApiService.setBaseUrl(tempUrl);
    final res = await ApiService.testConnection();

    if (mounted) {
      setState(() {
        _testing = false;
        _testSuccess = res['success'] == true;
        _testResult = _testSuccess
            ? '✓ Kết nối thành công tới Render Online!'
            : '✗ Không thể kết nối: ${res["error"] ?? "Mã lỗi ${res["statusCode"]}"}';
      });
    }
  }

  void _save(String url) async {
    await ApiService.setBaseUrl(url);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã cập nhật máy chủ: $url'),
          backgroundColor: Colors.brown[700],
        ),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.settings_ethernet, color: Colors.brown),
          SizedBox(width: 8),
          Text('Cấu hình Server Backend', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
      content: _loading
          ? const SizedBox(height: 100, child: Center(child: CircularProgressIndicator()))
          : SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Địa chỉ API Backend (Render Online):',
                    style: TextStyle(fontSize: 13, color: Colors.black87),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: 'https://quan-ly-ca-phe.onrender.com/api',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Nút kiểm tra kết nối ngay
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF5D4037),
                        side: const BorderSide(color: Color(0xFF5D4037)),
                      ),
                      icon: _testing
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.network_check, size: 18),
                      label: Text(_testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối máy chủ'),
                      onPressed: _testing ? null : _testConnectionNow,
                    ),
                  ),

                  if (_testResult != null)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: _testSuccess ? Colors.green.shade50 : Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: _testSuccess ? Colors.green.shade300 : Colors.red.shade300),
                      ),
                      child: Text(
                        _testResult!,
                        style: TextStyle(
                          color: _testSuccess ? Colors.green.shade800 : Colors.red.shade800,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),

                  const SizedBox(height: 14),
                  const Text('Chọn nhanh cấu hình chuẩn:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ActionChip(
                        avatar: const Icon(Icons.cloud_done, size: 16, color: Colors.green),
                        backgroundColor: Colors.green.shade50,
                        label: const Text('Render Online (Mặc định)', style: TextStyle(fontWeight: FontWeight.bold)),
                        onPressed: () {
                          _controller.text = 'https://quan-ly-ca-phe.onrender.com/api';
                          _testConnectionNow();
                        },
                      ),
                      ActionChip(
                        avatar: const Icon(Icons.wifi, size: 16),
                        label: const Text('Wi-Fi nội bộ (192.168.1.15)'),
                        onPressed: () => _controller.text = 'http://192.168.1.15:5000/api',
                      ),
                      ActionChip(
                        avatar: const Icon(Icons.phone_android, size: 16),
                        label: const Text('Máy ảo Android (10.0.2.2)'),
                        onPressed: () => _controller.text = 'http://10.0.2.2:5000/api',
                      ),
                    ],
                  ),
                ],
              ),
            ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Đóng'),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF5D4037),
            foregroundColor: Colors.white,
          ),
          onPressed: () => _save(_controller.text),
          child: const Text('Lưu & Áp dụng'),
        ),
      ],
    );
  }
}
