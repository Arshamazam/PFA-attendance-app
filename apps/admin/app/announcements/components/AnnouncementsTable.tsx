"use client";
import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Pencil, Trash2, CheckCheck, Archive, ChevronUp, ChevronDown, X } from "lucide-react";
import api from "@/lib/api";
import { format, parseISO } from "date-fns";

type Announcement = {
  id: string; title: string; type: string; priority: string;
  scheduledDate: string; scheduledTime: string; status: string;
  views: number; description: string; content: string;
  isPublished: boolean; autoPublish: boolean; isActive: boolean;
  expiryDate?: string; imageUrl?: string; targetAudience?: string;
};

const TYPE_COLORS: Record<string, string> = {
  Important: "bg-purple-100 text-purple-700 border-purple-200",
  General: "bg-gray-100 text-gray-700 border-gray-200",
  Holiday: "bg-green-100 text-green-700 border-green-200",
  Maintenance: "bg-red-100 text-red-700 border-red-200",
  Alert: "bg-orange-100 text-orange-700 border-orange-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Low: "bg-blue-100 text-blue-700 border-blue-200",
};

const STATUS_COLORS: Record<string, string> = {
  Scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  Published: "bg-green-100 text-green-700 border-green-200",
  Archived: "bg-gray-100 text-gray-600 border-gray-200",
  Expired: "bg-red-100 text-red-700 border-red-200",
};

type SortDir = "asc" | "desc";
type SortField = "title" | "scheduledDate" | "views" | "priority";

