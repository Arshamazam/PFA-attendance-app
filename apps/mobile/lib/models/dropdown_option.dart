class DropdownOption {
  final String id;
  final String value;
  final String label;
  final int displayOrder;

  const DropdownOption({
    required this.id,
    required this.value,
    required this.label,
    required this.displayOrder,
  });

  factory DropdownOption.fromJson(Map<String, dynamic> json) {
    return DropdownOption(
      id: json['id'] as String? ?? '',
      value: json['value'] as String? ?? '',
      label: json['label'] as String? ?? '',
      displayOrder: json['displayOrder'] as int? ?? 0,
    );
  }
}

class DropdownCategory {
  final String id;
  final String fieldName;
  final String fieldLabel;
  final String fieldType;
  final List<DropdownOption> values;

  const DropdownCategory({
    required this.id,
    required this.fieldName,
    required this.fieldLabel,
    required this.fieldType,
    required this.values,
  });

  factory DropdownCategory.fromJson(Map<String, dynamic> json) {
    return DropdownCategory(
      id: json['id'] as String? ?? '',
      fieldName: json['fieldName'] as String? ?? '',
      fieldLabel: json['fieldLabel'] as String? ?? '',
      fieldType: json['fieldType'] as String? ?? '',
      values: (json['values'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(DropdownOption.fromJson)
          .toList(),
    );
  }
}
