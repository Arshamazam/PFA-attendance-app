"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Settings,
  ScrollText,
  ShieldCheck,
  BarChart3,
  LogOut,
  ChevronRight,
  ListChecks,
  MapPin,
  UserCog,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "System overview" },
  { label: "Geofence Zones", href: "/dashboard/geofences", icon: MapPin, description: "Manage check-in zones" },
  { label: "Employee Geofence", href: "/dashboard/employees", icon: UserCog, description: "Per-employee exemptions" },
  { label: "Admin Management", href: "/dashboard/admins", icon: Users, description: "Manage admins" },
  { label: "Dropdown Values", href: "/dashboard/dropdowns", icon: ListChecks, description: "Manage form dropdowns" },
  { label: "System Settings", href: "/dashboard/system-settings", icon: Settings, description: "System configuration" },
  { label: "Audit Logs", href: "/dashboard/audit-logs", icon: ScrollText, description: "Activity logs" },
  { label: "Security", href: "/dashboard/security", icon: ShieldCheck, description: "Security settings" },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, description: "System analytics" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div
      className="w-64 flex-shrink-0 flex flex-col h-full"
      style={{ background: "linear-gradient(180deg, #1e0533 0%, #2d0a4a 55%, #3b0764 100%)" }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-purple-900/40 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.4)" }}
        >
          <ShieldCheck size={18} className="text-purple-300" />
        </div>
        <div>
          <p className="text-white font-black text-sm leading-none">PFA System</p>
          <p className="text-purple-400 text-[11px] font-semibold mt-0.5">Super Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <div
                className="px-3 py-2.5 rounded-xl cursor-pointer transition-all group relative"
                style={
                  isActive
                    ? {
                        background: "rgba(168,85,247,0.22)",
                        border: "1px solid rgba(168,85,247,0.35)",
                        boxShadow: "0 0 10px rgba(168,85,247,0.2)",
                      }
                    : { border: "1px solid transparent" }
                }
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                    style={{ background: "linear-gradient(to bottom, #a855f7, #7c3aed)" }}
                  />
                )}
                <div className="flex items-center gap-3">
                  <Icon
                    size={18}
                    className={isActive ? "text-purple-300" : "text-purple-500 group-hover:text-purple-300 transition-colors"}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-none ${isActive ? "text-white" : "text-purple-300 group-hover:text-white transition-colors"}`}>
                      {item.label}
                    </p>
                    <p className="text-[11px] text-purple-500 mt-0.5 group-hover:text-purple-400 transition-colors">
                      {item.description}
                    </p>
                  </div>
                  {isActive && <ChevronRight size={14} className="text-purple-400 flex-shrink-0" />}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-purple-900/40">
        <div
          className="px-3 py-2.5 rounded-xl"
          style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}
        >
          <p className="text-white text-xs font-semibold truncate">{session?.user?.name ?? "Super Admin"}</p>
          <p className="text-purple-400 text-[11px] truncate">{session?.user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 flex items-center gap-1.5 text-[11px] text-purple-400 hover:text-red-400 transition-colors"
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
        <p className="text-center text-purple-600 text-[10px] mt-2">
          © 2026 Punjab Food Authority
        </p>
      </div>
    </div>
  );
}
