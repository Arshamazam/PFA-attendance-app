import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  static const _green = Color(0xFF006B3F);

  // Mock announcements — replace with API call when backend endpoint is ready
  static const _announcements = [
    _Announcement(
      id: '1',
      title: 'New Attendance Policy',
      body:
          'Starting July 1, 2026, all employees must check in before 9:30 AM. Late arrivals must '
          'provide a reason via the app. Employees with more than 3 late arrivals per month will '
          'be subject to the disciplinary procedure outlined in the HR manual.',
      date: '2026-06-23',
      icon: Icons.policy_rounded,
      iconColor: Color(0xFF006B3F),
    ),
    _Announcement(
      id: '2',
      title: 'System Maintenance',
      body:
          'Scheduled maintenance on June 25, 2026 from 10 PM to 2 AM. The attendance app will be '
          'temporarily unavailable. Please ensure you check in/out before 10 PM.',
      date: '2026-06-22',
      icon: Icons.build_rounded,
      iconColor: Color(0xFFE65100),
    ),
    _Announcement(
      id: '3',
      title: 'Eid Holiday Notice',
      body:
          'Punjab Food Authority offices will remain closed on July 7–9, 2026 for Eid ul-Adha. '
          'Employees are not required to check in during this period. Emergency duty roster '
          'will be shared separately by the HR department.',
      date: '2026-06-20',
      icon: Icons.celebration_rounded,
      iconColor: Color(0xFF1565C0),
    ),
    _Announcement(
      id: '4',
      title: 'Geofence Zone Update',
      body:
          'Geofence zones have been updated to reflect the new office layout at PFA Headquarters, '
          'Lahore. If you experience issues checking in, please contact IT support.',
      date: '2026-06-18',
      icon: Icons.location_on_rounded,
      iconColor: Color(0xFF6A1B9A),
    ),
  ];

  final Set<String> _expanded = {};

  String _fmtDate(String isoDate) {
    final dt = DateTime.tryParse(isoDate);
    if (dt == null) return isoDate;
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
              child: Text(
                'ANNOUNCEMENTS',
                style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: _green,
                  letterSpacing: 0.5,
                ),
              ),
            ),

            // List
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                itemCount: _announcements.length,
                itemBuilder: (ctx, i) {
                  final item = _announcements[i];
                  final isExpanded = _expanded.contains(item.id);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Material(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      elevation: 2,
                      shadowColor: Colors.black.withValues(alpha: 0.08),
                      child: InkWell(
                        onTap: () => setState(() {
                          if (isExpanded) {
                            _expanded.remove(item.id);
                          } else {
                            _expanded.add(item.id);
                          }
                        }),
                        borderRadius: BorderRadius.circular(16),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Title row
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: item.iconColor.withValues(alpha: 0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(
                                      item.icon,
                                      color: item.iconColor,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.title,
                                          style: GoogleFonts.poppins(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                            color: const Color(0xFF222222),
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          _fmtDate(item.date),
                                          style: GoogleFonts.roboto(
                                            fontSize: 11,
                                            color: Colors.grey.shade500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Icon(
                                    isExpanded
                                        ? Icons.keyboard_arrow_up_rounded
                                        : Icons.keyboard_arrow_down_rounded,
                                    color: Colors.grey.shade400,
                                  ),
                                ],
                              ),

                              const SizedBox(height: 10),

                              // Body text
                              AnimatedCrossFade(
                                duration: const Duration(milliseconds: 200),
                                crossFadeState: isExpanded
                                    ? CrossFadeState.showSecond
                                    : CrossFadeState.showFirst,
                                firstChild: Text(
                                  item.body,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.roboto(
                                    fontSize: 13,
                                    color: Colors.grey.shade700,
                                    height: 1.5,
                                  ),
                                ),
                                secondChild: Text(
                                  item.body,
                                  style: GoogleFonts.roboto(
                                    fontSize: 13,
                                    color: Colors.grey.shade700,
                                    height: 1.5,
                                  ),
                                ),
                              ),

                              if (!isExpanded) ...[
                                const SizedBox(height: 6),
                                Text(
                                  'Read more',
                                  style: GoogleFonts.roboto(
                                    fontSize: 12,
                                    color: _green,
                                    fontWeight: FontWeight.w500,
                                    decoration: TextDecoration.underline,
                                    decorationColor: _green,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
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
}

class _Announcement {
  final String id;
  final String title;
  final String body;
  final String date;
  final IconData icon;
  final Color iconColor;

  const _Announcement({
    required this.id,
    required this.title,
    required this.body,
    required this.date,
    required this.icon,
    required this.iconColor,
  });
}
