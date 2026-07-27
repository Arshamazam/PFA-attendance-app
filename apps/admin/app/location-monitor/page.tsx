"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { format, parseISO } from "date-fns";
import {
  MapPin, Clock, CheckCircle2, AlertCircle, RefreshCw,
  ChevronDown, Navigation, Wifi, Eye, X,
} from "lucide-react";

/* ── helpers ─────────────────────────────────────────────── */
const G = "#006B3F";
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
const resolveUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BACKEND}${url}`;
};
const AVATAR_COLORS = ["#10B981","#3B82F6","#8B5CF6","#F97316","#14B8A6","#F43F5E","#6366F1"];
const avatarBg  = (n: string) => AVATAR_COLORS[(n.charCodeAt(0) ?? 65) % AVATAR_COLORS.length];
const initials  = (n: string) => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
const cleanZone = (n: string) => (n ?? "").replace(/^Punjab Food Authority\s*/i, "").replace(/^,\s*/, "").trim() || n;
const pktTime   = (iso: string) => {
  const d = parseISO(iso);
  const pkt = new Date(d.getTime() + 5 * 3600000);
  const h = pkt.getUTCHours(), m = pkt.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};
const isLate = (iso: string) => {
  const d = parseISO(iso);
  const pkt = new Date(d.getTime() + 5 * 3600000);
  const h = pkt.getUTCHours(), m = pkt.getUTCMinutes();
  return h > 9 || (h === 9 && m > 0);
};

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee?: { id: string; name: string; email: string };
  checkInTime: string;
  checkOutTime: string | null;
  checkInLat: number;
  checkInLng: number;
  checkInPhotoUrl: string | null;
  geofenceZoneId: string | null;
  geofenceZone?: { id: string; name: string } | null;
}

/* ── Photo modal ─────────────────────────────────────────── */
function PhotoModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">{name} — Check-in Photo</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <img src={url} alt={name} className="w-full object-cover max-h-80" />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function LocationMonitorPage() {
  const [selectedZone, setSelectedZone] = useState("");
  const [photoModal, setPhotoModal]     = useState<{ url: string; name: string } | null>(null);
  const [lastRefresh, setLastRefresh]   = useState(new Date());

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: geofences } = useQuery({
    queryKey: ["geofences-all"],
    queryFn: () => api.get<{ id: string; name: string }[]>("/geofence").then(r => r.data),
    staleTime: 10 * 60_000,
  });

  const { data: raw, refetch, isFetching } = useQuery({
    queryKey: ["location-monitor-today", today],
    queryFn: () =>
      api.get<{ data: AttendanceRecord[]; total: number }>(
        `/attendance/all?limit=2000&startDate=${today}&endDate=${today}`
      ).then(r => r.data),
    refetchInterval: 60_000,
  });

  useEffect(() => { setLastRefresh(new Date()); }, [raw]);

  const records: AttendanceRecord[] = raw?.data ?? [];

  /* filter by zone */
  const filtered = selectedZone
    ? records.filter(r => r.geofenceZoneId === selectedZone)
    : records;

  /* zone breakdown */
  const zoneMap: Record<string, { name: string; count: number; onTime: number; late: number }> = {};
  for (const r of records) {
    const zid  = r.geofenceZoneId ?? "unknown";
    const zname = r.geofenceZone?.name ?? "Unknown";
    if (!zoneMap[zid]) zoneMap[zid] = { name: zname, count: 0, onTime: 0, late: 0 };
    zoneMap[zid].count++;
    isLate(r.checkInTime) ? zoneMap[zid].late++ : zoneMap[zid].onTime++;
  }
  const zoneSummary = Object.entries(zoneMap).sort((a, b) => b[1].count - a[1].count);

  const totalToday  = records.length;
  const totalOnTime = records.filter(r => !isLate(r.checkInTime)).length;
  const totalLate   = records.filter(r =>  isLate(r.checkInTime)).length;
  const checkedOut  = records.filter(r => r.checkOutTime).length;

  return (
    <DashboardLayout title="Location Monitor">
      {photoModal && <PhotoModal url={photoModal.url} name={photoModal.name} onClose={() => setPhotoModal(null)} />}

      <div className="space-y-5">

        {/* ── Header ───────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <MapPin size={20} style={{ color: G }} />
              Location Monitor
            </h1>
            <p className="text-[12px] text-gray-400 mt-0.5">
              Live attendance check-ins — {format(new Date(), "EEEE, dd MMM yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-bold text-emerald-700">LIVE</span>
            </div>
            <span className="text-[11px] text-gray-400">
              Updated {format(lastRefresh, "hh:mm:ss a")}
            </span>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── KPI row ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Check-ins", value: totalToday,  icon: Wifi,         color: "#1D4ED8", bg: "#EFF6FF" },
            { label: "On Time",         value: totalOnTime, icon: CheckCircle2, color: "#16A34A", bg: "#F0FDF4" },
            { label: "Late",            value: totalLate,   icon: AlertCircle,  color: "#EA580C", bg: "#FFF7ED" },
            { label: "Checked Out",     value: checkedOut,  icon: Clock,        color: G,         bg: "#F0FDF4" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-black text-gray-800 tabular-nums leading-none mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Zone breakdown cards ──────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Check-ins by Location</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {zoneSummary.map(([zid, z]) => (
              <button
                key={zid}
                onClick={() => setSelectedZone(selectedZone === zid ? "" : zid)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  selectedZone === zid
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={12} style={{ color: G }} className="shrink-0" />
                  <p className="text-[11px] font-bold text-gray-600 truncate">{cleanZone(z.name)}</p>
                </div>
                <p className="text-xl font-black text-gray-800 tabular-nums">{z.count}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] text-emerald-600 font-semibold">{z.onTime} on-time</span>
                  {z.late > 0 && <span className="text-[10px] text-orange-500 font-semibold">{z.late} late</span>}
                </div>
              </button>
            ))}
            {zoneSummary.length === 0 && (
              <div className="col-span-4 text-center py-6 text-gray-300 text-sm">No check-ins yet today</div>
            )}
          </div>
        </div>

        {/* ── Filter + Table ────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-gray-700">Live Check-in Log</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-3">
              {selectedZone && (
                <button
                  onClick={() => setSelectedZone("")}
                  className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg font-semibold hover:bg-emerald-100"
                >
                  {cleanZone(geofences?.find(z => z.id === selectedZone)?.name ?? "")} <X size={10} />
                </button>
              )}
              <div className="relative">
                <select
                  value={selectedZone}
                  onChange={e => setSelectedZone(e.target.value)}
                  className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-7 text-[12px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#006B3F]/20 cursor-pointer"
                >
                  <option value="">All Locations</option>
                  {(geofences ?? []).map(z => (
                    <option key={z.id} value={z.id}>{cleanZone(z.name)}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Employee", "Location", "GPS", "Check-in", "Check-out", "Status", "Photo"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-300">
                      <MapPin size={28} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No check-ins yet{selectedZone ? " for this location" : " today"}</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(r => {
                    const name = r.employee?.name ?? "Unknown";
                    const bg   = avatarBg(name);
                    const late = isLate(r.checkInTime);
                    const zoneName = cleanZone(r.geofenceZone?.name ?? "—");
                    const mapsUrl = `https://www.google.com/maps?q=${r.checkInLat},${r.checkInLng}`;

                    return (
                      <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Employee */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                              style={{ background: bg }}
                            >
                              {initials(name)}
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-gray-800 whitespace-nowrap">{name}</p>
                              <p className="text-[10px] text-gray-400">{r.employee?.email ?? ""}</p>
                            </div>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={11} style={{ color: G }} className="shrink-0" />
                            <span className="text-[12px] font-medium text-gray-700 whitespace-nowrap max-w-[180px] truncate">{zoneName}</span>
                          </div>
                        </td>

                        {/* GPS */}
                        <td className="px-5 py-3.5">
                          {r.checkInLat && r.checkInLng ? (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] font-mono text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                            >
                              <Navigation size={10} />
                              {r.checkInLat.toFixed(4)}, {r.checkInLng.toFixed(4)}
                            </a>
                          ) : (
                            <span className="text-gray-300 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Check-in time */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <p className="text-[12px] font-semibold text-gray-700">{pktTime(r.checkInTime)}</p>
                          <p className="text-[10px] text-gray-400">{format(parseISO(r.checkInTime), "dd MMM")}</p>
                        </td>

                        {/* Check-out time */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {r.checkOutTime ? (
                            <p className="text-[12px] font-semibold text-gray-700">{pktTime(r.checkOutTime)}</p>
                          ) : (
                            <span className="text-[11px] text-gray-300 italic">Still in</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                            late ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {late ? <AlertCircle size={9} /> : <CheckCircle2 size={9} />}
                            {late ? "Late" : "On Time"}
                          </span>
                        </td>

                        {/* Photo */}
                        <td className="px-5 py-3.5">
                          {resolveUrl(r.checkInPhotoUrl) ? (
                            <button
                              onClick={() => setPhotoModal({ url: resolveUrl(r.checkInPhotoUrl)!, name })}
                              className="w-9 h-9 rounded-lg overflow-hidden border border-gray-200 hover:border-emerald-400 transition-colors relative group"
                            >
                              <img
                                src={resolveUrl(r.checkInPhotoUrl)!}
                                alt={name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye size={12} className="text-white" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-gray-300 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
            <p className="text-[11px] text-gray-400">
              Auto-refreshes every 60 seconds · GPS links open in Google Maps
            </p>
            <p className="text-[11px] text-gray-400">
              All times in PKT (UTC+5)
            </p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
