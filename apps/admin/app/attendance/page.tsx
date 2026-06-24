"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AttendanceRecord, PaginatedResponse } from "@/types";
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
import { toast } from "sonner";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";

const LIMIT = 20;

function duration(checkIn: string, checkOut: string | null) {
  if (!checkOut) return "—";
  const mins = differenceInMinutes(parseISO(checkOut), parseISO(checkIn));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function isLate(checkIn: string) {
  const dt = parseISO(checkIn);
  return dt.getHours() > 9 || (dt.getHours() === 9 && dt.getMinutes() > 0);
}

export default function AttendancePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const params = new URLSearchParams({
    page: String(page),
    limit: String(LIMIT),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", page, startDate, endDate],
    queryFn: () =>
      api
        .get<PaginatedResponse<AttendanceRecord>>(`/attendance/all?${params}`)
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  // Client-side search filter by employee name
  const records = (data?.data ?? []).filter((r) =>
    r.employee?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function exportCSV() {
    const rows = (data?.data ?? []).map((r) => [
      r.employee?.name ?? "",
      r.employee?.email ?? "",
      format(parseISO(r.checkInTime), "yyyy-MM-dd"),
      format(parseISO(r.checkInTime), "HH:mm:ss"),
      r.checkOutTime ? format(parseISO(r.checkOutTime), "HH:mm:ss") : "",
      duration(r.checkInTime, r.checkOutTime),
      isLate(r.checkInTime) ? "Late" : "On Time",
      r.geofenceZone?.name ?? "",
    ]);

    const header = ["Employee", "Email", "Date", "Check-In", "Check-Out", "Duration", "Status", "Zone"];
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${v}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  }

  return (
    <DashboardLayout title="Attendance">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-end justify-between">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Filter by employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-48"
              />
            </div>
            <div className="flex items-end gap-1">
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">From</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="h-9 text-sm w-36"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">To</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="h-9 text-sm w-36"
                />
              </div>
              {(startDate || endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            className="h-9 gap-2 border-[#006B3F] text-[#006B3F] hover:bg-green-50"
            onClick={exportCSV}
            disabled={(data?.data ?? []).length === 0}
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="text-xs font-semibold">Employee</TableHead>
                <TableHead className="text-xs font-semibold">Date</TableHead>
                <TableHead className="text-xs font-semibold">Check-In</TableHead>
                <TableHead className="text-xs font-semibold">Check-Out</TableHead>
                <TableHead className="text-xs font-semibold">Duration</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Zone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                    No attendance records found
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => {
                  const late = isLate(r.checkInTime);
                  return (
                    <TableRow key={r.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{r.employee?.name ?? "—"}</p>
                          <p className="text-xs text-gray-400">{r.employee?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(parseISO(r.checkInTime), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-gray-700">
                        {format(parseISO(r.checkInTime), "h:mm a")}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-gray-700">
                        {r.checkOutTime ? format(parseISO(r.checkOutTime), "h:mm a") : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {duration(r.checkInTime, r.checkOutTime)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            late
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : "bg-green-50 text-green-700 border-green-200"
                          }
                        >
                          {late ? "Late" : "On Time"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {r.geofenceZone?.name ?? "—"}
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
    </DashboardLayout>
  );
}
