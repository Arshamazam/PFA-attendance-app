class AttendanceRecord {
  final String id;
  final DateTime date;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final bool isLate;
  final String? lateReason;
  final String? lateReasonNotes;
  final String? geofenceZoneId;
  final String status;

  const AttendanceRecord({
    required this.id,
    required this.date,
    this.checkInTime,
    this.checkOutTime,
    this.isLate = false,
    this.lateReason,
    this.lateReasonNotes,
    this.geofenceZoneId,
    this.status = 'present',
  });

  bool get isCheckedOut => checkOutTime != null;
  bool get isCheckedIn => checkInTime != null;

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    final checkInTime = json['checkInTime'] != null
        ? DateTime.tryParse(json['checkInTime'] as String)?.toLocal()
        : null;
    final checkOutTime = json['checkOutTime'] != null
        ? DateTime.tryParse(json['checkOutTime'] as String)?.toLocal()
        : null;
    // derive isLate from check-in hour (cutoff 9:00 AM) if not in payload
    final isLate = json['isLate'] is bool
        ? json['isLate'] as bool
        : () {
            if (checkInTime == null) return false;
            return checkInTime.hour > 9 ||
                (checkInTime.hour == 9 && checkInTime.minute > 0);
          }();
    return AttendanceRecord(
      id: json['id'] as String? ?? '',
      date: checkInTime ??
          DateTime.tryParse(json['date'] as String? ?? '') ??
          DateTime.now(),
      checkInTime: checkInTime,
      checkOutTime: checkOutTime,
      isLate: isLate,
      lateReason: json['lateReason'] as String?,
      lateReasonNotes: json['lateReasonNotes'] as String?,
      geofenceZoneId: json['geofenceZoneId'] as String?,
      status: json['status'] as String? ?? 'present',
    );
  }
}
