import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class PerformanceGoalsScreen extends StatefulWidget {
  const PerformanceGoalsScreen({super.key});

  @override
  State<PerformanceGoalsScreen> createState() => _PerformanceGoalsScreenState();
}

class _PerformanceGoalsScreenState extends State<PerformanceGoalsScreen> {
  static const _green = Color(0xFF006B3F);
  List<Map<String, dynamic>> _goals = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final goals = await context.read<ApiService>().getMyPerformanceGoals();
      setState(() { _goals = goals; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'Completed': return Colors.grey;
      case 'On Track': return _green;
      case 'At Risk': return Colors.red;
      default: return Colors.blue;
    }
  }

  Color _progressColor(int pct) => pct >= 80 ? _green : pct >= 50 ? Colors.orange : Colors.red;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: _green,
        foregroundColor: Colors.white,
        title: Text('My Goals', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600)),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: _green))
          : _goals.isEmpty
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.flag_outlined, size: 56, color: Colors.grey.shade300),
                  const SizedBox(height: 12),
                  Text('No performance goals assigned', style: GoogleFonts.roboto(color: Colors.grey)),
                ]))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _goals.length,
                  itemBuilder: (_, i) {
                    final g = _goals[i];
                    final pct = (g['percentage'] as num?)?.toInt() ?? 0;
                    final status = g['status'] as String? ?? 'In Progress';
                    return Card(
                      elevation: 2,
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(child: Text(g['goalTitle'] as String? ?? '', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600))),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(color: _statusColor(status).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10), border: Border.all(color: _statusColor(status).withValues(alpha: 0.4))),
                                  child: Text(status, style: GoogleFonts.roboto(fontSize: 11, color: _statusColor(status), fontWeight: FontWeight.w600)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: LinearProgressIndicator(
                                      value: pct / 100,
                                      minHeight: 8,
                                      backgroundColor: Colors.grey.shade200,
                                      valueColor: AlwaysStoppedAnimation(_progressColor(pct)),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Text('$pct%', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w700, color: _progressColor(pct))),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('${g['currentProgress']} / ${g['targetValue']}', style: GoogleFonts.roboto(fontSize: 12, color: Colors.grey.shade500)),
                                Text('Due: ${g['endDate'] != null ? DateTime.parse(g['endDate'] as String).toLocal().toString().split(' ').first : '—'}', style: GoogleFonts.roboto(fontSize: 12, color: Colors.grey.shade500)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
