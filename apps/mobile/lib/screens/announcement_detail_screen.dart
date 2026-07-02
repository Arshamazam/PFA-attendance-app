import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/announcement.dart';
import '../providers/announcement_provider.dart';
import '../services/api_service.dart';

class AnnouncementDetailScreen extends StatefulWidget {
  final Announcement announcement;
  const AnnouncementDetailScreen({super.key, required this.announcement});

  @override
  State<AnnouncementDetailScreen> createState() => _AnnouncementDetailScreenState();
}

class _AnnouncementDetailScreenState extends State<AnnouncementDetailScreen> {
  static const _green = Color(0xFF006B3F);

  final _typeColors = const {
    'Important': Color(0xFF7B1FA2), 'General': Color(0xFF616161),
    'Holiday': Color(0xFF2E7D32), 'Maintenance': Color(0xFFC62828),
    'Alert': Color(0xFFE65100),
  };
  final _priorityColors = const {
    'Urgent': Color(0xFFC62828), 'High': Color(0xFFE65100),
    'Medium': Color(0xFFF57C00), 'Low': Color(0xFF1565C0),
  };

  String _fmtDate(DateTime dt) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    final h = dt.hour > 12 ? dt.hour - 12 : dt.hour == 0 ? 12 : dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
    final p = dt.hour >= 12 ? 'PM' : 'AM';
    return '${dt.day} ${months[dt.month - 1]} ${dt.year} at $h:$m $p';
  }

  String? _resolveImage(String? url) {
    if (url == null || url.isEmpty) return null;
    if (url.startsWith('http')) return url;
    return '${ApiService.baseUrl}$url';
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AnnouncementProvider>().markAsViewed(widget.announcement.id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.announcement;
    final imgUrl = _resolveImage(a.imageUrl);
    final typeColor = _typeColors[a.type] ?? const Color(0xFF616161);
    final priorityColor = _priorityColors[a.priority] ?? const Color(0xFF616161);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: _green,
            foregroundColor: Colors.white,
            expandedHeight: imgUrl != null ? 240 : 80,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: imgUrl != null
                  ? Image.network(imgUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: _green))
                  : Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(colors: [Color(0xFF003D2E), Color(0xFF006B3F)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                      ),
                    ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.share_outlined),
                onPressed: () => Share.share('${a.title}\n\n${a.description}\n\nPFA Attendance App'),
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(a.title, style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w700, color: const Color(0xFF222222))),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8, runSpacing: 6,
                    children: [
                      _badge(a.type, typeColor),
                      _badge(a.priority, priorityColor),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _infoRow(Icons.calendar_today_outlined, 'Scheduled', _fmtDate(a.scheduledDate)),
                  if (a.publishedAt != null) _infoRow(Icons.publish_outlined, 'Published', _fmtDate(a.publishedAt!)),
                  if (a.expiryDate != null) _infoRow(Icons.event_busy_outlined, 'Expires', _fmtDate(a.expiryDate!)),
                  _infoRow(Icons.remove_red_eye_outlined, 'Views', a.views.toString()),
                  const SizedBox(height: 20),
                  const Divider(),
                  const SizedBox(height: 16),
                  Text('Description', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF333333))),
                  const SizedBox(height: 6),
                  Text(a.description, style: GoogleFonts.roboto(fontSize: 14, color: Colors.grey.shade700, height: 1.6)),
                  const SizedBox(height: 20),
                  const Divider(),
                  const SizedBox(height: 16),
                  Text('Full Content', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF333333))),
                  const SizedBox(height: 6),
                  Text(a.content, style: GoogleFonts.roboto(fontSize: 14, color: Colors.grey.shade700, height: 1.7)),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _badge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withValues(alpha: 0.4))),
      child: Text(label, style: GoogleFonts.roboto(fontSize: 12, color: color, fontWeight: FontWeight.w600)),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 15, color: _green),
          const SizedBox(width: 8),
          Expanded(child: RichText(text: TextSpan(style: GoogleFonts.roboto(fontSize: 13, color: Colors.grey.shade500), children: [
            TextSpan(text: '$label: ', style: const TextStyle(fontWeight: FontWeight.w500)),
            TextSpan(text: value, style: TextStyle(color: Colors.grey.shade700)),
          ]))),
        ],
      ),
    );
  }
}
