"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Users, MapPin, CheckCircle2, Calendar, Clock,
  ArrowLeftRight, UserX, Activity, UserPlus, CalendarCheck, BarChart3,
  SlidersHorizontal, ChevronDown, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import type { Employee, LeaveRequest, AttendanceRecord } from "@/types";
import { format, parseISO } from "date-fns";

import GenderDistributionPie from "./components/GenderDistributionPie";
import AgeGenderBarChart from "./components/AgeGenderBarChart";
import OnLeaveToday from "./components/OnLeaveToday";
import EmployeesByDepartment from "./components/EmployeesByDepartment";
import WhatsHappeningPFA from "./components/WhatsHappeningPFA";
import LeaveHistory6Months from "./components/LeaveHistory6Months";
import TopEmployees from "./components/TopEmployees";
import EmployeeTransfers from "./components/EmployeeTransfers";
import PerformanceGoals from "./components/PerformanceGoals";

/* ──────────────────────────────────────────────────────── helpers */

const PIE_COLORS = ["#006B3F", "#1565C0", "#E65100", "#6A1B9A", "#2E7D32"];
const AVATAR_COLORS = [
  "#10B981", "#3B82F6", "#8B5CF6", "#F97316",
  "#14B8A6", "#F43F5E", "#6366F1",
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function avatarBg(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 65) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number | string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-2xl px-4 py-3 pointer-events-none">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black text-[#006B3F] mt-1 tabular-nums">
        {payload[0].value}
      </p>
      <p className="text-[10px] text-gray-400 -mt-0.5">check-ins</p>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-[3px] h-4 rounded-full bg-gradient-to-b from-[#006B3F] to-[#00A651]" />
      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.14em]">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-gray-300/50 to-transparent" />
    </div>
  );
}

/* ──────────────────────────────────────────────────────── page */

