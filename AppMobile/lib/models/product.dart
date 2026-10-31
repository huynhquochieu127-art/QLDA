class ProductModel {
  final int id;
  final String name;
  final double price;
  final String image;
  final String? description;
  final int categoryId;
  final String categoryName;
  final bool isAvailable;

  ProductModel({
    required this.id,
    required this.name,
    required this.price,
    required this.image,
    this.description,
    required this.categoryId,
    required this.categoryName,
    this.isAvailable = true,
  });

  String get imageUrl => image;

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final rawPrice = json['Gia'] ?? json['price'] ?? 0;
    final parsedPrice = rawPrice is num
        ? rawPrice.toDouble()
        : double.tryParse(rawPrice.toString()) ?? 0.0;

    final rawActive = json['is_active'] ?? json['isActive'] ?? 1;
    final parsedActive = rawActive == 1 || rawActive == true || rawActive == '1';

    final idVal = json['MaSanPham'] ?? json['id'] ?? 0;
    final catIdVal = json['MaDanhMuc'] ?? json['categoryId'] ?? 1;

    return ProductModel(
      id: idVal is int ? idVal : int.tryParse(idVal.toString()) ?? 0,
      name: (json['TenSanPham'] ?? json['name'] ?? '').toString(),
      price: parsedPrice,
      image: (json['HinhAnh'] ?? json['image'] ?? '').toString(),
      description: (json['MoTa'] ?? json['description'])?.toString(),
      categoryId: catIdVal is int ? catIdVal : int.tryParse(catIdVal.toString()) ?? 1,
      categoryName: (json['TenDanhMuc'] ?? json['categoryName'] ?? 'Đồ uống').toString(),
      isAvailable: parsedActive,
    );
  }

  String get fullImageUrl {
    if (image.isEmpty) return '';
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    return 'https://quan-ly-ca-phe.onrender.com${image.startsWith('/') ? '' : '/'}$image';
  }

  ProductModel copyWith({
    int? id,
    String? name,
    double? price,
    String? image,
    String? description,
    int? categoryId,
    String? categoryName,
    bool? isAvailable,
  }) {
    return ProductModel(
      id: id ?? this.id,
      name: name ?? this.name,
      price: price ?? this.price,
      image: image ?? this.image,
      description: description ?? this.description,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      isAvailable: isAvailable ?? this.isAvailable,
    );
  }
}

