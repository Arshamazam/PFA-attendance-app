import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/announcement_provider.dart';
import '../models/announcement.dart';
import '../services/api_service.dart';
import 'announcement_detail_screen.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  static const _green = Color(0xFF006B3F);

  final _scrollCtrl = ScrollController();

  final _typeColors = const {
    'Important': Color(0xFF7B1FA2), 'General': Color(0xFF616161),
    'Holiday': Color(0xFF2E7D32), 'Maintenance': Color(0xFFC62828),
    'Alert': Color(0xFFE65100),
  };
  final _priorityColors = const {
    'Urgent': Color(0xFFC62828), 'High': Color(0xFFE65100),
    'Medium': Color(0xFFF57C00), 'Low': Color(0xFF1565C0),
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AnnouncementProvider>().fetchAnnouncements();
    });
    _scrollCtrl.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollCtrl.position.pixels >= _scrollCtrl.position.maxScrollExtent - 200) {
      final provider = context.read<AnnouncementProvider>();
      if (provider.hasMore && !provider.isLoading) {
        provider.loadMore();
      }
    }
  }

  String _fmtDate(DateTime dt) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
  }

  String? _resolveImage(String? url) {
    if (url == null || url.isEmpty) return null;
    if (url.startsWith('http')) return url;
    return '${ApiService.baseUrl}$url';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
              child: Text('ANNOUNCEMENTS', style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w800, color: _green, letterSpacing: 0.5)),
            ),
            Expanded(
              child: Consumer<AnnouncementProvider>(
                builder: (_, provider, __) {
                  if (provider.isLoading && provider.announcements.isEmpty) {
                    return const Center(child: CircularProgressIndicator(color: _green));
                  }
                  if (provider.announcements.isEmpty) {
                    return Center(
                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Icon(Icons.campaign_outlined, size: 56, color: Colors.grey.shade300),
                        const SizedBox(height: 12),
                        Text('No announcements', style: GoogleFonts.roboto(color: Colors.grey, fontSize: 15)),
                        const SizedBox(height: 8),
                        TextButton(onPressed: () => provider.fetchAnnouncements(), child: const Text('Refresh')),
                      ]),
                    );
                  }
                  return RefreshIndicator(
                    color: _green,
                    onRefresh: () => provider.fetchAnnouncements(),
                    child: ListView.builder(
                      controller: _scrollCtrl,
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                      itemCount: provider.announcements.length + (provider.hasMore ? 1 : 0),
                      itemBuilder: (ctx, i) {
                        if (i == provider.announcements.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(child: CircularProgressIndicator(color: _green, strokeWidth: 2)),
                          );
                        }
                        return _buildCard(context, provider.announcements[i]);
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(BuildContext context, Announcement a) {
    final typeColor = _typeColors[a.type] ?? const Color(0xFF616161);
    final priorityColor = _priorityColors[a.priority] ?? const Color(0xFF616161);
    final imgUrl = _resolveImage(a.imageUrl);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        elevation: 2,
        shadowColor: Colors.black.withValues(alpha: 0.08),
        child: InkWell(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => AnnouncementDetailScreen(announcement: a))),
          borderRadius: BorderRadius.circular(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (imgUrl != null)
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  child: Image.network(imgUrl, height: 160, width: double.infinity, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox.shrink()),
                ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: Text(a.title, style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF222222)))),
                        const SizedBox(width: 8),
                        Text('${a.views} views', style: GoogleFonts.roboto(fontSize: 11, color: Colors.grey.shade400)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Wrap(spacing: 6, runSpacing: 4, children: [
                      _badge(a.type, typeColor),
                      _badge(a.priority, priorityColor),
                    ]),
                    const SizedBox(height: 8),
                    Text(
                      a.description.length > 100 ? '${a.description.substring(0, 100)}…' : a.description,
                      style: GoogleFonts.roboto(fontSize: 13, color: Colors.grey.shade700, height: 1.5),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(_fmtDate(a.scheduledDate), style: GoogleFonts.roboto(fontSize: 11, color: Colors.grey.shade400)),
                        Text('Read More →', style: GoogleFonts.roboto(fontSize: 12, color: _green, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _badge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withValues(alpha: 0.3))),
      child: Text(label, style: GoogleFonts.roboto(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
    );
  }
}
