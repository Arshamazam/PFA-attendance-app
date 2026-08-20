"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AttendanceRecord, PaginatedResponse } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Download, ChevronLeft, ChevronRight, Clock, Users, TrendingUp, AlertTriangle, RefreshCw, Camera } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO, differenceInMinutes } from "date-fns";

const LIMIT = 20;
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BACKEND}${url}`;
}

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

// Converts UTC ISO string → a Date whose LOCAL fields equal the PKT values,
// so date-fns format() produces correct PKT output regardless of browser timezone.
function toPKTLocal(iso: string): Date {
  const pkt = new Date(parseISO(iso).getTime() + PKT_OFFSET_MS);
  return new Date(pkt.getUTCFullYear(), pkt.getUTCMonth(), pkt.getUTCDate(),
                  pkt.getUTCHours(), pkt.getUTCMinutes(), pkt.getUTCSeconds());
}
function fmtPKT(iso: string, fmt: string) { return format(toPKTLocal(iso), fmt); }

function dur(checkIn: string, checkOut: string | null) {
  if (!checkOut) return "—";
  const mins = differenceInMinutes(parseISO(checkOut), parseISO(checkIn));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function isLate(checkIn: string) {
  const pkt = toPKTLocal(checkIn);
  return pkt.getHours() > 9 || (pkt.getHours() === 9 && pkt.getMinutes() > 30);
}

interface Stats { totalCheckIns: number; onTime: number; late: number; absent: number; avgCheckInTime: string; totalEmployees: number; }

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ontime" | "late">("all");
  const [photoRecord, setPhotoRecord] = useState<AttendanceRecord | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  // Debounce search input — waits 500ms after last keystroke before querying
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const statsQuery = useQuery<Stats>({
    queryKey: ["attendance-stats", today],
    queryFn: () => api.get(`/attendance/statistics?date=${today}`).then((r) => r.data as Stats),
    refetchInterval: 60_000,
  });

  const params = new URLSearchParams({
    page: String(page),
    limit: String(LIMIT),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(debouncedSearch && { search: debouncedSearch }),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["attendance", page, startDate, endDate, debouncedSearch],
    queryFn: () => api.get<PaginatedResponse<AttendanceRecord>>(`/attendance/all?${params}`).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const records = (data?.data ?? []).filter((r) => {
    if (statusFilter === "ontime") return !isLate(r.checkInTime);
    if (statusFilter === "late") return isLate(r.checkInTime);
    return true;
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function exportCSV() {
    const header = ["Employee", "Email", "Date", "Check-In", "Check-Out", "Duration", "Status", "Zone"];
    const rows = (data?.data ?? []).map((r) => [
      r.employee?.name ?? "", r.employee?.email ?? "",
      fmtPKT(r.checkInTime, "yyyy-MM-dd"),
      fmtPKT(r.checkInTime, "HH:mm:ss"),
      r.checkOutTime ? fmtPKT(r.checkOutTime, "HH:mm:ss") : "",
      dur(r.checkInTime, r.checkOutTime),
      isLate(r.checkInTime) ? "Late" : "On Time",
      r.geofenceZone?.name ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `attendance_${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url); toast.success("CSV exported");
  }

  async function exportExcel() {
    const xlsx = await import("xlsx");
    const header = ["Employee", "Email", "Date", "Check-In", "Check-Out", "Duration", "Status", "Zone"];
    const rows = (data?.data ?? []).map((r) => [
      r.employee?.name ?? "", r.employee?.email ?? "",
      fmtPKT(r.checkInTime, "yyyy-MM-dd"),
      fmtPKT(r.checkInTime, "HH:mm:ss"),
      r.checkOutTime ? fmtPKT(r.checkOutTime, "HH:mm:ss") : "",
      dur(r.checkInTime, r.checkOutTime),
      isLate(r.checkInTime) ? "Late" : "On Time",
      r.geofenceZone?.name ?? "",
    ]);

    const ws = xlsx.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = header.map((_, i) => ({ wch: i === 0 || i === 1 ? 20 : 15 }));
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Attendance");

    const s = statsQuery.data;
    if (s) {
      const ws2 = xlsx.utils.aoa_to_sheet([
        ["Metric", "Value"],
        ["Date", today], ["Total Check-Ins", s.totalCheckIns],
        ["On Time", s.onTime], ["Late", s.late], ["Absent", s.absent],
        ["Total Employees", s.totalEmployees], ["Avg Check-In", s.avgCheckInTime],
      ]);
      xlsx.utils.book_append_sheet(wb, ws2, "Summary");
    }
    xlsx.writeFile(wb, `attendance_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Excel exported");
  }

  const stats = statsQuery.data;

  return (
    <DashboardLayout title="Attendance">
      <div className="space-y-5">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={Users} label="Check-Ins Today" value={stats?.totalCheckIns ?? "—"} color="bg-blue-50 text-blue-600" />
          <StatCard icon={TrendingUp} label="On Time" value={stats?.onTime ?? "—"} color="bg-green-50 text-green-600" />
          <StatCard icon={AlertTriangle} label="Late" value={stats?.late ?? "—"} color="bg-orange-50 text-orange-600" />
          <StatCard icon={Users} label="Absent" value={stats?.absent ?? "—"} color="bg-red-50 text-red-600" />
          <StatCard icon={Clock} label="Avg Check-In" value={stats?.avgCheckInTime ?? "—"} color="bg-purple-50 text-purple-600" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-end justify-between">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Filter by employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-48" />
            </div>
            <div className="flex items-end gap-1">
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">From</Label>
                <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="h-9 text-sm w-36" />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">To</Label>
                <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="h-9 text-sm w-36" />
              </div>
              {(startDate || endDate) && <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}>Clear</Button>}
            </div>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden h-9">
              {(["all", "ontime", "late"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 text-xs font-medium transition-colors ${statusFilter === s ? "bg-[#006B3F] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  {s === "all" ? "All" : s === "ontime" ? "On Time" : "Late"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={() => refetch()}><RefreshCw className="w-3.5 h-3.5" /></Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 border-[#006B3F] text-[#006B3F] hover:bg-green-50" onClick={exportCSV} disabled={!data?.data?.length}>
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button size="sm" className="h-9 gap-1.5 bg-[#006B3F] hover:bg-[#005530] text-white" onClick={exportExcel} disabled={!data?.data?.length}>
              <Download className="w-3.5 h-3.5" /> Excel
            </Button>
          </div>
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
                <TableHead className="text-xs font-semibold">Photos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((__, j) => (<TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>))}</TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-400">No records found</TableCell></TableRow>
              ) : (
                records.map((r, i) => {
                  const late = isLate(r.checkInTime);
                  return (
                    <TableRow key={r.id} className={`hover:bg-gray-50 ${i % 2 !== 0 ? "bg-gray-50/40" : ""}`}>
                      <TableCell>
                        <p className="text-sm font-medium">{r.employee?.name ?? "—"}</p>
                        <p className="text-xs text-gray-400">{r.employee?.email}</p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{fmtPKT(r.checkInTime, "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-sm font-mono text-gray-700">{fmtPKT(r.checkInTime, "h:mm a")}</TableCell>
                      <TableCell className="text-sm font-mono text-gray-700">{r.checkOutTime ? fmtPKT(r.checkOutTime, "h:mm a") : <span className="text-gray-300">—</span>}</TableCell>
                      <TableCell className="text-sm text-gray-600">{dur(r.checkInTime, r.checkOutTime)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={late ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-green-50 text-green-700 border-green-200"}>
                          {late ? "Late" : "On Time"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{r.geofenceZone?.name ?? "—"}</TableCell>
                      <TableCell>
                        {(r.checkInPhotoUrl || r.checkOutPhotoUrl) ? (
                          <button
                            onClick={() => setPhotoRecord(r)}
                            className="flex items-center gap-1 text-xs text-[#006B3F] hover:underline"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            {r.checkInPhotoUrl && r.checkOutPhotoUrl ? "2" : "1"}
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
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
      {/* Photo Viewer Modal */}
      <Dialog open={!!photoRecord} onOpenChange={(o) => !o && setPhotoRecord(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#006B3F]">
              <Camera className="w-4 h-4" />
              Attendance Photos — {photoRecord?.employee?.name ?? ""}
              <span className="text-xs font-normal text-gray-400 ml-1">
                {photoRecord?.checkInTime ? fmtPKT(photoRecord.checkInTime, "dd MMM yyyy") : ""}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Check-in · {photoRecord?.checkInTime ? fmtPKT(photoRecord.checkInTime, "h:mm a") : "—"}
              </p>
              {resolveUrl(photoRecord?.checkInPhotoUrl) ? (
                <div className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveUrl(photoRecord?.checkInPhotoUrl)!}
                    alt="Check-in photo"
                    className="w-full rounded-xl border border-gray-200 object-cover max-h-64"
                  />
                  <a
                    href={resolveUrl(photoRecord?.checkInPhotoUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Open full
                  </a>
                </div>
              ) : (
                <div className="h-40 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
                  No photo
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Check-out · {photoRecord?.checkOutTime ? fmtPKT(photoRecord.checkOutTime, "h:mm a") : "Not checked out"}
              </p>
              {resolveUrl(photoRecord?.checkOutPhotoUrl) ? (
                <div className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveUrl(photoRecord?.checkOutPhotoUrl)!}
                    alt="Check-out photo"
                    className="w-full rounded-xl border border-gray-200 object-cover max-h-64"
                  />
                  <a
                    href={resolveUrl(photoRecord?.checkOutPhotoUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Open full
                  </a>
                </div>
              ) : (
                <div className="h-40 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
                  No photo
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
