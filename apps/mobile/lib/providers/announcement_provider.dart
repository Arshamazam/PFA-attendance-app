import 'package:flutter/material.dart';
import '../models/announcement.dart';
import '../services/api_service.dart';

class AnnouncementProvider extends ChangeNotifier {
  final ApiService _api;

  AnnouncementProvider(this._api);

  List<Announcement> announcements = [];
  bool isLoading = false;
  bool hasMore = true;
  int _skip = 0;
  static const _pageSize = 10;

  Future<void> fetchAnnouncements({bool reset = true}) async {
    if (isLoading) return;
    if (reset) {
      _skip = 0;
      hasMore = true;
      announcements = [];
    }
    if (!hasMore) return;
    isLoading = true;
    notifyListeners();
    try {
      final result = await _api.getActiveAnnouncements(skip: _skip, take: _pageSize);
      final newItems = (result['data'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(Announcement.fromJson)
          .toList();
      if (reset) {
        announcements = newItems;
      } else {
        announcements = [...announcements, ...newItems];
      }
      final total = result['total'] as int? ?? 0;
      _skip += newItems.length;
      hasMore = announcements.length < total;
    } catch (_) {}
    isLoading = false;
    notifyListeners();
  }

  Future<void> loadMore() => fetchAnnouncements(reset: false);

  Future<void> markAsViewed(String id) async {
    try {
      await _api.markAnnouncementViewed(id);
      announcements = announcements.map((a) => a.id == id
          ? Announcement(
              id: a.id, title: a.title, description: a.description, content: a.content,
              type: a.type, priority: a.priority, targetAudience: a.targetAudience,
              scheduledDate: a.scheduledDate, scheduledTime: a.scheduledTime,
              expiryDate: a.expiryDate, imageUrl: a.imageUrl, isActive: a.isActive,
              views: a.views + 1, publishedAt: a.publishedAt, createdAt: a.createdAt)
          : a).toList();
      notifyListeners();
    } catch (_) {}
  }
}
