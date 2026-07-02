"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import type { GeofenceZone } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, MapPin, RefreshCw, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

const GeofenceMap = dynamic(() => import("@/components/GeofenceMap"), { ssr: false });

interface CheckIn { id: string; checkInLat: number; checkInLng: number; checkInTime: string; employee?: { name: string }; }
interface ZoneWithCount extends GeofenceZone { totalCheckIns?: number; }

function ZoneCard({ zone, onView }: { zone: ZoneWithCount; onView: () => void }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 transition-all ${zone.active ? "border-gray-100" : "border-gray-200 opacity-70"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${zone.active ? "bg-green-50" : "bg-gray-100"}`}>
            <MapPin className={`w-5 h-5 ${zone.active ? "text-[#006B3F]" : "text-gray-400"}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{zone.name}</h3>
            <p className="text-xs text-gray-400">{zone.centerLat?.toFixed(5)}, {zone.centerLng?.toFixed(5)}</p>
          </div>
        </div>
        <Badge variant="outline" className={zone.active ? "bg-green-50 text-green-700 border-green-200 text-xs" : "bg-gray-100 text-gray-500 border-gray-200 text-xs"}>
          {zone.active ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center"><p className="text-xs text-gray-400">Radius</p><p className="font-semibold text-sm">{zone.radiusMeters}m</p></div>
        <div className="text-center"><p className="text-xs text-gray-400">Check-ins</p><p className="font-semibold text-sm">{zone.totalCheckIns ?? 0}</p></div>
        <div className="text-center"><p className="text-xs text-gray-400">Created</p><p className="font-semibold text-sm">{format(parseISO(zone.createdAt), "dd MMM")}</p></div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs h-8" onClick={onView}>
          <Eye className="w-3.5 h-3.5" /> View Details & Check-ins
        </Button>
      </div>
    </div>
  );
}

export default function GeofencesPage() {
  const [viewOpen, setViewOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<ZoneWithCount | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);

  const { data: zones = [], isLoading, refetch } = useQuery<ZoneWithCount[]>({
    queryKey: ["geofences"],
    queryFn: () => api.get("/geofence").then((r) => r.data as ZoneWithCount[]),
  });

  async function openView(z: ZoneWithCount) {
    setViewTarget(z); setLoadingCheckIns(true); setCheckIns([]); setViewOpen(true);
    try {
      const res = await api.get<CheckIn[]>(`/geofence/${z.id}/check-ins`);
      setCheckIns(res.data);
    } catch {
      toast.error("Failed to load check-ins");
    } finally { setLoadingCheckIns(false); }
  }

  return (
    <DashboardLayout title="Geofence Zones">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">{zones.length} zone{zones.length !== 1 ? "s" : ""} configured</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {/* Zone Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
            <MapPin className="w-12 h-12 text-gray-200" />
            <p className="font-medium">No geofence zones configured</p>
            <p className="text-sm text-gray-300">Contact your system administrator to set up zones</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((z) => (
              <ZoneCard key={z.id} zone={z} onView={() => openView(z)} />
            ))}
          </div>
        )}
      </div>

      {/* View Zone + Check-ins */}
      <Dialog open={viewOpen} onOpenChange={(o) => !o && setViewOpen(false)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#006B3F] flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {viewTarget?.name ?? "Zone"} — Details
            </DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400">Radius</p><p className="font-semibold">{viewTarget.radiusMeters}m</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400">Total Check-ins</p><p className="font-semibold">{viewTarget.totalCheckIns ?? checkIns.length}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-400">Status</p>
                  <Badge variant="outline" className={viewTarget.active ? "bg-green-50 text-green-700 border-green-200 text-xs mt-0.5" : "bg-gray-100 text-gray-500 text-xs mt-0.5"}>
                    {viewTarget.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
                {loadingCheckIns ? (
                  <div className="h-full flex items-center justify-center bg-gray-50">
                    <Loader2 className="w-6 h-6 text-[#006B3F] animate-spin" />
                  </div>
                ) : (
                  <GeofenceMap lat={viewTarget.centerLat} lng={viewTarget.centerLng} radius={viewTarget.radiusMeters}
                    checkIns={checkIns} otherZones={[]} readOnly />
                )}
              </div>
              {checkIns.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent Check-ins</p>
                  {checkIns.slice(0, 20).map((ci) => (
                    <div key={ci.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-gray-50">
                      <span className="font-medium">{ci.employee?.name ?? "—"}</span>
                      <span className="text-xs text-gray-400">{format(parseISO(ci.checkInTime), "dd MMM, h:mm a")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
