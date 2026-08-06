"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Employee, PaginatedResponse } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Eye, Download, RefreshCw, ChevronLeft, ChevronRight, X, ArrowUpDown, ArrowLeftRight, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const DESIGNATIONS = [
  "All", "Deputy Director (Operations)", "Food Safety Officer", "Veterinary Specialist",
  "Dairy Technologist", "Assistant Food Safety Officer", "Senior Clerk", "Junior Clerk",
  "Driver", "Naib Qasid", "Junior Computer Operator", "Daak Rider", "Security Guard",
  "Chowkidar", "Sweeper", "Accountant", "Computer Operator", "IT Coordinator", "Analyst",
  "Lab Attendant", "Electrician", "Sanitary Worker", "IT Administrator",
  "Admin Trainee (Skilled-JCO)", "Admin Trainee (Skilled-DR)", "Admin Trainee (Skilled-EN)",
  "Admin Trainee (Unskilled)", "Consultant", "Food Safety Trainee Officer",
];
const LIMITS = [10, 25, 50];

type SortKey = "name" | "email" | "employeeCode" | "designation" | "department" | "createdAt";
type SortDir = "asc" | "desc";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timerRef = { current: undefined as any };
  const update = useCallback((v: T) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(v), delay);
  }, [delay]); // eslint-disable-line
  update(value);
  return debounced;
}

