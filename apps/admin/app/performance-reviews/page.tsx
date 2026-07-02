"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { Star, ChevronRight, Search, Filter } from "lucide-react";
import { format, parseISO } from "date-fns";

interface ReviewSummary {
  id: string;
  reviewPeriod: string;
  reviewDate: string;
  status: string;
  overallScore: number | null;
  reviewerName: string | null;
  employee: { id: string; name: string; department: string | null; designation: string | null; profilePhotoUrl: string | null };
}

const STATUS_STYLE: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600",
  submitted: "bg-blue-50 text-blue-700",
  approved:  "bg-green-50 text-green-700",
  rejected:  "bg-red-50 text-red-700",
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-300 text-xs italic">No score</span>;
  const color = score >= 4 ? "text-green-600" : score >= 3 ? "text-yellow-600" : "text-red-500";
  return (
    <span className={`font-bold text-sm ${color} flex items-center gap-0.5`}>
      <Star className="w-3.5 h-3.5 fill-current" />
      {score.toFixed(1)}
    </span>
  );
}

export default function PerformanceReviewsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery<{ data: ReviewSummary[]; total: number }>({
    queryKey: ["performance-reviews", statusFilter],
    queryFn: () =>
      api.get(`/performance-reviews${statusFilter ? `?status=${statusFilter}` : ""}`)
        .then((r) => r.data as { data: ReviewSummary[]; total: number }),
  });

  const reviews = (data?.data ?? []).filter((r) =>
    !search ||
    r.employee.name.toLowerCase().includes(search.toLowerCase()) ||
    r.reviewPeriod.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Performance Reviews">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Performance Reviews</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {data?.total ?? 0} total · go to an employee profile to start a new review
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee or period…"
            className="w-full pl-9 pr-3 h-9 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-gray-400" />
          {["", "draft", "submitted", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${
                statusFilter === s
                  ? "bg-[#006B3F] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-7 h-7 border-[3px] border-[#006B3F] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No reviews found</p>
            <p className="text-xs mt-1">Open an employee profile and click "Start Review"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Employee", "Period", "Review Date", "Score", "Reviewer", "Status", ""].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reviews.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                    onClick={() => router.push(`/performance-reviews/${r.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#006B3F] flex items-center justify-center shrink-0 overflow-hidden">
                          {r.employee.profilePhotoUrl
                            ? <img src={r.employee.profilePhotoUrl} alt={r.employee.name} className="w-full h-full object-cover" />
                            : <span className="text-white text-[10px] font-bold">{r.employee.name.slice(0, 2).toUpperCase()}</span>
                          }
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{r.employee.name}</p>
                          <p className="text-xs text-gray-400">{r.employee.designation ?? r.employee.department ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">{r.reviewPeriod}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{format(parseISO(r.reviewDate), "dd MMM yyyy")}</td>
                    <td className="px-4 py-3"><ScoreBadge score={r.overallScore} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.reviewerName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLE[r.status] ?? ""}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
