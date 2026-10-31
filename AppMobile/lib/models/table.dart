class TableModel {
  final int id;
  final String name;
  String status; // 'TRONG', 'CO_KHACH', 'DAT_TRUOC'
  final int seats;
  final int areaId;

  TableModel({
    required this.id,
    required this.name,
    required this.status,
    required this.seats,
    required this.areaId,
  });

  factory TableModel.fromJson(Map<String, dynamic> json) {
    return TableModel(
      id: json['MaBan'] ?? json['id'] ?? 0,
      name: json['TenBan'] ?? json['name'] ?? 'Bàn',
      status: (json['TrangThai'] ?? json['status'] ?? 'TRONG').toString().toUpperCase(),
      seats: json['SoChoNgoi'] ?? json['seats'] ?? 4,
      areaId: json['MaKhuVuc'] ?? json['areaId'] ?? 1,
    );
  }

  bool get isAvailable => status == 'TRONG';
  bool get isOccupied => status == 'CO_KHACH';
  bool get isReserved => status == 'DAT_TRUOC';

  String get areaName {
    switch (areaId) {
      case 1:
        return 'Tầng 1';
      case 2:
        return 'Tầng 2';
      case 3:
        return 'Ngoài trời';
      default:
        return 'Khu vực $areaId';
    }
  }

  String get statusDisplay {
    switch (status) {
      case 'CO_KHACH':
        return 'Đang có khách';
      case 'DAT_TRUOC':
        return 'Đã đặt trước';
      default:
        return 'Bàn trống';
    }
  }
}
