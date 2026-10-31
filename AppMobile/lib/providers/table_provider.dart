import 'package:flutter/material.dart';
import '../models/table.dart';
import '../services/api_service.dart';

class TableProvider extends ChangeNotifier {
  List<TableModel> _tables = [];
  bool _isLoading = false;
  int _selectedArea = 0; // 0: Tất cả, 1: Tầng 1, 2: Tầng 2, 3: Ngoài trời
  TableModel? _selectedTable;

  List<TableModel> get tables => _tables;
  bool get isLoading => _isLoading;
  int get selectedArea => _selectedArea;
  TableModel? get selectedTable => _selectedTable;

  List<TableModel> get filteredTables {
    if (_selectedArea == 0) return _tables;
    return _tables.where((t) => t.areaId == _selectedArea).toList();
  }

  int get totalTables => _tables.length;
  int get occupiedCount => _tables.where((t) => t.isOccupied).length;
  int get availableCount => _tables.where((t) => t.isAvailable).length;

  void selectArea(int areaId) {
    _selectedArea = areaId;
    notifyListeners();
  }

  void selectTable(TableModel? table) {
    _selectedTable = table;
    notifyListeners();
  }

  Future<void> fetchTables() async {
    _isLoading = true;
    notifyListeners();

    _tables = await ApiService.getTables();
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> changeTableStatus(int tableId, String newStatus) async {
    final success = await ApiService.updateTableStatus(tableId, newStatus);
    if (success) {
      final index = _tables.indexWhere((t) => t.id == tableId);
      if (index != -1) {
        _tables[index].status = newStatus;
        notifyListeners();
      }
    }
    return success;
  }
}
