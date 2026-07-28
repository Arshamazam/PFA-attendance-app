import 'dart:async';
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/attendance_record.dart';
import '../models/leave_balance.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../services/api_service.dart';
import 'check_in_screen.dart';
import 'attendance_history_screen.dart';
import 'login_screen.dart';
import 'requests_screen.dart';
import 'announcements_screen.dart';
import 'my_info_screen.dart';
import 'notifications_screen.dart';
import 'leave_approvals_screen.dart';
import '../providers/leave_approvals_provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  static const _green = Color(0xFF006B3F);
  static const _blue = Color(0xFF003D82);
  static const _bg = Color(0xFFF5F5F5);

  int _tabIndex = 0;
  int _unreadNotifs = 0;
  late final Timer _clockTimer;
  late final Timer _notifTimer;
  DateTime _now = DateTime.now();

  // Controllers
  late final AnimationController _glowCtrl;
  late final AnimationController _contentCtrl;
  late final List<AnimationController> _leaveCtrl;

  @override
  void initState() {
    super.initState();

    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });

    _glowCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();

    _contentCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    )..forward();

    _leaveCtrl = List.generate(4, (i) {
      final ctrl = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 450),
      );
      Future.delayed(Duration(milliseconds: 300 + i * 130), () {
        if (mounted) ctrl.forward();
      });
      return ctrl;
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AttendanceProvider>().fetchDashboard();
      _fetchUnreadCount();
      context.read<LeaveApprovalsProvider>().fetchAll();
    });
    _notifTimer = Timer.periodic(const Duration(seconds: 60), (_) => _fetchUnreadCount());
  }

  Future<void> _fetchUnreadCount() async {
    try {
      final count = await context.read<ApiService>().getUnreadNotificationCount();
      if (mounted) setState(() => _unreadNotifs = count);
    } catch (_) {}
  }

  @override
  void dispose() {
    _clockTimer.cancel();
    _notifTimer.cancel();
    _glowCtrl.dispose();
    _contentCtrl.dispose();
    for (final c in _leaveCtrl) {
      c.dispose();
    }
    super.dispose();
  }

  // ─── Formatters ─────────────────────────────────────────────────────────────

  String _clock(DateTime dt) {
    final h = dt.hour > 12 ? dt.hour - 12 : dt.hour == 0 ? 12 : dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
    final s = dt.second.toString().padLeft(2, '0');
    return '$h:$m:$s ${dt.hour >= 12 ? "PM" : "AM"}';
  }

  String _headerDate(DateTime dt) {
    const days = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${days[dt.weekday - 1]}, ${dt.day} ${months[dt.month - 1]}';
  }

  String _recordDate(DateTime dt) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const days = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year} (${days[dt.weekday - 1]})';
  }

  String _shortTime(DateTime? dt) {
    if (dt == null) return '--:--';
    final h = dt.hour > 12 ? dt.hour - 12 : dt.hour == 0 ? 12 : dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m ${dt.hour >= 12 ? "PM" : "AM"}';
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  Future<void> _handleCheckIn() async {
    final shift = await _selectShift();
    if (shift == null || !mounted) return;
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => CheckInScreen(shift: shift)),
    );
    if (result == true && mounted) {
      context.read<AttendanceProvider>().fetchDashboard();
    }
  }

  Future<String?> _selectShift() {
    return showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 36),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
            ),
            const SizedBox(height: 20),
            Text(
              'Select Your Shift',
              style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700, color: const Color(0xFF1A1A1A)),
            ),
            const SizedBox(height: 6),
            Text(
              'Choose your shift before marking attendance',
              style: GoogleFonts.roboto(fontSize: 13, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: _ShiftCard(
                    label: 'Morning Shift',
                    icon: Icons.wb_sunny_rounded,
                    color: const Color(0xFFF59E0B),
                    time: '9:00 AM – 5:00 PM',
                    onTap: () => Navigator.of(ctx).pop('morning'),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: _ShiftCard(
                    label: 'Evening Shift',
                    icon: Icons.nights_stay_rounded,
                    color: const Color(0xFF4F46E5),
                    time: '5:00 PM – 1:00 AM',
                    onTap: () => Navigator.of(ctx).pop('evening'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: Text('Cancel', style: GoogleFonts.roboto(color: Colors.grey.shade500, fontSize: 14)),
            ),
          ],
        ),
      ),
    );
  }

  Future<bool> _detectFaceInPhoto(String imagePath) async {
    final detector = FaceDetector(
      options: FaceDetectorOptions(performanceMode: FaceDetectorMode.accurate),
    );
    try {
      final faces = await detector.processImage(InputImage.fromFilePath(imagePath));
      return faces.isNotEmpty;
    } catch (_) {
      return false; // block on error — do not allow unverified photos
    } finally {
      await detector.close();
    }
  }

  Future<void> _handleCheckOut() async {
    // ── 3-hour minimum guard ──────────────────────────────────────────────────
    final checkInTime = context.read<AttendanceProvider>().openCheckInTime;
    if (checkInTime != null) {
      final elapsed = DateTime.now().difference(checkInTime);
      if (elapsed.inMinutes < 180) {
        final remaining = Duration(minutes: 180 - elapsed.inMinutes);
        final h = remaining.inHours;
        final m = remaining.inMinutes % 60;
        final label = h > 0 ? '${h}h ${m}m' : '${m}m';
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.timer_outlined, color: Colors.white),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'You can check out in $label. Minimum 3 hours after check-in.',
                    style: GoogleFonts.roboto(color: Colors.white),
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.orange.shade700,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );
        return;
      }
    }

    // ── Capture selfie ────────────────────────────────────────────────────────
    String? photoPath;
    try {
      final cameras = await availableCameras();
      if (cameras.isNotEmpty) {
        final front = cameras.firstWhere(
          (c) => c.lensDirection == CameraLensDirection.front,
          orElse: () => cameras.first,
        );
        final ctrl = CameraController(front, ResolutionPreset.medium, enableAudio: false);
        await ctrl.initialize();
        if (!mounted) { await ctrl.dispose(); return; }
        final xfile = await showDialog<XFile>(
          context: context,
          barrierDismissible: false,
          builder: (_) => _CheckOutCameraDialog(controller: ctrl),
        );
        await ctrl.dispose();
        photoPath = xfile?.path;
      } else {
        final picker = ImagePicker();
        final img = await picker.pickImage(source: ImageSource.camera, imageQuality: 85);
        photoPath = img?.path;
      }
    } catch (_) {
      // Camera unavailable — proceed without photo
    }

    // ── Face detection on check-out photo ─────────────────────────────────────
    if (photoPath != null && mounted) {
      final hasFace = await _detectFaceInPhoto(photoPath);
      if (!mounted) return;
      if (!hasFace) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.face_retouching_off, color: Colors.white),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'No face detected. Please look directly at the camera and try again.',
                    style: GoogleFonts.roboto(color: Colors.white),
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );
        return;
      }
    }

    if (!mounted) return;
    try {
      await context.read<AttendanceProvider>().checkOut(photoPath: photoPath);
      if (!mounted) return;
      final now = DateTime.now();
      final h = now.hour > 12 ? now.hour - 12 : now.hour == 0 ? 12 : now.hour;
      final m = now.minute.toString().padLeft(2, '0');
      final period = now.hour >= 12 ? 'PM' : 'AM';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Checked out at $h:$m $period'),
          backgroundColor: _green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Check-out failed: $e'),
          backgroundColor: Colors.red.shade700,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _logout() async {
    await context.read<AuthProvider>().logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  // ─── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final attendance = context.watch<AttendanceProvider>();
    final approvals = context.watch<LeaveApprovalsProvider>();

    return Scaffold(
      backgroundColor: _bg,
      body: IndexedStack(
        index: _tabIndex,
        children: [
          _homeTab(auth, attendance),
          const RequestsScreen(),
          const AnnouncementsScreen(),
          const MyInfoScreen(),
          const LeaveApprovalsScreen(),
        ],
      ),
      bottomNavigationBar: _bottomNav(approvals.pending.length),
    );
  }

  // ─── Bottom Nav ─────────────────────────────────────────────────────────────

  Widget _bottomNav(int pendingApprovals) {
    return NavigationBar(
      selectedIndex: _tabIndex,
      onDestinationSelected: (i) => setState(() => _tabIndex = i),
      backgroundColor: Colors.white,
      indicatorColor: _green.withValues(alpha: 0.12),
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      animationDuration: const Duration(milliseconds: 300),
      height: 64,
      destinations: [
        const NavigationDestination(
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home_rounded, color: _green),
          label: 'Home',
        ),
        const NavigationDestination(
          icon: Icon(Icons.request_page_outlined),
          selectedIcon: Icon(Icons.request_page_rounded, color: _green),
          label: 'Requests',
        ),
        const NavigationDestination(
          icon: Icon(Icons.campaign_outlined),
          selectedIcon: Icon(Icons.campaign_rounded, color: _green),
          label: 'Updates',
        ),
        const NavigationDestination(
          icon: Icon(Icons.person_outline),
          selectedIcon: Icon(Icons.person_rounded, color: _green),
          label: 'My Info',
        ),
        NavigationDestination(
          icon: pendingApprovals > 0
              ? Badge.count(
                  count: pendingApprovals,
                  child: const Icon(Icons.how_to_reg_outlined),
                )
              : const Icon(Icons.how_to_reg_outlined),
          selectedIcon: pendingApprovals > 0
              ? Badge.count(
                  count: pendingApprovals,
                  child: const Icon(Icons.how_to_reg_rounded, color: _green),
                )
              : const Icon(Icons.how_to_reg_rounded, color: _green),
          label: 'Approvals',
        ),
      ],
    );
  }

  // ─── Home Tab ───────────────────────────────────────────────────────────────

  Widget _homeTab(AuthProvider auth, AttendanceProvider attendance) {
    final topPad = MediaQuery.of(context).padding.top;
    return Stack(
      children: [
        // Gradient header background — covers top portion
        Positioned(
          top: 0, left: 0, right: 0,
          child: Container(
            height: topPad + 150,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF003D2E), Color(0xFF006B3F), Color(0xFF00A651)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
        ),

        // Scrollable content on top of gradient
        RefreshIndicator(
          color: _green,
          onRefresh: () => attendance.fetchDashboard(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SafeArea(
                  bottom: false,
                  child: _header(auth),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 40),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _statusCard(attendance),
                      const SizedBox(height: 14),
                      _actionButton(attendance),
                      const SizedBox(height: 28),
                      _leaveSection(attendance),
                      const SizedBox(height: 16),
                      _announcementsCard(),
                      const SizedBox(height: 28),
                      _attendanceSection(attendance),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ─── Header ─────────────────────────────────────────────────────────────────

  Widget _header(AuthProvider auth) {
    final name = auth.user?.name ?? 'Employee';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'E';

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 16, 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome,',
                  style: GoogleFonts.roboto(
                    color: Colors.white.withValues(alpha: 0.82),
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  name,
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _headerDate(_now),
                  style: GoogleFonts.roboto(
                    color: Colors.white.withValues(alpha: 0.72),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            children: [
              Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined, color: Colors.white, size: 24),
                    onPressed: () async {
                      await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationsScreen()));
                      _fetchUnreadCount();
                    },
                    tooltip: 'Notifications',
                  ),
                  if (_unreadNotifs > 0)
                    Positioned(
                      right: 6, top: 6,
                      child: Container(
                        width: 16, height: 16,
                        decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                        child: Center(child: Text('$_unreadNotifs', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold))),
                      ),
                    ),
                ],
              ),
              GestureDetector(
                onTap: _logout,
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.35),
                      width: 1.5,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      initial,
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── Status Card ────────────────────────────────────────────────────────────

  Widget _statusCard(AttendanceProvider attendance) {
    final isIn = attendance.isCheckedIn;
    final statusColor = isIn ? _green : const Color(0xFF757575);

    return FadeTransition(
      opacity: _contentCtrl,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.10),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
        child: Column(
          children: [
            // Pulsing glow + circle
            AnimatedBuilder(
              animation: _glowCtrl,
              builder: (ctx, child) => CustomPaint(
                size: const Size(210, 210),
                painter: _GlowPainter(_glowCtrl.value, statusColor),
                child: child,
              ),
              child: SizedBox(
                width: 210,
                height: 210,
                child: Center(
                  child: Container(
                    width: 168,
                    height: 168,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: statusColor.withValues(alpha: 0.07),
                      border: Border.all(
                        color: statusColor.withValues(alpha: 0.22),
                        width: 3,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          isIn
                              ? Icons.check_circle_rounded
                              : Icons.radio_button_unchecked_rounded,
                          color: statusColor,
                          size: 50,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          isIn ? 'CHECKED IN' : 'CHECKED OUT',
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: statusColor,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 18),

            // Digital clock
            Text(
              _clock(_now),
              style: GoogleFonts.roboto(
                fontSize: 26,
                fontWeight: FontWeight.w300,
                color: const Color(0xFF333333),
                letterSpacing: 2.5,
              ),
            ),

            // Recorded check-in / check-out times
            Builder(builder: (ctx) {
              final today = DateTime.now();
              AttendanceRecord? todayRecord;
              for (final r in attendance.records) {
                final d = r.date.toLocal();
                if (d.year == today.year && d.month == today.month && d.day == today.day) {
                  todayRecord = r;
                  break;
                }
              }
              if (todayRecord == null) return const SizedBox.shrink();
              return Padding(
                padding: const EdgeInsets.only(top: 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _miniTimeChip(Icons.login_rounded, 'In', _shortTime(todayRecord.checkInTime), _green),
                    const SizedBox(width: 24),
                    _miniTimeChip(Icons.logout_rounded, 'Out', _shortTime(todayRecord.checkOutTime), const Color(0xFFC62828)),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _miniTimeChip(IconData icon, String label, String time, Color color) {
    return Column(
      children: [
        Icon(icon, size: 14, color: color.withValues(alpha: 0.7)),
        const SizedBox(height: 2),
        Text(label, style: GoogleFonts.roboto(fontSize: 10, color: Colors.grey.shade500)),
        Text(time, style: GoogleFonts.roboto(fontSize: 13, fontWeight: FontWeight.w600, color: color)),
      ],
    );
  }

  // ─── Action Button ──────────────────────────────────────────────────────────

  Widget _actionButton(AttendanceProvider attendance) {
    final isIn = attendance.isCheckedIn;
    final btnColor = isIn ? const Color(0xFFC62828) : _green;

    if (attendance.isLoading) {
      return Container(
        height: 56,
        decoration: BoxDecoration(
          color: _green.withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(
              color: Colors.white,
              strokeWidth: 2.5,
            ),
          ),
        ),
      );
    }

    return SizedBox(
      height: 56,
      child: ElevatedButton(
        onPressed: isIn ? _handleCheckOut : _handleCheckIn,
        style: ElevatedButton.styleFrom(
          backgroundColor: btnColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 4,
          shadowColor: btnColor.withValues(alpha: 0.45),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isIn ? Icons.logout_rounded : Icons.location_on_rounded,
              size: 22,
            ),
            const SizedBox(width: 10),
            Text(
              isIn ? 'TAP TO CHECK OUT' : 'TAP TO CHECK IN',
              style: GoogleFonts.poppins(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.8,
              ),
            ),
            if (!isIn) ...[
              const SizedBox(width: 8),
              const Icon(Icons.camera_alt_rounded, size: 18),
            ],
          ],
        ),
      ),
    );
  }

  // ─── Leaves Section ─────────────────────────────────────────────────────────

  Widget _leaveSection(AttendanceProvider attendance) {
    final s = attendance.leaveSummary;
    final items = <(String, LeaveBalance, Color)>[
      ('Casual', s.casual, const Color(0xFF1565C0)),
      ('Medical', s.medical, const Color(0xFF2E7D32)),
      ('Extra Ordinary', s.extraordinary, const Color(0xFF6A1B9A)),
      ('Annual', s.annual, const Color(0xFFE65100)),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionLabel('LEAVES SUMMARY'),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.92,
          children: List.generate(4, (i) {
            final label = items[i].$1;
            final balance = items[i].$2;
            final color = items[i].$3;
            return FadeTransition(
              opacity: _leaveCtrl[i],
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0, 0.3),
                  end: Offset.zero,
                ).animate(CurvedAnimation(
                  parent: _leaveCtrl[i],
                  curve: Curves.easeOutCubic,
                )),
                child: _leaveCard(label, balance, color),
              ),
            );
          }),
        ),
      ],
    );
  }

  Widget _leaveCard(String label, LeaveBalance balance, Color color) {
    final used = balance.used;
    final total = balance.total;
    final ratio = total > 0 ? (used / total).clamp(0.0, 1.0) : 0.0;
    final ringColor = used > 0 ? color : const Color(0xFFBDBDBD);
    final sublabel = used == 0
        ? '0 Used'
        : used == total
            ? 'Full'
            : '$used Used';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Progress ring
          SizedBox(
            width: 96,
            height: 96,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox.expand(
                  child: CircularProgressIndicator(
                    value: ratio,
                    backgroundColor: Colors.grey.shade100,
                    valueColor: AlwaysStoppedAnimation(ringColor),
                    strokeWidth: 7,
                    strokeCap: StrokeCap.round,
                  ),
                ),
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$used',
                      style: GoogleFonts.poppins(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF222222),
                        height: 1,
                      ),
                    ),
                    Text(
                      '/ $total',
                      style: GoogleFonts.roboto(
                        fontSize: 11,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF333333),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 2),
          Text(
            sublabel,
            style: GoogleFonts.roboto(
              fontSize: 11,
              color: Colors.grey.shade500,
            ),
          ),
        ],
      ),
    );
  }

  // ─── Announcements Card ──────────────────────────────────────────────────────

  Widget _announcementsCard() {
    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AnnouncementsScreen())),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF003D2E), Color(0xFF006B3F)], begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: const Color(0xFF006B3F).withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 4))],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.campaign_rounded, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Latest Announcements', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
                  Text('Tap to view all updates', style: GoogleFonts.roboto(color: Colors.white.withValues(alpha: 0.75), fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 16),
          ],
        ),
      ),
    );
  }

  // ─── Attendance Section ──────────────────────────────────────────────────────

  Widget _attendanceSection(AttendanceProvider attendance) {
    final records = attendance.records.take(3).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            _sectionLabel('RECENT ATTENDANCE'),
            TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const AttendanceHistoryScreen()),
              ),
              style: TextButton.styleFrom(
                foregroundColor: _blue,
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                'View All',
                style: GoogleFonts.roboto(
                  color: _blue,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  decoration: TextDecoration.underline,
                  decorationColor: _blue,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (attendance.isLoading && records.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(40),
              child: CircularProgressIndicator(),
            ),
          )
        else if (records.isEmpty)
          _emptyAttendance()
        else
          ...List.generate(records.length, (i) {
            return AnimatedBuilder(
              animation: _contentCtrl,
              builder: (ctx, child) {
                final delay = i * 0.18;
                final raw = (_contentCtrl.value - delay) / (1.0 - delay);
                final t = Curves.easeOut.transform(raw.clamp(0.0, 1.0));
                return Opacity(
                  opacity: t,
                  child: Transform.translate(
                    offset: Offset(0, 20.0 * (1 - t)),
                    child: child,
                  ),
                );
              },
              child: _attendanceCard(records[i]),
            );
          }),
      ],
    );
  }

  Widget _emptyAttendance() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(Icons.history_rounded, size: 44, color: Colors.grey.shade300),
          const SizedBox(height: 8),
          Text(
            'No attendance records yet',
            style: GoogleFonts.roboto(color: Colors.grey, fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _attendanceCard(AttendanceRecord record) {
    final isLate = record.isLate;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        elevation: 4,
        shadowColor: Colors.black.withValues(alpha: 0.08),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Date + badge
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _recordDate(record.date),
                      style: GoogleFonts.poppins(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF333333),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: isLate
                          ? Colors.orange.shade50
                          : Colors.green.shade50,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isLate
                            ? Colors.orange.shade300
                            : Colors.green.shade300,
                      ),
                    ),
                    child: Text(
                      isLate ? 'Late' : 'On Time',
                      style: GoogleFonts.roboto(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: isLate
                            ? Colors.orange.shade800
                            : Colors.green.shade700,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 10),
              const Divider(height: 1, color: Color(0xFFF0F0F0)),
              const SizedBox(height: 10),

              // Check-in / check-out times
              Row(
                children: [
                  _timeChip(
                    Icons.login_rounded,
                    'Check In',
                    _shortTime(record.checkInTime),
                    _blue,
                  ),
                  const Spacer(),
                  _timeChip(
                    Icons.logout_rounded,
                    'Check Out',
                    _shortTime(record.checkOutTime),
                    _green,
                  ),
                ],
              ),

              // Late reason
              if (isLate && record.lateReason != null) ...[
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline_rounded,
                        size: 13, color: Colors.red),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        record.lateReason!,
                        style: GoogleFonts.roboto(
                          fontSize: 11,
                          color: Colors.red.shade700,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ─── Shared Widgets ──────────────────────────────────────────────────────────

  Widget _timeChip(IconData icon, String label, String time, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: GoogleFonts.roboto(
                fontSize: 10,
                color: Colors.grey.shade500,
              ),
            ),
            Text(
              time,
              style: GoogleFonts.roboto(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _sectionLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.poppins(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: _green,
        letterSpacing: 0.5,
      ),
    );
  }

}

// ─── Checkout camera dialog ──────────────────────────────────────────────────

class _CheckOutCameraDialog extends StatefulWidget {
  final CameraController controller;
  const _CheckOutCameraDialog({required this.controller});

  @override
  State<_CheckOutCameraDialog> createState() => _CheckOutCameraDialogState();
}

class _CheckOutCameraDialogState extends State<_CheckOutCameraDialog> {
  static const _primary = Color(0xFF006B3F);

  Future<void> _capture() async {
    try {
      final xfile = await widget.controller.takePicture();
      if (mounted) Navigator.of(context).pop(xfile);
    } catch (_) {
      if (mounted) Navigator.of(context).pop(null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          CameraPreview(widget.controller),
          Positioned(
            top: 0, left: 0, right: 0,
            child: SafeArea(
              child: Container(
                color: Colors.black.withValues(alpha: 0.5),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.of(context).pop(null),
                    ),
                    Expanded(
                      child: Text(
                        'Check-Out Selfie',
                        style: GoogleFonts.poppins(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
              ),
            ),
          ),
          // Face guide oval
          Center(
            child: Container(
              width: 200,
              height: 240,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white.withValues(alpha: 0.6), width: 2),
                borderRadius: BorderRadius.circular(120),
              ),
            ),
          ),
          Positioned(
            bottom: 0, left: 0, right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 40),
                child: Column(
                  children: [
                    GestureDetector(
                      onTap: _capture,
                      child: Container(
                        width: 76, height: 76,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 4),
                          color: Colors.white.withValues(alpha: 0.2),
                        ),
                        child: Center(
                          child: Container(
                            width: 58, height: 58,
                            decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text('Capture Selfie', style: GoogleFonts.roboto(color: Colors.white70, fontSize: 12)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Pulsing glow rings for status circle ────────────────────────────────────

class _GlowPainter extends CustomPainter {
  final double value;
  final Color color;

  _GlowPainter(this.value, this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    const baseRadius = 92.0;

    for (int i = 0; i < 3; i++) {
      final t = (value + i / 3) % 1.0;
      final radius = baseRadius + t * 22;
      final opacity = (1.0 - t) * 0.14;
      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..color = color.withValues(alpha: opacity)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.5,
      );
    }
  }

  @override
  bool shouldRepaint(_GlowPainter old) =>
      old.value != value || old.color != color;
}

class _ShiftCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final String time;
  final VoidCallback onTap;

  const _ShiftCard({
    required this.label,
    required this.icon,
    required this.color,
    required this.time,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.3), width: 1.5),
        ),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(height: 12),
            Text(
              label,
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF1A1A1A),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              time,
              style: GoogleFonts.roboto(
                fontSize: 11,
                color: Colors.grey.shade500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
