"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowRight, ChevronLeft, ChevronRight, ArrowLeftRight, Search } from "lucide-react";
import { format, parseISO } from "date-fns";

const PFA_DISTRICTS = [
  "All", "LAHORE", "KASUR", "SHEIKHUPURA", "NANKANA", "FAISALABAD", "JHANG",
  "CHINIOT", "T.T.SINGH", "OKARA", "SAHIWAL", "PAKPATTAN", "MURREE",
  "RAWALPINDI", "ATTOCK", "CHAKWAL", "JHELUM", "GUJRANWALA", "GUJRAT",
  "M.B.DIN", "HAFIZABAD", "SIALKOT", "NAROWAL", "BHAKKAR", "MIANWALI",
  "KHUSHAB", "SARGODHA", "BAHAWALNAGAR", "BAHAWALPUR", "MULTAN", "LODHRAN",
  "KHANEWAL", "VEHARI", "R.Y.KHAN", "D.G.KHAN", "LAYYAH", "MUZAFFARGARH", "RAJANPUR",
];

const LIMIT = 20;

interface Transfer {
  id: string;
  fromDepartment: string;
  toDepartment: string;
  transferDate: string;
  reason?: string;
  status: string;
  createdAt: string;
  employee: { id: string; name: string; department?: string };
  approver?: { id: string; name: string } | null;
}

export default function TransfersPage() {
  const [page, setPage] = useState(1);
  const [district, setDistrict] = useState("All");
  const [search, setSearch] = useState("");

  const params = new URLSearchParams({
    page: String(page),
    limit: String(LIMIT),
    ...(district !== "All" && { department: district }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["transfers", page, district],
    queryFn: () => api.get<{ data: Transfer[]; total: number; page: number; limit: number }>(`/employee-transfers?${params}`).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const transfers = (data?.data ?? []).filter((t) =>
    search.trim() === "" || t.employee?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <DashboardLayout title="Transfer History">
      <div className="space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Total Transfers", value: total, color: "bg-blue-50 text-blue-600" },
            { label: "This Page", value: data?.data?.length ?? 0, color: "bg-purple-50 text-purple-600" },
            { label: "Completed", value: (data?.data ?? []).filter((t) => t.status === "Approved").length, color: "bg-green-50 text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <ArrowLeftRight className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search employee…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-56"
              />
            </div>
            <Select value={district} onValueChange={(v) => { if (v) { setDistrict(v); setPage(1); } }}>
              <SelectTrigger className="w-44 h-9 border-2 border-gray-300 hover:border-gray-400 focus-visible:border-[#006B3F] focus-visible:ring-2 focus-visible:ring-[#006B3F]/20">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                {PFA_DISTRICTS.map((d) => (
                  <SelectItem key={d} value={d}>{d === "All" ? "All Districts" : d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-gray-500 font-medium">{total} transfer{total !== 1 ? "s" : ""}</p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="text-xs font-semibold">Employee</TableHead>
                <TableHead className="text-xs font-semibold">From District</TableHead>
                <TableHead className="text-xs font-semibold w-6"></TableHead>
                <TableHead className="text-xs font-semibold">To District</TableHead>
                <TableHead className="text-xs font-semibold">Transfer Date</TableHead>
                <TableHead className="text-xs font-semibold">Transferred By</TableHead>
                <TableHead className="text-xs font-semibold">Reason</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-14 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <ArrowLeftRight className="w-8 h-8 opacity-30" />
                      <p className="font-medium">No transfers found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((t) => {
                  const initial = t.employee?.name?.[0]?.toUpperCase() ?? "?";
                  return (
                    <TableRow key={t.id} className="hover:bg-gray-50 transition-colors">
                      {/* Employee */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#006B3F] flex items-center justify-center shrink-0">
                            <span className="text-white text-[10px] font-bold">{initial}</span>
                          </div>
                          <span className="text-sm font-medium">{t.employee?.name ?? "—"}</span>
                        </div>
                      </TableCell>
                      {/* From */}
                      <TableCell>
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                          {t.fromDepartment}
                        </span>
                      </TableCell>
                      {/* Arrow */}
                      <TableCell className="px-0">
                        <ArrowRight className="w-4 h-4 text-gray-300" />
                      </TableCell>
                      {/* To */}
                      <TableCell>
                        <span className="text-sm text-[#006B3F] bg-green-50 px-2 py-0.5 rounded-md font-semibold">
                          {t.toDepartment}
                        </span>
                      </TableCell>
                      {/* Date */}
                      <TableCell className="text-sm text-gray-600">
                        {t.transferDate ? format(parseISO(t.transferDate), "dd MMM yyyy") : "—"}
                      </TableCell>
                      {/* Transferred by */}
                      <TableCell className="text-sm text-gray-600">
                        {t.approver?.name ?? "Admin"}
                      </TableCell>
                      {/* Reason */}
                      <TableCell className="text-sm text-gray-500 max-w-[160px]">
                        <p className="truncate">{t.reason ?? "—"}</p>
                      </TableCell>
                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            t.status === "Approved"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : t.status === "Rejected"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }
                        >
                          {t.status}
                        </Badge>
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
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="flex items-center px-3 h-8 border rounded-md text-xs">
              {page} / {totalPages}
            </span>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
