import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/table.dart';
import '../models/product.dart';
import '../models/discount.dart';

class ApiService {
  // Địa chỉ IP Wi-Fi của máy tính đang chạy Backend
  static const String _defaultAndroidUrl = 'http://192.168.1.15:5000/api';
  static const String _defaultOtherUrl = 'http://localhost:5000/api';
  static const String _prefBaseUrlKey = 'custom_api_base_url';

  static String? _cachedBaseUrl;

  static Future<String> getBaseUrl() async {
    if (_cachedBaseUrl != null) return _cachedBaseUrl!;
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefBaseUrlKey);
    if (saved != null && saved.trim().isNotEmpty) {
      _cachedBaseUrl = saved.trim().replaceAll(RegExp(r'/+$'), '');
      return _cachedBaseUrl!;
    }
    try {
      if (Platform.isAndroid) {
        _cachedBaseUrl = _defaultAndroidUrl;
      } else {
        _cachedBaseUrl = _defaultOtherUrl;
      }
    } catch (_) {
      _cachedBaseUrl = _defaultOtherUrl;
    }
    return _cachedBaseUrl!;
  }

  static Future<void> setBaseUrl(String newUrl) async {
    final clean = newUrl.trim().replaceAll(RegExp(r'/+$'), '');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefBaseUrlKey, clean);
    _cachedBaseUrl = clean;
  }

  // 1. Đăng nhập
  static Future<Map<String, dynamic>> login(String username, String password) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/login');
    try {
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'email': username,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode == 200 && (data['success'] == true || data['accessToken'] != null)) {
        return {
          'success': true,
          'user': UserModel.fromJson(data['user'] ?? {}, token: data['accessToken'] ?? data['token']),
          'message': data['message'] ?? 'Đăng nhập thành công',
        };
      }
      return {
        'success': false,
        'message': data['message'] ?? 'Tên đăng nhập hoặc mật khẩu không đúng',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Không thể kết nối máy chủ ($baseUrl): $e',
      };
    }
  }

  // 2. Lấy danh sách bàn
  static Future<List<TableModel>> getTables() async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/tables');
    try {
      final res = await http.get(url).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes));
        if (list is List) {
          return list.map((item) => TableModel.fromJson(item)).toList();
        }
      }
    } catch (e) {
      // ignore & fallback
    }
    return [];
  }

  // 3. Cập nhật trạng thái bàn
  static Future<bool> updateTableStatus(int tableId, String status) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/tables/$tableId/status');
    try {
      final res = await http.patch(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'trangThai': status}),
      ).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 4. Lấy danh mục đồ uống
  static Future<List<Map<String, dynamic>>> getCategories() async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/categories');
    try {
      final res = await http.get(url).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes));
        if (list is List) {
          return list.map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
    } catch (_) {}
    return [
      {'MaDanhMuc': 0, 'TenDanhMuc': 'Tất cả'},
      {'MaDanhMuc': 1, 'TenDanhMuc': 'Cà Phê'},
      {'MaDanhMuc': 2, 'TenDanhMuc': 'Trà & Trà Sữa'},
      {'MaDanhMuc': 3, 'TenDanhMuc': 'Bánh Ngọt'},
    ];
  }

  // 5. Lấy danh sách sản phẩm còn hàng
  static Future<List<ProductModel>> getProducts({int? categoryId}) async {
    final baseUrl = await getBaseUrl();
    String query = '?availableOnly=true';
    if (categoryId != null && categoryId > 0) {
      query += '&maDanhMuc=$categoryId';
    }
    final url = Uri.parse('$baseUrl/products$query');
    try {
      final res = await http.get(url).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes));
        if (list is List) {
          return list
              .map((e) => ProductModel.fromJson(e))
              .where((p) => p.isAvailable)
              .toList();
        }
      }
    } catch (_) {}
    return [];
  }

  // 6. Kiểm tra & áp dụng mã giảm giá voucher
  static Future<DiscountModel?> validateDiscount({
    required String code,
    required double subtotal,
    int? customerId,
    int customerPoints = 0,
  }) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/discounts/validate');
    try {
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'maCode': code.trim().toUpperCase(),
          'subtotal': subtotal,
          'customerId': customerId,
          'customerPoints': customerPoints,
        }),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode == 200 && (data['success'] == true || data['valid'] == true)) {
        return DiscountModel.fromJson(data);
      }
      throw Exception(data['message'] ?? 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện');
    } catch (e) {
      rethrow;
    }
  }

  // 7. Tạo đơn hàng (Checkout)
  static Future<Map<String, dynamic>> checkout({
    int? tableId,
    int? employeeId,
    int? customerId,
    required List<Map<String, dynamic>> items,
    required double subtotal,
    required double discount,
    required double total,
    String? discountCode,
    String paymentMethod = 'TIEN_MAT',
    double? customerCash,
  }) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/checkout');
    try {
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'maBan': tableId,
          'maNhanVien': employeeId,
          'maKhachHang': customerId,
          'items': items,
          'tongTien': subtotal,
          'giamGia': discount,
          'thanhTien': total,
          'maGiamGia': discountCode,
          'phuongThucTT': paymentMethod,
          'tienKhachDua': customerCash ?? total,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode == 200 && data['success'] != false) {
        // Cập nhật trạng thái bàn nếu có
        if (tableId != null) {
          await updateTableStatus(tableId, 'CO_KHACH');
        }
        return {'success': true, 'data': data};
      }
      return {'success': false, 'message': data['message'] ?? 'Thanh toán thất bại'};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // 8. Chấm công nhân viên (Check-in)
  static Future<Map<String, dynamic>> checkIn({
    required int employeeId,
    required String shiftName,
  }) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/timekeeping/check-in');
    try {
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'maNhanVien': employeeId,
          'caLam': shiftName,
          'thoiGian': DateTime.now().toIso8601String(),
        }),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(utf8.decode(res.bodyBytes));
      return {
        'success': res.statusCode == 200 && data['success'] != false,
        'message': data['message'] ?? 'Chấm công thành công!',
      };
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }
}
