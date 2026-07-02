"use client";

import { useSession } from "next-auth/react";
import { Bell, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";

export default function Header({ title }: { title: string }) {
  const { data: session } = useSession();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const name = session?.user?.name ?? "Admin";
  const userInitials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/60 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
      {/* Left — breadcrumb style title */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#006B3F] to-[#00A651]" />
        <h1 className="text-base font-bold text-gray-800 tracking-tight">{title}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Live clock */}
        <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-right">
            <p className="text-[10px] text-gray-400 leading-none">{dateStr}</p>
            <p className="text-xs font-bold text-[#006B3F] tabular-nums leading-none mt-0.5">{timeStr}</p>
          </div>
        </div>

        {/* Notification bell */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:text-[#006B3F] hover:border-[#006B3F]/30 hover:bg-green-50/50 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl pl-1 pr-3 py-1 hover:border-[#006B3F]/30 transition-colors cursor-default">
          <Avatar className="h-7 w-7 ring-2 ring-[#006B3F]/30">
            <AvatarFallback className="bg-gradient-to-br from-[#006B3F] to-[#00A651] text-white text-[10px] font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-gray-800 leading-none">{name}</p>
            <p className="text-[9px] text-gray-400 mt-0.5 capitalize">{session?.user?.role ?? "admin"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