export default function EmployeesPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");

  const { data: departmentList = [] } = useQuery<string[]>({
    queryKey: ["employee-departments"],
    queryFn: () => api.get<string[]>("/employees/departments").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const [designation, setDesignation] = useState("All");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isExporting, setIsExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [transferTarget, setTransferTarget] = useState<Employee | null>(null);
  const [toDept, setToDept] = useState("");
  const [transferDate, setTransferDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [transferReason, setTransferReason] = useState("");

  const debouncedSearch = useDebounce(search, 400);

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(department !== "All" && { department }),
    ...(designation !== "All" && { designation }),
    ...(status !== "all" && { status }),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["employees", page, limit, debouncedSearch, department, designation, status],
    queryFn: () => api.get<PaginatedResponse<Employee>>(`/employees?${params}`).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  // Client-side sort only (designation filter is now server-side)
  const rows = [...(data?.data ?? [])]
    .sort((a, b) => {
      const av = (a[sortKey as keyof Employee] as string) ?? "";
      const bv = (b[sortKey as keyof Employee] as string) ?? "";
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      toast.success("Employee deleted");
      qc.invalidateQueries({ queryKey: ["employees"] });
      setDeleteTarget(null);
    },
    onError: () => toast.error("Delete failed"),
  });

  const transferMutation = useMutation({
    mutationFn: () =>
      api.post("/employee-transfers", {
        employeeId: transferTarget!.id,
        fromDepartment: transferTarget!.department ?? "Unknown",
        toDepartment: toDept,
        transferDate,
        reason: transferReason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Transfer request submitted — pending approval");
      setTransferTarget(null);
      setToDept("");
      setTransferReason("");
      qc.invalidateQueries({ queryKey: ["transfers-summary"] });
    },
    onError: () => toast.error("Failed to submit transfer request"),
  });

  function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toDept) { toast.error("Please select a destination department"); return; }
    if (toDept === transferTarget?.department) { toast.error("Destination must differ from current department"); return; }
    transferMutation.mutate();
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function clearFilters() {
    setSearch(""); setDepartment("All"); setDesignation("All"); setStatus("all"); setPage(1);
  }

  const hasFilters = search || department !== "All" || designation !== "All" || status !== "all";

  async function exportCSV() {
    setIsExporting(true);
    try {
      const exportParams = new URLSearchParams({
        page: "1",
        limit: "9999",
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(department !== "All" && { department }),
        ...(designation !== "All" && { designation }),
        ...(status !== "all" && { status }),
      });
      const res = await api.get<PaginatedResponse<Employee>>(`/employees?${exportParams}`);
      const all = res.data.data;
      const header = ["Employee ID", "Name", "Email", "Designation", "District", "Wing", "Mobile", "Status", "Joined"];
      const csvRows = all.map((e) => [
        e.employeeCode ?? "", e.name, e.email, e.designation ?? "",
        e.department || e.addressDistrict || "",
        e.wing ?? "", e.mobilePhone ?? "", e.active !== false ? "Active" : "Inactive",
        e.createdAt ? format(parseISO(e.createdAt), "yyyy-MM-dd") : "",
      ]);
      const csv = [header, ...csvRows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a"); a.href = url; a.download = `employees_${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`CSV exported — ${all.length} employees`);
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => (
    <ArrowUpDown className={`w-3 h-3 ml-1 inline ${sortKey === col ? "text-[#006B3F]" : "text-gray-300"}`} />
  );

  return (
    <DashboardLayout title="Employees">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Name, CNIC, phone, email..." className="pl-9 h-9 w-64" />
            </div>
            {/* Department */}
            <Select value={department} onValueChange={(v) => { if (v) { setDepartment(v); setPage(1); } }}>
              <SelectTrigger className="h-9 w-40 border-2 border-gray-300 hover:border-gray-400 focus-visible:border-[#006B3F] focus-visible:ring-2 focus-visible:ring-[#006B3F]/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Districts</SelectItem>
                {departmentList.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Designation */}
            <Select value={designation} onValueChange={(v) => { if (v) { setDesignation(v); setPage(1); } }}>
              <SelectTrigger className="h-9 w-40 border-2 border-gray-300 hover:border-gray-400 focus-visible:border-[#006B3F] focus-visible:ring-2 focus-visible:ring-[#006B3F]/20"><SelectValue /></SelectTrigger>
              <SelectContent>{DESIGNATIONS.map((d) => <SelectItem key={d} value={d}>{d === "All" ? "All Designations" : d}</SelectItem>)}</SelectContent>
            </Select>
            {/* Status */}
            <Select value={status} onValueChange={(v) => { if (v) { setStatus(v); setPage(1); } }}>
              <SelectTrigger className="h-9 w-32 border-2 border-gray-300 hover:border-gray-400 focus-visible:border-[#006B3F] focus-visible:ring-2 focus-visible:ring-[#006B3F]/20"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => refetch()}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 border-[#006B3F] text-[#006B3F] hover:bg-green-50" onClick={exportCSV} disabled={isExporting}>
              {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} CSV
            </Button>
            <Button onClick={() => router.push("/employees/add")} className="h-9 bg-[#006B3F] hover:bg-[#005530] text-white gap-1.5">
              <Plus className="w-4 h-4" /> Add Employee
            </Button>
          </div>
        </div>

        {/* Active filter badges */}
        {hasFilters && (
          <div className="flex gap-1.5 flex-wrap">
            {search && <Badge variant="outline" className="text-xs gap-1 bg-blue-50 border-blue-200 text-blue-700">Search: {search}<button onClick={() => setSearch("")}><X className="w-2.5 h-2.5" /></button></Badge>}
            {department !== "All" && <Badge variant="outline" className="text-xs gap-1 bg-purple-50 border-purple-200 text-purple-700">District: {department}<button onClick={() => setDepartment("All")}><X className="w-2.5 h-2.5" /></button></Badge>}
            {designation !== "All" && <Badge variant="outline" className="text-xs gap-1 bg-orange-50 border-orange-200 text-orange-700">Role: {designation}<button onClick={() => setDesignation("All")}><X className="w-2.5 h-2.5" /></button></Badge>}
            {status !== "all" && <Badge variant="outline" className="text-xs gap-1 bg-green-50 border-green-200 text-green-700">Status: {status}<button onClick={() => setStatus("all")}><X className="w-2.5 h-2.5" /></button></Badge>}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {isError && <p className="text-center py-10 text-red-500">Failed to load employees. <button className="underline" onClick={() => refetch()}>Retry</button></p>}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="text-xs font-semibold cursor-pointer select-none" onClick={() => toggleSort("employeeCode")}>
                    EMP ID <SortIcon col="employeeCode" />
                  </TableHead>
                  <TableHead className="text-xs font-semibold cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    Name <SortIcon col="name" />
                  </TableHead>
                  <TableHead className="text-xs font-semibold cursor-pointer select-none" onClick={() => toggleSort("email")}>
                    Email <SortIcon col="email" />
                  </TableHead>
                  <TableHead className="text-xs font-semibold cursor-pointer select-none" onClick={() => toggleSort("designation")}>
                    Designation <SortIcon col="designation" />
                  </TableHead>
                  <TableHead className="text-xs font-semibold cursor-pointer select-none" onClick={() => toggleSort("department")}>
                    District <SortIcon col="department" />
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Wing</TableHead>
                  <TableHead className="text-xs font-semibold">Mobile</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Search className="w-8 h-8 opacity-40" />
                        <p className="font-medium">No employees found</p>
                        {hasFilters && <button className="text-[#006B3F] text-sm underline" onClick={clearFilters}>Clear filters</button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((emp, i) => (
                    <TableRow key={emp.id} className={`hover:bg-green-50/30 transition-colors ${i % 2 !== 0 ? "bg-gray-50/30" : ""}`}>
                      <TableCell className="font-mono text-xs text-gray-500">{emp.employeeCode ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-[#006B3F] flex items-center justify-center shrink-0">
                            {emp.profilePhotoUrl
                              ? <img src={emp.profilePhotoUrl} alt={emp.name} className="w-full h-full object-cover" />
                              : <span className="text-white text-[10px] font-bold">{emp.name.slice(0, 2).toUpperCase()}</span>
                            }
                          </div>
                          <span className="text-sm font-medium">{emp.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{emp.email}</TableCell>
                      <TableCell className="text-sm text-gray-600">{emp.designation ?? "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{emp.department || emp.addressDistrict || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{emp.wing ?? "—"}</TableCell>
                      <TableCell className="text-sm text-gray-500 font-mono">{emp.mobilePhone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={emp.active !== false ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}>
                          {emp.active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-[#006B3F] hover:bg-green-50"
                            title="View Profile" onClick={() => router.push(`/employees/${emp.id}/profile`)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                            title="Transfer Employee"
                            onClick={() => {
                              setTransferTarget(emp);
                              setToDept("");
                              setTransferDate(format(new Date(), "yyyy-MM-dd"));
                              setTransferReason("");
                            }}>
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Edit" onClick={() => router.push(`/employees/${emp.id}/edit`)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete" onClick={() => setDeleteTarget(emp)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-gray-500 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs">Rows per page:</span>
            <Select value={String(limit)} onValueChange={(v) => { if (v) { setLimit(Number(v)); setPage(1); } }}>
              <SelectTrigger className="h-7 w-16 text-xs border-2 border-gray-300 hover:border-gray-400 focus-visible:border-[#006B3F] focus-visible:ring-[#006B3F]/20"><SelectValue /></SelectTrigger>
              <SelectContent>{LIMITS.map((l) => <SelectItem key={l} value={String(l)}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-xs">{total > 0 ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}` : "No results"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(1)}>«</Button>
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs px-2">Page {page} of {totalPages}</span>
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</Button>
          </div>
        </div>
      </div>

      {/* Transfer dialog */}
      <Dialog open={!!transferTarget} onOpenChange={(o) => !o && setTransferTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ArrowLeftRight size={16} className="text-[#006B3F]" />
              Transfer Employee
            </DialogTitle>
          </DialogHeader>

          {transferTarget && (
            <form onSubmit={handleTransferSubmit} className="space-y-4 mt-1">
              {/* Employee chip */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#006B3F]/10 flex items-center justify-center text-[#006B3F] text-sm font-bold shrink-0">
                  {transferTarget.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{transferTarget.name}</p>
                  <p className="text-xs text-gray-400">{transferTarget.employeeCode ?? transferTarget.id}</p>
                </div>
              </div>

              {/* From → To */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From</Label>
                  <input
                    readOnly
                    value={transferTarget.department ?? "Not set"}
                    className="w-full h-10 text-sm border border-gray-200 rounded-xl px-3 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div className="mb-[2px] flex items-center justify-center">
                  <ArrowRight size={16} className="text-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="toDeptList" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    To <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="toDeptList"
                    value={toDept}
                    onChange={(e) => setToDept(e.target.value)}
                    required
                    className="w-full h-10 text-sm border border-gray-200 rounded-xl px-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30 focus:border-[#006B3F]/50"
                  >
                    <option value="">Select dept…</option>
                    {departmentList.filter((d) => d !== transferTarget.department).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transfer date */}
              <div className="space-y-1.5">
                <Label htmlFor="transferDateList" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Transfer Date <span className="text-red-500">*</span>
                </Label>
                <input
                  id="transferDateList"
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  required
                  className="w-full h-10 text-sm border border-gray-200 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30 focus:border-[#006B3F]/50"
                />
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Reason <span className="text-gray-300 font-normal">(optional)</span>
                </Label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Departmental restructuring, employee request…"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30 focus:border-[#006B3F]/50"
                />
              </div>

              <DialogFooter className="gap-2 pt-1">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setTransferTarget(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={transferMutation.isPending}
                  className="bg-[#006B3F] hover:bg-[#005530] text-white rounded-xl gap-2"
                >
                  {transferMutation.isPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight size={14} />
                      Submit Transfer
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate <strong>{deleteTarget?.name}</strong> ({deleteTarget?.employeeCode}). Their attendance and leave records will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
