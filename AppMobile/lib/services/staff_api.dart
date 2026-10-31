import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_service.dart';

/// Kết quả gọi API chung: [ok] = HTTP 2xx và success != false.
class ApiResult {
  final bool ok;
  final int status;
  final dynamic body;
  final String message;

  ApiResult(this.ok, this.status, this.body, this.message);

  /// Trường `data` trong JSON trả về (hoặc toàn bộ body nếu không có).
  dynamic get data => body is Map ? (body as Map)['data'] : body;

  /// `data` dạng danh sách các Map (rỗng nếu không phải danh sách).
  List<Map<String, dynamic>> get list {
    final d = data;
    if (d is List) return d.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    return [];
  }
}

/// Các API phục vụ những chức năng đã có trên Web nhưng App chưa có:
/// chấm công theo giờ máy chủ, quên điểm danh, bảng công, phiếu lương,
/// bảng lương, duyệt ca, thông báo, đi trễ, báo cáo doanh thu, danh mục.
class StaffApi {
  static Future<ApiResult> _request(
    String method,
    String path, {
    Map<String, dynamic>? query,
    Map<String, dynamic>? body,
  }) async {
    final baseUrl = await ApiService.getBaseUrl();
    var uri = Uri.parse('$baseUrl$path');
    if (query != null) {
      uri = uri.replace(queryParameters: {
        ...uri.queryParameters,
        for (final e in query.entries)
          if (e.value != null) e.key: e.value.toString(),
      });
    }
    const headers = {'Content-Type': 'application/json'};
    final encoded = body == null ? null : jsonEncode(body);
    try {
      late http.Response res;
      switch (method) {
        case 'POST':
          res = await http.post(uri, headers: headers, body: encoded).timeout(const Duration(seconds: 15));
          break;
        case 'PUT':
          res = await http.put(uri, headers: headers, body: encoded).timeout(const Duration(seconds: 15));
          break;
        case 'DELETE':
          res = await http.delete(uri, headers: headers).timeout(const Duration(seconds: 15));
          break;
        default:
          res = await http.get(uri).timeout(const Duration(seconds: 15));
      }
      dynamic decoded;
      try {
        decoded = jsonDecode(utf8.decode(res.bodyBytes));
      } catch (_) {
        decoded = null;
      }
      final okStatus = res.statusCode >= 200 && res.statusCode < 300;
      final successFlag = decoded is Map ? decoded['success'] != false : true;
      final msg = decoded is Map ? (decoded['message'] ?? '').toString() : '';
      return ApiResult(okStatus && successFlag, res.statusCode, decoded, msg);
    } catch (e) {
      return ApiResult(false, 0, null, 'Không kết nối được máy chủ: $e');
    }
  }

  // ───────────── CHẤM CÔNG (giờ máy chủ, giống Web EmployeeCheckIn) ─────────────
  static Future<ApiResult> getMyToday(Object maNhanVien) =>
      _request('GET', '/timekeeping/my-today', query: {'maNhanVien': maNhanVien});

  static Future<ApiResult> checkIn(Object maNhanVien, String shiftType) =>
      _request('POST', '/timekeeping/checkin', body: {'maNhanVien': maNhanVien, 'shiftType': shiftType});

  static Future<ApiResult> checkOut(Object maNhanVien) =>
      _request('POST', '/timekeeping/checkout', body: {'maNhanVien': maNhanVien});

  // ───────────── YÊU CẦU BỔ SUNG ĐIỂM DANH (QH-49 / QH-50) ─────────────
  static Future<ApiResult> submitAttendanceRequest({
    required Object maNhanVien,
    required String ngay,
    required String caLam,
    required String loai,
    required String thoiGian,
    required String lyDo,
  }) =>
      _request('POST', '/yeucau-chamcong', body: {
        'maNhanVien': maNhanVien,
        'ngay': ngay,
        'caLam': caLam,
        'loai': loai,
        'thoiGian': thoiGian,
        'lyDo': lyDo,
      });

  static Future<ApiResult> getAttendanceRequests({String status = 'all'}) =>
      _request('GET', '/yeucau-chamcong', query: {'status': status});

  static Future<ApiResult> approveAttendanceRequest(int id, String note) =>
      _request('PUT', '/yeucau-chamcong/$id/approve', body: {'ghiChuQL': note});

  static Future<ApiResult> rejectAttendanceRequest(int id, String note) =>
      _request('PUT', '/yeucau-chamcong/$id/reject', body: {'ghiChuQL': note});

  // ───────────── BẢNG CÔNG CỦA TÔI (QH-54) ─────────────
  static Future<ApiResult> getMyTimesheet(Object maNhanVien, int thang, int nam) =>
      _request('GET', '/bangcong-thang/my', query: {'maNhanVien': maNhanVien, 'thang': thang, 'nam': nam});

  static Future<ApiResult> confirmMyTimesheet(Object maNhanVien, int thang, int nam) =>
      _request('POST', '/bangcong-thang/my/confirm', body: {'maNhanVien': maNhanVien, 'thang': thang, 'nam': nam});

