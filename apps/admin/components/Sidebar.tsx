"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Clock,
  CalendarCheck,
  BarChart3,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/geofences", label: "Geofences", icon: MapPin },
  { href: "/attendance", label: "Attendance", icon: Clock },
  { href: "/leaves", label: "Leave Approvals", icon: CalendarCheck },
  { href: "/reports", label: "Reports", icon: BarChart3, disabled: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const name = session?.user?.name ?? "Admin";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-[#003D2E] flex flex-col z-30 shadow-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#006B3F]">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">PFA Admin</p>
          <p className="text-green-300 text-xs mt-0.5">Management Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-green-400 text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">
          Main Menu
        </p>
        {navItems.map(({ href, label, icon: Icon, disabled }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={disabled ? "#" : href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-[#006B3F] text-white"
                  : "text-green-200 hover:bg-white/10 hover:text-white",
                disabled && "opacity-40 cursor-not-allowed pointer-events-none"
              )}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
              <span>{label}</span>
              {disabled && (
                <span className="ml-auto text-[9px] bg-white/10 text-green-300 px-1.5 py-0.5 rounded">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#006B3F] text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{name}</p>
            <p className="text-green-400 text-[10px] capitalize">{session?.user?.role}</p>
          </div>
        </div>
        <Separator className="bg-white/10 mb-2" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full justify-start text-red-300 hover:text-red-200 hover:bg-red-900/20 gap-2 h-8"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
        <p className="text-center text-green-600 text-[9px] mt-2">
          © 2026 Punjab Food Authority
        </p>
      </div>
    </aside>
  );
}
