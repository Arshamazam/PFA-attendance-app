"use client";

import { useEffect, useRef } from "react";

interface CheckIn {
  id: string;
  checkInLat: number;
  checkInLng: number;
  checkInTime: string;
  employee?: { name: string };
}

interface Zone {
  id?: string;
  name?: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  active?: boolean;
}

interface Props {
  lat: number;
  lng: number;
  radius: number;
  zoom?: number;
  onMapClick?: (lat: number, lng: number) => void;
  otherZones?: Zone[];
  checkIns?: CheckIn[];
  readOnly?: boolean;
  boundaryType?: string;
  boundaryPoints?: { lat: number; lng: number }[];
  hotspots?: { name: string; lat: number; lng: number; radius: number }[];
  bufferZone?: number;
}

export default function GeofenceMap({
  lat, lng, radius, zoom, onMapClick,
  otherZones = [], checkIns = [], readOnly = false,
  boundaryType, boundaryPoints, hotspots, bufferZone,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentCircleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bufferCircleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polygonLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hotspotLayersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const centerMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      import("leaflet/dist/leaflet.css");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const centerLat = lat || 31.5204;
      const centerLng = lng || 74.3587;

      const map = L.map(mapRef.current!).setView([centerLat, centerLng], 15);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Other zones (gray)
      otherZones.forEach((z) => {
        L.circle([z.centerLat, z.centerLng], {
          radius: z.radiusMeters,
          color: z.active ? "#94a3b8" : "#cbd5e1",
          fillColor: "#f1f5f9",
          fillOpacity: 0.2,
          weight: 1,
          dashArray: "4",
        }).addTo(map).bindTooltip(z.name ?? "Zone");
      });

      // Check-in markers (blue dots)
      checkIns.forEach((ci) => {
        L.circleMarker([ci.checkInLat, ci.checkInLng], {
          radius: 5,
          color: "#1d4ed8",
          fillColor: "#3b82f6",
          fillOpacity: 0.8,
          weight: 1,
        }).addTo(map).bindTooltip(`${ci.employee?.name ?? "?"} — ${new Date(ci.checkInTime).toLocaleString()}`);
      });

      if (lat && lng) {
        const divIcon = L.divIcon({
          className: "",
          html: `<div style="width:16px;height:16px;background:#006B3F;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        if (boundaryType === "polygon" && boundaryPoints && boundaryPoints.length >= 3) {
          const latLngs = boundaryPoints.map((p) => [p.lat, p.lng] as [number, number]);
          polygonLayerRef.current = L.polygon(latLngs, {
            color: "#006B3F", fillColor: "#00A651", fillOpacity: 0.2, weight: 2,
          }).addTo(map);

          if ((bufferZone ?? 30) > 0) {
            bufferCircleRef.current = L.circle([lat, lng], {
              radius: bufferZone ?? 30, color: "#006B3F", fillOpacity: 0, weight: 1, dashArray: "5,5",
            }).addTo(map);
          }
        } else {
          bufferCircleRef.current = L.circle([lat, lng], {
            radius: radius + (bufferZone ?? 0),
            color: "#006B3F", fillColor: "#00A651", fillOpacity: 0.1, weight: 1, dashArray: "5,5",
          }).addTo(map);
          currentCircleRef.current = L.circle([lat, lng], {
            radius: radius || 100,
            color: "#006B3F", fillColor: "#00A651", fillOpacity: 0.2, weight: 2,
          }).addTo(map);
        }

        if (hotspots) {
          hotspotLayersRef.current = hotspots.map((hs) =>
            L.circle([hs.lat, hs.lng], {
              radius: hs.radius, color: "#f97316", fillColor: "#fb923c", fillOpacity: 0.3, weight: 2,
            }).addTo(map).bindTooltip(hs.name)
          );
        }

        centerMarkerRef.current = L.marker([lat, lng], { icon: divIcon }).addTo(map);
      }

      if (!readOnly) {
        map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
          onMapClick?.(e.latlng.lat, e.latlng.lng);
        });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update layers when props change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      // Remove old layers
      if (currentCircleRef.current) { currentCircleRef.current.remove(); currentCircleRef.current = null; }
      if (bufferCircleRef.current) { bufferCircleRef.current.remove(); bufferCircleRef.current = null; }
      if (polygonLayerRef.current) { polygonLayerRef.current.remove(); polygonLayerRef.current = null; }
      hotspotLayersRef.current.forEach((l) => l.remove());
      hotspotLayersRef.current = [];
      if (centerMarkerRef.current) { centerMarkerRef.current.remove(); centerMarkerRef.current = null; }

      if (!lat || !lng) return;

      const divIcon = L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;background:#006B3F;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      if (boundaryType === "polygon" && boundaryPoints && boundaryPoints.length >= 3) {
        const latLngs = boundaryPoints.map((p) => [p.lat, p.lng] as [number, number]);
        polygonLayerRef.current = L.polygon(latLngs, {
          color: "#006B3F", fillColor: "#00A651", fillOpacity: 0.2, weight: 2,
        }).addTo(mapInstanceRef.current);

        if ((bufferZone ?? 30) > 0) {
          bufferCircleRef.current = L.circle([lat, lng], {
            radius: bufferZone ?? 30, color: "#006B3F", fillOpacity: 0, weight: 1, dashArray: "5,5",
          }).addTo(mapInstanceRef.current);
        }
      } else {
        bufferCircleRef.current = L.circle([lat, lng], {
          radius: radius + (bufferZone ?? 0),
          color: "#006B3F", fillColor: "#00A651", fillOpacity: 0.1, weight: 1, dashArray: "5,5",
        }).addTo(mapInstanceRef.current);
        currentCircleRef.current = L.circle([lat, lng], {
          radius: radius || 100,
          color: "#006B3F", fillColor: "#00A651", fillOpacity: 0.2, weight: 2,
        }).addTo(mapInstanceRef.current);
      }

      if (hotspots) {
        hotspotLayersRef.current = hotspots.map((hs) =>
          L.circle([hs.lat, hs.lng], {
            radius: hs.radius, color: "#f97316", fillColor: "#fb923c", fillOpacity: 0.3, weight: 2,
          }).addTo(mapInstanceRef.current).bindTooltip(hs.name)
        );
      }

      centerMarkerRef.current = L.marker([lat, lng], { icon: divIcon }).addTo(mapInstanceRef.current);
      mapInstanceRef.current.setView([lat, lng], zoom ?? mapInstanceRef.current.getZoom());
    });
  }, [lat, lng, radius, zoom, boundaryType, boundaryPoints, hotspots, bufferZone]);

  return (
    <div ref={mapRef} className="h-full w-full rounded-lg overflow-hidden" style={{ minHeight: 300 }} />
  );
}
