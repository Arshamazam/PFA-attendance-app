class LeaveBalance {
  final int used;
  final int total;

  const LeaveBalance({required this.used, required this.total});

  int get remaining => total - used;
  double get usageRatio => total > 0 ? used / total : 0.0;

  factory LeaveBalance.fromJson(Map<String, dynamic> json) => LeaveBalance(
        used: json['used'] as int? ?? 0,
        total: json['total'] as int? ?? 0,
      );
}

class LeaveSummary {
  final LeaveBalance casual;
  final LeaveBalance medical;
  final LeaveBalance extraordinary;
  final LeaveBalance annual;

  const LeaveSummary({
    required this.casual,
    required this.medical,
    required this.extraordinary,
    required this.annual,
  });

  factory LeaveSummary.fromJson(Map<String, dynamic> json) => LeaveSummary(
        casual: LeaveBalance.fromJson(
            json['casual'] as Map<String, dynamic>? ?? {'used': 0, 'total': 15}),
        medical: LeaveBalance.fromJson(
            json['medical'] as Map<String, dynamic>? ?? {'used': 0, 'total': 30}),
        extraordinary: LeaveBalance.fromJson(
            json['extraordinary'] as Map<String, dynamic>? ??
                json['extraOrdinary'] as Map<String, dynamic>? ??
                {'used': 0, 'total': 30}),
        annual: LeaveBalance.fromJson(
            json['annual'] as Map<String, dynamic>? ?? {'used': 0, 'total': 15}),
      );

  static LeaveSummary get defaultSummary => const LeaveSummary(
        casual: LeaveBalance(used: 0, total: 15),
        medical: LeaveBalance(used: 0, total: 30),
        extraordinary: LeaveBalance(used: 0, total: 30),
        annual: LeaveBalance(used: 0, total: 15),
      );
}
