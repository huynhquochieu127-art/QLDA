import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../providers/cart_provider.dart';
import '../utils/formatters.dart';
import 'cart_screen.dart';

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
    final cats = await ApiService.getCategories();
    final prods = await ApiService.getProducts(
      categoryId: _selectedCategory == 0 ? null : _selectedCategory,
    );
    if (mounted) {
      setState(() {
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
    final prods = await ApiService.getProducts(categoryId: catId == 0 ? null : catId);
    if (mounted) {
      setState(() {
        _products = prods;
        _isLoading = false;
      });
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

    return Scaffold(
      backgroundColor: const Color(0xFFF9F6F0),
      body: Column(
        children: [
          // Thanh tìm kiếm
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
            child: TextField(
              controller: _searchController,
              onChanged: (val) => setState(() => _searchQuery = val),
              decoration: InputDecoration(
                hintText: 'Tìm kiếm món (Cà phê, trà, bánh...)',
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

          // Danh mục món
          Container(
            height: 46,
            margin: const EdgeInsets.symmetric(vertical: 4),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _categories.length,
              itemBuilder: (ctx, idx) {
                final cat = _categories[idx];
                final catId = cat['MaDanhMuc'] ?? 0;
                final catName = cat['TenDanhMuc'] ?? '';
                final isSelected = _selectedCategory == catId;

                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(catName),
                    selected: isSelected,
                    selectedColor: const Color(0xFF5D4037),
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : Colors.brown[800],
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                    backgroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    onSelected: (_) => _onCategorySelected(catId),
                  ),
                );
              },
            ),
          ),

          // Banner bàn đang chọn (nếu có)
          if (cart.selectedTable != null)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.amber[100],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber[600]!),
              ),
              child: Row(
                children: [
                  const Icon(Icons.table_restaurant, color: Colors.brown, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Đang gọi món cho: ${cart.selectedTable!.name}',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.brown),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => cart.setTable(null),
                    child: const Icon(Icons.close, size: 18, color: Colors.brown),
                  ),
                ],
              ),
            ),

          // Danh sách món ăn / đồ uống
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Colors.brown))
                : _filteredProducts.isEmpty
                    ? const Center(child: Text('Không tìm thấy món phù hợp'))
                    : GridView.builder(
                        padding: const EdgeInsets.fromLTRB(12, 8, 12, 90),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.8,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                        ),
                        itemCount: _filteredProducts.length,
                        itemBuilder: (ctx, index) {
                          final product = _filteredProducts[index];
                          final inCartCount = cart.items[product.id]?.quantity ?? 0;

                          return Card(
                            elevation: 2,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            clipBehavior: Clip.antiAlias,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Ảnh món
                                Expanded(
                                  child: Container(
                                    width: double.infinity,
                                    color: Colors.brown[50],
                                    child: product.image.isNotEmpty &&
                                            (product.image.startsWith('http://') ||
                                                product.image.startsWith('https://'))
                                        ? Image.network(
                                            product.image,
                                            fit: BoxFit.cover,
                                            errorBuilder: (context, error, stackTrace) =>
                                                const Icon(Icons.local_cafe, size: 48, color: Colors.brown),
                                          )
                                        : const Icon(Icons.local_cafe, size: 48, color: Colors.brown),
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
                                        child: inCartCount == 0
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
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        const Icon(Icons.shopping_bag_outlined, color: Colors.white, size: 28),
                        Positioned(
                          right: -4,
                          top: -4,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(color: Colors.redAccent, shape: BoxShape.circle),
                            child: Text(
                              '${cart.totalItemCount}',
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 14),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          Formatters.formatCurrency(cart.finalTotal),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          cart.selectedTable != null ? 'Bàn ${cart.selectedTable!.name}' : 'Chưa chọn bàn',
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                    const Spacer(),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFFB300),
                        foregroundColor: Colors.brown[900],
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const CartScreen()),
                        );
                      },
                      child: const Text('Xem Giỏ Hàng', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }
}
