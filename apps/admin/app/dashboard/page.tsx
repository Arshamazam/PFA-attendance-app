"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Users, MapPin, CheckCircle2, Calendar, Clock, UserPlus, TrendingUp, TrendingDown,
  SlidersHorizontal, ChevronDown, X, Gift, Briefcase, BarChart3, CalendarCheck,
  ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { Employee, LeaveRequest, AttendanceRecord } from "@/types";
import { format, parseISO, differenceInDays } from "date-fns";

/* ── constants ─────────────────────────────────────────── */
const G = "#006B3F";
const BACKEND_URL = "http://187.127.125.215:3000";
const PIE_COLORS = [G, "#1565C0", "#E65100", "#6A1B9A", "#2E7D32", "#00838F", "#AD1457", "#F57F17", "#37474F"];
const AVATAR_COLORS = ["#10B981","#3B82F6","#8B5CF6","#F97316","#14B8A6","#F43F5E","#6366F1"];

function avatarBg(name: string) { return AVATAR_COLORS[(name.charCodeAt(0) ?? 65) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2); }

/* ── Gauge ──────────────────────────────────────────────── */
function AttendanceGauge({ pct }: { pct: number }) {
  const r = 64, cx = 100, cy = 86;
  const safe = Math.min(Math.max(pct, 0), 100);
  const angle = -Math.PI + (safe / 100) * Math.PI;
  const endX = cx + r * Math.cos(angle);
  const endY = cy + r * Math.sin(angle);
  const largeArc = safe > 50 ? 1 : 0;
  const stroke = safe >= 90 ? "#10B981" : safe >= 75 ? "#F59E0B" : "#EF4444";
  return (
    <svg viewBox="0 0 200 106" className="w-full max-w-[210px] mx-auto">
      <path d={`M ${cx-r},${cy} A ${r},${r} 0 0 1 ${cx+r},${cy}`} stroke="#F1F5F9" strokeWidth="15" fill="none" strokeLinecap="round" />
      {safe > 1 && (
        <path d={`M ${cx-r},${cy} A ${r},${r} 0 ${largeArc} 1 ${endX.toFixed(1)},${endY.toFixed(1)}`} stroke={stroke} strokeWidth="15" fill="none" strokeLinecap="round" />
      )}
      <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 22, fontWeight: 800, fill: "#1E293B" }}>{safe.toFixed(1)}%</text>
      <text x={cx} y={cx + 12} textAnchor="middle" style={{ fontSize: 9, fill: "#94A3B8", fontWeight: 600, letterSpacing: 1 }}>ATTENDANCE RATE</text>
      <text x={cx-r} y={cy+16} textAnchor="middle" style={{ fontSize: 8, fill: "#CBD5E1" }}>0%</text>
      <text x={cx+r} y={cy+16} textAnchor="middle" style={{ fontSize: 8, fill: "#CBD5E1" }}>100%</text>
    </svg>
  );
}

