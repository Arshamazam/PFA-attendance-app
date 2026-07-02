import 'package:flutter/material.dart';
import '../models/dropdown_option.dart';
import '../services/api_service.dart';

class DropdownProvider extends ChangeNotifier {
  final ApiService _api;

  bool isLoading = false;
  bool _loaded = false;
  final Map<String, List<DropdownOption>> _options = {};

  DropdownProvider(this._api);

  List<DropdownOption> getOptions(String fieldType) => _options[fieldType] ?? [];

  List<String> getLabels(String fieldType) => getOptions(fieldType).map((o) => o.label).toList();

  bool get isLoaded => _loaded;

  Future<void> loadIfNeeded() async {
    if (_loaded || isLoading) return;
    await fetch();
  }

  Future<void> fetch() async {
    isLoading = true;
    notifyListeners();
    try {
      final categories = await _api.getDropdowns();
      _options.clear();
      for (final cat in categories) {
        _options[cat.fieldType] = cat.values;
      }
      _loaded = true;
    } catch (_) {
      // Keep existing cached values on error
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
