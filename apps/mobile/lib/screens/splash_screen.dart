import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'home_screen.dart';
import 'login_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _entryCtrl;
  late final AnimationController _glowCtrl;
  late final AnimationController _shimmerCtrl;
  late final AnimationController _exitCtrl;

  late final Animation<double> _logoFade;
  late final Animation<double> _logoScale;
  late final Animation<double> _textFade;
  late final Animation<Offset> _textSlide;
  late final Animation<double> _govtFade;
  late final Animation<double> _shimmerAnim;
  late final Animation<double> _exitFade;

  final _bgPainter = _BackgroundPainter();

  @override
  void initState() {
    super.initState();

    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
    ));

    _entryCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );
    _glowCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat();
    _shimmerCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    )..repeat();
    _exitCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _logoFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entryCtrl,
        curve: const Interval(0.0, 0.42, curve: Curves.easeOut),
      ),
    );
    _logoScale = Tween<double>(begin: 0.72, end: 1.0).animate(
      CurvedAnimation(
        parent: _entryCtrl,
        curve: const Interval(0.0, 0.55, curve: Curves.easeOutBack),
      ),
    );
    _textFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entryCtrl,
        curve: const Interval(0.42, 0.82, curve: Curves.easeOut),
      ),
    );
    _textSlide = Tween<Offset>(
      begin: const Offset(0, 0.45),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _entryCtrl,
        curve: const Interval(0.42, 0.88, curve: Curves.easeOutCubic),
      ),
    );
    _govtFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entryCtrl,
        curve: const Interval(0.72, 1.0, curve: Curves.easeOut),
      ),
    );
    _shimmerAnim = Tween<double>(begin: -1.6, end: 1.6).animate(
      CurvedAnimation(parent: _shimmerCtrl, curve: Curves.easeInOut),
    );
    _exitFade = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _exitCtrl, curve: Curves.easeIn),
    );

    _entryCtrl.forward();

    // Load stored session concurrently with the animation
    final authProvider = context.read<AuthProvider>();
    authProvider.loadStoredSession();

    Future.delayed(const Duration(milliseconds: 3400), () async {
      if (!mounted) return;
      await _exitCtrl.forward();
      if (!mounted) return;
      final destination = authProvider.isAuthenticated
          ? const HomeScreen()
          : const LoginScreen();
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (ctx, anim, sec) => destination,
          transitionDuration: Duration.zero,
        ),
      );
    });
  }

  @override
  void dispose() {
    _entryCtrl.dispose();
    _glowCtrl.dispose();
    _shimmerCtrl.dispose();
    _exitCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: FadeTransition(
        opacity: _exitFade,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Subtle background pattern
            CustomPaint(painter: _bgPainter),

            // Main content
            SafeArea(
              child: Column(
                children: [
                  const Spacer(flex: 2),

                  // Logo + pulsing glow rings
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      AnimatedBuilder(
                        animation: _glowCtrl,
                        builder: (ctx, child) => CustomPaint(
                          size: const Size(260, 260),
                          painter: _GlowPainter(_glowCtrl.value),
                        ),
                      ),
                      FadeTransition(
                        opacity: _logoFade,
                        child: ScaleTransition(
                          scale: _logoScale,
                          child: Container(
                            width: 152,
                            height: 152,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(30),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF006B3F)
                                      .withValues(alpha: 0.20),
                                  blurRadius: 44,
                                  spreadRadius: 12,
                                  offset: const Offset(0, 12),
                                ),
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.07),
                                  blurRadius: 18,
                                  offset: const Offset(0, 5),
                                ),
                              ],
                            ),
                            padding: const EdgeInsets.all(20),
                            child: Image.asset(
                              'assets/images/pfa_logo.png',
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 38),

                  // Text content
                  SlideTransition(
                    position: _textSlide,
                    child: FadeTransition(
                      opacity: _textFade,
                      child: Column(
                        children: [
                          // Shimmer title
                          AnimatedBuilder(
                            animation: _shimmerAnim,
                            builder: (ctx, child) => ShaderMask(
                              blendMode: BlendMode.srcIn,
                              shaderCallback: (bounds) => LinearGradient(
                                begin: Alignment(_shimmerAnim.value - 1, 0),
                                end: Alignment(_shimmerAnim.value + 1, 0),
                                colors: const [
                                  Color(0xFF004D2E),
                                  Color(0xFF006B3F),
                                  Color(0xFF00A651),
                                  Color(0xFF006B3F),
                                  Color(0xFF004D2E),
                                ],
                                stops: const [0.0, 0.28, 0.5, 0.72, 1.0],
                              ).createShader(bounds),
                              child: Text(
                                'PFA Attendance',
                                style: GoogleFonts.poppins(
                                  fontSize: 30,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF006B3F),
                                  letterSpacing: -0.5,
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 6),

                          Text(
                            'Punjab Food Authority',
                            style: GoogleFonts.poppins(
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                              color: const Color(0xFF3A3A3A),
                              letterSpacing: 0.2,
                            ),
                          ),

                          const SizedBox(height: 10),

                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFF006B3F)
                                  .withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: const Color(0xFF006B3F)
                                    .withValues(alpha: 0.15),
                              ),
                            ),
                            child: Text(
                              'Smart Attendance Management',
                              style: GoogleFonts.roboto(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF006B3F),
                                letterSpacing: 0.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const Spacer(flex: 3),
                ],
              ),
            ),

            // Government of Punjab footer
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: FadeTransition(
                opacity: _govtFade,
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 22, top: 6),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Divider(
                          color: Colors.grey.withValues(alpha: 0.22),
                          indent: 52,
                          endIndent: 52,
                          thickness: 1,
                        ),
                        const SizedBox(height: 14),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            // Govt logo in green circle (screen blend converts
                            // black background to match the container colour)
                            Container(
                              width: 50,
                              height: 50,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: Color(0xFF006B3F),
                              ),
                              child: ClipOval(
                                child: Padding(
                                  padding: const EdgeInsets.all(7),
                                  child: Image.asset(
                                    'assets/images/govt_logo.png',
                                    fit: BoxFit.contain,
                                    color: const Color(0xFF006B3F),
                                    colorBlendMode: BlendMode.screen,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Government of Punjab',
                                  style: GoogleFonts.roboto(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF222222),
                                    letterSpacing: 0.2,
                                  ),
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  'حکومت پنجاب',
                                  style: GoogleFonts.roboto(
                                    fontSize: 12,
                                    color: const Color(0xFF666666),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Background pattern painter ───────────────────────────────────────────────

class _BackgroundPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF006B3F).withValues(alpha: 0.055)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..strokeCap = StrokeCap.round;

    const spacing = 76.0;
    final cols = (size.width / spacing).ceil() + 2;
    final rows = (size.height / spacing).ceil() + 2;

    for (int r = 0; r < rows; r++) {
      for (int c = 0; c < cols; c++) {
        final x = c * spacing + (r.isOdd ? spacing * 0.5 : 0);
        final y = r * spacing;
        final center = Offset(x, y);
        final idx = (r * 3 + c) % 3;
        if (idx == 0) {
          _drawFork(canvas, paint, center);
        } else if (idx == 1) {
          _drawMagnifier(canvas, paint, center);
        } else {
          _drawShield(canvas, paint, center);
        }
      }
    }
  }

  void _drawFork(Canvas canvas, Paint p, Offset c) {
    canvas.drawLine(c + const Offset(0, -14), c + const Offset(0, 14), p);
    canvas.drawLine(c + const Offset(-5, -14), c + const Offset(-5, -7), p);
    canvas.drawLine(c + const Offset(5, -14), c + const Offset(5, -7), p);
    canvas.drawArc(
      Rect.fromCenter(
          center: c + const Offset(0, -7), width: 10, height: 7),
      0, math.pi, false, p,
    );
  }

  void _drawMagnifier(Canvas canvas, Paint p, Offset c) {
    canvas.drawCircle(c + const Offset(-3, -3), 9, p);
    canvas.drawLine(c + const Offset(4, 4), c + const Offset(11, 11), p);
  }

  void _drawShield(Canvas canvas, Paint p, Offset c) {
    final path = Path()
      ..moveTo(c.dx, c.dy - 13)
      ..lineTo(c.dx + 9, c.dy - 8)
      ..lineTo(c.dx + 9, c.dy + 2)
      ..quadraticBezierTo(c.dx + 9, c.dy + 9, c.dx, c.dy + 14)
      ..quadraticBezierTo(c.dx - 9, c.dy + 9, c.dx - 9, c.dy + 2)
      ..lineTo(c.dx - 9, c.dy - 8)
      ..close();
    canvas.drawPath(path, p);
    // checkmark inside
    final cp = Paint()
      ..color = p.color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..strokeCap = StrokeCap.round;
    final check = Path()
      ..moveTo(c.dx - 4, c.dy + 1)
      ..lineTo(c.dx - 1, c.dy + 5)
      ..lineTo(c.dx + 5, c.dy - 3);
    canvas.drawPath(check, cp);
  }

  @override
  bool shouldRepaint(_BackgroundPainter old) => false;
}

// ─── Pulsing glow rings painter ───────────────────────────────────────────────

class _GlowPainter extends CustomPainter {
  final double value;
  _GlowPainter(this.value);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    const baseR = 86.0;

    for (int i = 0; i < 3; i++) {
      final t = (value + i / 3) % 1.0;
      final radius = baseR + t * 40;
      final opacity = (1.0 - t) * 0.18;
      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..color = const Color(0xFF006B3F).withValues(alpha: opacity)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0,
      );
    }
  }

  @override
  bool shouldRepaint(_GlowPainter old) => old.value != value;
}
