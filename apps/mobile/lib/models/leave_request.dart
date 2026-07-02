class LeaveRequest {
  final String id;
  final String startDate;
  final String endDate;
  final String leaveType;
  final String reason;
  final String status;
  final String? approvedByName;
  final String? rejectionReason;
  final DateTime? approvedAt;
  final int days;
  // Present when viewed by a reporting officer
  final String? employeeName;
  final String? employeeEmail;
  final String? employeeDepartment;
  final String? employeeDesignation;
  final DateTime createdAt;

  const LeaveRequest({
    required this.id,
    required this.startDate,
    required this.endDate,
    required this.leaveType,
    required this.reason,
    required this.status,
    this.approvedByName,
    this.rejectionReason,
    this.approvedAt,
    this.days = 1,
    this.employeeName,
    this.employeeEmail,
    this.employeeDepartment,
    this.employeeDesignation,
    required this.createdAt,
  });

  factory LeaveRequest.fromJson(Map<String, dynamic> json) {
    final approver = json['approver'] as Map<String, dynamic>?;
    final employee = json['employee'] as Map<String, dynamic>?;

    final startStr = json['startDate'] as String? ?? '';
    final endStr = json['endDate'] as String? ?? '';
    final start = DateTime.tryParse(startStr);
    final end = DateTime.tryParse(endStr);
    final days = json['days'] as int? ??
        (start != null && end != null
            ? end.difference(start).inDays + 1
            : 1);

    return LeaveRequest(
      id: json['id'] as String? ?? '',
      startDate: startStr,
      endDate: endStr,
      leaveType: json['leaveType'] as String? ?? 'Casual',
      reason: json['reason'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      approvedByName: approver?['name'] as String?,
      rejectionReason: json['rejectionReason'] as String?,
      approvedAt: DateTime.tryParse(json['approvedAt'] as String? ?? ''),
      days: days,
      employeeName: employee?['name'] as String?,
      employeeEmail: employee?['email'] as String?,
      employeeDepartment: employee?['department'] as String?,
      employeeDesignation: employee?['designation'] as String?,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }
}
