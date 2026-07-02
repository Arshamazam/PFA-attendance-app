import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/leave_request.dart';
import '../providers/leave_approvals_provider.dart';

class LeaveApprovalsScreen extends StatefulWidget {
  const LeaveApprovalsScreen({super.key});

  @override
  State<LeaveApprovalsScreen> createState() => _LeaveApprovalsScreenState();
}

class _LeaveApprovalsScreenState extends State<LeaveApprovalsScreen>
    with SingleTickerProviderStateMixin {
  static const _green = Color(0xFF006B3F);
  static const _red = Color(0xFFC62828);

  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LeaveApprovalsProvider>().fetchAll();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // ─── Date helpers ────────────────────────────────────────────────────────────

  String _fmtDate(String isoDate) {
    final dt = DateTime.tryParse(isoDate);
    if (dt == null) return isoDate;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
  }

  String _fmtDateTime(DateTime dt) {
    final h = dt.hour > 12 ? dt.hour - 12 : dt.hour == 0 ? 12 : dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
    final p = dt.hour >= 12 ? 'PM' : 'AM';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}  $h:$m $p';
  }

  // ─── Approve flow ────────────────────────────────────────────────────────────

  void _confirmApprove(LeaveRequest leave) {
    showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Approve Leave?', style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(leave.employeeName ?? 'Employee',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 4),
            Text(
              '${leave.leaveType} · ${_fmtDate(leave.startDate)} → ${_fmtDate(leave.endDate)} (${leave.days} ${leave.days == 1 ? 'day' : 'days'})',
              style: GoogleFonts.roboto(fontSize: 13, color: Colors.grey.shade700),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: GoogleFonts.roboto(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: _green,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Approve', style: GoogleFonts.roboto(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    ).then((confirmed) async {
      if (confirmed != true || !mounted) return;
      try {
        await context.read<LeaveApprovalsProvider>().approve(leave.id);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('✓ Leave approved for ${leave.employeeName}'),
          backgroundColor: _green,
          behavior: SnackBarBehavior.floating,
        ));
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Failed: $e'),
          backgroundColor: _red,
          behavior: SnackBarBehavior.floating,
        ));
      }
    });
  }

  // ─── Reject flow ─────────────────────────────────────────────────────────────

  void _confirmReject(LeaveRequest leave) {
    final reasonCtrl = TextEditingController();
    showDialog<String>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Reject Leave?', style: GoogleFonts.poppins(fontWeight: FontWeight.w700)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(leave.employeeName ?? 'Employee',
                  style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(height: 12),
              Text('Reason for rejection *',
                  style: GoogleFonts.roboto(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
              const SizedBox(height: 6),
              TextField(
                controller: reasonCtrl,
                maxLines: 3,
                maxLength: 200,
                decoration: InputDecoration(
                  hintText: 'e.g. Insufficient coverage during this period',
                  hintStyle: GoogleFonts.roboto(fontSize: 13, color: Colors.grey.shade400),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: _red),
                  ),
                  contentPadding: const EdgeInsets.all(10),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('Cancel', style: GoogleFonts.roboto(color: Colors.grey.shade600)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _red,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                if (reasonCtrl.text.trim().isEmpty) {
                  ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
                    content: Text('Please enter a rejection reason'),
                    duration: Duration(seconds: 2),
                  ));
                  return;
                }
                Navigator.pop(ctx, reasonCtrl.text.trim());
              },
              child: Text('Reject', style: GoogleFonts.roboto(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    ).then((reason) async {
      if (reason == null || reason.isEmpty || !mounted) return;
      try {
        await context.read<LeaveApprovalsProvider>().reject(leave.id, reason);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Leave rejected for ${leave.employeeName}'),
          backgroundColor: _red,
          behavior: SnackBarBehavior.floating,
        ));
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Failed: $e'),
          backgroundColor: Colors.grey.shade700,
          behavior: SnackBarBehavior.floating,
        ));
      }
    });
  }

  // ─── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LeaveApprovalsProvider>();
    final pendingCount = provider.pending.length;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Container(
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 12, 0),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'LEAVE APPROVALS',
                                style: GoogleFonts.poppins(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: _green,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              if (pendingCount > 0)
                                Text(
                                  '$pendingCount pending request${pendingCount == 1 ? '' : 's'}',
                                  style: GoogleFonts.roboto(
                                    fontSize: 12,
                                    color: Colors.orange.shade700,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: Icon(
                            Icons.refresh_rounded,
                            color: provider.isLoading ? _green.withValues(alpha: 0.4) : _green,
                          ),
                          onPressed: provider.isLoading ? null : () => provider.fetchAll(),
                          tooltip: 'Refresh',
                        ),
                      ],
                    ),
                  ),
                  TabBar(
                    controller: _tabController,
                    labelColor: _green,
                    unselectedLabelColor: Colors.grey.shade500,
                    indicatorColor: _green,
                    indicatorWeight: 2.5,
                    labelStyle: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600),
                    unselectedLabelStyle: GoogleFonts.roboto(fontSize: 12),
                    tabs: [
                      Tab(text: pendingCount > 0 ? 'Pending ($pendingCount)' : 'Pending'),
                      Tab(text: 'Approved (${provider.approved.length})'),
                      Tab(text: 'Rejected (${provider.rejected.length})'),
                    ],
                  ),
                ],
              ),
            ),

            // Content
            Expanded(
              child: provider.isLoading &&
                      provider.pending.isEmpty &&
                      provider.approved.isEmpty &&
                      provider.rejected.isEmpty
                  ? const Center(child: CircularProgressIndicator(color: _green))
                  : provider.errorMessage != null &&
                          provider.pending.isEmpty &&
                          provider.approved.isEmpty
                      ? _errorView(provider)
                      : TabBarView(
                          controller: _tabController,
                          children: [
                            _pendingTab(provider),
                            _historyTab(provider.approved, approved: true),
                            _historyTab(provider.rejected, approved: false),
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────

  Widget _errorView(LeaveApprovalsProvider provider) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: Colors.red.shade300),
          const SizedBox(height: 12),
          Text(
            provider.errorMessage!,
            style: GoogleFonts.roboto(color: Colors.grey),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => provider.fetchAll(),
            style: ElevatedButton.styleFrom(backgroundColor: _green, foregroundColor: Colors.white),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  // ─── Pending Tab ─────────────────────────────────────────────────────────────

  Widget _pendingTab(LeaveApprovalsProvider provider) {
    if (provider.pending.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.of(context).size.height * 0.2),
          Column(
            children: [
              Icon(Icons.done_all_rounded, size: 64, color: Colors.grey.shade300),
              const SizedBox(height: 16),
              Text(
                'No pending leave requests',
                style: GoogleFonts.poppins(color: Colors.grey.shade500, fontSize: 15),
              ),
              const SizedBox(height: 6),
              Text(
                'All caught up!',
                style: GoogleFonts.roboto(color: Colors.grey.shade400, fontSize: 13),
              ),
            ],
          ),
        ],
      );
    }

    return RefreshIndicator(
      color: _green,
      onRefresh: () => provider.fetchAll(),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: provider.pending.length,
        itemBuilder: (_, i) => _PendingCard(
          leave: provider.pending[i],
          fmtDate: _fmtDate,
          onApprove: () => _confirmApprove(provider.pending[i]),
          onReject: () => _confirmReject(provider.pending[i]),
        ),
      ),
    );
  }

  // ─── History Tab ─────────────────────────────────────────────────────────────

  Widget _historyTab(List<LeaveRequest> items, {required bool approved}) {
    if (items.isEmpty) {
      return Center(
        child: Text(
          approved ? 'No approved requests yet' : 'No rejected requests yet',
          style: GoogleFonts.roboto(color: Colors.grey.shade500),
        ),
      );
    }

    return RefreshIndicator(
      color: _green,
      onRefresh: () => context.read<LeaveApprovalsProvider>().fetchAll(),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: items.length,
        itemBuilder: (_, i) => _HistoryCard(
          leave: items[i],
          approved: approved,
          fmtDate: _fmtDate,
          fmtDateTime: _fmtDateTime,
        ),
      ),
    );
  }
}

