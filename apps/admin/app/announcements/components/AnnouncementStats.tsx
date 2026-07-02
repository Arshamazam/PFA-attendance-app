"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, Clock, CheckCircle2, Archive, Eye, TrendingUp, Star } from "lucide-react";
import api from "@/lib/api";

type Stats = { total: number; scheduled: number; published: number; archived: number; totalViews: number; avgViews: number; mostViewed: { title: string; views: number } | null };

export default function AnnouncementStats({ refresh }: { refresh?: number }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>("/announcements/analytics/summary").then((r) => setStats(r.data)).catch(() => {});
  }, [refresh]);

  const cards = [
    { label: "Total", value: stats?.total ?? "—", icon: Megaphone, color: "#006B3F", bg: "bg-green-50" },
    { label: "Scheduled", value: stats?.scheduled ?? "—", icon: Clock, color: "#003D82", bg: "bg-blue-50" },
    { label: "Published", value: stats?.published ?? "—", icon: CheckCircle2, color: "#2E7D32", bg: "bg-emerald-50" },
    { label: "Archived", value: stats?.archived ?? "—", icon: Archive, color: "#6B7280", bg: "bg-gray-50" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-3xl font-bold text-[#333333] mt-1">{value}</p>
              </div>
              <div className={`p-3 rounded-xl ${bg}`}>
                <Icon size={22} style={{ color }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Eye size={18} className="text-[#006B3F]" />
              <div><p className="text-xs text-gray-400">Total Views</p><p className="text-lg font-bold text-[#333333]">{stats.totalViews}</p></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp size={18} className="text-[#006B3F]" />
              <div><p className="text-xs text-gray-400">Avg Views</p><p className="text-lg font-bold text-[#333333]">{stats.avgViews}</p></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Star size={18} className="text-[#006B3F]" />
              <div><p className="text-xs text-gray-400">Most Viewed</p><p className="text-sm font-semibold text-[#333333] truncate max-w-[160px]">{stats.mostViewed ? `${stats.mostViewed.title} (${stats.mostViewed.views})` : "—"}</p></div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
