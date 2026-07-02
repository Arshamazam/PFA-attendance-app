"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { Users, Search, Shield, ShieldOff, X, RefreshCw } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Employee {
  id: string; name: string; email: string; role: string;
  department?: string; designation?: string; employmentStatus?: string;
  requiresGeofence: boolean; geofenceExemptReason?: string;
  geofenceExemptedAt?: string; profilePhotoUrl?: string;
}

// ── Exemption Reason Modal ────────────────────────────────────────────────────
function ExemptModal({
  employee,
  onClose,
  onConfirm,
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [exemptTarget, setExemptTarget] = useState<Employee | null>(null);

  const { data: raw, isLoading, refetch } = useQuery({
    queryKey: ["sa-employees"],
    queryFn: () =>
      api.get("/employees", { params: { limit: 200 } }).then((r) => {
        const d = r.data;
        return (Array.isArray(d) ? d : d?.data ?? []) as Employee[];
      }),
  });

  const employees = (raw ?? []).filter((e) =>
    !search ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    (e.department ?? "").toLowerCase().includes(search.toLowerCase())
  );

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
    if (emp.requiresGeofence) {
      // Exempting — need a reason
      setExemptTarget(emp);
    } else {
      // Re-enabling — no reason needed
      toggleMutation.mutate({ id: emp.id, requiresGeofence: true });
    }
  }

  function handleExemptConfirm(reason: string) {
    if (!exemptTarget) return;
    toggleMutation.mutate({ id: exemptTarget.id, requiresGeofence: false, reason });
    setExemptTarget(null);
  }

  const exemptCount = employees.filter((e) => !e.requiresGeofence).length;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Employee Geofence Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Toggle geofence requirement per employee — exempted employees can check in from anywhere
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
          { label: "Total Employees", value: raw?.length ?? 0, color: "text-gray-800" },
          { label: "Geofence Required", value: (raw?.length ?? 0) - exemptCount, color: "text-emerald-700" },
          { label: "Exempted", value: exemptCount, color: "text-orange-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or department…"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
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
          <p className="text-gray-500 text-sm">{search ? "No employees match your search" : "No employees found"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(168,85,247,0.04))" }}>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Employee</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Department</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Geofence Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors">
                  {/* Employee */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Department */}
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-700">{emp.department ?? "—"}</p>
                    <p className="text-xs text-gray-400">{emp.designation ?? ""}</p>
                  </td>
                  {/* Role */}
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{emp.role}</span>
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
                          <p className="text-[10px] text-gray-400 mt-0.5 max-w-[180px] truncate" title={emp.geofenceExemptReason}>
                            {emp.geofenceExemptReason}
                          </p>
                        )}
                        {emp.geofenceExemptedAt && (
                          <p className="text-[10px] text-gray-400">
                            {new Date(emp.geofenceExemptedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
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
