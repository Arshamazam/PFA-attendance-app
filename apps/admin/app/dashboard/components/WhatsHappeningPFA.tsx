"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, UserPlus, MapPin, Calendar, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

type Notification = { id: string; type: string; title: string; message: string; severity: string; isRead: boolean; createdAt: string };

const TYPE_ICONS: Record<string, React.ReactNode> = {
  "Leave Approved": <CheckCircle2 size={14} className="text-green-500" />,
  "Leave Rejected": <AlertTriangle size={14} className="text-red-500" />,
  "Employee Added": <UserPlus size={14} className="text-blue-500" />,
  "Zone Created": <MapPin size={14} className="text-purple-500" />,
  Holiday: <Calendar size={14} className="text-orange-500" />,
  Transfer: <UserPlus size={14} className="text-indigo-500" />,
  Goal: <AlertTriangle size={14} className="text-yellow-500" />,
  Attendance: <AlertTriangle size={14} className="text-red-400" />,
};

const SEVERITY_BADGE: Record<string, string> = {
  Info: "bg-blue-50 text-blue-600 border-blue-200",
  Warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function WhatsHappeningPFA() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const fetch = useCallback(() => {
    api.get<{ data: Notification[] }>("/notifications?limit=10").then((r) => {
      setNotifications(r.data.data ?? []);
      setUnread((r.data.data ?? []).filter((n: Notification) => !n.isRead).length);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, [fetch]);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/mark-read`).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnread((p) => Math.max(0, p - 1));
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-[#333333] flex items-center gap-2">
          <Bell size={15} className="text-[#006B3F]" />
          What&apos;s Happening at PFA
        </CardTitle>
        {unread > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unread}</span>
        )}
      </CardHeader>
      <CardContent className="p-0 max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No notifications</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <div key={n.id} onClick={() => !n.isRead && markRead(n.id)}
                className={`px-5 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${n.isRead ? "opacity-50" : ""}`}>
                <div className="mt-0.5">{TYPE_ICONS[n.type] ?? <Bell size={14} />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[#333333] truncate">{n.title}</p>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{n.message}</p>
                </div>
                <Badge className={`text-xs shrink-0 ${SEVERITY_BADGE[n.severity] ?? SEVERITY_BADGE.Info}`} variant="outline">
                  {n.severity}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
