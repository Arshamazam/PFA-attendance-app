"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const COLORS = ["#006B3F", "#00A651", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

interface TrendPoint { date: string; total: number; onTime: number; late: number; }
interface DeptPoint { department: string; count: number; onTime: number; late: number; }
interface StatsData {
  totalCheckIns: number; onTime: number; late: number; absent: number;
  avgCheckInTime: string; totalEmployees: number;
  byDepartment: DeptPoint[];
}

const PERIODS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-5 text-white ${color}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  );
}

function DonutLabel({ cx, cy, percent }: { cx?: number; cy?: number; percent?: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="text-xl font-bold" style={{ fontSize: 16, fontWeight: 700 }}>
      {percent != null ? `${(percent * 100).toFixed(0)}%` : ""}
    </text>
  );
}

export default function ReportsPage() {
  const [days, setDays] = useState(30);

  const { data: trend = [], isLoading: trendLoading } = useQuery<TrendPoint[]>({
    queryKey: ["attendance-trend", days],
    queryFn: () => api.get(`/attendance/trend?days=${days}`).then((r) => r.data as TrendPoint[]),
  });

  const today = new Date().toISOString().split("T")[0];
  const { data: stats } = useQuery<StatsData>({
    queryKey: ["attendance-stats-report", today],
    queryFn: () => api.get(`/attendance/statistics?date=${today}`).then((r) => r.data as StatsData),
  });

  const donutData = [
    { name: "On Time", value: stats?.onTime ?? 0 },
    { name: "Late", value: stats?.late ?? 0 },
    { name: "Absent", value: stats?.absent ?? 0 },
  ];

  const deptData = stats?.byDepartment ?? [];

  const total = (stats?.onTime ?? 0) + (stats?.late ?? 0) + (stats?.absent ?? 0) || 1;
  const onTimeRate = Math.round(((stats?.onTime ?? 0) / total) * 100);

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-5">
        {/* Period selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 font-medium">Period:</span>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {PERIODS.map((p) => (
              <button key={p.days} onClick={() => setDays(p.days)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${days === p.days ? "bg-[#006B3F] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Employees" value={stats?.totalEmployees ?? "—"} color="bg-gradient-to-br from-[#003D2E] to-[#006B3F]" />
          <StatCard label="On-Time Rate (Today)" value={`${onTimeRate}%`} sub={`${stats?.onTime ?? 0} of ${stats?.totalCheckIns ?? 0} check-ins`} color="bg-gradient-to-br from-blue-600 to-blue-400" />
          <StatCard label="Late Arrivals (Today)" value={stats?.late ?? "—"} color="bg-gradient-to-br from-orange-500 to-orange-400" />
          <StatCard label="Avg Check-In" value={stats?.avgCheckInTime ?? "—"} color="bg-gradient-to-br from-purple-600 to-purple-400" />
        </div>

        {/* Row 1: Attendance trend + On-time vs Late donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <ChartCard title={`Attendance Trend — Last ${days} Days`}>
              {trendLoading ? (
                <div className="h-60 bg-gray-50 rounded-lg animate-pulse" />
              ) : trend.length === 0 ? (
                <div className="h-60 flex items-center justify-center text-gray-400">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="total" stroke="#006B3F" strokeWidth={2} dot={false} name="Total" />
                    <Line type="monotone" dataKey="onTime" stroke="#3b82f6" strokeWidth={2} dot={false} name="On Time" />
                    <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} dot={false} name="Late" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
          <ChartCard title="Today: On Time vs Late vs Absent">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value"
                  labelLine={false}>
                  {donutData.map((_, i) => <Cell key={i} fill={["#006B3F", "#f59e0b", "#ef4444"][i]} />)}
                </Pie>
                <DonutLabel cx={undefined} cy={undefined} percent={undefined} />
                <Tooltip formatter={(v) => [`${v}`, ""]} contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center text-sm mt-2">
              <span className="font-bold text-[#006B3F] text-xl">{onTimeRate}%</span>
              <span className="text-gray-400 text-xs ml-1">on time</span>
            </div>
          </ChartCard>
        </div>

        {/* Row 2: Department bar chart */}
        {deptData.length > 0 && (
          <ChartCard title="Attendance by Department (Today)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deptData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="onTime" name="On Time" fill="#006B3F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Row 3: Trend bars breakdown */}
        {trend.length > 0 && (
          <ChartCard title="Daily Breakdown — Check-ins Stacked">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend.slice(-14)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="onTime" name="On Time" stackId="a" fill="#006B3F" />
                <Bar dataKey="late" name="Late" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {!stats && !trendLoading && (
          <div className="text-center py-16 text-gray-400">
            <p>No data available yet. Check-in activity will appear here.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
