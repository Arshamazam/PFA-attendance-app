"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Eye, MapPin,
  ToggleLeft, ToggleRight, Search, Loader2, X, RefreshCw,
} from "lucide-react";

const GeofenceMap = dynamic(() => import("@/components/GeofenceMap"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────
interface BoundaryPoint { lat: number; lng: number }
interface Hotspot { name: string; lat: number; lng: number; radius: number }

interface GeofenceZone {
  id: string; name: string; centerLat: number; centerLng: number;
  radiusMeters: number; active: boolean; createdAt: string;
  boundaryType?: string; boundaryPoints?: BoundaryPoint[];
  hotspots?: Hotspot[]; enforcementLevel?: string;
  bufferZone?: number; gpsAccuracyThreshold?: number; gracePeriod?: number;
}
interface ZoneWithCount extends GeofenceZone { totalCheckIns?: number }
interface CheckIn {
  id: string; checkInLat: number; checkInLng: number; checkInTime: string;
  employee?: { name: string };
}
interface NominatimResult { place_id: number; display_name: string; lat: string; lon: string }

const DEFAULT_LAT = 31.5204;
const DEFAULT_LNG = 74.3587;

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeCentroid(pts: BoundaryPoint[]): { lat: number; lng: number } {
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
  return { lat, lng };
}

function computeMaxRadius(center: { lat: number; lng: number }, pts: BoundaryPoint[]): number {
  const R = 6371000;
  let max = 0;
  for (const p of pts) {
    const dLat = ((p.lat - center.lat) * Math.PI) / 180;
    const dLng = ((p.lng - center.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((center.lat * Math.PI) / 180) *
        Math.cos((p.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (d > max) max = d;
  }
  return Math.ceil(max);
}

// ── Zone Card ─────────────────────────────────────────────────────────────────
function ZoneCard({ zone, onEdit, onDelete, onView, onToggle }: {
  zone: ZoneWithCount;
  onEdit: () => void; onDelete: () => void; onView: () => void; onToggle: () => void;
}) {
  const created = new Date(zone.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const btype = zone.boundaryType ?? "circle";
  return (
    <div className={`bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md ${zone.active ? "border-gray-100" : "border-gray-200 opacity-70"}`}>
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${zone.active ? "bg-purple-50" : "bg-gray-100"}`}>
              <MapPin className={`w-5 h-5 ${zone.active ? "text-purple-600" : "text-gray-400"}`} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{zone.name}</h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{zone.centerLat?.toFixed(5)}, {zone.centerLng?.toFixed(5)}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${zone.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
              {zone.active ? "Active" : "Inactive"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 capitalize">
              {btype}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-4">
        {[
          { label: "Radius", val: `${zone.radiusMeters}m` },
          { label: "Check-ins", val: zone.totalCheckIns ?? 0 },
          { label: "Created", val: created },
        ].map((s) => (
          <div key={s.label} className="text-center bg-gray-50 rounded-xl py-2.5">
            <p className="text-[10px] text-gray-400 mb-0.5">{s.label}</p>
            <p className="font-bold text-sm text-gray-800">{s.val}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 px-4 pb-4">
        <button onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors">
          <Eye size={13} /> View
        </button>
        <button onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
          <Pencil size={13} /> Edit
        </button>
        <button onClick={onToggle} title={zone.active ? "Deactivate" : "Activate"}
          className="w-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
          {zone.active
            ? <ToggleRight size={16} className="text-emerald-600" />
            : <ToggleLeft size={16} className="text-gray-400" />}
        </button>
        <button onClick={onDelete}
          className="w-9 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
          <Trash2 size={14} className="text-red-500" />
        </button>
      </div>
    </div>
  );
}

// ── Modal overlay ─────────────────────────────────────────────────────────────
function Modal({ children, onClose, maxW = "max-w-2xl" }: {
  children: React.ReactNode; onClose: () => void; maxW?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} mx-4 max-h-[90vh] overflow-y-auto`}>
        {children}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GeofencesPage() {
  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ZoneWithCount | null>(null);
  const [editTarget, setEditTarget] = useState<ZoneWithCount | null>(null);
  const [viewTarget, setViewTarget] = useState<ZoneWithCount | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);

  // Form — basic
  const [formName, setFormName] = useState("");
  const [formLat, setFormLat] = useState(DEFAULT_LAT);
  const [formLng, setFormLng] = useState(DEFAULT_LNG);
  const [formRadius, setFormRadius] = useState(100);
  const [formZoom, setFormZoom] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form — advanced
  const [boundaryType, setBoundaryType] = useState<"circle" | "polygon">("circle");
  const [polygonPoints, setPolygonPoints] = useState<BoundaryPoint[]>([]);
  const [enforcementLevel, setEnforcementLevel] = useState<"strict" | "moderate" | "lenient">("strict");
  const [bufferZone, setBufferZone] = useState(30);
  const [gpsAccuracyThreshold, setGpsAccuracyThreshold] = useState(50);
  const [gracePeriod, setGracePeriod] = useState(5);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  // Hotspot draft
  const [hsName, setHsName] = useState("");
  const [hsLat, setHsLat] = useState("");
  const [hsLng, setHsLng] = useState("");
  const [hsRadius, setHsRadius] = useState("50");

  // ── Queries & Mutations ──────────────────────────────────────────────────────
  const { data: zones = [], isLoading, refetch } = useQuery<ZoneWithCount[]>({
    queryKey: ["geofences"],
    queryFn: () => api.get("/geofence").then((r) => r.data as ZoneWithCount[]),
  });

  const createMutation = useMutation({
    mutationFn: (dto: object) => api.post("/geofence", dto),
    onSuccess: () => { toast.success("Zone created"); qc.invalidateQueries({ queryKey: ["geofences"] }); closeForm(); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? "Create failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: object }) => api.patch(`/geofence/${id}`, dto),
    onSuccess: () => { toast.success("Zone updated"); qc.invalidateQueries({ queryKey: ["geofences"] }); closeForm(); },
    onError: () => toast.error("Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/geofence/${id}`),
    onSuccess: () => { toast.success("Zone deleted"); qc.invalidateQueries({ queryKey: ["geofences"] }); setDeleteTarget(null); },
    onError: () => toast.error("Delete failed"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/geofence/${id}/${active ? "activate" : "deactivate"}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["geofences"] }),
    onError: () => toast.error("Toggle failed"),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function resetForm() {
    setFormName(""); setFormLat(DEFAULT_LAT); setFormLng(DEFAULT_LNG);
    setFormRadius(100); setFormZoom(undefined); setSearchQuery(""); setSearchResults([]);
    setBoundaryType("circle"); setPolygonPoints([]);
    setEnforcementLevel("strict"); setBufferZone(30);
    setGpsAccuracyThreshold(50); setGracePeriod(5);
    setHotspots([]); setHsName(""); setHsLat(""); setHsLng(""); setHsRadius("50");
  }

  function openCreate() {
    setEditTarget(null); resetForm(); setFormOpen(true);
  }

  function openEdit(z: ZoneWithCount) {
    setEditTarget(z);
    setFormName(z.name); setFormLat(z.centerLat); setFormLng(z.centerLng);
    setFormRadius(z.radiusMeters); setFormZoom(undefined);
    setSearchQuery(""); setSearchResults([]);
    setBoundaryType((z.boundaryType as "circle" | "polygon") ?? "circle");
    setPolygonPoints(z.boundaryPoints ?? []);
    setEnforcementLevel((z.enforcementLevel as "strict" | "moderate" | "lenient") ?? "strict");
    setBufferZone(z.bufferZone ?? 30);
    setGpsAccuracyThreshold(z.gpsAccuracyThreshold ?? 50);
    setGracePeriod(z.gracePeriod ?? 5);
    setHotspots(z.hotspots ?? []);
    setHsName(""); setHsLat(""); setHsLng(""); setHsRadius("50");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false); setEditTarget(null); resetForm();
  }

  async function searchLocation() {
    if (!searchQuery.trim()) return;
    setIsSearching(true); setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&countrycodes=pk`
      );
      const data: NominatimResult[] = await res.json();
      if (data.length === 0) toast.info("No locations found — try a different search");
      setSearchResults(data);
    } catch { toast.error("Location search failed"); }
    finally { setIsSearching(false); }
  }

  function selectResult(r: NominatimResult) {
    const lat = parseFloat(parseFloat(r.lat).toFixed(6));
    const lng = parseFloat(parseFloat(r.lon).toFixed(6));
    setFormLat(lat); setFormLng(lng);
    setFormZoom(14); setSearchQuery(""); setSearchResults([]);
    toast.success("Location set — adjust pin on map if needed");
  }

  async function openView(z: ZoneWithCount) {
    setViewTarget(z); setLoadingCheckIns(true); setCheckIns([]); setViewOpen(true);
    try {
      const res = await api.get<CheckIn[]>(`/geofence/${z.id}/check-ins`);
      setCheckIns(res.data);
    } catch { toast.error("Failed to load check-ins"); }
    finally { setLoadingCheckIns(false); }
  }

  function handleMapClick(lat: number, lng: number) {
    if (boundaryType === "polygon") {
      setPolygonPoints((prev) => [...prev, { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) }]);
      // Update centroid
      const newPts = [...polygonPoints, { lat, lng }];
      const c = computeCentroid(newPts);
      setFormLat(parseFloat(c.lat.toFixed(6)));
      setFormLng(parseFloat(c.lng.toFixed(6)));
    } else {
      setFormLat(parseFloat(lat.toFixed(6)));
      setFormLng(parseFloat(lng.toFixed(6)));
      setFormZoom(undefined);
    }
  }

  function removePolygonPoint(i: number) {
    const newPts = polygonPoints.filter((_, idx) => idx !== i);
    setPolygonPoints(newPts);
    if (newPts.length >= 1) {
      const c = computeCentroid(newPts);
      setFormLat(parseFloat(c.lat.toFixed(6)));
      setFormLng(parseFloat(c.lng.toFixed(6)));
    }
  }

  function addHotspot() {
    const lat = parseFloat(hsLat);
    const lng = parseFloat(hsLng);
    const r = parseFloat(hsRadius);
    if (!hsName.trim() || isNaN(lat) || isNaN(lng) || isNaN(r)) {
      toast.error("Fill in all hotspot fields");
      return;
    }
    setHotspots((prev) => [...prev, { name: hsName.trim(), lat, lng, radius: r }]);
    setHsName(""); setHsLat(""); setHsLng(""); setHsRadius("50");
  }

  function handleSubmit() {
    if (!formName.trim()) { toast.error("Zone name is required"); return; }
    if (boundaryType === "polygon" && polygonPoints.length < 3) {
      toast.error("Polygon requires at least 3 points"); return;
    }

    let centerLat = formLat;
    let centerLng = formLng;
    let radiusMeters = formRadius;

    if (boundaryType === "polygon" && polygonPoints.length >= 3) {
      const c = computeCentroid(polygonPoints);
      centerLat = parseFloat(c.lat.toFixed(6));
      centerLng = parseFloat(c.lng.toFixed(6));
      radiusMeters = computeMaxRadius(c, polygonPoints);
    }

    const dto = {
      name: formName.trim(),
      centerLat,
      centerLng,
      radiusMeters,
      boundaryType,
      boundaryPoints: boundaryType === "polygon" ? polygonPoints : null,
      hotspots: hotspots.length > 0 ? hotspots : null,
      enforcementLevel,
      bufferZone,
      gpsAccuracyThreshold,
      gracePeriod,
    };

    if (editTarget) updateMutation.mutate({ id: editTarget.id, dto });
    else createMutation.mutate(dto);
  }

  const otherZones = zones.filter((z) => z.id !== editTarget?.id);

  // Derived centroid for polygon display
  const displayLat = boundaryType === "polygon" && polygonPoints.length >= 1
    ? computeCentroid(polygonPoints).lat
    : formLat;
  const displayLng = boundaryType === "polygon" && polygonPoints.length >= 1
    ? computeCentroid(polygonPoints).lng
    : formLng;
  const displayRadius = boundaryType === "polygon" && polygonPoints.length >= 3
    ? computeMaxRadius(computeCentroid(polygonPoints), polygonPoints)
    : formRadius;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Geofence Zones</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {zones.length} zone{zones.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:border-purple-300 text-gray-600 hover:text-purple-700 transition-all shadow-sm">
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
            <Plus size={16} /> Add Zone
          </button>
        </div>
      </div>

      {/* Zone grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 bg-white rounded-2xl animate-pulse shadow-sm" />
          ))}
        </div>
      ) : zones.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.1)" }}>
            <MapPin size={28} className="text-purple-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700">No geofence zones yet</p>
            <p className="text-sm text-gray-400 mt-1">Create a zone to define check-in boundaries</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
            <Plus size={16} /> Create first zone
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((z) => (
            <ZoneCard key={z.id} zone={z}
              onEdit={() => openEdit(z)}
              onDelete={() => setDeleteTarget(z)}
              onView={() => openView(z)}
              onToggle={() => toggleMutation.mutate({ id: z.id, active: !z.active })}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ────────────────────────────────────────────────── */}
      {formOpen && (
        <Modal onClose={closeForm} maxW="max-w-3xl">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(168,85,247,0.06))" }}>
            <div>
              <h3 className="font-bold text-gray-900">{editTarget ? "Edit Geofence Zone" : "Create Geofence Zone"}</h3>
              <p className="text-xs text-purple-600 mt-0.5">Define a check-in boundary on the map</p>
            </div>
            <button onClick={closeForm} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
              <X size={16} className="text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Location search */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Search Location</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchLocation()}
                    placeholder="e.g. PFA Lahore, G.T. Road…"
                    className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button onClick={searchLocation} disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-purple-700 border border-purple-200 bg-purple-50 hover:bg-purple-100 disabled:opacity-50 flex items-center gap-1.5 transition-colors">
                  {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  {isSearching ? "Searching…" : "Search"}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 border-2 rounded-xl overflow-hidden shadow-md" style={{ borderColor: "rgba(124,58,237,0.3)" }}>
                  <div className="px-3 py-2 border-b text-xs font-semibold text-purple-700"
                    style={{ background: "rgba(124,58,237,0.06)", borderColor: "rgba(124,58,237,0.2)" }}>
                    {searchResults.length} location{searchResults.length > 1 ? "s" : ""} found — click to select
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y divide-gray-100">
                    {searchResults.map((r) => (
                      <button key={r.place_id} type="button" onClick={() => selectResult(r)}
                        className="w-full text-left px-3 py-2.5 hover:bg-purple-50 transition-colors">
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{r.display_name}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {parseFloat(r.lat).toFixed(5)}, {parseFloat(r.lon).toFixed(5)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Zone name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Zone Name *</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. PFA Lahore HQ"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
            </div>

            {/* Boundary type toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Boundary Type</label>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                {(["circle", "polygon"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => { setBoundaryType(t); if (t === "circle") setPolygonPoints([]); }}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors capitalize ${boundaryType === t ? "text-white" : "text-gray-600 hover:bg-gray-50"}`}
                    style={boundaryType === t ? { background: "linear-gradient(135deg, #7c3aed, #a855f7)" } : {}}>
                    {t === "circle" ? "Circle" : "Polygon"}
                  </button>
                ))}
              </div>
            </div>

            {/* Circle mode: coordinates + radius */}
            {boundaryType === "circle" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Latitude</label>
                  <input type="number" step="0.000001" value={formLat}
                    onChange={(e) => setFormLat(parseFloat(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Longitude</label>
                  <input type="number" step="0.000001" value={formLng}
                    onChange={(e) => setFormLng(parseFloat(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Radius (m)</label>
                  <input type="number" min={50} max={5000} value={formRadius}
                    onChange={(e) => setFormRadius(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                </div>
              </div>
            )}

            {/* Polygon mode: point list */}
            {boundaryType === "polygon" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Polygon Vertices ({polygonPoints.length} point{polygonPoints.length !== 1 ? "s" : ""})
                    {polygonPoints.length < 3 && <span className="text-orange-500 ml-1">— need at least 3</span>}
                  </p>
                  {polygonPoints.length > 0 && (
                    <button type="button" onClick={() => { setPolygonPoints([]); }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                      Clear polygon
                    </button>
                  )}
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 text-xs text-purple-700">
                  Click on the map to add polygon vertices. Click in order around the boundary.
                </div>
                {polygonPoints.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {polygonPoints.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-xs font-mono text-gray-600">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold inline-flex items-center justify-center mr-2">{i + 1}</span>
                          {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                        </span>
                        <button type="button" onClick={() => removePolygonPoint(i)}
                          className="text-red-400 hover:text-red-600 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Map */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                {boundaryType === "polygon" ? "Click map to add polygon vertices" : "Click map to fine-tune center"}
              </label>
              <div className="h-72 rounded-xl overflow-hidden border-2 border-gray-200">
                <GeofenceMap
                  lat={displayLat} lng={displayLng} radius={displayRadius} zoom={formZoom}
                  onMapClick={handleMapClick}
                  boundaryType={boundaryType}
                  boundaryPoints={boundaryType === "polygon" ? polygonPoints : undefined}
                  bufferZone={bufferZone}
                  hotspots={hotspots.length > 0 ? hotspots : undefined}
                  otherZones={otherZones}
                />
              </div>
            </div>

            {/* Advanced settings */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Advanced Settings</p>
              </div>
              <div className="p-4 space-y-5">
                {/* Enforcement level */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Enforcement Level</label>
                  <div className="space-y-2">
                    {([
                      { val: "strict", label: "Strict", desc: "Must be within boundary + GPS accuracy ≤ threshold" },
                      { val: "moderate", label: "Moderate", desc: "Must be within boundary (GPS accuracy is scored but doesn't block)" },
                      { val: "lenient", label: "Lenient", desc: "Any location near the boundary (with buffer) is accepted" },
                    ] as const).map(({ val, label, desc }) => (
                      <label key={val}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${enforcementLevel === val ? "border-purple-300 bg-purple-50" : "border-gray-200 hover:border-gray-300"}`}>
                        <input type="radio" name="enforcement" value={val}
                          checked={enforcementLevel === val}
                          onChange={() => setEnforcementLevel(val)}
                          className="mt-0.5 accent-purple-600" />
                        <div>
                          <p className={`text-sm font-semibold ${enforcementLevel === val ? "text-purple-800" : "text-gray-700"}`}>{label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Buffer + GPS threshold + grace period */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Buffer Zone (m)</label>
                    <input type="number" min={0} max={500} value={bufferZone}
                      onChange={(e) => setBufferZone(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                    <p className="text-[10px] text-gray-400 mt-1">Extra meters added to boundary</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">GPS Threshold (m)</label>
                    <input type="number" min={5} max={200} value={gpsAccuracyThreshold}
                      onChange={(e) => setGpsAccuracyThreshold(parseInt(e.target.value, 10) || 50)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                    <p className="text-[10px] text-gray-400 mt-1">Reject if GPS accuracy &gt; this</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Grace Period (min)</label>
                    <input type="number" min={0} max={60} value={gracePeriod}
                      onChange={(e) => setGracePeriod(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                    <p className="text-[10px] text-gray-400 mt-1">Informational only</p>
                  </div>
                </div>

                {/* Hotspots */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                    Entry Hotspots ({hotspots.length})
                  </label>
                  {hotspots.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {hotspots.map((hs, i) => (
                        <div key={i} className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                          <div>
                            <span className="text-sm font-medium text-orange-800">{hs.name}</span>
                            <span className="text-xs text-orange-500 ml-2 font-mono">{hs.lat.toFixed(5)}, {hs.lng.toFixed(5)} · r={hs.radius}m</span>
                          </div>
                          <button type="button" onClick={() => setHotspots((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-orange-400 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-5 gap-2">
                    <input value={hsName} onChange={(e) => setHsName(e.target.value)}
                      placeholder="Name" className="col-span-2 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <input value={hsLat} onChange={(e) => setHsLat(e.target.value)}
                      placeholder="Lat" type="number" step="0.000001"
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <input value={hsLng} onChange={(e) => setHsLng(e.target.value)}
                      placeholder="Lng" type="number" step="0.000001"
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <div className="flex gap-1">
                      <input value={hsRadius} onChange={(e) => setHsRadius(e.target.value)}
                        placeholder="r(m)" type="number" min={10}
                        className="w-full px-2 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    </div>
                  </div>
                  <button type="button" onClick={addHotspot}
                    className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors">
                    + Add Hotspot
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button onClick={closeForm}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving…"
                  : editTarget ? "Update Zone" : "Create Zone"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── View / Check-ins Modal ────────────────────────────────────────────── */}
      {viewOpen && viewTarget && (
        <Modal onClose={() => setViewOpen(false)}>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-purple-600" />
              <h3 className="font-bold text-gray-900">{viewTarget.name} — Check-ins</h3>
            </div>
            <button onClick={() => setViewOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Boundary</p>
                <p className="font-bold text-sm text-gray-800 mt-0.5 capitalize">{viewTarget.boundaryType ?? "circle"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Radius</p>
                <p className="font-bold text-sm text-gray-800 mt-0.5">{viewTarget.radiusMeters}m</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Total Check-ins</p>
                <p className="font-bold text-sm text-gray-800 mt-0.5">{viewTarget.totalCheckIns ?? checkIns.length}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Enforcement</p>
                <p className="font-bold text-sm text-gray-800 mt-0.5 capitalize">{viewTarget.enforcementLevel ?? "strict"}</p>
              </div>
            </div>
            <div className="h-72 rounded-xl overflow-hidden border border-gray-200">
              {loadingCheckIns ? (
                <div className="h-full flex items-center justify-center bg-gray-50">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <GeofenceMap
                  lat={viewTarget.centerLat} lng={viewTarget.centerLng}
                  radius={viewTarget.radiusMeters}
                  boundaryType={viewTarget.boundaryType}
                  boundaryPoints={viewTarget.boundaryPoints}
                  hotspots={viewTarget.hotspots}
                  bufferZone={viewTarget.bufferZone}
                  checkIns={checkIns} otherZones={[]} readOnly
                />
              )}
            </div>
            {checkIns.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent Check-ins</p>
                {checkIns.slice(0, 20).map((ci) => (
                  <div key={ci.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-gray-50">
                    <span className="font-medium text-gray-800">{ci.employee?.name ?? "—"}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(ci.checkInTime).toLocaleString("en-GB", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation ───────────────────────────────────────────────── */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)} maxW="max-w-sm">
          <div className="p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-center">Delete Zone?</h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              <strong className="text-gray-700">{deleteTarget.name}</strong> will be permanently removed. This cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60 transition-colors">
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
