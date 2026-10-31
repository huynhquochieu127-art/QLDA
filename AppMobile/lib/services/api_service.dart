import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/table.dart';
import '../models/product.dart';
import '../models/discount.dart';
import '../models/order.dart';
import '../models/customer.dart';
import '../models/leave_request.dart';
import '../models/employee.dart';

class ApiService {
  // Đường dẫn Backend Render Online chính thức đồng bộ 100% cùng Web
  static const String _defaultOnlineUrl = 'https://quan-ly-ca-phe.onrender.com/api';
  static const String _prefBaseUrlKey = 'custom_api_base_url';

  static String? _cachedBaseUrl;

  static Future<String> getBaseUrl() async {
    if (_cachedBaseUrl != null) return _cachedBaseUrl!;
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefBaseUrlKey);
    if (saved != null && saved.trim().isNotEmpty) {
      final clean = saved.trim().replaceAll(RegExp(r'/+$'), '');
      // Tự động dọn dẹp các URL Cloudflare tunnel đã tắt hoặc 10.0.2.2 máy ảo cũ
      if (!clean.contains('trycloudflare') &&
          !clean.contains('10.0.2.2') &&
          clean.startsWith('http')) {
        _cachedBaseUrl = clean;
        return _cachedBaseUrl!;
      } else {
        await prefs.remove(_prefBaseUrlKey);
      }
    }
    _cachedBaseUrl = _defaultOnlineUrl;
    return _cachedBaseUrl!;
  }

  static Future<void> setBaseUrl(String newUrl) async {
    final clean = newUrl.trim().replaceAll(RegExp(r'/+$'), '');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefBaseUrlKey, clean);
    _cachedBaseUrl = clean;
  }

  static Future<void> resetBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefBaseUrlKey);
    _cachedBaseUrl = _defaultOnlineUrl;
  }

  // Kiểm tra kết nối nhanh tới máy chủ
  static Future<Map<String, dynamic>> testConnection() async {
    final baseUrl = await getBaseUrl();
    try {
      final res = await http.get(Uri.parse('$baseUrl/categories')).timeout(const Duration(seconds: 10));
      return {
        'success': res.statusCode == 200,
        'statusCode': res.statusCode,
        'url': baseUrl,
      };
    } catch (e) {
      return {
        'success': false,
        'error': e.toString(),
        'url': baseUrl,
      };
    }
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
      ).timeout(const Duration(seconds: 12));

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
      final res = await http.get(url).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes));
        if (list is List) {
          return list.map((item) => TableModel.fromJson(item)).toList();
        }
      }
    } catch (_) {}
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
      final res = await http.get(url).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes));
        if (list is List) {
          final items = <Map<String, dynamic>>[
            {'MaDanhMuc': 0, 'TenDanhMuc': 'Tất cả'}
          ];
          for (var e in list) {
            final name = (e['TenDanhMuc'] ?? '').toString();
            String displayName = name;
            if (name.toLowerCase() == 'coffee') displayName = 'Cà Phê';
            if (name.toLowerCase() == 'bakery') displayName = 'Bánh Ngọt';
            if (name.toLowerCase() == 'food') displayName = 'Đồ Ăn';
            items.add({
              'MaDanhMuc': e['MaDanhMuc'],
              'TenDanhMuc': displayName,
            });
          }
          return items;
        }
      }
    } catch (_) {}
    return [
      {'MaDanhMuc': 0, 'TenDanhMuc': 'Tất cả'},
      {'MaDanhMuc': 1, 'TenDanhMuc': 'Cà Phê'},
      {'MaDanhMuc': 2, 'TenDanhMuc': 'Bánh Ngọt'},
      {'MaDanhMuc': 3, 'TenDanhMuc': 'Đồ Ăn'},
    ];
  }

  // 5. Lấy danh sách sản phẩm
  static Future<List<ProductModel>> getProducts({int? categoryId, bool availableOnly = false}) async {
    final baseUrl = await getBaseUrl();
    String query = availableOnly ? '?availableOnly=true' : '';
    if (categoryId != null && categoryId > 0) {
      query += '${query.isEmpty ? '?' : '&'}maDanhMuc=$categoryId';
    }
    final url = Uri.parse('$baseUrl/products$query');
    try {
      final res = await http.get(url).timeout(const Duration(seconds: 12));
      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes));
        if (list is List) {
          final items = list.map((e) => ProductModel.fromJson(e)).toList();
          return availableOnly ? items.where((p) => p.isAvailable).toList() : items;
        }
      }
    } catch (_) {}
    return [];
  }

  // 6. Cập nhật trạng thái món: Còn hàng / Hết hàng (Barista & Quản lý)
  static Future<bool> toggleProductStatus(int productId, {bool? isActive}) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/products/$productId/status');
    try {
      final res = await http.patch(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(isActive != null ? {'is_active': isActive ? 1 : 0} : {}),
      ).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 7. Kiểm tra & áp dụng mã giảm giá voucher
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

  // 8. Lấy tất cả mã giảm giá
  static Future<List<DiscountModel>> getDiscounts() async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/discounts');
    try {
      final res = await http.get(url).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes));
        if (list is List) {
          return list.map((e) => DiscountModel.fromJson(e)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  // 9. Tạo đơn hàng (Checkout)
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

  // 10. Lấy danh sách đơn hàng / hóa đơn
  static Future<List<OrderModel>> getOrders({int limit = 50}) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/orders?limit=$limit');
    try {
      final res = await http.get(url).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final list = jsonDecode(utf8.decode(res.bodyBytes));
        if (list is List) {
          return list.map((e) => OrderModel.fromJson(e)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  // 11. Cập nhật trạng thái đơn hàng
  static Future<bool> updateOrderStatus(int orderId, String status) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/orders/$orderId/status');
    try {
      final res = await http.patch(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'status': status}),
      ).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 12. Báo cáo doanh thu hôm nay (Dashboard)
  static Future<Map<String, dynamic>?> getTodayRevenue() async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/orders/today-revenue');
    try {
      final res = await http.get(url).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        return jsonDecode(utf8.decode(res.bodyBytes));
      }
    } catch (_) {}
    return null;
  }

  // 13. Lấy danh sách khách hàng
  static Future<List<CustomerModel>> getCustomers({String search = '', int page = 1, int limit = 30}) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/customers?search=$search&page=$page&limit=$limit');
    try {
      final res = await http.get(url).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        final list = data is Map ? (data['data'] as List? ?? []) : (data is List ? data : []);
        return list.map((e) => CustomerModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  // 14. Thêm khách hàng mới
  static Future<bool> createCustomer({
    required String name,
    required String phone,
    String? dob,
    String? email,
  }) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/customers');
    try {
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': name,
          'phone': phone,
          'dob': dob,
          'email': email,
        }),
      ).timeout(const Duration(seconds: 8));
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  // 15. Chấm công nhân viên (Check-in)
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
        'message': data['message'] ?? 'Chấm công vào ca thành công!',
      };
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // 16. Chấm công nhân viên (Check-out)
  static Future<Map<String, dynamic>> checkOut({required int employeeId}) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/timekeeping/check-out');
    try {
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'maNhanVien': employeeId,
          'thoiGian': DateTime.now().toIso8601String(),
        }),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(utf8.decode(res.bodyBytes));
      return {
        'success': res.statusCode == 200 && data['success'] != false,
        'message': data['message'] ?? 'Check-out tan ca thành công!',
      };
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // 17. Lấy danh sách đơn xin nghỉ phép
  static Future<List<LeaveRequestModel>> getLeaveRequests({int? employeeId, String? status}) async {
    final baseUrl = await getBaseUrl();
    String query = '';
    if (employeeId != null) query += 'employeeId=$employeeId';
    if (status != null) query += '${query.isEmpty ? '' : '&'}status=$status';
    final url = Uri.parse('$baseUrl/leave-requests${query.isNotEmpty ? '?$query' : ''}');
    try {
      final res = await http.get(url).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        final list = data is Map ? (data['data'] as List? ?? []) : (data is List ? data : []);
        return list.map((e) => LeaveRequestModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  // 18. Gửi đơn xin nghỉ phép
  static Future<bool> createLeaveRequest({
    required int employeeId,
    required String reason,
    required String startDate,
    String? endDate,
    String leaveType = 'Nghỉ phép',
  }) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/leave-requests');
    try {
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'maNhanVien': employeeId,
          'lyDo': reason,
          'ngayNghi': startDate,
          'ngayNghiDen': endDate ?? startDate,
          'loaiNghi': leaveType,
        }),
      ).timeout(const Duration(seconds: 8));
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  // 19. Duyệt / Từ chối đơn xin nghỉ (Quản lý & Admin)
  static Future<bool> updateLeaveRequestStatus(int requestId, String status, {String? managerNote}) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/leave-requests/$requestId/status');
    try {
      final res = await http.patch(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'status': status,
          'ghiChuQL': managerNote,
        }),
      ).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 20. Lấy danh sách nhân viên (Admin)
  static Future<List<EmployeeModel>> getEmployees() async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/employees');
    try {
      final res = await http.get(url).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        final list = data is Map ? (data['data'] as List? ?? data['employees'] as List? ?? []) : (data is List ? data : []);
        return list.map((e) => EmployeeModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  // 21. Thêm nhân viên mới (Admin)
  static Future<Map<String, dynamic>> createEmployee({
    required String hoTen,
    required String email,
    String? soDienThoai,
    String? cccd,
    String? chucVu,
    String loaiNhanVien = 'Full-time',
    double? luong,
    int? maVaiTro,
    String? password,
  }) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/employees');
    try {
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'hoTen': hoTen.trim(),
          'email': email.trim(),
          'soDienThoai': soDienThoai?.trim(),
          'cccd': cccd?.trim(),
          'chucVu': chucVu?.trim() ?? 'Nhân viên',
          'loaiNhanVien': loaiNhanVien,
          'luong': luong ?? 0,
          'maVaiTro': maVaiTro ?? 3,
          'password': password?.trim(),
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode == 200 || res.statusCode == 201) {
        return {'success': true, 'message': data['message'] ?? 'Thêm nhân viên thành công!', 'data': data};
      }
      return {'success': false, 'message': data['message'] ?? 'Thêm nhân viên thất bại'};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // 22. Cập nhật nhân viên (Admin)
  static Future<Map<String, dynamic>> updateEmployee(
    int id, {
    String? hoTen,
    String? soDienThoai,
    String? cccd,
    String? chucVu,
    String? loaiNhanVien,
    double? luong,
    String? trangThai,
    int? maVaiTro,
  }) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/employees/$id');
    try {
      final body = <String, dynamic>{};
      if (hoTen != null) body['hoTen'] = hoTen.trim();
      if (soDienThoai != null) body['soDienThoai'] = soDienThoai.trim();
      if (cccd != null) body['cccd'] = cccd.trim();
      if (chucVu != null) body['chucVu'] = chucVu.trim();
      if (loaiNhanVien != null) body['loaiNhanVien'] = loaiNhanVien;
      if (luong != null) body['luong'] = luong;
      if (trangThai != null) body['trangThai'] = trangThai;
      if (maVaiTro != null) body['maVaiTro'] = maVaiTro;

      final res = await http.put(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode == 200) {
        return {'success': true, 'message': data['message'] ?? 'Cập nhật thành công!'};
      }
      return {'success': false, 'message': data['message'] ?? 'Cập nhật thất bại'};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // 23. Xóa nhân viên (Admin)
  static Future<bool> deleteEmployee(int id) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/employees/$id');
    try {
      final res = await http.delete(url).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 24. Thêm sản phẩm mới (Admin)
  static Future<Map<String, dynamic>> createProduct({
    required String tenSanPham,
    required double gia,
    String? moTa,
    int? maDanhMuc,
    String? hinhAnh,
  }) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/products');
    try {
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'tenSanPham': tenSanPham.trim(),
          'gia': gia,
          'moTa': moTa?.trim(),
          'maDanhMuc': maDanhMuc,
          'hinhAnh': hinhAnh?.trim(),
          'coBan': 1,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode == 200 || res.statusCode == 201) {
        return {'success': true, 'message': data['message'] ?? 'Thêm món thành công!'};
      }
      return {'success': false, 'message': data['message'] ?? 'Thêm món thất bại'};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // 25. Cập nhật sản phẩm (Admin)
  static Future<Map<String, dynamic>> updateProduct(
    int id, {
    required String tenSanPham,
    required double gia,
    String? moTa,
    int? maDanhMuc,
    String? hinhAnh,
  }) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/products/$id');
    try {
      final body = <String, dynamic>{
        'tenSanPham': tenSanPham.trim(),
        'gia': gia,
        'moTa': moTa?.trim(),
        'maDanhMuc': maDanhMuc,
        'coBan': 1,
      };
      if (hinhAnh != null && hinhAnh.isNotEmpty) {
        body['hinhAnh'] = hinhAnh.trim();
      }

      final res = await http.put(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode == 200) {
        return {'success': true, 'message': data['message'] ?? 'Cập nhật món thành công!'};
      }
      return {'success': false, 'message': data['message'] ?? 'Cập nhật thất bại'};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // 26. Xóa sản phẩm (Admin)
  static Future<bool> deleteProduct(int id) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/products/$id');
    try {
      final res = await http.delete(url).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 27. Thêm bàn mới (Admin)
  static Future<Map<String, dynamic>> createTable({
    required String tenBan,
    int soChoNgoi = 4,
    int maKhuVuc = 1,
  }) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/tables');
    try {
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'tenBan': tenBan.trim(),
          'soChoNgoi': soChoNgoi,
          'maKhuVuc': maKhuVuc,
        }),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode == 200 || res.statusCode == 201) {
        return {'success': true, 'message': data['message'] ?? 'Thêm bàn thành công!'};
      }
      return {'success': false, 'message': data['message'] ?? 'Thêm bàn thất bại'};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // 28. Cập nhật thông tin bàn (Admin)
  static Future<bool> updateTable(
    int tableId, {
    String? tenBan,
    int? soChoNgoi,
    int? maKhuVuc,
    String? trangThai,
  }) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/tables/$tableId');
    try {
      final body = <String, dynamic>{};
      if (tenBan != null) body['tenBan'] = tenBan.trim();
      if (soChoNgoi != null) body['soChoNgoi'] = soChoNgoi;
      if (maKhuVuc != null) body['maKhuVuc'] = maKhuVuc;
      if (trangThai != null) body['trangThai'] = trangThai;

      final res = await http.put(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 29. Xóa bàn (Admin)
  static Future<bool> deleteTable(int tableId) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/tables/$tableId');
    try {
      final res = await http.delete(url).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 30. Thêm mã giảm giá mới (Admin & Quản lý)
  static Future<Map<String, dynamic>> createDiscount({
    required String maCode,
    required String tenMG,
    String loaiGiam = 'percent',
    required double giaTriGiam,
    double donHangToiThieu = 0,
    int diemToiThieu = 0,
    double? giaTriToiDa,
  }) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/discounts');
    try {
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'maCode': maCode.trim().toUpperCase(),
          'tenMG': tenMG.trim(),
          'loaiGiam': loaiGiam,
          'giaTriGiam': giaTriGiam,
          'donHangToiThieu': donHangToiThieu,
          'diemToiThieu': diemToiThieu,
          'giaTriToiDa': giaTriToiDa,
        }),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (res.statusCode == 200 || res.statusCode == 201) {
        return {'success': true, 'message': 'Tạo mã giảm giá thành công!'};
      }
      return {'success': false, 'message': data['message'] ?? 'Tạo mã giảm giá thất bại'};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // 31. Xóa mã giảm giá (Admin)
  static Future<bool> deleteDiscount(int id) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/discounts/$id');
    try {
      final res = await http.delete(url).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 32. Bật / Tắt trạng thái mã giảm giá
  static Future<bool> toggleDiscountStatus(int id, bool isActive) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/discounts/$id/status');
    try {
      final res = await http.patch(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'trangThai': isActive ? 1 : 0}),
      ).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 33. Cập nhật khách hàng (Admin / Quản lý)
  static Future<bool> updateCustomer(
    int id, {
    required String name,
    required String phone,
    String? dob,
    String? email,
  }) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/customers/$id');
    try {
      final res = await http.put(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': name.trim(),
          'phone': phone.trim(),
          'dob': dob,
          'email': email?.trim(),
        }),
      ).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // 34. Xóa khách hàng (Admin)
  static Future<bool> deleteCustomer(int id) async {
    final baseUrl = await getBaseUrl();
    final url = Uri.parse('$baseUrl/customers/$id');
    try {
      final res = await http.delete(url).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
