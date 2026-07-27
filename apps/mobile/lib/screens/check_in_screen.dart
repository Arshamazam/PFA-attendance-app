import 'dart:async';
import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../models/geofence_zone.dart';
import '../providers/attendance_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/geofence_provider.dart';

enum _Step { locating, validating, verified, outsideZone, camera, reviewing, submitting }

class CheckInScreen extends StatefulWidget {
  const CheckInScreen({super.key});

  @override
  State<CheckInScreen> createState() => _CheckInScreenState();
}

class _CheckInScreenState extends State<CheckInScreen> {
  _Step _step = _Step.locating;
  Position? _position;
  GeofenceZone? _matchedZone;
  CameraController? _cameraCtrl;
  XFile? _photo;
  String? _errorMessage;
  bool _isExempted = false;
  int _verificationScore = 0;

  // Fallback to image_picker when no physical camera (e.g. simulator)
  bool _usePickerFallback = false;

  static const _primary = Color(0xFF006B3F);

  @override
  void initState() {
    super.initState();
    _startFlow();
  }

  @override
  void dispose() {
    _cameraCtrl?.dispose();
    super.dispose();
  }

  // ─── Flow steps ─────────────────────────────────────────────────────────────

  Future<void> _startFlow() async {
    setState(() { _step = _Step.locating; _isExempted = false; });
    try {
      // 1. Ensure location permission
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }

      // 2. Get current position (best-effort — exempted employees don't strictly need it)
      Position? position;
      if (perm != LocationPermission.denied && perm != LocationPermission.deniedForever) {
        try {
          // High accuracy (GPS) with 10s timeout — can be slow indoors
          position = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.high,
              timeLimit: Duration(seconds: 10),
            ),
          );
        } catch (_) {
          // GPS timed out — try medium accuracy (WiFi/cell towers) for a current fix
          try {
            position = await Geolocator.getCurrentPosition(
              locationSettings: const LocationSettings(
                accuracy: LocationAccuracy.medium,
                timeLimit: Duration(seconds: 8),
              ),
            );
          } catch (_) {
            // Medium also failed — last known position as absolute last resort
            // (may be stale but better than nothing)
            position = await Geolocator.getLastKnownPosition();
          }
        }
      }
      _position = position;

      // 3. Fetch live geofence status (requiresGeofence + current geofenceZoneIds)
      if (!mounted) return;
      setState(() => _step = _Step.validating);
      final employeeId = context.read<AuthProvider>().user?.id;
      bool requiresGeofence = true;
      List<String> liveZoneIds = [];
      if (employeeId != null) {
        try {
          final status = await context.read<AttendanceProvider>().api.getGeofenceStatus(employeeId);
          requiresGeofence = status['requiresGeofence'] as bool? ?? true;
          liveZoneIds = (status['geofenceZoneIds'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ?? [];
        } catch (_) {
          requiresGeofence = true; // fail safe: require geofence if check fails
        }
      }

      if (!requiresGeofence) {
        // Exempted — skip geofence validation entirely
        _isExempted = true;
        await _initCamera();
        if (!mounted) return;
        setState(() => _step = _Step.camera);
        return;
      }

      // 4. Not exempted — enforce location permission
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        setState(() {
          _errorMessage = 'Location permission is required to check in.\nPlease enable it in Settings.';
          _step = _Step.outsideZone;
        });
        return;
      }
      if (position == null) {
        setState(() {
          _errorMessage = 'Could not get your location. Please try again.';
          _step = _Step.outsideZone;
        });
        return;
      }

      // 5. Validate geofence zone using live zone IDs (not stale cached user data)
      final geofenceProvider = context.read<GeofenceProvider>();
      await geofenceProvider.fetchGeofences();
      if (!mounted) return;

      // If no zones are assigned to this employee yet, show a clear message
      if (liveZoneIds.isEmpty) {
        setState(() {
          _errorMessage = 'No office zone has been assigned to your profile.\nPlease contact your administrator.';
          _step = _Step.outsideZone;
        });
        return;
      }

      final matched = geofenceProvider.matchingZone(
        position.latitude,
        position.longitude,
        allowedZoneIds: liveZoneIds,
      );
      if (matched == null) {
        setState(() {
          _errorMessage = 'You are outside your assigned office zone.\nPlease go to your designated office location to check in.';
          _step = _Step.outsideZone;
        });
        return;
      }
      _matchedZone = matched;

      // 6. Compute verification score (UI only — backend enforces)
      int score = 60; // in boundary
      final accuracy = position.accuracy;
      if (accuracy <= 10) score += 40;
      else if (accuracy <= 20) score += 30;
      else if (accuracy <= 50) score += 15;
      else score += 5;
      _verificationScore = score;

      // 7. Show verified step briefly, then init camera
      if (!mounted) return;
      setState(() => _step = _Step.verified);
      await Future.delayed(const Duration(milliseconds: 1500));

      // 8. Init camera
      await _initCamera();
      if (!mounted) return;
      setState(() => _step = _Step.camera);
    } catch (e) {
      setState(() {
        _errorMessage = 'Error: ${e.toString()}';
        _step = _Step.outsideZone;
      });
    }
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        _usePickerFallback = true;
        return;
      }
      final front = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );
      _cameraCtrl = CameraController(front, ResolutionPreset.high, enableAudio: false);
      await _cameraCtrl!.initialize();
    } catch (_) {
      _cameraCtrl?.dispose();
      _cameraCtrl = null;
      _usePickerFallback = true;
    }
  }

  Future<void> _capturePhoto() async {
    if (_usePickerFallback) {
      final picker = ImagePicker();
      final image = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
      if (image != null) setState(() { _photo = image; _step = _Step.reviewing; });
      return;
    }
    try {
      final xfile = await _cameraCtrl!.takePicture();
      setState(() { _photo = xfile; _step = _Step.reviewing; });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Camera error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _retakePhoto() {
    setState(() { _photo = null; _step = _Step.camera; });
  }

  void _confirmPhoto() {
    final now = DateTime.now();
    final cutoff = DateTime(now.year, now.month, now.day, 9, 0);
    if (now.isAfter(cutoff)) {
      _showLateReasonModal();
    } else {
      _submit();
    }
  }

  Future<void> _showLateReasonModal() async {
    String selectedReason = 'Traffic';
    final notesCtrl = TextEditingController();

    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            left: 24,
            right: 24,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Icon(Icons.access_time, color: Colors.orange, size: 22),
                  const SizedBox(width: 8),
                  Text(
                    'Late Arrival Reason',
                    style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Your check-in time is after 9:00 AM. Please provide a reason.',
                style: GoogleFonts.roboto(fontSize: 12, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 20),
              DropdownButtonFormField<String>(
                initialValue: selectedReason,
                decoration: InputDecoration(
                  labelText: 'Reason',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: _primary),
                  ),
                ),
                items: ['Traffic', 'Personal', 'Medical', 'Other']
                    .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                    .toList(),
                onChanged: (v) => setModal(() => selectedReason = v!),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: notesCtrl,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: 'Additional notes (optional)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: _primary),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop({'reason': selectedReason, 'notes': notesCtrl.text}),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text('Submit Check-In', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ),
      ),
    );

    if (result != null && mounted) {
      await _submit(lateReason: result['reason'], lateReasonNotes: result['notes']);
    }
  }

  Future<void> _submit({String? lateReason, String? lateReasonNotes}) async {
    setState(() => _step = _Step.submitting);
    try {
      await context.read<AttendanceProvider>().checkIn(
        latitude: _position?.latitude ?? 0,
        longitude: _position?.longitude ?? 0,
        gpsAccuracy: _position?.accuracy,
        geofenceZoneId: _isExempted ? null : _matchedZone?.id,
        lateReason: lateReason,
        lateReasonNotes: lateReasonNotes,
        photoPath: _photo?.path,
      );
      if (!mounted) return;
      final now = DateTime.now();
      final h = now.hour > 12 ? now.hour - 12 : now.hour == 0 ? 12 : now.hour;
      final m = now.minute.toString().padLeft(2, '0');
      final period = now.hour >= 12 ? 'PM' : 'AM';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Checked in at $h:$m $period'),
          backgroundColor: _primary,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Check-in failed: $e'),
          backgroundColor: Colors.red.shade700,
          behavior: SnackBarBehavior.floating,
        ),
      );
      setState(() => _step = _Step.camera);
    }
  }

  // ─── UI builders ─────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: switch (_step) {
        _Step.locating => _buildLoading('Getting your location...'),
        _Step.validating => _buildLoading('Validating office location...'),
        _Step.verified => _buildVerified(),
        _Step.outsideZone => _buildError(),
        _Step.camera => _buildCamera(),
        _Step.reviewing => _buildReview(),
        _Step.submitting => _buildLoading('Submitting attendance...'),
      },
    );
  }

  Widget _buildLoading(String message) => SafeArea(
        child: Column(
          children: [
            _backBar(),
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const CircularProgressIndicator(color: _primary),
                    const SizedBox(height: 20),
                    Text(
                      message,
                      style: GoogleFonts.roboto(color: Colors.white70, fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );

  Widget _buildVerified() => SafeArea(
        child: Column(
          children: [
            _backBar(),
            Expanded(
              child: Container(
                color: Colors.white,
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: const BoxDecoration(
                        color: Color(0xFFE6F4EE),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.verified_rounded, color: _primary, size: 44),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Location Verified',
                      style: GoogleFonts.poppins(
                          fontSize: 20, fontWeight: FontWeight.w700, color: const Color(0xFF222222)),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _matchedZone?.name ?? 'Office Zone',
                      style: GoogleFonts.roboto(fontSize: 14, color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 24),
                    // Score ring
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 96,
                          height: 96,
                          child: CircularProgressIndicator(
                            value: _verificationScore / 100,
                            strokeWidth: 8,
                            backgroundColor: Colors.grey.shade200,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              _verificationScore >= 80
                                  ? _primary
                                  : _verificationScore >= 50
                                      ? Colors.orange
                                      : Colors.red.shade400,
                            ),
                          ),
                        ),
                        Column(
                          children: [
                            Text(
                              '$_verificationScore',
                              style: GoogleFonts.poppins(
                                  fontSize: 22, fontWeight: FontWeight.w800, color: _primary),
                            ),
                            Text('/ 100',
                                style: GoogleFonts.roboto(fontSize: 11, color: Colors.grey)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'GPS Accuracy Score',
                      style: GoogleFonts.roboto(fontSize: 12, color: Colors.grey.shade500),
                    ),
                    const SizedBox(height: 8),
                    if (_position != null)
                      Text(
                        'Accuracy: ±${_position!.accuracy.toStringAsFixed(0)}m',
                        style: GoogleFonts.roboto(
                            fontSize: 11, color: Colors.grey.shade400, fontStyle: FontStyle.italic),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );

  Widget _buildError() => SafeArea(
        child: Column(
          children: [
            _backBar(light: false),
            Expanded(
              child: Container(
                color: Colors.white,
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.location_off_rounded, color: Colors.red.shade400, size: 40),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Check-In Failed',
                      style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w700, color: const Color(0xFF222222)),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _errorMessage ?? 'An error occurred.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.roboto(fontSize: 14, color: Colors.grey.shade600, height: 1.5),
                    ),
                    const SizedBox(height: 36),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        onPressed: _startFlow,
                        icon: const Icon(Icons.refresh_rounded),
                        label: Text('Retry', style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 15)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      child: Text('Cancel', style: GoogleFonts.roboto(color: Colors.grey)),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );

  Widget _buildCamera() {
    // Fallback UI when no real camera is available
    if (_usePickerFallback || _cameraCtrl == null || !_cameraCtrl!.value.isInitialized) {
      return SafeArea(
        child: Column(
          children: [
            _backBar(),
            Expanded(
              child: Container(
                color: Colors.black87,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.camera_alt_outlined, size: 80, color: Colors.white.withValues(alpha: 0.4)),
                      const SizedBox(height: 16),
                      Text(
                        'Camera not available\non this device/simulator',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.roboto(color: Colors.white60, fontSize: 14),
                      ),
                      if (_isExempted) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.orange.withValues(alpha: 0.9),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.shield_outlined, color: Colors.white, size: 14),
                              const SizedBox(width: 6),
                              Text('Geofence Exempted',
                                style: GoogleFonts.roboto(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 32),
                      ElevatedButton.icon(
                        onPressed: _capturePhoto,
                        icon: const Icon(Icons.photo_library_outlined),
                        label: Text('Select from Gallery', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        // Full-screen camera preview
        CameraPreview(_cameraCtrl!),

        // Top bar
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              color: Colors.black.withValues(alpha: 0.4),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
                    onPressed: () => Navigator.of(context).pop(false),
                  ),
                  Expanded(
                    child: Text(
                      'Take a Selfie',
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

        // Zone indicator (or exemption badge)
        Positioned(
          top: 80,
          left: 0,
          right: 0,
          child: Center(
            child: _isExempted
                ? Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.shield_outlined, color: Colors.white, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          'Geofence Exempted',
                          style: GoogleFonts.roboto(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  )
                : Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(
                      color: _primary.withValues(alpha: 0.85),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.location_on, color: Colors.white, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          _matchedZone?.name ?? 'Office',
                          style: GoogleFonts.roboto(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
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

        // Capture button
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 40),
              child: Column(
                children: [
                  GestureDetector(
                    onTap: _capturePhoto,
                    child: Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 4),
                        color: Colors.white.withValues(alpha: 0.2),
                      ),
                      child: Center(
                        child: Container(
                          width: 58,
                          height: 58,
                          decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Capture Selfie',
                    style: GoogleFonts.roboto(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildReview() => Stack(
        fit: StackFit.expand,
        children: [
          // Photo preview
          if (_photo != null)
            Image.file(File(_photo!.path), fit: BoxFit.cover),

          // Overlay gradient
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.black.withValues(alpha: 0.5), Colors.transparent, Colors.black.withValues(alpha: 0.7)],
              ),
            ),
          ),

          // Top bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Text(
                  'Review Photo',
                  style: GoogleFonts.poppins(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),

          // Bottom buttons
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _retakePhoto,
                        icon: const Icon(Icons.replay, color: Colors.white),
                        label: Text('Retake', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _confirmPhoto,
                        icon: const Icon(Icons.check_circle_outline),
                        label: Text('Confirm', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      );

  Widget _backBar({bool light = true}) => Container(
        color: Colors.transparent,
        child: SafeArea(
          child: Row(
            children: [
              IconButton(
                icon: Icon(
                  Icons.arrow_back_ios_new,
                  color: light ? Colors.white : const Color(0xFF333333),
                ),
                onPressed: () => Navigator.of(context).pop(false),
              ),
            ],
          ),
        ),
      );
}