export default function AnnouncementsTable({ onEdit, onView, refresh }: { onEdit: (a: Announcement) => void; onView: (a: Announcement) => void; refresh?: number }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<SortField>("scheduledDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<Announcement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (priority) params.set("priority", priority);
    if (search) params.set("search", search);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("skip", String((page - 1) * pageSize));
    params.set("take", String(pageSize));
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    try {
      const r = await api.get<{ data: Announcement[]; total: number }>(`/announcements?${params}`);
      setAnnouncements(r.data.data ?? []);
      setTotal(r.data.total ?? 0);
    } catch (_) {}
    setLoading(false);
  }, [status, type, priority, search, from, to, page, pageSize, sortBy, sortDir, refresh]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const sort = (field: SortField) => {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortBy === field ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="text-gray-300" />;

  const doPublish = async (id: string) => {
    await api.patch(`/announcements/${id}/publish`).catch(() => {});
    load();
  };
  const doArchive = async (id: string) => {
    await api.patch(`/announcements/${id}/archive`).catch(() => {});
    load();
  };
  const doDelete = async () => {
    if (!deleteId) return;
    await api.delete(`/announcements/${deleteId}`).catch(() => {});
    setDeleteId(null);
    load();
  };

  const clearFilters = () => { setStatus(""); setType(""); setPriority(""); setSearch(""); setFrom(""); setTo(""); setPage(1); };

  return (
    <>
      <Card className="border-0 shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 items-end">
          <input placeholder="Search title..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="text-xs border rounded px-2 py-1.5 w-44" />
          {([ ["Status", ["Scheduled","Published","Archived","Expired"], status, setStatus],
              ["Type", ["Important","General","Holiday","Maintenance","Alert"], type, setType],
              ["Priority", ["Low","Medium","High","Urgent"], priority, setPriority],
          ] as [string, string[], string, (v: string) => void][]).map(([label, opts, val, setter]) => (
            <select key={label} value={val} onChange={(e) => { setter(e.target.value); setPage(1); }} className="text-xs border rounded px-2 py-1.5 bg-white">
              <option value="">{label}</option>
              {opts.map((o) => <option key={o}>{o}</option>)}
            </select>
          ))}
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="text-xs border rounded px-2 py-1.5" />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="text-xs border rounded px-2 py-1.5" />
          <select value={pageSize} onChange={(e) => { setPageSize(+e.target.value); setPage(1); }} className="text-xs border rounded px-2 py-1.5 bg-white">
            {[10, 25, 50].map((n) => <option key={n}>{n}</option>)}
          </select>
          {(status || type || priority || search || from || to) && (
            <button onClick={clearFilters} className="text-xs text-gray-500 flex items-center gap-1 border rounded px-2 py-1.5 hover:bg-gray-50">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[["Title", "title"], ["Type", null], ["Priority", "priority"], ["Schedule", "scheduledDate"], ["Status", null], ["Views", "views"], ["Actions", null]].map(([col, field]) => (
                    <th key={col as string} className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${field ? "cursor-pointer select-none" : ""}`}
                      onClick={() => field && sort(field as SortField)}>
                      <span className="flex items-center gap-1">{col as string}{field && <SortIcon field={field as SortField} />}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Loading…</td></tr>
                ) : announcements.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No announcements found</td></tr>
                ) : announcements.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 max-w-[200px]">
                      <button onClick={() => setViewItem(a)} className="text-[#006B3F] font-medium hover:underline text-left line-clamp-2">{a.title}</button>
                    </td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${TYPE_COLORS[a.type] ?? ""}`} variant="outline">{a.type}</Badge></td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${PRIORITY_COLORS[a.priority] ?? ""}`} variant="outline">{a.priority}</Badge></td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {format(parseISO(a.scheduledDate), "MMM d, yyyy")} <span className="text-gray-400">{a.scheduledTime}</span>
                    </td>
                    <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_COLORS[a.status] ?? ""}`} variant="outline">{a.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{a.views.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewItem(a)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="View"><Eye size={14} /></button>
                        <button onClick={() => onEdit(a)} className="p-1.5 rounded hover:bg-blue-50 text-blue-500" title="Edit"><Pencil size={14} /></button>
                        {a.status === "Scheduled" && (
                          <button onClick={() => doPublish(a.id)} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Publish"><CheckCheck size={14} /></button>
                        )}
                        {a.status === "Published" && (
                          <button onClick={() => doArchive(a.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Archive"><Archive size={14} /></button>
                        )}
                        <button onClick={() => setDeleteId(a.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {page} of {totalPages} — {total} total</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="text-xs px-3 py-1.5 border rounded disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="text-xs px-3 py-1.5 border rounded disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h3 className="font-semibold mb-2 text-[#333333]">Delete Announcement?</h3>
            <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="text-sm px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={doDelete} className="text-sm px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            {viewItem.imageUrl && (
              <img src={viewItem.imageUrl.startsWith("/") ? `http://localhost:3000${viewItem.imageUrl}` : viewItem.imageUrl} alt="" className="w-full h-48 object-cover rounded-t-xl" />
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-lg font-bold text-[#333333] flex-1 pr-4">{viewItem.title}</h2>
                <button onClick={() => setViewItem(null)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                <Badge className={`text-xs ${TYPE_COLORS[viewItem.type] ?? ""}`} variant="outline">{viewItem.type}</Badge>
                <Badge className={`text-xs ${PRIORITY_COLORS[viewItem.priority] ?? ""}`} variant="outline">{viewItem.priority}</Badge>
                <Badge className={`text-xs ${STATUS_COLORS[viewItem.status] ?? ""}`} variant="outline">{viewItem.status}</Badge>
              </div>
              <div className="text-xs text-gray-400 space-y-0.5 mb-4">
                <p>Scheduled: {format(parseISO(viewItem.scheduledDate), "MMMM d, yyyy")} at {viewItem.scheduledTime}</p>
                {viewItem.expiryDate && <p>Expires: {format(parseISO(viewItem.expiryDate), "MMMM d, yyyy")}</p>}
                <p>Audience: {viewItem.targetAudience}</p>
                <p>Views: {viewItem.views.toLocaleString()}</p>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
              <p className="text-sm text-gray-600 mb-4">{viewItem.description}</p>
              <p className="text-sm font-medium text-gray-700 mb-1">Full Content</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{viewItem.content}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
