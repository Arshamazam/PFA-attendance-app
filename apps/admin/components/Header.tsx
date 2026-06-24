"use client";

import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";
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
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      <h1 className="text-lg font-bold text-[#333333]">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-500">{dateStr}</p>
          <p className="text-sm font-semibold text-[#006B3F] tabular-nums">{timeStr}</p>
        </div>
        <button className="relative text-gray-400 hover:text-[#006B3F] transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#006B3F] text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-[#333333] hidden sm:block">{name}</span>
        </div>
      </div>
    </header>
  );
}
