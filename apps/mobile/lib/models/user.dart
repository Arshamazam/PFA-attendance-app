class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? employeeId;
  final String? designation;
  final String? profilePhotoUrl;
  final List<String> geofenceZoneIds;

  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.employeeId,
    this.designation,
    this.profilePhotoUrl,
    this.geofenceZoneIds = const [],
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? json['username'] as String? ?? 'Employee',
        email: json['email'] as String? ?? '',
        role: json['role'] as String? ?? 'employee',
        employeeId: json['employeeCode'] as String? ?? json['employeeId'] as String?,
        designation: json['designation'] as String?,
        profilePhotoUrl: json['profilePhotoUrl'] as String?,
        geofenceZoneIds: (json['geofenceZoneIds'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
      );

  String get firstName => name.split(' ').first;
}