  static Future<ApiResult> disputeMyTimesheet(Object maNhanVien, int thang, int nam, String lyDo) =>
      _request('POST', '/bangcong-thang/my/dispute',
          body: {'maNhanVien': maNhanVien, 'thang': thang, 'nam': nam, 'lyDo': lyDo});

  // ───────────── BẢNG CÔNG THÁNG - QUẢN LÝ ─────────────
  static Future<ApiResult> getMonthlyTimesheets(int thang, int nam) =>
      _request('GET', '/bangcong-thang', query: {'thang': thang, 'nam': nam});

  static Future<ApiResult> generateTimesheetDraft(int thang, int nam) =>
      _request('POST', '/bangcong-thang/generate-draft', body: {'thang': thang, 'nam': nam, 'force': true});

  static Future<ApiResult> sendTimesheetsForReview(int thang, int nam) =>
      _request('POST', '/bangcong-thang/send-for-review', body: {'thang': thang, 'nam': nam});

  static Future<ApiResult> confirmAllTimesheets(int thang, int nam) =>
      _request('POST', '/bangcong-thang/confirm-all', body: {'thang': thang, 'nam': nam});

  static Future<ApiResult> closeTimesheetsToAdmin(int thang, int nam) =>
      _request('POST', '/bangcong-thang/close-and-submit-to-admin', body: {'thang': thang, 'nam': nam});

  static Future<ApiResult> updateTimesheet(int id, Map<String, dynamic> values, {bool resolveComplaint = false}) =>
      _request('PUT', resolveComplaint ? '/bangcong-thang/$id/resolve-complaint' : '/bangcong-thang/$id',
          body: values);

  // ───────────── PHIẾU LƯƠNG (QH-59) & BẢNG LƯƠNG ─────────────
  static Future<ApiResult> getMyPayslip(Object maNhanVien, int thang, int nam) =>
      _request('GET', '/bangluong/my', query: {'maNhanVien': maNhanVien, 'thang': thang, 'nam': nam});

  static Future<ApiResult> getPayrollList(int thang, int nam) =>
      _request('GET', '/bangluong', query: {'thang': thang, 'nam': nam});

  static Future<ApiResult> calculatePayroll(int thang, int nam, {bool force = false}) =>
      _request('POST', '/bangluong/calculate', body: {'thang': thang, 'nam': nam, 'force': force});

  static Future<ApiResult> approvePayroll(int id, {String trangThai = 'Đã duyệt'}) =>
      _request('PUT', '/bangluong/$id/approve', body: {'trangThai': trangThai});

  static Future<ApiResult> approveAllPayroll(int thang, int nam) =>
      _request('POST', '/bangluong/approve-all', body: {'thang': thang, 'nam': nam});

  // ───────────── DUYỆT CA LÀM (QH-39) ─────────────
  static Future<ApiResult> getShiftRegistrations({String? startDate, String? endDate, String? status}) =>
      _request('GET', '/shifts/registrations', query: {'startDate': startDate, 'endDate': endDate, 'status': status});

  static Future<ApiResult> updateShiftRegistrationStatus(int id, String status) =>
      _request('PUT', '/shifts/registrations/$id/status', body: {'status': status});

  static Future<ApiResult> approveAllShifts(List<String> dateKeys) =>
      _request('PUT', '/shifts/registrations/approve-all', body: {'dateKeys': dateKeys});

  static Future<ApiResult> deleteShiftRegistration(int id) => _request('DELETE', '/shifts/registrations/$id');

  // ───────────── THÔNG BÁO ─────────────
  static Future<ApiResult> getNotifications(Object? maNhanVien) =>
      _request('GET', '/notifications/my', query: {'maNhanVien': maNhanVien});

  static Future<ApiResult> markNotificationRead(int id) => _request('PUT', '/notifications/$id/read');

  static Future<ApiResult> markAllNotificationsRead(Object? maNhanVien) =>
      _request('PUT', '/notifications/read-all', body: {'maNhanVien': maNhanVien});

  // ───────────── GIÁM SÁT: ĐI TRỄ HÔM NAY & DOANH THU ─────────────
  static Future<ApiResult> getLateToday() => _request('GET', '/timekeeping/late-today');

  static Future<ApiResult> getTodayRevenue() => _request('GET', '/invoices/today-revenue');

  static Future<ApiResult> getRevenueByDay(String from, String to) =>
      _request('GET', '/reports/revenue', query: {'from': from, 'to': to});

  // ───────────── DANH MỤC ─────────────
  static Future<ApiResult> getCategories() => _request('GET', '/categories');

  static Future<ApiResult> createCategory(String name) =>
      _request('POST', '/categories', body: {'tenDanhMuc': name});

  static Future<ApiResult> updateCategory(int id, String name) =>
      _request('PUT', '/categories/$id', body: {'tenDanhMuc': name});

  static Future<ApiResult> deleteCategory(int id) => _request('DELETE', '/categories/$id');

  // ───────────── NHÂN VIÊN (để Quản lý chọn xem phiếu lương) ─────────────
  static Future<ApiResult> getEmployees() => _request('GET', '/employees', query: {'limit': 200});
}
