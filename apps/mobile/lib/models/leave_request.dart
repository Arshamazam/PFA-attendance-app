class LeaveRequest {
  final String id;
  final String startDate;
  final String endDate;
  final String leaveType;
  final String reason;
  final String status;
  final String? approvedByName;
  final DateTime createdAt;

  const LeaveRequest({
    required this.id,
    required this.startDate,
    required this.endDate,
    required this.leaveType,
    required this.reason,
    required this.status,
    this.approvedByName,
    required this.createdAt,
  });

  factory LeaveRequest.fromJson(Map<String, dynamic> json) {
    final approver = json['approver'] as Map<String, dynamic>?;
    return LeaveRequest(
      id: json['id'] as String? ?? '',
      startDate: json['startDate'] as String? ?? '',
      endDate: json['endDate'] as String? ?? '',
      leaveType: json['leaveType'] as String? ?? 'Casual',
      reason: json['reason'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      approvedByName: approver?['name'] as String?,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }
}
