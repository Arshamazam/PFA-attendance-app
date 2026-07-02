"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  ScrollText,
  AlertCircle,
  Settings,
  BarChart3,
  ArrowRight,
  Activity,
  Database,
  Server,
} from "lucide-react";

const STATS = [
  { label: "Total Admins", value: 0, icon: Users, gradient: "from-blue-500 to-blue-600", shadow: "rgba(59,130,246,0.35)" },
  { label: "Active Systems", value: 3, icon: Server, gradient: "from-emerald-500 to-emerald-600", shadow: "rgba(16,185,129,0.35)" },
  { label: "Audit Events", value: 0, icon: ScrollText, gradient: "from-purple-500 to-purple-600", shadow: "rgba(168,85,247,0.35)" },
  { label: "Active Alerts", value: 0, icon: AlertCircle, gradient: "from-rose-500 to-rose-600", shadow: "rgba(239,68,68,0.35)" },
];

const QUICK_ACTIONS = [
  { label: "Create Admin", description: "Add new admin user", href: "/dashboard/admins", icon: Users },
  { label: "Audit Logs", description: "View system activities", href: "/dashboard/audit-logs", icon: ScrollText },
  { label: "System Settings", description: "Configure system", href: "/dashboard/system-settings", icon: Settings },
  { label: "Analytics", description: "View system metrics", href: "/dashboard/analytics", icon: BarChart3 },
];

const SYSTEM_STATUS = [
  { name: "Backend API", status: "Operational", ok: true },
  { name: "Database", status: "Operational", ok: true },
  { name: "Storage", status: "Warning", ok: false },
  { name: "Mobile API", status: "Operational", ok: true },
];

const RECENT_ACTIVITY = [
  { text: 'System initialized', time: 'Just now' },
  { text: 'Super Admin authenticated', time: 'Just now' },
  { text: 'Audit trail started', time: 'Just now' },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-5 rounded-full flex-shrink-0"
        style={{ background: "linear-gradient(to bottom, #a855f7, #7c3aed)" }} />
      <h2 className="font-bold text-gray-800 text-base">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-purple-200 to-transparent" />
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { data: session } = useSession();

  return (
    <div className="space-y-7">
      {/* Hero banner */}
      <div
        className="rounded-2xl p-7 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e0533 0%, #4c0888 100%)" }}
      >
        <div className="absolute top-[-40px] right-[60px] w-[200px] h-[200px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
        <div className="absolute bottom-[-30px] right-[-30px] w-[150px] h-[150px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} className="text-purple-400" />
            <span className="text-purple-400 text-xs font-semibold uppercase tracking-widest">System Console</span>
          </div>
          <h1 className="text-2xl font-black text-white">
            Welcome back, {session?.user?.name?.split(" ")[0] ?? "Super Admin"}
          </h1>
          <p className="text-purple-300 text-sm mt-1">You have full system access · All actions are logged.</p>

          <div className="flex flex-wrap gap-3 mt-5">
            {QUICK_ACTIONS.slice(0, 3).map((a) => (
              <Link key={a.href} href={a.href}>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
                  style={{ background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.4)" }}>
                  <a.icon size={14} />
                  {a.label}
                  <ArrowRight size={12} className="opacity-70" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div>
        <SectionHeader title="System Overview" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-xl p-5 relative overflow-hidden transition-all hover:-translate-y-1 cursor-default"
                style={{
                  background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                  boxShadow: `0 8px 24px ${s.shadow}`,
                }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient}`} />
                <div className="absolute top-[-20px] right-[-20px] w-24 h-24 rounded-full bg-white/10" />
                <div className="relative z-10 flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white/80 text-xs font-medium">{s.label}</p>
                    <p className="text-white font-black text-3xl leading-none mt-1">{s.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* System Status */}
        <div>
          <SectionHeader title="System Status" />
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-2 border border-gray-100">
            {SYSTEM_STATUS.map((s) => (
              <div key={s.name}
                className="flex justify-between items-center px-4 py-3 rounded-xl"
                style={{ background: s.ok ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${s.ok ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.2)"}` }}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${s.ok ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className="text-sm font-medium text-gray-700">{s.name}</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.ok ? "text-emerald-700 bg-emerald-100" : "text-amber-700 bg-amber-100"}`}>
                  {s.status}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Database size={13} className="text-gray-400" />
              <span className="text-xs text-gray-400">Last checked: just now</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <SectionHeader title="Recent Activity" />
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <div className="space-y-2">
              {RECENT_ACTIVITY.map((a, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gray-50">
                  <div className="w-[3px] h-9 rounded-full flex-shrink-0 mt-0.5"
                    style={{ background: "linear-gradient(to bottom, #a855f7, #7c3aed)" }} />
                  <div>
                    <p className="text-sm text-gray-700">{a.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
              <ScrollText size={11} />
              Live audit trail — all actions recorded
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href}>
                <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-purple-200 hover:-translate-y-1 transition-all cursor-pointer shadow-sm hover:shadow-md group">
                  <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(168,85,247,0.12))", border: "1px solid rgba(168,85,247,0.2)" }}>
                    <Icon size={18} className="text-purple-600" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{a.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                  <div className="flex items-center gap-1 mt-3 text-purple-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight size={11} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