export default function DashboardPage() {
  const { data: session } = useSession();
  const firstName = (session?.user?.name ?? "Admin").split(" ")[0];
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [trendDays, setTrendDays] = useState<number>(7);

  const { data: employees } = useQuery({
    queryKey: ["employees-all"],
    queryFn: () => api.get<{ data: Employee[]; total: number }>("/employees?limit=1").then((r) => r.data),
  });
  const { data: geofences } = useQuery({
    queryKey: ["geofences-all"],
    queryFn: () => api.get<{ id: string; name: string }[]>("/geofence").then((r) => r.data),
  });
  const { data: departments } = useQuery({
    queryKey: ["employee-departments"],
    queryFn: () => api.get<string[]>("/employees/departments").then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  // Use the statistics endpoint for accurate PKT-based today counts
  const { data: stats } = useQuery({
    queryKey: ["attendance-stats-today", selectedZoneId, selectedDepartment],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedZoneId) params.set("zoneId", selectedZoneId);
      if (selectedDepartment) params.set("department", selectedDepartment);
      const qs = params.toString();
      return api.get<{ totalCheckIns: number; onTime: number; late: number; absent: number; totalEmployees: number }>(
        `/attendance/statistics${qs ? `?${qs}` : ""}`
      ).then((r) => r.data);
    },
    refetchInterval: 60_000,
  });
  // Use the trend endpoint for accurate chart
  const { data: trendRaw } = useQuery({
    queryKey: ["attendance-trend", trendDays, selectedZoneId, selectedDepartment],
    queryFn: () => {
      const params = new URLSearchParams({ days: String(trendDays) });
      if (selectedZoneId) params.set("zoneId", selectedZoneId);
      if (selectedDepartment) params.set("department", selectedDepartment);
      return api.get<{ date: string; total: number; onTime: number; late: number }[]>(`/attendance/trend?${params}`).then((r) => r.data);
    },
  });
  // Recent check-ins list only — small fetch, just for display
  const { data: attendance } = useQuery({
    queryKey: ["attendance-recent"],
    queryFn: () => api.get<{ data: AttendanceRecord[]; total: number }>("/attendance/all?limit=10").then((r) => r.data),
  });
  const { data: leaves } = useQuery({
    queryKey: ["leaves-pending"],
    queryFn: () => api.get<{ data: LeaveRequest[]; total: number }>("/leave/pending?limit=10").then((r) => r.data),
  });
  const { data: transfers } = useQuery({
    queryKey: ["transfers-summary"],
    queryFn: () => api.get<{ data: unknown[]; total: number }>("/employee-transfers?status=Pending").then((r) => r.data),
  });
  const { data: onLeave } = useQuery({
    queryKey: ["on-leave-today"],
    queryFn: () => api.get<{ count: number }>("/analytics/on-leave-today").then((r) => r.data),
  });
  const { data: goals } = useQuery({
    queryKey: ["goals-at-risk"],
    queryFn: () => api.get<{ percentage: number; status: string }[]>("/performance-goals").then((r) => r.data),
  });

  const todayCheckIns = stats?.totalCheckIns ?? 0;

  const trendData = (trendRaw ?? []).map((r) => ({
    day: format(new Date(r.date + "T00:00:00"), "EEE"),
    checkIns: r.total,
  }));

  const leaveTypeMap: Record<string, number> = {};
  leaves?.data?.forEach((l) => {
    leaveTypeMap[l.leaveType] = (leaveTypeMap[l.leaveType] ?? 0) + 1;
  });
  const pieData = Object.entries(leaveTypeMap).map(([name, value]) => ({ name, value }));

  const recentCheckIns = (attendance?.data ?? []).slice(0, 5);
  const recentLeaves = (leaves?.data ?? []).slice(0, 5);

  /* KPI card definitions */
  const selectedZoneName = selectedZoneId
    ? (geofences?.find((z) => z.id === selectedZoneId)?.name ?? "")
        .replace(/^Punjab Food Authority\s*/i, "").replace(/^,\s*/, "").trim()
    : "";
  const filtersActive = !!(selectedZoneId || selectedDepartment || trendDays !== 7);

  const kpiCards = [
    {
      label: (selectedZoneId || selectedDepartment) ? "Filtered Staff" : "Total Employees",
      value: (selectedZoneId || selectedDepartment) ? (stats?.totalEmployees ?? "—") : (employees?.total ?? "—"),
      sub: selectedZoneName || selectedDepartment || "Active workforce",
      icon: Users,
      gradient: "linear-gradient(135deg, #006B3F 0%, #00A651 100%)",
      shadow: "0 10px 30px -6px rgba(0,107,63,0.45)",
    },
    {
      label: "Today's Check-Ins",
      value: todayCheckIns,
      sub: format(new Date(), "EEEE"),
      icon: CheckCircle2,
      gradient: "linear-gradient(135deg, #0A6638 0%, #1A9C55 100%)",
      shadow: "0 10px 30px -6px rgba(10,102,56,0.45)",
    },
    {
      label: "On Leave Today",
      value: onLeave?.count ?? "—",
      sub: "Approved absences",
      icon: UserX,
      gradient: "linear-gradient(135deg, #C84B11 0%, #E8650A 100%)",
      shadow: "0 10px 30px -6px rgba(200,75,17,0.45)",
    },
    {
      label: "Pending Leaves",
      value: leaves?.total ?? "—",
      sub: "Awaiting approval",
      icon: Calendar,
      gradient: "linear-gradient(135deg, #C45E00 0%, #F07800 100%)",
      shadow: "0 10px 30px -6px rgba(196,94,0,0.45)",
    },
    {
      label: "Pending Transfers",
      value: transfers?.total ?? "—",
      sub: "Under review",
      icon: ArrowLeftRight,
      gradient: "linear-gradient(135deg, #0E4FA8 0%, #1976D2 100%)",
      shadow: "0 10px 30px -6px rgba(14,79,168,0.45)",
    },
    {
      label: "Geofence Zones",
      value: Array.isArray(geofences) ? geofences.length : "—",
      sub: "Monitored areas",
      icon: MapPin,
      gradient: "linear-gradient(135deg, #550E90 0%, #7B1FB8 100%)",
      shadow: "0 10px 30px -6px rgba(85,14,144,0.45)",
    },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-7">

        {/* ══════════════════════════════════════════
            HERO BANNER
        ══════════════════════════════════════════ */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "linear-gradient(135deg, #001208 0%, #002E1E 45%, #005C38 100%)" }}
        >
          {/* dot grid */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          {/* glow orbs */}
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-[#00A651]/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 left-1/3 w-48 h-48 rounded-full bg-[#006B3F]/20 blur-2xl pointer-events-none" />

          <div className="relative px-7 py-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">

              {/* ── Greeting + Quick Actions */}
              <div>
                <p className="text-emerald-400/70 text-sm font-medium">{getGreeting()},</p>
                <h2 className="text-white text-3xl font-black mt-0.5 tracking-tight leading-tight">
                  {firstName} 👋
                </h2>
                <p className="text-white/30 text-sm mt-1.5">
                  {format(new Date(), "EEEE, MMMM do, yyyy")}
                </p>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 mt-5">
                  {[
                    { label: "Add Employee", href: "/employees/add", icon: UserPlus, primary: true },
                    { label: "Review Leaves", href: "/leaves", icon: CalendarCheck },
                    { label: "Manage Zones", href: "/geofences", icon: MapPin },
                    { label: "Reports", href: "/reports", icon: BarChart3 },
                  ].map(({ label, href, icon: Ic, primary }) => (
                    <Link key={label} href={href}>
                      <span
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-semibold rounded-xl border transition-all duration-150 cursor-pointer hover:-translate-y-0.5"
                        style={primary ? {
                          background: "rgba(0,107,63,0.85)",
                          borderColor: "rgba(0,166,81,0.4)",
                          color: "white",
                          boxShadow: "0 4px 14px rgba(0,107,63,0.4)",
                        } : {
                          background: "rgba(255,255,255,0.07)",
                          borderColor: "rgba(255,255,255,0.12)",
                          color: "rgba(255,255,255,0.7)",
                        }}
                      >
                        <Ic size={11} />
                        {label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* ── Snapshot Stats */}
              <div className="flex items-center gap-5 sm:gap-8 shrink-0 sm:self-center">
                {[
                  { label: "Check-Ins", value: stats?.totalCheckIns ?? 0, sub: selectedZoneName || selectedDepartment || "today" },
                  { label: "Leaves", value: leaves?.total ?? 0, sub: "pending" },
                  { label: "Staff", value: stats?.totalEmployees ?? employees?.total ?? 0, sub: selectedZoneName || selectedDepartment || "total" },
                ].map(({ label, value, sub }, i) => (
                  <React.Fragment key={label}>
                    {i > 0 && <div className="w-px h-14 bg-white/10" />}
                    <div className="text-center">
                      <p className="text-emerald-500/60 text-[9px] font-bold uppercase tracking-[0.18em]">{label}</p>
                      <p className="text-white text-4xl font-black tabular-nums mt-1 leading-none">{value}</p>
                      <p className="text-white/25 text-[10px] mt-1">{sub}</p>
                    </div>
                  </React.Fragment>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            FILTER BAR
        ══════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <div className="flex flex-wrap items-end gap-4">

            {/* Label */}
            <div className="flex items-center gap-1.5 pb-2 shrink-0">
              <SlidersHorizontal size={13} className="text-[#006B3F]" />
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Filters</span>
            </div>

            {/* District / Zone */}
            <div className="flex flex-col gap-1 min-w-[170px]">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">District / Zone</label>
              <div className="relative">
                <select
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-8 text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#006B3F]/20 focus:border-[#006B3F] cursor-pointer"
                >
                  <option value="">All Districts</option>
                  {Array.isArray(geofences) && geofences.map((zone) => {
                    if (!zone?.id) return null;
                    const label = (zone.name ?? "")
                      .replace(/^Punjab Food Authority\s*/i, "")
                      .replace(/^,\s*/, "").trim() || zone.name;
                    return <option key={zone.id} value={zone.id}>{label}</option>;
                  })}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Department */}
            <div className="flex flex-col gap-1 min-w-[170px]">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">Department</label>
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-8 text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#006B3F]/20 focus:border-[#006B3F] cursor-pointer"
                >
                  <option value="">All Departments</option>
                  {Array.isArray(departments) && departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Chart Period */}
            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">Chart Period</label>
              <div className="relative">
                <select
                  value={trendDays}
                  onChange={(e) => setTrendDays(Number(e.target.value))}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-8 text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#006B3F]/20 focus:border-[#006B3F] cursor-pointer"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={14}>Last 14 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 90 Days</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Reset */}
            {filtersActive && (
              <button
                onClick={() => { setSelectedZoneId(""); setSelectedDepartment(""); setTrendDays(7); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-500 text-[12px] font-semibold hover:bg-red-100 transition-colors border border-red-100 mb-0.5"
              >
                <X size={11} /> Clear All
              </button>
            )}
          </div>

          {/* Active filter badges */}
          {filtersActive && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50">
              <span className="text-[11px] text-gray-400 font-medium self-center">Active:</span>
              {selectedZoneName && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#006B3F]/10 text-[#006B3F] text-[12px] font-semibold cursor-pointer hover:bg-[#006B3F]/20"
                  onClick={() => setSelectedZoneId("")}
                >
                  <MapPin size={10} /> {selectedZoneName} <X size={9} />
                </span>
              )}
              {selectedDepartment && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-[12px] font-semibold cursor-pointer hover:bg-blue-100"
                  onClick={() => setSelectedDepartment("")}
                >
                  <Users size={10} /> {selectedDepartment} <X size={9} />
                </span>
              )}
              {trendDays !== 7 && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 text-[12px] font-semibold cursor-pointer hover:bg-purple-100"
                  onClick={() => setTrendDays(7)}
                >
                  <Clock size={10} /> Last {trendDays} days <X size={9} />
                </span>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════
            KPI TILES
        ══════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {kpiCards.map(({ label, value, sub, icon: Icon, gradient, shadow }) => (
            <div
              key={label}
              className="rounded-2xl p-5 relative overflow-hidden text-white transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] cursor-default"
              style={{ background: gradient, boxShadow: shadow }}
            >
              {/* Decorative circles */}
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute -right-2 bottom-2 w-16 h-16 rounded-full bg-white/[0.06] pointer-events-none" />
              <div className="absolute left-3 bottom-0 w-8 h-8 rounded-full bg-white/[0.04] pointer-events-none" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white/60 text-[11px] font-semibold uppercase tracking-widest truncate">
                    {label}
                  </p>
                  <p className="text-[2.6rem] font-black mt-2 tabular-nums leading-none tracking-tight">
                    {value}
                  </p>
                  <p className="text-white/50 text-xs mt-2">{sub}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm shrink-0">
                  <Icon size={22} className="text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            CHARTS — Trend + Leave Breakdown
        ══════════════════════════════════════════ */}
        <div>
          <SectionHeader label="Analytics" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            {/* Area Chart */}
            <Card className="lg:col-span-2 border-0 shadow-md rounded-2xl bg-white overflow-hidden">
              <CardHeader className="pb-0 pt-5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Activity size={14} className="text-[#006B3F]" />
                  Attendance — Last {trendDays} Days
                </CardTitle>
                <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-lg">
                  {trendDays}d view
                </span>
              </CardHeader>
              <CardContent className="px-2 pb-4 pt-3">
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={trendData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#006B3F" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#006B3F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="checkIns"
                      stroke="#006B3F"
                      strokeWidth={2.5}
                      fill="url(#areaGrad)"
                      dot={{ r: 4, fill: "#006B3F", stroke: "#fff", strokeWidth: 2.5 }}
                      activeDot={{ r: 7, fill: "#fff", stroke: "#006B3F", strokeWidth: 2.5 }}
                      name="Check-Ins"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Leave Donut */}
            <Card className="border-0 shadow-md rounded-2xl bg-white overflow-hidden">
              <CardHeader className="pb-0 pt-5 px-5">
                <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Calendar size={14} className="text-[#006B3F]" />
                  Leave Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3 pt-1">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="46%"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[230px] flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Calendar size={28} className="opacity-30" />
                    <p className="text-sm">No pending leaves</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            DISTRIBUTIONS
        ══════════════════════════════════════════ */}
        <div>
          <SectionHeader label="Workforce Breakdown" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <GenderDistributionPie />
            <AgeGenderBarChart />
          </div>
        </div>

        {/* ══════════════════════════════════════════
            DEPARTMENT + ON LEAVE
        ══════════════════════════════════════════ */}
        <div>
          <SectionHeader label="Department Overview" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <EmployeesByDepartment />
            <OnLeaveToday />
          </div>
        </div>

        {/* ══════════════════════════════════════════
            NOTIFICATIONS
        ══════════════════════════════════════════ */}
        <div>
          <SectionHeader label="Activity Feed" />
          <div className="mt-4">
            <WhatsHappeningPFA />
          </div>
        </div>

        {/* ══════════════════════════════════════════
            LEAVE HISTORY
        ══════════════════════════════════════════ */}
        <div>
          <SectionHeader label="Leave History" />
          <div className="mt-4">
            <LeaveHistory6Months />
          </div>
        </div>

        {/* ══════════════════════════════════════════
            TOP EMPLOYEES
        ══════════════════════════════════════════ */}
        <div>
          <SectionHeader label="Leaderboard" />
          <div className="mt-4">
            <TopEmployees />
          </div>
        </div>

        {/* ══════════════════════════════════════════
            RECENT ACTIVITY
        ══════════════════════════════════════════ */}
        <div>
          <SectionHeader label="Recent Activity" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">

            {/* Recent Check-Ins */}
            <Card className="border-0 shadow-md rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pb-2 pt-5 px-5 border-b border-gray-50">
                <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Clock size={14} className="text-[#006B3F]" />
                  Recent Check-Ins
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentCheckIns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                    <Clock size={26} className="opacity-30" />
                    <p className="text-sm">No records yet</p>
                  </div>
                ) : (
                  <div>
                    {recentCheckIns.map((r, idx) => {
                      const empName = r.employee?.name ?? "—";
                      const h = new Date(r.checkInTime).getHours();
                      const m = new Date(r.checkInTime).getMinutes();
                      const isLate = h > 9 || (h === 9 && m > 0);
                      const bg = avatarBg(empName);
                      return (
                        <div
                          key={r.id}
                          className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/80 transition-colors"
                          style={{ borderBottom: idx < recentCheckIns.length - 1 ? "1px solid #F8FAFC" : "none" }}
                        >
                          {/* Left status bar */}
                          <div
                            className="w-[3px] h-9 rounded-full shrink-0"
                            style={{ background: isLate ? "#F97316" : "#10B981" }}
                          />
                          {/* Avatar */}
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                            style={{ background: bg, boxShadow: `0 3px 8px ${bg}55` }}
                          >
                            {initials(empName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{empName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {format(parseISO(r.checkInTime), "dd MMM, h:mm a")}
                            </p>
                          </div>
                          <Badge
                            className={isLate
                              ? "bg-orange-50 text-orange-600 border-orange-200 text-[11px] font-semibold"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold"}
                            variant="outline"
                          >
                            {isLate ? "Late" : "On Time"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Leaves */}
            <Card className="border-0 shadow-md rounded-2xl overflow-hidden bg-white">
              <CardHeader className="pb-2 pt-5 px-5 border-b border-gray-50">
                <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Calendar size={14} className="text-[#006B3F]" />
                  Pending Leave Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                    <Calendar size={26} className="opacity-30" />
                    <p className="text-sm">No pending requests</p>
                  </div>
                ) : (
                  <div>
                    {recentLeaves.map((l, idx) => {
                      const empName = l.employee?.name ?? "—";
                      const bg = avatarBg(empName);
                      return (
                        <div
                          key={l.id}
                          className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/80 transition-colors"
                          style={{ borderBottom: idx < recentLeaves.length - 1 ? "1px solid #F8FAFC" : "none" }}
                        >
                          <div className="w-[3px] h-9 rounded-full bg-amber-400 shrink-0" />
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                            style={{ background: bg, boxShadow: `0 3px 8px ${bg}55` }}
                          >
                            {initials(empName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{empName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {format(parseISO(l.startDate), "dd MMM")} – {format(parseISO(l.endDate), "dd MMM")}
                              {" · "}
                              <span className="italic text-gray-400">{l.leaveType}</span>
                            </p>
                          </div>
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] font-semibold" variant="outline">
                            Pending
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* ══════════════════════════════════════════
            TRANSFERS + GOALS
        ══════════════════════════════════════════ */}
        <div>
          <SectionHeader label="Transfers & Performance" />
          <div className="space-y-4 mt-4">
            <EmployeeTransfers />
            <PerformanceGoals />
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
