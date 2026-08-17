"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Users, Search, Shield, ShieldOff, X, RefreshCw,
  ChevronLeft, ChevronRight, Filter, ChevronDown,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Employee {
  id: string; name: string; email: string; role: string;
  department?: string; designation?: string; employmentStatus?: string;
  requiresGeofence: boolean; geofenceExemptReason?: string;
  geofenceExemptedAt?: string; profilePhotoUrl?: string;
  active?: boolean; employeeCode?: string; mobilePhone?: string;
}

const PAGE_SIZE = 50;

// ── Exemption Reason Modal ────────────────────────────────────────────────────
function ExemptModal({
  employee, onClose, onConfirm,
}: { employee: Employee; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-2xl"
          style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.06), rgba(251,146,60,0.06))" }}>
          <div>
            <h3 className="font-bold text-gray-900">Exempt from Geofence</h3>
            <p className="text-xs text-orange-600 mt-0.5">{employee.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
            <p className="text-xs text-orange-700">
              This employee will be able to mark attendance from <strong>anywhere</strong> — no geofence zone required.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Reason for exemption</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Remote worker, field operations, official duty outside zone..."
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={() => onConfirm(reason)}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all"
              style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}>
              Exempt Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── District Dropdown ─────────────────────────────────────────────────────────
function DistrictSelect({
  value, onChange, districts,
}: { value: string; onChange: (v: string) => void; districts: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  const handleBlur = (e: React.FocusEvent) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  };

  const label = value || "All Districts";

  return (
    <div ref={ref} className="relative" onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 min-w-[170px] justify-between hover:border-purple-300 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Filter size={14} className="text-gray-400" />
          <span className={value ? "text-gray-900 font-medium" : "text-gray-400"}>{label}</span>
        </span>
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 w-56 bg-white rounded-xl border border-gray-100 shadow-lg py-1 max-h-72 overflow-y-auto">
          <button
            className={`w-full text-left px-3.5 py-2 text-sm hover:bg-purple-50 transition-colors ${!value ? "text-purple-700 font-semibold" : "text-gray-700"}`}
            onMouseDown={() => { onChange(""); setOpen(false); }}
          >
            All Districts
          </button>
          {districts.map((d) => (
            <button key={d}
              className={`w-full text-left px-3.5 py-2 text-sm hover:bg-purple-50 transition-colors ${value === d ? "text-purple-700 font-semibold bg-purple-50/60" : "text-gray-700"}`}
              onMouseDown={() => { onChange(d); setOpen(false); }}
            >
              {d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [page, setPage] = useState(1);
  const [exemptTarget, setExemptTarget] = useState<Employee | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  }

  function handleDistrictChange(val: string) {
    setDistrict(val);
    setPage(1);
  }

  // Fetch department list for the dropdown
  const { data: districts = [] } = useQuery<string[]>({
    queryKey: ["departments"],
    queryFn: () => api.get("/employees/departments").then((r) => r.data as string[]),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch paginated employees
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sa-employees", debouncedSearch, district, page],
    queryFn: () =>
      api.get("/employees", {
        params: {
          page,
          limit: PAGE_SIZE,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(district ? { department: district } : {}),
        },
      }).then((r) => {
        const d = r.data;
        if (d && typeof d === "object" && "data" in d) {
          return d as { data: Employee[]; total: number; page: number; limit: number };
        }
        return { data: Array.isArray(d) ? d : [], total: 0, page: 1, limit: PAGE_SIZE };
      }),
  });

  const employees = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Stats (summary counters — always full dataset)
  const { data: allStats } = useQuery({
    queryKey: ["sa-employees-stats"],
    queryFn: () =>
      api.get("/employees", { params: { page: 1, limit: 1 } })
        .then((r) => ({ total: r.data?.total ?? 0 })),
    staleTime: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, requiresGeofence, reason }: { id: string; requiresGeofence: boolean; reason?: string }) =>
      api.patch(`/employees/${id}/geofence-requirement`, { requiresGeofence, reason }),
    onSuccess: (_, vars) => {
      toast.success(vars.requiresGeofence ? "Geofence requirement re-enabled" : "Employee exempted from geofence");
      qc.invalidateQueries({ queryKey: ["sa-employees"] });
    },
    onError: () => toast.error("Failed to update geofence requirement"),
  });

  function handleToggle(emp: Employee) {
    if (emp.requiresGeofence) setExemptTarget(emp);
    else toggleMutation.mutate({ id: emp.id, requiresGeofence: true });
  }

  function handleExemptConfirm(reason: string) {
    if (!exemptTarget) return;
    toggleMutation.mutate({ id: exemptTarget.id, requiresGeofence: false, reason });
    setExemptTarget(null);
  }

  const hasFilters = !!debouncedSearch || !!district;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Employees</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {total > 0 ? `${total.toLocaleString()} employee${total !== 1 ? "s" : ""}${hasFilters ? " matching filters" : ""}` : "Manage all employees"}
          </p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:border-purple-300 text-gray-600 hover:text-purple-700 transition-all shadow-sm">
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Employees", value: allStats?.total ?? "—", color: "text-gray-800" },
          { label: "Geofence Required", value: employees.filter((e) => e.requiresGeofence).length, color: "text-emerald-700", note: "on this page" },
          { label: "Exempted", value: employees.filter((e) => !e.requiresGeofence).length, color: "text-orange-600", note: "on this page" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}</p>
            {s.note && <p className="text-[10px] text-gray-400 mt-0.5">{s.note}</p>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          />
          {search && (
            <button onClick={() => { setSearch(""); setDebouncedSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* District filter */}
        <DistrictSelect value={district} onChange={handleDistrictChange} districts={districts} />

        {/* Clear all filters */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setDebouncedSearch(""); setDistrict(""); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition-colors"
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-7 w-7 text-purple-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.1)" }}>
            <Users size={24} className="text-purple-400" />
          </div>
          <p className="text-gray-500 text-sm">{hasFilters ? "No employees match your filters" : "No employees found"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(168,85,247,0.04))" }}>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">#</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">Employee</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">District</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">Designation</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">Geofence</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map((emp, i) => (
                  <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Row number */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-gray-400 tabular-nums">{(page - 1) * PAGE_SIZE + i + 1}</span>
                    </td>
                    {/* Employee */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{emp.name}</p>
                          <p className="text-xs text-gray-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* District */}
                    <td className="px-5 py-3.5">
                      {emp.department ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 whitespace-nowrap">
                          {emp.department}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    {/* Designation */}
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-gray-600 whitespace-nowrap">{emp.designation ?? "—"}</p>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        emp.active !== false ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                      }`}>
                        {emp.active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {/* Geofence Status */}
                    <td className="px-5 py-3.5">
                      {emp.requiresGeofence ? (
                        <div className="flex items-center gap-1.5">
                          <Shield size={13} className="text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-700">Required</span>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <ShieldOff size={13} className="text-orange-500" />
                            <span className="text-xs font-semibold text-orange-600">Exempted</span>
                          </div>
                          {emp.geofenceExemptReason && (
                            <p className="text-[10px] text-gray-400 mt-0.5 max-w-[160px] truncate" title={emp.geofenceExemptReason}>
                              {emp.geofenceExemptReason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    {/* Action */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggle(emp)}
                        disabled={toggleMutation.isPending}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap ${
                          emp.requiresGeofence
                            ? "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                      >
                        {emp.requiresGeofence ? (
                          <><ShieldOff size={12} /> Exempt</>
                        ) : (
                          <><Shield size={12} /> Re-enable</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span> of <span className="font-semibold text-gray-700">{total.toLocaleString()}</span> employees
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 hover:border-purple-300 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-gray-600 px-2 tabular-nums">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 hover:border-purple-300 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exemption reason modal */}
      {exemptTarget && (
        <ExemptModal
          employee={exemptTarget}
          onClose={() => setExemptTarget(null)}
          onConfirm={handleExemptConfirm}
        />
      )}
    </div>
  );
}
