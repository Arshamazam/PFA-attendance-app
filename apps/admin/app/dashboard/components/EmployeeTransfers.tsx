"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeftRight, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";

type Transfer = {
  id: string;
  employee: { name: string };
  fromDepartment: string;
  toDepartment: string;
  transferDate: string;
  approver?: { name: string };
  status: string;
  reason?: string;
};

const STATUS_STYLE: Record<string, string> = {
  Approved: "bg-green-50 text-green-700 border-green-200",
  Pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function EmployeeTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (statusFilter !== "All") params.set("status", statusFilter);
    api
      .get<{ data: Transfer[] }>(`/employee-transfers?${params}`)
      .then((r) => setTransfers(r.data.data ?? []))
      .catch(() => {});
  };

  useEffect(() => { load(); }, [statusFilter]);

  const updateStatus = async (id: string, newStatus: string) => {
    await api.patch(`/employee-transfers/${id}`, { status: newStatus }).catch(() => {});
    load();
  };

  const filtered = transfers.filter((t) =>
    t.employee?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 pt-5 px-5 border-b border-gray-50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <ArrowLeftRight size={14} className="text-[#006B3F]" />
            Employee Transfers
            {filtered.length > 0 && (
              <span className="ml-1 text-[10px] bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                {filtered.length}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              placeholder="Search name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-[#006B3F]/40 focus:border-[#006B3F]/50"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#006B3F]/40"
            >
              {["All", "Pending", "Approved", "Rejected"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
            <ArrowLeftRight size={26} className="opacity-30" />
            <p className="text-sm">No transfers found</p>
          </div>
        ) : (
          /* Scroll container: max-h limits vertical growth; overflow-auto adds both scrollbars as needed */
          <div className="overflow-auto max-h-[360px]">
            <table className="w-full min-w-[700px] text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
                <tr>
                  {["#", "Employee", "From", "", "To", "Date", "Status", "Actions", ""].map(
                    (h, i) => (
                      <th
                        key={i}
                        className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap border-b border-gray-100"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => (
                  <>
                    <tr
                      key={t.id}
                      className="hover:bg-gray-50/60 transition-colors"
                      style={{ borderBottom: "1px solid #F8FAFC" }}
                    >
                      {/* Row # */}
                      <td className="px-4 py-3 text-xs text-gray-400 font-medium whitespace-nowrap">
                        {idx + 1}
                      </td>
                      {/* Name */}
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                        {t.employee?.name}
                      </td>
                      {/* From dept */}
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {t.fromDepartment}
                      </td>
                      {/* Arrow */}
                      <td className="px-1 py-3 text-gray-300">
                        <ArrowRight size={13} />
                      </td>
                      {/* To dept */}
                      <td className="px-4 py-3 font-medium text-[#006B3F] whitespace-nowrap">
                        {t.toDepartment}
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(t.transferDate).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          className={`text-[11px] font-semibold ${STATUS_STYLE[t.status] ?? ""}`}
                          variant="outline"
                        >
                          {t.status}
                        </Badge>
                      </td>
                      {/* Approve / Reject */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.status === "Pending" && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => updateStatus(t.id, "Approved")}
                              className="text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateStatus(t.id, "Rejected")}
                              className="text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                      {/* Expand reason */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {t.reason && (
                          <button
                            onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Toggle reason"
                          >
                            {expanded === t.id ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded reason row */}
                    {expanded === t.id && t.reason && (
                      <tr key={`${t.id}-reason`} className="bg-amber-50/40">
                        <td colSpan={9} className="px-6 py-3">
                          <p className="text-xs text-gray-600 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm">
                            <span className="font-semibold text-gray-500 mr-2">Reason:</span>
                            {t.reason}
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