// ─── Pending Leave Card ───────────────────────────────────────────────────────

class _PendingCard extends StatelessWidget {
  final LeaveRequest leave;
  final String Function(String) fmtDate;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  static const _green = Color(0xFF006B3F);
  static const _red = Color(0xFFC62828);

  const _PendingCard({
    required this.leave,
    required this.fmtDate,
    required this.onApprove,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    final initial = (leave.employeeName?.isNotEmpty == true)
        ? leave.employeeName![0].toUpperCase()
        : '?';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        elevation: 2,
        shadowColor: Colors.black.withValues(alpha: 0.08),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Employee row
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFF006B3F),
                    ),
                    child: Center(
                      child: Text(
                        initial,
                        style: GoogleFonts.poppins(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          leave.employeeName ?? '—',
                          style: GoogleFonts.poppins(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            color: const Color(0xFF222222),
                          ),
                        ),
                        Text(
                          [leave.employeeDesignation, leave.employeeDepartment]
                              .where((s) => s != null && s.isNotEmpty)
                              .join(' · '),
                          style: GoogleFonts.roboto(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.orange.shade200),
                    ),
                    child: Text(
                      'PENDING',
                      style: GoogleFonts.roboto(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: Colors.orange.shade700,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),
              const Divider(height: 1, color: Color(0xFFF0F0F0)),
              const SizedBox(height: 12),

              // Leave details row
              Row(
                children: [
                  _detail(
                    label: 'Type',
                    value: leave.leaveType,
                    color: _green,
                  ),
                  const SizedBox(width: 24),
                  _detail(
                    label: 'Duration',
                    value: '${leave.days} ${leave.days == 1 ? 'day' : 'days'}',
                  ),
                ],
              ),
              const SizedBox(height: 8),
              _detail(
                label: 'Period',
                value: '${fmtDate(leave.startDate)}  →  ${fmtDate(leave.endDate)}',
              ),
              const SizedBox(height: 8),
              _detail(label: 'Reason', value: leave.reason),

              const SizedBox(height: 14),

              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onReject,
                      icon: const Icon(Icons.close_rounded, size: 16),
                      label: Text('Reject', style: GoogleFonts.roboto(fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: _red,
                        side: const BorderSide(color: _red),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: onApprove,
                      icon: const Icon(Icons.check_rounded, size: 16),
                      label: Text('Approve', style: GoogleFonts.roboto(fontWeight: FontWeight.w700)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _green,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        elevation: 0,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detail({required String label, required String value, Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label,
            style: GoogleFonts.roboto(fontSize: 11, color: Colors.grey.shade500)),
        Text(value,
            style: GoogleFonts.roboto(
              fontSize: 13,
              color: color ?? const Color(0xFF333333),
              fontWeight: color != null ? FontWeight.w600 : FontWeight.w400,
            )),
      ],
    );
  }
}

// ─── History Card ─────────────────────────────────────────────────────────────

class _HistoryCard extends StatelessWidget {
  final LeaveRequest leave;
  final bool approved;
  final String Function(String) fmtDate;
  final String Function(DateTime) fmtDateTime;

  const _HistoryCard({
    required this.leave,
    required this.approved,
    required this.fmtDate,
    required this.fmtDateTime,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = approved ? const Color(0xFF4CAF50) : const Color(0xFFF44336);
    final statusBg = approved ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE);
    final statusIcon = approved ? Icons.check_circle_rounded : Icons.cancel_rounded;
    final statusText = approved ? 'Approved' : 'Rejected';
    final initial = (leave.employeeName?.isNotEmpty == true)
        ? leave.employeeName![0].toUpperCase()
        : '?';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        elevation: 1,
        shadowColor: Colors.black.withValues(alpha: 0.06),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: statusColor.withValues(alpha: 0.15),
                ),
                child: Center(
                  child: Text(
                    initial,
                    style: GoogleFonts.poppins(
                      color: statusColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            leave.employeeName ?? '—',
                            style: GoogleFonts.poppins(
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              color: const Color(0xFF222222),
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: statusBg,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(statusIcon, size: 12, color: statusColor),
                              const SizedBox(width: 4),
                              Text(
                                statusText,
                                style: GoogleFonts.roboto(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: statusColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${leave.leaveType} · ${fmtDate(leave.startDate)} → ${fmtDate(leave.endDate)} (${leave.days} ${leave.days == 1 ? 'day' : 'days'})',
                      style: GoogleFonts.roboto(fontSize: 12, color: Colors.grey.shade600),
                    ),
                    if (!approved && leave.rejectionReason != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Reason: ${leave.rejectionReason}',
                        style: GoogleFonts.roboto(
                          fontSize: 11,
                          color: Colors.red.shade700,
                          fontStyle: FontStyle.italic,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    if (leave.approvedAt != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        fmtDateTime(leave.approvedAt!),
                        style: GoogleFonts.roboto(fontSize: 11, color: Colors.grey.shade400),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
