class ProductModel {
  final int id;
  final String name;
  final double price;
  final String image;
  final int categoryId;
  final String categoryName;
  final bool isAvailable;

  ProductModel({
    required this.id,
    required this.name,
    required this.price,
    required this.image,
    required this.categoryId,
    required this.categoryName,
    this.isAvailable = true,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['MaSanPham'] ?? json['id'] ?? 0,
      name: json['TenSanPham'] ?? json['name'] ?? '',
      price: (json['Gia'] ?? json['price'] ?? 0).toDouble(),
      image: json['HinhAnh'] ?? json['image'] ?? '',
      categoryId: json['MaDanhMuc'] ?? json['categoryId'] ?? 1,
      categoryName: json['TenDanhMuc'] ?? json['categoryName'] ?? 'Đồ uống',
      isAvailable: (json['is_active'] ?? 1) != 0,
    );
  }

  ProductModel copyWith({
    int? id,
    String? name,
    double? price,
    String? image,
    int? categoryId,
    String? categoryName,
    bool? isAvailable,
  }) {
    return ProductModel(
      id: id ?? this.id,
      name: name ?? this.name,
      price: price ?? this.price,
      image: image ?? this.image,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      isAvailable: isAvailable ?? this.isAvailable,
    );
  }
}
