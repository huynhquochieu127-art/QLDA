import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';

/// QH-95: Khu vực "✨ Món gọi kèm gợi ý" trong giỏ hàng POS (giống Web PosSuggestions).
/// Gọi API AI (POST /ai/goi-y-mon); nếu chưa có thì dùng gợi ý mặc định theo nhóm món.
class PosSuggestions extends StatefulWidget {
  const PosSuggestions({super.key});

  @override
  State<PosSuggestions> createState() => _PosSuggestionsState();
}

class _PosSuggestionsState extends State<PosSuggestions> {
  // Món hay gọi kèm theo từng nhóm (giống luật dự phòng trên Web)
  static const _pairing = {
    'coffee': ['cake', 'snack'],
    'tea': ['snack', 'cake'],
    'cake': ['coffee', 'tea'],
    'snack': ['tea', 'coffee'],
  };
  static const _max = 3;

  List<ProductModel> _menu = [];
  List<(ProductModel, String)> _suggestions = [];
  bool _fromAi = false;
  bool _loading = false;
  String _lastKey = '';

  @override
  void initState() {
    super.initState();
    ApiService.getProducts(availableOnly: true).then((list) {
      if (!mounted) return;
      _menu = list;
      _refresh();
    });
  }

  String _group(ProductModel p) {
    final s = '${p.categoryName} ${p.name}'.toLowerCase();
    if (s.contains('bánh') || s.contains('cake') || s.contains('bakery')) return 'cake';
    if (s.contains('trà') || s.contains('tea') || s.contains('sữa chua')) return 'tea';
    if (s.contains('ăn') || s.contains('snack') || s.contains('khoai') || s.contains('food')) return 'snack';
    return 'coffee';
  }

  List<(ProductModel, String)> _fallback(List<ProductModel> cart) {
    final inCart = cart.map((p) => p.id).toSet();
    final anchor = cart.first;
    final targets = _pairing[_group(anchor)] ?? const [];
    return targets
        .expand((g) => _menu.where((p) => _group(p) == g && !inCart.contains(p.id)))
        .take(_max)
        .map((p) => (p, 'Hay được gọi kèm ${anchor.name}'))
        .toList();
  }

  Future<void> _refresh() async {
    final cart = Provider.of<CartProvider>(context, listen: false).itemList.map((i) => i.product).toList();
    final key = cart.map((p) => p.id).join(',');
    if (key == _lastKey) return;
    _lastKey = key;
    if (cart.isEmpty || _menu.isEmpty) {
      setState(() => _suggestions = []);
      return;
    }
    setState(() => _loading = true);

    List<(ProductModel, String)> result = [];
    var fromAi = false;
    try {
      final baseUrl = await ApiService.getBaseUrl();
      final res = await http
          .post(Uri.parse('$baseUrl/ai/goi-y-mon'),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({
                'maSanPham': cart.map((p) => p.id).toList(),
                'tenMon': cart.map((p) => p.name).toList(),
              }))
          .timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final body = jsonDecode(utf8.decode(res.bodyBytes));
        final data = body is Map ? body['data'] : body;
        final inCart = cart.map((p) => p.id).toSet();
        for (final s in (data is List ? data : const [])) {
          final match = _menu.where((p) =>
              '${p.id}' == '${s['maSanPham'] ?? s['id']}' ||
              p.name.toLowerCase() == '${s['tenSanPham'] ?? s['name'] ?? ''}'.toLowerCase());
          if (match.isNotEmpty && !inCart.contains(match.first.id)) {
            result.add((match.first, '${s['lyDo'] ?? s['reason'] ?? 'AI gợi ý dựa trên lịch sử đơn hàng'}'));
          }
        }
        fromAi = result.isNotEmpty;
      }
    } catch (_) {}
    if (result.isEmpty) result = _fallback(cart);
    if (!mounted || key != _lastKey) return;
    setState(() {
      _suggestions = result.take(_max).toList();
      _fromAi = fromAi;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);
    // Gọi lại gợi ý mỗi khi danh sách món trong giỏ thay đổi
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _refresh();
    });
    if (cart.itemList.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFFFAF5FF), Color(0xFFEEF2FF)]),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDDD6FE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text('✨ Món gọi kèm gợi ý',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF5B21B6))),
              ),
              Text(
                _loading ? 'Đang phân tích...' : (_fromAi ? 'AI' : 'Gợi ý mặc định'),
                style: const TextStyle(fontSize: 11, color: Color(0xFF6D28D9), fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 6),
          if (!_loading && _suggestions.isEmpty)
            const Text('Chưa có món phù hợp để gợi ý.', style: TextStyle(fontSize: 12, color: Colors.black45))
          else
            ..._suggestions.map((s) => Card(
                  margin: const EdgeInsets.only(top: 6),
                  child: ListTile(
                    dense: true,
                    title: Text(s.$1.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(s.$2, style: const TextStyle(fontSize: 11)),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(Formatters.formatCurrency(s.$1.price),
                            style: const TextStyle(color: Color(0xFF6D28D9), fontWeight: FontWeight.w600)),
                        const SizedBox(width: 6),
                        const Icon(Icons.add_circle, color: Color(0xFF7C3AED)),
                      ],
                    ),
                    onTap: () => cart.addItem(s.$1),
                  ),
                )),
        ],
      ),
    );
  }
}
