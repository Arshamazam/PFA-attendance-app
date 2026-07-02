import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  static const _green = Color(0xFF006B3F);
  List<Map<String, dynamic>> _notifications = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = context.read<AuthProvider>();
      final _ = api; // ensure auth
      final svc = context.read<ApiService>();
      final result = await svc.getNotifications();
      setState(() {
        _notifications = List<Map<String, dynamic>>.from(result['data'] ?? []);
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _markRead(String id) async {
    try {
      await context.read<ApiService>().markNotificationRead(id);
      setState(() {
        _notifications = _notifications.map((n) => n['id'] == id ? {...n, 'isRead': true} : n).toList();
      });
    } catch (_) {}
  }

  String _timeAgo(String iso) {
    final diff = DateTime.now().difference(DateTime.parse(iso));
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  Color _severityColor(String severity) {
    switch (severity) {
      case 'Warning': return Colors.orange;
      case 'Critical': return Colors.red;
      default: return _green;
    }
  }

  @override
  Widget build(BuildContext context) {
    final unread = _notifications.where((n) => n['isRead'] != true).length;
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: _green,
        foregroundColor: Colors.white,
        title: Text('Notifications${unread > 0 ? " ($unread)" : ""}', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600)),
        actions: [
          if (unread > 0)
            IconButton(
              icon: const Icon(Icons.done_all),
              tooltip: 'Mark all read',
              onPressed: () async {
                try {
                  await context.read<ApiService>().markAllNotificationsRead();
                  setState(() {
                    _notifications = _notifications.map((n) => {...n, 'isRead': true}).toList();
                  });
                } catch (_) {}
              },
            ),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: _green))
          : _notifications.isEmpty
              ? Center(child: Text('No notifications', style: GoogleFonts.roboto(color: Colors.grey)))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _notifications.length,
                  itemBuilder: (_, i) {
                    final n = _notifications[i];
                    final isRead = n['isRead'] == true;
                    return Card(
                      elevation: isRead ? 0 : 2,
                      margin: const EdgeInsets.only(bottom: 8),
                      child: InkWell(
                        onTap: () => isRead ? null : _markRead(n['id'] as String),
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 8, height: 8,
                                margin: const EdgeInsets.only(top: 6, right: 10),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isRead ? Colors.transparent : _severityColor(n['severity'] as String? ?? 'Info'),
                                ),
                              ),
                              Expanded(
                                child: Opacity(
                                  opacity: isRead ? 0.5 : 1.0,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(n['title'] as String? ?? '', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600)),
                                      const SizedBox(height: 2),
                                      Text(n['message'] as String? ?? '', style: GoogleFonts.roboto(fontSize: 12, color: Colors.grey.shade600)),
                                      const SizedBox(height: 4),
                                      Text(_timeAgo(n['createdAt'] as String? ?? ''), style: GoogleFonts.roboto(fontSize: 11, color: Colors.grey.shade400)),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