/* ── KPI Card ───────────────────────────────────────────── */
function MetricCard({ label, value, sub, trend, trendUp, icon: Icon, iconBg, iconColor }: {
  label: string; value: string | number; sub?: string;
  trend?: string; trendUp?: boolean;
  icon: React.ElementType; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon size={20} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-2xl font-black text-gray-800 mt-0.5 tabular-nums leading-none">{value}</p>
        {(sub || trend) && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {trend && (
              <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
                {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {trend}
              </span>
            )}
            {sub && <span className="text-[11px] text-gray-400">{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Card shell ─────────────────────────────────────────── */
function DCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>{children}</div>;
}
function DCardHead({ title, badge, action }: { title: string; badge?: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 pt-5 pb-3 flex items-center justify-between">
      <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      <div className="flex items-center gap-2">
        {badge && <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{badge}</span>}
        {action}
      </div>
    </div>
  );
}

/* ── Custom tooltip ─────────────────────────────────────── */
function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-gray-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { data: session } = useSession();
  const firstName = (session?.user?.name ?? "Admin").split(" ")[0];

  /* filters */
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");
  const [fromDate, setFromDate] = useState(today);
  const [toDate,   setToDate]   = useState(today);

  const handleFromChange = (val: string) => {
    setFromDate(val);
    if (val > toDate) setToDate(val);
  };

  const isToday = fromDate === today && toDate === today;
  const trendDays = Math.min(90, Math.max(1, differenceInDays(new Date(toDate + "T00:00:00"), new Date(fromDate + "T00:00:00")) + 1));

  const filtersActive = !!(selectedZoneId || selectedDepartment || !isToday);

  /* queries */
  const { data: employees } = useQuery({
    queryKey: ["employees-all"],
    queryFn: () => api.get<{ data: Employee[]; total: number }>("/employees?limit=1").then(r => r.data),
  });
  const { data: geofences } = useQuery({
    queryKey: ["geofences-all"],
    queryFn: () => api.get<{ id: string; name: string }[]>("/geofence").then(r => r.data),
  });
  const { data: departments } = useQuery({
    queryKey: ["employee-departments"],
    queryFn: () => api.get<string[]>("/employees/departments").then(r => r.data),
    staleTime: 5 * 60_000,
  });
  const { data: summary } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => api.get<{ totalEmployees: number; activeEmployees: number; newHiresThisMonth: number; statusBreakdown: Record<string, number> }>("/analytics/summary").then(r => r.data),
  });
  const { data: stats } = useQuery({
    queryKey: ["attendance-stats", fromDate, selectedZoneId, selectedDepartment],
    queryFn: () => {
      const p = new URLSearchParams();
      if (!isToday) p.set("date", fromDate);
      if (selectedZoneId) p.set("zoneId", selectedZoneId);
      if (selectedDepartment) p.set("department", selectedDepartment);
      const qs = p.toString();
      return api.get<{
        totalCheckIns: number; onTime: number; late: number; absent: number; totalEmployees: number;
        byDepartment: { dept: string; onTime: number; late: number }[];
      }>(`/attendance/statistics${qs ? `?${qs}` : ""}`).then(r => r.data);
    },
    refetchInterval: isToday ? 60_000 : false,
  });
  const { data: trendRaw } = useQuery({
    queryKey: ["attendance-trend", fromDate, toDate, trendDays, selectedZoneId, selectedDepartment],
    queryFn: () => {
      const p = new URLSearchParams({ days: String(trendDays) });
      if (selectedZoneId) p.set("zoneId", selectedZoneId);
      if (selectedDepartment) p.set("department", selectedDepartment);
      return api.get<{ date: string; total: number; onTime: number; late: number }[]>(`/attendance/trend?${p}`).then(r => r.data);
    },
  });
  const { data: leaves } = useQuery({
    queryKey: ["leaves-pending"],
    queryFn: () => api.get<{ data: LeaveRequest[]; total: number }>("/leave/pending?limit=10").then(r => r.data),
  });
  const { data: allLeaves } = useQuery({
    queryKey: ["leaves-all-summary"],
    queryFn: () => api.get<{ data: LeaveRequest[]; total: number }>("/leave/all?limit=200").then(r => r.data).catch(() => null),
  });
  const { data: deptData } = useQuery({
    queryKey: ["analytics-dept"],
    queryFn: () => api.get<{ department: string; count: number; percentage: number }[]>("/analytics/employees-by-department").then(r => r.data),
  });
  const { data: genderData } = useQuery({
    queryKey: ["analytics-gender"],
    queryFn: () => api.get<{ male: number; female: number; other: number; total: number }>("/analytics/gender-count").then(r => r.data),
  });
  const { data: monthlyHires } = useQuery({
    queryKey: ["analytics-monthly-hires"],
    queryFn: () => api.get<{ month: string; newHires: number; exits: number }[]>("/analytics/monthly-hires-exits?months=6").then(r => r.data),
  });
  const { data: birthdays } = useQuery({
    queryKey: ["analytics-birthdays"],
    queryFn: () => api.get<{ id: string; name: string; department: string; designation: string; date: string; daysUntil: number }[]>("/analytics/upcoming-birthdays?days=30").then(r => r.data),
  });
  const { data: attendance } = useQuery({
    queryKey: ["attendance-recent"],
    queryFn: () => api.get<{ data: AttendanceRecord[]; total: number }>("/attendance/all?limit=8").then(r => r.data),
    refetchInterval: 60_000,
  });

  /* derived */
  const selectedZoneName = selectedZoneId
    ? (geofences?.find(z => z.id === selectedZoneId)?.name ?? "").replace(/^Punjab Food Authority\s*/i, "").replace(/^,\s*/, "").trim()
    : "";

  const todayCheckIns = stats?.totalCheckIns ?? 0;
  const totalEmp = (selectedZoneId || selectedDepartment) ? (stats?.totalEmployees ?? 0) : (employees?.total ?? 0);
  const avgAttPct = stats && stats.totalEmployees > 0 ? (stats.totalCheckIns / stats.totalEmployees) * 100 : 0;

  const trendData = (trendRaw ?? []).map(r => ({
    day: format(new Date(r.date + "T00:00:00"), trendDays <= 14 ? "EEE dd" : "dd MMM"),
    onTime: r.onTime, late: r.late, total: r.total,
  }));

  const todayVal = trendRaw?.[trendRaw.length - 1]?.total ?? 0;
  const yestVal  = trendRaw?.[trendRaw.length - 2]?.total ?? 0;
  const checkInTrend = yestVal > 0 ? `${((todayVal - yestVal) / yestVal * 100).toFixed(0)}% vs yesterday` : undefined;

  const genderPie = genderData ? [
    { name: "Male",   value: genderData.male   },
    { name: "Female", value: genderData.female },
    ...(genderData.other > 0 ? [{ name: "Other", value: genderData.other }] : []),
  ] : [];

  const statusBars = Object.entries(summary?.statusBreakdown ?? {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxStatus = statusBars[0]?.[1] ?? 1;

  const leaveApproved = allLeaves?.data?.filter(l => (l as any).status === "approved").length ?? 0;
  const leavePending  = leaves?.total ?? 0;
  const leaveRejected = allLeaves?.data?.filter(l => (l as any).status === "rejected").length ?? 0;
  const leaveTotal    = leaveApproved + leavePending + leaveRejected || 1;

  const deptAttendance = (stats?.byDepartment ?? [])
    .filter(d => d.onTime + d.late > 0)
    .sort((a, b) => (b.onTime + b.late) - (a.onTime + a.late))
    .slice(0, 6);

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-5">

        {/* ── Page Header ────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-800">HR Dashboard</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">Welcome back, {firstName} — here&apos;s your workforce overview</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-400 font-medium">
              {format(new Date(), "EEEE, dd MMM yyyy")}
            </span>
            <Link href="/reports">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                <BarChart3 size={12} /> Reports
              </span>
            </Link>
            <Link href="/employees/add">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white transition-colors" style={{ background: G }}>
                <UserPlus size={12} /> Add Employee
              </span>
            </Link>
          </div>
        </div>

        {/* ── Filter Bar ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-1.5 pb-2 shrink-0">
              <SlidersHorizontal size={13} className="text-[#006B3F]" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filters</span>
            </div>

            {[
              {
                label: "District / Zone", value: selectedZoneId, onChange: setSelectedZoneId,
                options: Array.isArray(geofences) ? geofences.map(z => ({
                  value: z.id,
                  label: (z.name ?? "").replace(/^Punjab Food Authority\s*/i, "").replace(/^,\s*/, "").trim() || z.name,
                })) : [],
                placeholder: "All Districts",
              },
              {
                label: "Department", value: selectedDepartment, onChange: setSelectedDepartment,
                options: Array.isArray(departments) ? departments.map(d => ({ value: d, label: d })) : [],
                placeholder: "All Departments",
              },
            ].map(({ label, value, onChange, options, placeholder }) => (
              <div key={label} className="flex flex-col gap-1 min-w-[155px]">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">{label}</label>
                <div className="relative">
                  <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-8 text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#006B3F]/20 focus:border-[#006B3F] cursor-pointer"
                  >
                    {placeholder && <option value="">{placeholder}</option>}
                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">Date Range</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <Calendar size={13} className="text-gray-400 shrink-0" />
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">From</span>
                    <input
                      type="date"
                      value={fromDate}
                      max={today}
                      onChange={e => handleFromChange(e.target.value)}
                      className="text-[12px] font-semibold text-gray-700 bg-transparent outline-none cursor-pointer"
                    />
                  </div>
                  <span className="text-gray-300 text-xs">→</span>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">To</span>
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate}
                      max={today}
                      onChange={e => setToDate(e.target.value)}
                      className="text-[12px] font-semibold text-gray-700 bg-transparent outline-none cursor-pointer"
                    />
                  </div>
                </div>
                {!isToday && (
                  <button onClick={() => { setFromDate(today); setToDate(today); }} className="ml-1 text-gray-400 hover:text-red-400" title="Reset to today">
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>

            {filtersActive && (
              <button
                onClick={() => { setSelectedZoneId(""); setSelectedDepartment(""); setFromDate(today); setToDate(today); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-500 text-[12px] font-semibold hover:bg-red-100 border border-red-100 mb-0.5"
              >
                <X size={11} /> Clear All
              </button>
            )}
          </div>

          {filtersActive && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50">
              <span className="text-[11px] text-gray-400 font-medium self-center">Active:</span>
              {selectedZoneName && (
                <span onClick={() => setSelectedZoneId("")} className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[12px] font-semibold hover:bg-emerald-100">
                  <MapPin size={9} /> {selectedZoneName} <X size={9} />
                </span>
              )}
              {selectedDepartment && (
                <span onClick={() => setSelectedDepartment("")} className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-[12px] font-semibold hover:bg-blue-100">
                  <Briefcase size={9} /> {selectedDepartment} <X size={9} />
                </span>
              )}
              {!isToday && (
                <span onClick={() => { setFromDate(today); setToDate(today); }} className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 text-[12px] font-semibold hover:bg-purple-100">
                  <Calendar size={9} />
                  {fromDate === toDate ? format(new Date(fromDate + "T00:00:00"), "dd MMM yyyy") : `${format(new Date(fromDate + "T00:00:00"), "dd MMM")} – ${format(new Date(toDate + "T00:00:00"), "dd MMM yyyy")}`}
                  <X size={9} />
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── KPI Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard label="Total Employees" value={totalEmp.toLocaleString()} sub="workforce" icon={Users} iconBg="#EFF6FF" iconColor="#1D4ED8" />
          <MetricCard label="Active Employees" value={(summary?.activeEmployees ?? stats?.totalEmployees ?? "—").toLocaleString()}
            sub={`${summary && employees?.total ? Math.round(summary.activeEmployees / employees.total * 100) : "—"}% of total`}
            icon={CheckCircle2} iconBg="#F0FDF4" iconColor="#16A34A" />
          <MetricCard label="New Hires" value={summary?.newHiresThisMonth ?? "—"} sub="this month"
            icon={UserPlus} iconBg="#FFF7ED" iconColor="#EA580C" />
          <MetricCard label="Today's Check-ins" value={todayCheckIns.toLocaleString()}
            trend={checkInTrend} trendUp={(todayVal - yestVal) >= 0}
            sub={format(new Date(), "EEE")} icon={CalendarCheck} iconBg="#F0FDF4" iconColor={G} />
          <MetricCard label="Late Today" value={(stats?.late ?? "—").toLocaleString()}
            sub={stats ? `${stats.onTime} on time` : "loading"}
            icon={BarChart3} iconBg="#FFF7ED" iconColor="#EA580C" />
        </div>

        {/* ── Row 1: Department · Gender · Status ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Employee Overview */}
          <DCard>
            <DCardHead title="Employee Overview" badge="by dept" />
            <div className="px-4 pb-4">
              {deptData && deptData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={deptData.slice(0, 7)} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="count" nameKey="department">
                        {deptData.slice(0, 7).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-1">
                    {deptData.slice(0, 4).map((d, i) => (
                      <div key={d.department} className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-gray-600 truncate max-w-[130px]">{d.department}</span>
                        </div>
                        <span className="font-bold text-gray-700 tabular-nums">{d.count} <span className="text-gray-400 font-normal">({d.percentage}%)</span></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No data</div>
              )}
            </div>
          </DCard>

          {/* Gender Diversity */}
          <DCard>
            <DCardHead title="Gender Diversity" />
            <div className="px-4 pb-4">
              {genderData && genderData.total > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={genderPie} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value" nameKey="name">
                        <Cell fill="#3B82F6" />
                        <Cell fill="#EC4899" />
                        <Cell fill="#94A3B8" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-1">
                    {genderPie.map((g, i) => (
                      <div key={g.name} className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: i === 0 ? "#3B82F6" : i === 1 ? "#EC4899" : "#94A3B8" }} />
                          <span className="text-gray-600">{g.name}</span>
                        </div>
                        <span className="font-bold text-gray-700 tabular-nums">
                          {g.value} <span className="text-gray-400 font-normal">({genderData.total > 0 ? Math.round(g.value / genderData.total * 100) : 0}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No data</div>
              )}
            </div>
          </DCard>

          {/* Employee Status */}
          <DCard>
            <DCardHead title="Employee Status" />
            <div className="px-5 pb-5 pt-2">
              {statusBars.length > 0 ? (
                <div className="space-y-4 mt-2">
                  {statusBars.map(([status, count], i) => (
                    <div key={status}>
                      <div className="flex items-center justify-between text-[12px] mb-1.5">
                        <span className="text-gray-600 font-medium">{status}</span>
                        <span className="font-bold text-gray-800 tabular-nums">{count.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.round(count / maxStatus * 100)}%`,
                            background: i === 0 ? "#10B981" : i === 1 ? "#F59E0B" : i === 2 ? "#6366F1" : i === 3 ? "#EF4444" : "#94A3B8",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No data</div>
              )}
            </div>
          </DCard>
        </div>

        {/* ── Row 2: Dept Headcount · Monthly Hires · Leave ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Department Headcount */}
          <DCard>
            <DCardHead title="Department Headcount" />
            <div className="pb-3">
              {deptData && deptData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deptData.slice(0, 6)} margin={{ top: 8, right: 16, left: -24, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="department" tick={{ fontSize: 9, fill: "#94A3B8" }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]}>
                      {deptData.slice(0, 6).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">No data</div>
              )}
            </div>
          </DCard>

          {/* Monthly New Hires vs Exits */}
          <DCard>
            <DCardHead title="Monthly New Hires vs Exits" />
            <div className="pb-3">
              {monthlyHires && monthlyHires.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyHires} margin={{ top: 8, right: 16, left: -24, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="newHires" name="New Hires" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: "#10B981" }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="exits" name="Exits" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4, fill: "#EF4444" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">No data</div>
              )}
            </div>
          </DCard>

          {/* Leave Summary */}
          <DCard>
            <DCardHead title="Leave Summary" />
            <div className="px-5 pb-5 space-y-3 mt-1">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Total Requests</p>
                  <p className="text-2xl font-black text-gray-800 tabular-nums">{leaveTotal - 1 || 0}</p>
                </div>
                <Calendar size={28} className="text-gray-200" />
              </div>
              {[
                { label: "Approved", value: leaveApproved, pct: Math.round(leaveApproved / leaveTotal * 100), color: "#10B981", bg: "#F0FDF4", text: "#065F46" },
                { label: "Pending",  value: leavePending,  pct: Math.round(leavePending  / leaveTotal * 100), color: "#F59E0B", bg: "#FFFBEB", text: "#92400E" },
                { label: "Rejected", value: leaveRejected, pct: Math.round(leaveRejected / leaveTotal * 100), color: "#EF4444", bg: "#FEF2F2", text: "#991B1B" },
              ].map(({ label, value, pct, color, bg, text }) => (
                <div key={label} className="flex items-center justify-between p-3 rounded-xl" style={{ background: bg }}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>{label}</p>
                    <p className="text-xl font-black tabular-nums" style={{ color: text }}>{value}</p>
                  </div>
                  <span className="text-[13px] font-bold" style={{ color }}>{pct}%</span>
                </div>
              ))}
            </div>
          </DCard>
        </div>

        {/* ── Row 3: Gauge · On-Time vs Late Trend · Department Punctuality ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Attendance Gauge */}
          <DCard>
            <DCardHead title="Attendance Overview" badge={isToday ? "today" : format(new Date(fromDate + "T00:00:00"), "dd MMM")} />
            <div className="px-5 pb-5">
              <AttendanceGauge pct={avgAttPct} />
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: "Present", value: stats?.totalCheckIns ?? 0, color: "#10B981" },
                  { label: "Late",    value: stats?.late ?? 0,          color: "#F97316" },
                  { label: "Absent",  value: stats?.absent ?? 0,        color: "#EF4444" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-2 rounded-xl bg-gray-50">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
                    <p className="text-lg font-black tabular-nums" style={{ color }}>{value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </DCard>

          {/* On-Time vs Late Trend — stacked bar */}
          <DCard>
            <DCardHead title={`On Time vs Late — Last ${trendDays} Days`} badge={`${trendDays}d`} />
            <div className="pb-3">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trendData} margin={{ top: 8, right: 16, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                    <Bar dataKey="onTime" name="On Time" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="late"   name="Late"    stackId="a" fill="#F97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">No data</div>
              )}
            </div>
          </DCard>

          {/* Department Punctuality */}
          <DCard>
            <DCardHead
              title="Department Punctuality"
              badge={isToday ? "today" : format(new Date(fromDate + "T00:00:00"), "dd MMM")}
            />
            <div className="px-5 pb-5 space-y-4 mt-1">
              {deptAttendance.length > 0 ? deptAttendance.map(d => {
                const total = d.onTime + d.late;
                const pct = Math.round(d.onTime / total * 100);
                const textColor = pct >= 80 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";
                return (
                  <div key={d.dept}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] text-gray-600 font-medium truncate max-w-[150px]">{d.dept}</span>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: textColor }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                      <div style={{ width: `${pct}%`, background: "#10B981" }} className="h-full transition-all duration-700" />
                      <div style={{ width: `${100 - pct}%`, background: "#F97316" }} className="h-full transition-all duration-700" />
                    </div>
                    <div className="flex justify-between text-[10px] mt-0.5">
                      <span className="text-emerald-600 font-medium">{d.onTime} on time</span>
                      <span className="text-orange-500 font-medium">{d.late} late</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="h-40 flex flex-col items-center justify-center text-gray-300 gap-2">
                  <BarChart3 size={22} className="opacity-40" />
                  <p className="text-sm">No check-in data for selected period</p>
                </div>
              )}
            </div>
          </DCard>
        </div>

        {/* ── Row 4: Pending Leave Requests · Upcoming Birthdays ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Pending Leave Requests — 2/3 width */}
          <DCard className="lg:col-span-2">
            <DCardHead
              title="Pending Leave Requests"
              badge={leavePending > 0 ? `${leavePending} pending` : undefined}
              action={
                <Link href="/leave">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#006B3F] hover:underline">
                    View all <ArrowRight size={10} />
                  </span>
                </Link>
              }
            />
            <div className="overflow-x-auto">
              {(leaves?.data ?? []).length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {["Employee", "Type", "Duration", "Reason", ""].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(leaves?.data ?? []).slice(0, 7).map(l => {
                      const la = l as any;
                      const empName = la.employee?.name ?? "—";
                      const start = la.startDate ? parseISO(la.startDate) : null;
                      const end   = la.endDate   ? parseISO(la.endDate)   : null;
                      const days  = start && end  ? differenceInDays(end, start) + 1 : null;
                      return (
                        <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                style={{ background: avatarBg(empName) }}>
                                {initials(empName)}
                              </div>
                              <span className="text-[13px] font-semibold text-gray-800 truncate max-w-[130px]">{empName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 whitespace-nowrap">
                              {la.leaveType ?? "Leave"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-gray-500 whitespace-nowrap">
                            {start && end ? (
                              <>{format(start, "dd MMM")} → {format(end, "dd MMM")} <span className="font-semibold text-gray-700">({days}d)</span></>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-[12px] text-gray-500">
                            <span className="block truncate max-w-[180px]">{la.reason ?? "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Link href="/leave">
                              <span className="text-[11px] font-semibold text-[#006B3F] hover:underline whitespace-nowrap">Review</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300">
                  <CheckCircle2 size={24} className="opacity-40" />
                  <p className="text-sm">No pending leave requests</p>
                </div>
              )}
            </div>
          </DCard>

          {/* Upcoming Birthdays */}
          <DCard>
            <DCardHead title="Upcoming Birthdays" badge="next 30 days" />
            <div className="divide-y divide-gray-50">
              {birthdays && birthdays.length > 0 ? birthdays.slice(0, 5).map(b => {
                const bg = avatarBg(b.name);
                return (
                  <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                      style={{ background: bg, boxShadow: `0 2px 6px ${bg}55` }}>
                      {initials(b.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800 truncate">{b.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{b.designation || b.department}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-bold text-gray-700">{format(new Date(b.date), "dd MMM")}</p>
                      <p className="text-[10px] text-gray-400">{b.daysUntil === 0 ? "Today 🎂" : `in ${b.daysUntil}d`}</p>
                    </div>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300">
                  <Gift size={26} className="opacity-40" />
                  <p className="text-sm">No upcoming birthdays</p>
                </div>
              )}
            </div>
          </DCard>
        </div>

        {/* ── Recent Check-ins ────────────────────────────── */}
        <DCard>
          <DCardHead
            title="Recent Check-ins"
            badge="live"
            action={
              <Link href="/reports">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#006B3F] hover:underline">
                  View all <ArrowRight size={10} />
                </span>
              </Link>
            }
          />
          <div className="divide-y divide-gray-50">
            {(attendance?.data ?? []).slice(0, 8).map((r) => {
              const empName = r.employee?.name ?? "—";
              const pkt = new Date(new Date(r.checkInTime).getTime() + 5 * 3600000);
              const h = pkt.getUTCHours(), m = pkt.getUTCMinutes();
              const isLate = h > 9 || (h === 9 && m > 0);
              const bg = avatarBg(empName);
              const photoUrl = (r as any).checkInPhotoUrl
                ? `${BACKEND_URL}${(r as any).checkInPhotoUrl}`
                : null;
              return (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors">
                  <div className="w-1 h-10 rounded-full shrink-0" style={{ background: isLate ? "#F97316" : "#10B981" }} />
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 relative flex items-center justify-center"
                    style={{ background: bg, boxShadow: `0 2px 8px ${bg}55` }}>
                    <span className="text-white text-[11px] font-bold absolute select-none">{initials(empName)}</span>
                    {photoUrl && (
                      <img
                        src={photoUrl}
                        alt=""
                        className="w-full h-full object-cover absolute inset-0 z-10"
                        onError={e => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 truncate">{empName}</p>
                    <p className="text-[11px] text-gray-400 truncate">{(r.employee as any)?.email ?? ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-semibold text-gray-700 tabular-nums">{format(parseISO(r.checkInTime), "h:mm a")}</p>
                    <p className="text-[10px] text-gray-400">{format(parseISO(r.checkInTime), "dd MMM")}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${isLate ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-700"}`}>
                    {isLate ? "Late" : "On Time"}
                  </span>
                </div>
              );
            })}
            {!attendance?.data?.length && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300">
                <Clock size={26} className="opacity-40" />
                <p className="text-sm">No check-ins yet today</p>
              </div>
            )}
          </div>
        </DCard>

      </div>
    </DashboardLayout>
  );
}
