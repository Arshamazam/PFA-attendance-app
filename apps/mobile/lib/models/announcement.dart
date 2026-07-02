class Announcement {
  final String id;
  final String title;
  final String description;
  final String content;
  final String type;
  final String priority;
  final String targetAudience;
  final DateTime scheduledDate;
  final String scheduledTime;
  final DateTime? expiryDate;
  final String? imageUrl;
  final bool isActive;
  final int views;
  final DateTime? publishedAt;
  final DateTime createdAt;

  const Announcement({
    required this.id,
    required this.title,
    required this.description,
    required this.content,
    required this.type,
    required this.priority,
    required this.targetAudience,
    required this.scheduledDate,
    required this.scheduledTime,
    this.expiryDate,
    this.imageUrl,
    required this.isActive,
    required this.views,
    this.publishedAt,
    required this.createdAt,
  });

  factory Announcement.fromJson(Map<String, dynamic> json) {
    return Announcement(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      content: json['content'] as String? ?? '',
      type: json['type'] as String? ?? 'General',
      priority: json['priority'] as String? ?? 'Medium',
      targetAudience: json['targetAudience'] as String? ?? 'All',
      scheduledDate: DateTime.parse(json['scheduledDate'] as String).toLocal(),
      scheduledTime: json['scheduledTime'] as String? ?? '00:00',
      expiryDate: json['expiryDate'] != null ? DateTime.parse(json['expiryDate'] as String).toLocal() : null,
      imageUrl: json['imageUrl'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      views: json['views'] as int? ?? 0,
      publishedAt: json['publishedAt'] != null ? DateTime.parse(json['publishedAt'] as String).toLocal() : null,
      createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
    );
  }
}
