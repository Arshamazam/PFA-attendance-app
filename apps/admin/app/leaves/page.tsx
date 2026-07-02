"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { LeaveRequest, PaginatedResponse } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, CheckCircle2, XCircle, Eye, ChevronLeft, ChevronRight, CalendarCheck, Clock, CheckCheck, XCircle as XIcon } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

const LIMIT = 20;

function statusBadge(status: string) {
  const styles = { approved: "bg-green-50 text-green-700 border-green-200", rejected: "bg-red-50 text-red-700 border-red-200", pending: "bg-yellow-50 text-yellow-700 border-yellow-200" };
  return <Badge variant="outline" className={styles[status as keyof typeof styles] ?? styles.pending}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

function rowBg(status: string) {
  if (status === "pending") return "bg-yellow-50/30";
  if (status === "approved") return "bg-green-50/20";
  if (status === "rejected") return "bg-red-50/20";
  return "";
}

export default function LeavesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [viewTarget, setViewTarget] = useState<LeaveRequest | null>(null);
  const [actionTarget, setActionTarget] = useState<{ leave: LeaveRequest; action: "approve" | "reject" } | null>(null);
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const endpoint = statusFilter === "pending"
    ? `/leave/pending?page=${page}&limit=${LIMIT}`
    : `/leave/my-requests?page=${page}&limit=${LIMIT}`;

  const { data, isLoading } = useQuery({
    queryKey: ["leaves", page, statusFilter],
    queryFn: () => api.get<PaginatedResponse<LeaveRequest>>(endpoint).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  // Stat counts
  const { data: pendingCount } = useQuery({
    queryKey: ["leaves-pending-count"],
    queryFn: () => api.get<PaginatedResponse<LeaveRequest>>("/leave/pending?limit=1").then((r) => r.data.total),
  });

  const filtered = (data?.data ?? []).filter((l) => l.employee?.name?.toLowerCase().includes(search.toLowerCase()));
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const approveMutation = useMutation({
    mutationFn: ({ id, approvalNotes }: { id: string; approvalNotes?: string }) =>
      api.patch(`/leave/${id}/approve`, { approvalNotes }),
    onSuccess: () => {
      toast.success("Leave request approved");
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["leaves-pending-count"] });
      setActionTarget(null); setNotes("");
    },
    onError: () => toast.error("Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason: string }) =>
      api.patch(`/leave/${id}/reject`, { rejectionReason }),
    onSuccess: () => {
      toast.success("Leave request rejected");
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["leaves-pending-count"] });
      setActionTarget(null); setRejectionReason("");
    },
    onError: () => toast.error("Failed to reject"),
  });

  const handleConfirm = () => {
    if (!actionTarget) return;
    if (actionTarget.action === "approve") {
      approveMutation.mutate({ id: actionTarget.leave.id, approvalNotes: notes });
    } else {
      if (!rejectionReason.trim()) { toast.error("Rejection reason is required"); return; }
      rejectMutation.mutate({ id: actionTarget.leave.id, rejectionReason });
    }
  };

  return (
    <DashboardLayout title="Leave Approvals">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Clock, label: "Pending Requests", value: pendingCount ?? "—", color: "bg-yellow-50 text-yellow-600" },
            { icon: CalendarCheck, label: "Total This Page", value: total, color: "bg-blue-50 text-blue-600" },
            { icon: CheckCheck, label: "Approved (page)", value: (data?.data ?? []).filter((l) => l.status === "approved").length, color: "bg-green-50 text-green-600" },
            { icon: XIcon, label: "Rejected (page)", value: (data?.data ?? []).filter((l) => l.status === "rejected").length, color: "bg-red-50 text-red-600" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
              <div><p className="text-xs text-gray-400 font-medium">{label}</p><p className="text-2xl font-bold text-gray-900 mt-1">{value}</p></div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search by employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-52" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { if (v) { setStatusFilter(v); setPage(1); } }}>
              <SelectTrigger className="w-32 h-9 border-2 border-gray-300 hover:border-gray-400 focus-visible:border-[#006B3F] focus-visible:ring-2 focus-visible:ring-[#006B3F]/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-gray-500 font-medium">{total} request{total !== 1 ? "s" : ""}</p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="text-xs font-semibold">Employee</TableHead>
                <TableHead className="text-xs font-semibold">Type</TableHead>
                <TableHead className="text-xs font-semibold">Period</TableHead>
                <TableHead className="text-xs font-semibold">Days</TableHead>
                <TableHead className="text-xs font-semibold">Reason</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => (<TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>))}</TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-400">No leave requests found</TableCell></TableRow>
              ) : (
                filtered.map((leave) => {
                  const days = differenceInCalendarDays(parseISO(leave.endDate), parseISO(leave.startDate)) + 1;
                  return (
                    <TableRow key={leave.id} className={`hover:bg-gray-50 transition-colors ${rowBg(leave.status)}`}>
                      <TableCell>
                        <p className="text-sm font-medium">{leave.employee?.name ?? "—"}</p>
                        <p className="text-xs text-gray-400">{leave.employee?.email}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">{leave.leaveType}</Badge></TableCell>
                      <TableCell className="text-sm text-gray-600">{format(parseISO(leave.startDate), "dd MMM")} – {format(parseISO(leave.endDate), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-sm font-medium">{days}d</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[180px]"><p className="truncate">{leave.reason}</p></TableCell>
                      <TableCell>{statusBadge(leave.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-gray-600" title="View" onClick={() => setViewTarget(leave)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {leave.status === "pending" && (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" title="Approve" onClick={() => { setActionTarget({ leave, action: "approve" }); setNotes(""); }}>
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" title="Reject" onClick={() => { setActionTarget({ leave, action: "reject" }); setRejectionReason(""); }}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total > 0 ? `Showing ${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} of ${total}` : "No records"}</span>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="flex items-center px-3 h-8 border rounded-md text-xs">{page} / {totalPages}</span>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {/* View Details */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-[#006B3F]">Leave Request Details</DialogTitle></DialogHeader>
          {viewTarget && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Employee", viewTarget.employee?.name],
                  ["Leave Type", viewTarget.leaveType],
                  ["Status", viewTarget.status.toUpperCase()],
                  ["Start Date", format(parseISO(viewTarget.startDate), "dd MMM yyyy")],
                  ["End Date", format(parseISO(viewTarget.endDate), "dd MMM yyyy")],
                  ["Duration", `${differenceInCalendarDays(parseISO(viewTarget.endDate), parseISO(viewTarget.startDate)) + 1} day(s)`],
                  ["Submitted", format(parseISO(viewTarget.createdAt), "dd MMM yyyy, h:mm a")],
                ].map(([label, value]) => (
                  <div key={label}><p className="text-xs text-gray-400">{label}</p><p className="font-medium">{value}</p></div>
                ))}
              </div>
              <div><Label className="text-xs text-gray-400">Reason</Label><p className="text-sm mt-1">{viewTarget.reason}</p></div>
              {viewTarget.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1 bg-[#006B3F] hover:bg-[#005530] text-white gap-2" onClick={() => { setViewTarget(null); setActionTarget({ leave: viewTarget, action: "approve" }); setNotes(""); }}>
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </Button>
                  <Button variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-2" onClick={() => { setViewTarget(null); setActionTarget({ leave: viewTarget, action: "reject" }); setRejectionReason(""); }}>
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Modal */}
      <Dialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className={actionTarget?.action === "approve" ? "text-[#006B3F]" : "text-red-600"}>
              {actionTarget?.action === "approve" ? "Approve Leave Request" : "Reject Leave Request"}
            </DialogTitle>
          </DialogHeader>
          {actionTarget && (
            <div className="space-y-4 pt-2">
              {/* Leave summary */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-gray-400">Employee:</span> <strong>{actionTarget.leave.employee?.name}</strong></p>
                <p><span className="text-gray-400">Period:</span> {format(parseISO(actionTarget.leave.startDate), "dd MMM")} – {format(parseISO(actionTarget.leave.endDate), "dd MMM yyyy")}</p>
                <p><span className="text-gray-400">Type:</span> {actionTarget.leave.leaveType}</p>
                <p><span className="text-gray-400">Reason:</span> {actionTarget.leave.reason}</p>
              </div>

              {actionTarget.action === "approve" ? (
                <div className="space-y-1">
                  <Label className="text-sm">Approval Notes <span className="text-gray-400 text-xs">(optional)</span></Label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500}
                    placeholder="Add any notes for the employee..." rows={3}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#006B3F]" />
                  <p className="text-xs text-gray-400 text-right">{notes.length}/500</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-sm">Rejection Reason <span className="text-red-500">*</span></Label>
                  <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} maxLength={500}
                    placeholder="Please provide reason for rejection..." rows={3}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-red-400" />
                  <p className="text-xs text-gray-400 text-right">{rejectionReason.length}/500</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setActionTarget(null)}>Cancel</Button>
                <Button className={`flex-1 text-white ${actionTarget.action === "approve" ? "bg-[#006B3F] hover:bg-[#005530]" : "bg-red-600 hover:bg-red-700"}`}
                  disabled={approveMutation.isPending || rejectMutation.isPending} onClick={handleConfirm}>
                  {approveMutation.isPending || rejectMutation.isPending ? "Processing..." : actionTarget.action === "approve" ? "Approve" : "Reject"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
