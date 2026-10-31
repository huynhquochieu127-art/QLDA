import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../providers/cart_provider.dart';
import '../providers/auth_provider.dart';
import '../utils/formatters.dart';
import 'cart_screen.dart';
import '../widgets/server_config_dialog.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  List<ProductModel> _products = [];
  List<Map<String, dynamic>> _categories = [];
  int _selectedCategory = 0;
  bool _isLoading = true;
  String _searchQuery = '';
  String _currentServerUrl = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final baseUrl = await ApiService.getBaseUrl();
    final cats = await ApiService.getCategories();
    final prods = await ApiService.getProducts(
      categoryId: _selectedCategory == 0 ? null : _selectedCategory,
      availableOnly: false,
    );
    if (mounted) {
      setState(() {
        _currentServerUrl = baseUrl;
        _categories = cats;
        _products = prods;
        _isLoading = false;
      });
    }
  }

  void _onCategorySelected(int catId) async {
    setState(() {
      _selectedCategory = catId;
      _isLoading = true;
    });
    final prods = await ApiService.getProducts(
      categoryId: catId == 0 ? null : catId,
      availableOnly: false,
    );
    if (mounted) {
      setState(() {
        _products = prods;
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleProductStatus(ProductModel product) async {
    final newStatus = !product.isAvailable;
    final success = await ApiService.toggleProductStatus(product.id, isActive: newStatus);
    if (success) {
      setState(() {
        final idx = _products.indexWhere((p) => p.id == product.id);
        if (idx != -1) {
          _products[idx] = product.copyWith(isAvailable: newStatus);
        }
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Đã đổi món "${product.name}" sang: ${newStatus ? "Còn hàng" : "Hết hàng"}',
            ),
            backgroundColor: newStatus ? Colors.green : Colors.orange,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cập nhật trạng thái món thất bại!'), backgroundColor: Colors.red),
        );
      }
    }
  }

  List<ProductModel> get _filteredProducts {
    if (_searchQuery.trim().isEmpty) return _products;
    return _products
        .where((p) => p.name.toLowerCase().contains(_searchQuery.toLowerCase()))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;
    final canToggle = user?.canToggleProductStatus == true;

    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      body: Column(
        children: [
          // Thanh tìm kiếm + Nút làm mới
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val),
                    decoration: InputDecoration(
                      hintText: 'Tìm kiếm món (Cà phê, bánh, trà...)',
                      prefixIcon: const Icon(Icons.search, color: Colors.brown),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 20),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filledTonal(
                  icon: const Icon(Icons.refresh, color: Color(0xFF5D4037)),
                  tooltip: 'Tải lại dữ liệu',
                  onPressed: _loadData,
                ),
              ],
            ),
          ),

          // Thanh cuộn danh mục ngang
          if (_categories.isNotEmpty)
            SizedBox(
              height: 48,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final catId = cat['MaDanhMuc'] as int;
                  final isSelected = _selectedCategory == catId;

                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                    child: ChoiceChip(
                      label: Text(
                        cat['TenDanhMuc'] ?? '',
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.brown[900],
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 13,
                        ),
                      ),
                      selected: isSelected,
                      selectedColor: const Color(0xFF5D4037),
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                        side: BorderSide(
                          color: isSelected ? const Color(0xFF5D4037) : Colors.grey.shade300,
                        ),
                      ),
                      showCheckmark: false,
                      onSelected: (selected) {
                        if (selected) _onCategorySelected(catId);
                      },
                    ),
                  );
                },
              ),
            ),

          // Lưới sản phẩm kèm kéo để làm mới (Pull-to-refresh)
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF5D4037)))
                : _filteredProducts.isEmpty
                    ? RefreshIndicator(
                        onRefresh: _loadData,
                        color: const Color(0xFF5D4037),
                        child: SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          child: Container(
                            alignment: Alignment.center,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 60),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.coffee_outlined, size: 68, color: Colors.brown[200]),
                                const SizedBox(height: 14),
                                Text(
                                  _searchQuery.isNotEmpty
                                      ? 'Không tìm thấy món phù hợp'
                                      : 'Chưa có món nào hoặc chưa kết nối được máy chủ',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: Colors.brown[400], fontSize: 15, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  'Server: $_currentServerUrl',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(color: Colors.black45, fontSize: 11),
                                ),
                                const SizedBox(height: 18),
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF5D4037),
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  icon: const Icon(Icons.refresh, size: 18),
                                  label: const Text('Tải lại thực đơn'),
                                  onPressed: _loadData,
                                ),
                                const SizedBox(height: 8),
                                OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: const Color(0xFF5D4037),
                                    side: const BorderSide(color: Color(0xFF5D4037)),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  icon: const Icon(Icons.settings_ethernet, size: 16),
                                  label: const Text('Cấu hình Server IP / Render'),
                                  onPressed: () async {
                                    await ServerConfigDialog.show(context);
                                    _loadData();
                                  },
                                ),
                              ],
                            ),
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadData,
                        color: const Color(0xFF5D4037),
                        child: GridView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 0.70,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                          itemCount: _filteredProducts.length,
                          itemBuilder: (context, index) {
                            final product = _filteredProducts[index];
                            final inCartCount = cart.getItemQuantity(product.id);

                            return Card(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 1.5,
                              clipBehavior: Clip.antiAlias,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Ảnh món + Tag tình trạng món
                                  Expanded(
                                    child: Stack(
                                      fit: StackFit.expand,
                                      children: [
                                        Container(
                                          color: Colors.brown.shade50,
                                          child: product.fullImageUrl.isNotEmpty
                                              ? Image.network(
                                                  product.fullImageUrl,
                                                  fit: BoxFit.cover,
                                                  errorBuilder: (context, error, stackTrace) =>
                                                      const Icon(Icons.local_cafe, size: 48, color: Colors.brown),
                                                )
                                              : const Icon(Icons.local_cafe, size: 48, color: Colors.brown),
                                        ),
                                        if (!product.isAvailable)
                                          Container(
                                            color: Colors.black.withValues(alpha: 0.55),
                                            alignment: Alignment.center,
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: Colors.red.shade700,
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: const Text(
                                                'HẾT HÀNG',
                                                style: TextStyle(
                                                  color: Colors.white,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 11,
                                                  letterSpacing: 0.5,
                                                ),
                                              ),
                                            ),
                                          ),
                                        // Nút bật/tắt Còn món / Hết món cho Admin / Manager / Barista
                                        if (canToggle)
                                          Positioned(
                                            top: 6,
                                            right: 6,
                                            child: GestureDetector(
                                              onTap: () => _toggleProductStatus(product),
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                decoration: BoxDecoration(
                                                  color: product.isAvailable ? Colors.green.shade800 : Colors.red.shade800,
                                                  borderRadius: BorderRadius.circular(12),
                                                  boxShadow: [
                                                    BoxShadow(
                                                      color: Colors.black.withValues(alpha: 0.3),
                                                      blurRadius: 4,
                                                    ),
                                                  ],
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Icon(
                                                      product.isAvailable ? Icons.check : Icons.block,
                                                      size: 11,
                                                      color: Colors.white,
                                                    ),
                                                    const SizedBox(width: 3),
                                                    Text(
                                                      product.isAvailable ? 'Còn' : 'Hết',
                                                      style: const TextStyle(
                                                        color: Colors.white,
                                                        fontWeight: FontWeight.bold,
                                                        fontSize: 10,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(10),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          product.name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          Formatters.formatCurrency(product.price),
                                          style: TextStyle(
                                            color: Colors.brown[800],
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        // Nút thêm món vào giỏ
                                        SizedBox(
                                          width: double.infinity,
                                          height: 34,
                                          child: !product.isAvailable
                                              ? OutlinedButton(
                                                  style: OutlinedButton.styleFrom(
                                                    foregroundColor: Colors.grey,
                                                    side: BorderSide(color: Colors.grey.shade300),
                                                    padding: EdgeInsets.zero,
                                                  ),
                                                  onPressed: null,
                                                  child: const Text('Tạm ngưng', style: TextStyle(fontSize: 12)),
                                                )
                                              : inCartCount == 0
                                                  ? ElevatedButton.icon(
                                                      style: ElevatedButton.styleFrom(
                                                        backgroundColor: const Color(0xFF5D4037),
                                                        foregroundColor: Colors.white,
                                                      padding: EdgeInsets.zero,
                                                      shape: RoundedRectangleBorder(
                                                        borderRadius: BorderRadius.circular(8),
                                                      ),
                                                    ),
                                                    icon: const Icon(Icons.add, size: 16),
                                                    label: const Text('Thêm', style: TextStyle(fontSize: 12)),
                                                    onPressed: () => cart.addItem(product),
                                                  )
                                                : Row(
                                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                    children: [
                                                      IconButton(
                                                        icon: const Icon(Icons.remove_circle_outline, color: Colors.red),
                                                        padding: EdgeInsets.zero,
                                                        constraints: const BoxConstraints(),
                                                        onPressed: () => cart.decreaseQuantity(product.id),
                                                      ),
                                                      Text(
                                                        '$inCartCount',
                                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                                      ),
                                                      IconButton(
                                                        icon: const Icon(Icons.add_circle, color: Color(0xFF5D4037)),
                                                        padding: EdgeInsets.zero,
                                                        constraints: const BoxConstraints(),
                                                        onPressed: () => cart.addItem(product),
                                                      ),
                                                    ],
                                                  ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
          ),
        ],
      ),

      // Thanh giỏ hàng nổi phía dưới khi có món
      bottomSheet: cart.items.isNotEmpty
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF4E342E),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 8, offset: const Offset(0, -3)),
                ],
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${cart.totalItemCount} món trong giỏ',
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        Text(
                          Formatters.formatCurrency(cart.total),
                          style: const TextStyle(
                            color: Color(0xFFFFD54F),
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFFB300),
                        foregroundColor: const Color(0xFF3E2723),
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.shopping_cart_checkout, size: 20),
                      label: const Text(
                        'Xem giỏ hàng',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const CartScreen()),
                        );
                      },
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }
}
