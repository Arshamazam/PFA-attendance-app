"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarCheck,
  BarChart3,
  LogOut,
  Megaphone,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Star,
  CalendarDays,
  MapPin,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems: { href: string; label: string; icon: React.ElementType; disabled?: boolean }[] = [
  { href: "/dashboard",           label: "Dashboard",          icon: LayoutDashboard },
  { href: "/employees",           label: "Employees",          icon: Users },
  { href: "/transfers",           label: "Transfers",          icon: ArrowLeftRight },
  { href: "/attendance",          label: "Attendance",         icon: Clock },
  { href: "/leaves",              label: "Leave Approvals",    icon: CalendarCheck },
  { href: "/performance-reviews",  label: "Performance Reviews", icon: Star },
  { href: "/employee-categories", label: "Leave Categories",    icon: CalendarDays },
  { href: "/announcements",       label: "Announcements",      icon: Megaphone },
  { href: "/reports",             label: "Reports",            icon: BarChart3 },
  { href: "/location-monitor",   label: "Location Monitor",   icon: MapPin },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const name = session?.user?.name ?? "Admin";
  const userInitials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className="fixed left-0 top-0 h-full w-60 flex flex-col z-30 shadow-2xl"
      style={{
        background: "linear-gradient(180deg, #000D07 0%, #001810 55%, #001E15 100%)",
      }}
    >
      {/* ── Branding header ────────────────────────── */}
      <div className="px-4 pt-5 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center justify-between">
          <div className="bg-white rounded-xl p-1.5 shadow-lg flex items-center justify-center w-[38px] h-[38px] shrink-0">
            <Image
              src="/govt_logo.png"
              alt="Government of Punjab"
              width={26}
              height={26}
              className="object-contain"
            />
          </div>

          <div className="text-center flex-1 px-2">
            <p className="text-white font-bold text-[11px] leading-tight tracking-wider">PFA Admin</p>
            <p className="text-emerald-500/70 text-[9px] mt-0.5 tracking-widest uppercase">Management Panel</p>
          </div>

          <div className="bg-white rounded-xl p-1.5 shadow-lg flex items-center justify-center w-[38px] h-[38px] shrink-0">
            <Image
              src="/pfa_logo.png"
              alt="Punjab Food Authority"
              width={26}
              height={26}
              className="object-contain"
            />
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-emerald-700 text-[9px] font-bold uppercase tracking-[0.2em] px-2 mb-3">
          Navigation
        </p>

        {navItems.map(({ href, label, icon: Icon, disabled }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={disabled ? "#" : href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative",
                active
                  ? "text-white"
                  : "text-green-200/40 hover:text-white hover:bg-white/[0.07]",
                disabled && "opacity-30 cursor-not-allowed pointer-events-none"
              )}
              style={active ? {
                background: "linear-gradient(90deg, rgba(0,107,63,0.85) 0%, rgba(0,107,63,0.4) 100%)",
                boxShadow: "0 4px 20px -4px rgba(0, 166, 81, 0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
              } : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-400 rounded-r-full shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              )}

              <Icon
                size={16}
                className={cn(
                  "shrink-0 transition-colors duration-150",
                  active ? "text-emerald-300" : "text-green-600 group-hover:text-emerald-400"
                )}
              />

              <span className="flex-1">{label}</span>

              {active && <ChevronRight size={12} className="text-white/40 shrink-0" />}
              {disabled && (
                <span className="text-[9px] bg-white/10 text-green-400 px-1.5 py-0.5 rounded-md">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Super Admin Portal link (super_admin only) ── */}
      {session?.user?.role === "super_admin" && (
        <div className="px-3 pb-2">
          <a
            href="http://localhost:3002/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 group"
            style={{
              background: "linear-gradient(90deg, rgba(124,58,237,0.5) 0%, rgba(168,85,247,0.3) 100%)",
              border: "1px solid rgba(168,85,247,0.4)",
              boxShadow: "0 0 12px rgba(168,85,247,0.15)",
            }}
          >
            <ShieldCheck size={15} className="text-purple-300 shrink-0" />
            <span className="text-purple-200 flex-1">Super Admin Panel</span>
            <ExternalLink size={11} className="text-purple-400 shrink-0" />
          </a>
        </div>
      )}

      {/* ── User footer ────────────────────────────── */}
      <div className="px-3 pb-4 pt-3 border-t border-white/[0.07]">
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Avatar className="h-8 w-8 shrink-0" style={{ boxShadow: "0 0 0 2px rgba(0,107,63,0.6)" }}>
            <AvatarFallback
              className="text-white text-[10px] font-bold"
              style={{ background: "linear-gradient(135deg, #006B3F 0%, #00A651 100%)" }}
            >
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-semibold truncate">{name}</p>
            <p className="text-emerald-500/70 text-[10px] capitalize mt-0.5">{session?.user?.role ?? "admin"}</p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400/60 hover:text-red-300 hover:bg-red-900/20 text-xs font-medium transition-all duration-150"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>

        <p className="text-center text-green-800 text-[9px] mt-3 tracking-wide">
          © 2026 Punjab Food Authority
        </p>
      </div>
    </aside>
  );
}
