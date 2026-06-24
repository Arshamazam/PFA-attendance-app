import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/attendance_record.dart';
import '../providers/attendance_provider.dart';

class AttendanceHistoryScreen extends StatefulWidget {
  const AttendanceHistoryScreen({super.key});

  @override
  State<AttendanceHistoryScreen> createState() => _AttendanceHistoryScreenState();
}

class _AttendanceHistoryScreenState extends State<AttendanceHistoryScreen> {
  final _scrollCtrl = ScrollController();

  static const _primary = Color(0xFF006B3F);

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AttendanceProvider>().fetchDashboard();
    });
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollCtrl.position.pixels >= _scrollCtrl.position.maxScrollExtent - 200) {
      context.read<AttendanceProvider>().loadMoreRecords();
    }
  }

  String _formatFullDate(DateTime dt) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return '${days[dt.weekday - 1]}, ${dt.day} ${months[dt.month - 1]} ${dt.year}';
  }

  String _formatTime(DateTime? dt) {
    if (dt == null) return '--:--';
    final h = dt.hour > 12 ? dt.hour - 12 : dt.hour == 0 ? 12 : dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $period';
  }

  String _duration(AttendanceRecord record) {
    if (record.checkInTime == null || record.checkOutTime == null) return '';
    final diff = record.checkOutTime!.difference(record.checkInTime!);
    final h = diff.inHours;
    final m = diff.inMinutes % 60;
    return '${h}h ${m}m';
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AttendanceProvider>();
    final records = provider.records;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: _primary,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(
          'Attendance History',
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: records.isEmpty && provider.isLoading
          ? const Center(child: CircularProgressIndicator(color: _primary))
          : records.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.history_rounded, size: 64, color: Colors.grey.shade300),
                      const SizedBox(height: 12),
                      Text(
                        'No attendance records',
                        style: GoogleFonts.poppins(fontSize: 16, color: Colors.grey.shade400),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  controller: _scrollCtrl,
                  padding: const EdgeInsets.all(16),
                  itemCount: records.length + (provider.hasMore ? 1 : 0),
                  itemBuilder: (ctx, i) {
                    if (i == records.length) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 20),
                        child: Center(child: CircularProgressIndicator(color: _primary)),
                      );
                    }
                    return _recordCard(records[i]);
                  },
                ),
    );
  }

  Widget _recordCard(AttendanceRecord record) {
    final isLate = record.isLate;
    final isPresent = record.checkInTime != null;
    final dur = _duration(record);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isLate
                  ? Colors.orange.shade50
                  : isPresent
                      ? Colors.green.shade50
                      : Colors.red.shade50,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _formatFullDate(record.date),
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF333333),
                  ),
                ),
                _statusBadge(isPresent, isLate),
              ],
            ),
          ),

          // Time info
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                _timeBlock(
                  'CHECK IN',
                  _formatTime(record.checkInTime),
                  Icons.login_rounded,
                  Colors.green.shade600,
                ),
                Expanded(
                  child: dur.isNotEmpty
                      ? Column(
                          children: [
                            Icon(Icons.arrow_forward_rounded, color: Colors.grey.shade400, size: 18),
                            Text(
                              dur,
                              style: GoogleFonts.roboto(fontSize: 10, color: Colors.grey),
                            ),
                          ],
                        )
                      : Icon(Icons.more_horiz, color: Colors.grey.shade300),
                ),
                _timeBlock(
                  'CHECK OUT',
                  _formatTime(record.checkOutTime),
                  Icons.logout_rounded,
                  Colors.red.shade400,
                ),
              ],
            ),
          ),

          // Late reason
          if (isLate && record.lateReason != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(14)),
                border: Border(
                  top: BorderSide(color: Colors.orange.shade100),
                ),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, size: 14, color: Colors.orange.shade600),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Late reason: ${record.lateReason}'
                          '${record.lateReasonNotes != null && record.lateReasonNotes!.isNotEmpty ? " — ${record.lateReasonNotes}" : ""}',
                      style: GoogleFonts.roboto(
                        fontSize: 11,
                        color: Colors.orange.shade700,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _timeBlock(String label, String time, IconData icon, Color color) => Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(time,
              style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF222222))),
          const SizedBox(height: 2),
          Text(label, style: GoogleFonts.roboto(fontSize: 9, color: Colors.grey.shade500, letterSpacing: 0.5)),
        ],
      );

  Widget _statusBadge(bool isPresent, bool isLate) {
    final label = !isPresent ? 'Absent' : isLate ? 'Late' : 'On Time';
    final color = !isPresent
        ? Colors.red.shade600
        : isLate
            ? Colors.orange.shade700
            : Colors.green.shade700;
    final bg = !isPresent
        ? Colors.red.shade100
        : isLate
            ? Colors.orange.shade100
            : Colors.green.shade100;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        label,
        style: GoogleFonts.roboto(fontSize: 11, fontWeight: FontWeight.w700, color: color),
      ),
    );
  }
}
