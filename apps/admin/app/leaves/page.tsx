"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { LeaveRequest, PaginatedResponse } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, CheckCircle2, XCircle, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

const LIMIT = 20;

function statusBadge(status: string) {
  return (
    <Badge
      variant="outline"
      className={
        status === "approved"
          ? "bg-green-50 text-green-700 border-green-200"
          : status === "rejected"
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-yellow-50 text-yellow-700 border-yellow-200"
      }
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function LeavesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [viewTarget, setViewTarget] = useState<LeaveRequest | null>(null);
  const [actionTarget, setActionTarget] = useState<{
    leave: LeaveRequest;
    action: "approve" | "reject";
  } | null>(null);

  const endpoint =
    statusFilter === "pending"
      ? `/leave/pending?page=${page}&limit=${LIMIT}`
      : `/leave/my-requests?page=${page}&limit=${LIMIT}`;

  const { data, isLoading } = useQuery({
    queryKey: ["leaves", page, statusFilter],
    queryFn: () =>
      api.get<PaginatedResponse<LeaveRequest>>(endpoint).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const filtered = (data?.data ?? []).filter((l) =>
    l.employee?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/leave/${id}/approve`),
    onSuccess: () => {
      toast.success("Leave request approved");
      qc.invalidateQueries({ queryKey: ["leaves"] });
      setActionTarget(null);
    },
    onError: () => toast.error("Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/leave/${id}/reject`),
    onSuccess: () => {
      toast.success("Leave request rejected");
      qc.invalidateQueries({ queryKey: ["leaves"] });
      setActionTarget(null);
    },
    onError: () => toast.error("Failed to reject"),
  });

  return (
    <DashboardLayout title="Leave Approvals">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-52"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => { if (v) { setStatusFilter(v); setPage(1); } }}
            >
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-gray-500 font-medium">
            {total} {statusFilter === "pending" ? "pending" : "total"} request{total !== 1 ? "s" : ""}
          </p>
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
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                    No leave requests found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((leave) => {
                  const days =
                    differenceInCalendarDays(
                      parseISO(leave.endDate),
                      parseISO(leave.startDate)
                    ) + 1;
                  return (
                    <TableRow key={leave.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {leave.employee?.name ?? "—"}
                          </p>
                          <p className="text-xs text-gray-400">{leave.employee?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          {leave.leaveType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(parseISO(leave.startDate), "dd MMM")} –{" "}
                        {format(parseISO(leave.endDate), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-[#333333]">
                        {days}d
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[180px]">
                        <p className="truncate">{leave.reason}</p>
                      </TableCell>
                      <TableCell>{statusBadge(leave.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            title="View Details"
                            onClick={() => setViewTarget(leave)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {leave.status === "pending" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Approve"
                                onClick={() =>
                                  setActionTarget({ leave, action: "approve" })
                                }
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Reject"
                                onClick={() =>
                                  setActionTarget({ leave, action: "reject" })
                                }
                              >
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
          <span>
            {total > 0
              ? `Showing ${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} of ${total}`
              : "No records"}
          </span>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="flex items-center px-3 h-8 border rounded-md text-xs">
              {page} / {totalPages}
            </span>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#006B3F]">Leave Request Details</DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Employee", viewTarget.employee?.name],
                  ["Email", viewTarget.employee?.email],
                  ["Leave Type", viewTarget.leaveType],
                  ["Status", viewTarget.status.toUpperCase()],
                  ["Start Date", format(parseISO(viewTarget.startDate), "dd MMM yyyy")],
                  ["End Date", format(parseISO(viewTarget.endDate), "dd MMM yyyy")],
                  [
                    "Duration",
                    `${differenceInCalendarDays(parseISO(viewTarget.endDate), parseISO(viewTarget.startDate)) + 1} day(s)`,
                  ],
                  ["Submitted", format(parseISO(viewTarget.createdAt), "dd MMM yyyy, h:mm a")],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-medium text-[#333333]">{value}</p>
                  </div>
                ))}
              </div>
              <div>
                <Label className="text-xs text-gray-500">Reason</Label>
                <p className="text-sm text-[#333333] mt-1 leading-relaxed">
                  {viewTarget.reason}
                </p>
              </div>
              {viewTarget.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-[#006B3F] hover:bg-[#005530] text-white gap-2"
                    disabled={approveMutation.isPending}
                    onClick={() => {
                      setViewTarget(null);
                      setActionTarget({ leave: viewTarget, action: "approve" });
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-2"
                    onClick={() => {
                      setViewTarget(null);
                      setActionTarget({ leave: viewTarget, action: "reject" });
                    }}
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Confirm Modal */}
      <Dialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className={actionTarget?.action === "approve" ? "text-[#006B3F]" : "text-red-600"}>
              {actionTarget?.action === "approve" ? "Approve Leave Request" : "Reject Leave Request"}
            </DialogTitle>
          </DialogHeader>
          {actionTarget && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-600">
                {actionTarget.action === "approve" ? "Approve" : "Reject"} leave request for{" "}
                <strong>{actionTarget.leave.employee?.name}</strong> (
                {format(parseISO(actionTarget.leave.startDate), "dd MMM")} –{" "}
                {format(parseISO(actionTarget.leave.endDate), "dd MMM yyyy")})?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setActionTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  className={`flex-1 text-white ${
                    actionTarget.action === "approve"
                      ? "bg-[#006B3F] hover:bg-[#005530]"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  onClick={() => {
                    if (actionTarget.action === "approve") {
                      approveMutation.mutate(actionTarget.leave.id);
                    } else {
                      rejectMutation.mutate(actionTarget.leave.id);
                    }
                  }}
                >
                  {approveMutation.isPending || rejectMutation.isPending
                    ? "Processing..."
                    : actionTarget.action === "approve"
                    ? "Approve"
                    : "Reject"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
