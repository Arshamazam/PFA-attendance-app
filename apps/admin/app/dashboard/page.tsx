"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Users,
  MapPin,
  CheckCircle2,
  Calendar,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { Employee, LeaveRequest, AttendanceRecord } from "@/types";
import { format, parseISO } from "date-fns";

const GREEN = "#006B3F";
const BLUE = "#003D82";
const PIE_COLORS = ["#006B3F", "#003D82", "#E65100", "#6A1B9A"];

export default function DashboardPage() {
  const { data: employees } = useQuery({
    queryKey: ["employees-all"],
    queryFn: () => api.get<{ data: Employee[]; total: number }>("/employees?limit=100").then((r) => r.data),
  });

  const { data: geofences } = useQuery({
    queryKey: ["geofences-all"],
    queryFn: () => api.get<unknown[]>("/geofence").then((r) => r.data),
  });

  const { data: attendance } = useQuery({
    queryKey: ["attendance-recent"],
    queryFn: () =>
      api
        .get<{ data: AttendanceRecord[]; total: number }>("/attendance/all?limit=50")
        .then((r) => r.data),
  });

  const { data: leaves } = useQuery({
    queryKey: ["leaves-pending"],
    queryFn: () =>
      api
        .get<{ data: LeaveRequest[]; total: number }>("/leave/pending?limit=50")
        .then((r) => r.data),
  });

  const today = new Date().toDateString();
  const todayCheckIns =
    attendance?.data?.filter(
      (r) => new Date(r.checkInTime).toDateString() === today
    ).length ?? 0;

  // Attendance trend — last 7 days
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = format(d, "EEE");
    const dayStr = d.toDateString();
    const count = attendance?.data?.filter(
      (r) => new Date(r.checkInTime).toDateString() === dayStr
    ).length ?? 0;
    return { day: label, checkIns: count };
  });

  // Leave type breakdown
  const leaveTypeMap: Record<string, number> = {};
  leaves?.data?.forEach((l) => {
    leaveTypeMap[l.leaveType] = (leaveTypeMap[l.leaveType] ?? 0) + 1;
  });
  const pieData = Object.entries(leaveTypeMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Recent check-ins (last 5)
  const recentCheckIns = (attendance?.data ?? []).slice(0, 5);
  // Recent leave requests (last 5)
  const recentLeaves = (leaves?.data ?? []).slice(0, 5);

  const statCards = [
    {
      label: "Total Employees",
      value: employees?.total ?? "—",
      icon: Users,
      color: GREEN,
      bg: "bg-green-50",
    },
    {
      label: "Geofence Zones",
      value: Array.isArray(geofences) ? geofences.length : "—",
      icon: MapPin,
      color: BLUE,
      bg: "bg-blue-50",
    },
    {
      label: "Today's Check-Ins",
      value: todayCheckIns,
      icon: CheckCircle2,
      color: "#2E7D32",
      bg: "bg-emerald-50",
    },
    {
      label: "Pending Leaves",
      value: leaves?.total ?? "—",
      icon: Calendar,
      color: "#E65100",
      bg: "bg-orange-50",
    },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    <p className="text-3xl font-bold text-[#333333] mt-1">{value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${bg}`}>
                    <Icon size={22} style={{ color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Attendance Trend */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#333333] flex items-center gap-2">
                <TrendingUp size={16} className="text-[#006B3F]" />
                Attendance — Last 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="checkIns" fill={GREEN} radius={[4, 4, 0, 0]} name="Check-Ins" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Leave Type Pie */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#333333] flex items-center gap-2">
                <Calendar size={16} className="text-[#006B3F]" />
                Leave Type Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {pieData.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                  No pending leave requests
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Check-Ins */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#333333] flex items-center gap-2">
                <Clock size={16} className="text-[#006B3F]" />
                Recent Check-Ins
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentCheckIns.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No records yet</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentCheckIns.map((r) => {
                    const isLate =
                      new Date(r.checkInTime).getHours() >= 9 &&
                      new Date(r.checkInTime).getMinutes() > 0;
                    return (
                      <div key={r.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-sm font-medium text-[#333333]">
                            {r.employee?.name ?? "—"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(parseISO(r.checkInTime), "dd MMM, h:mm a")}
                          </p>
                        </div>
                        <Badge
                          className={
                            isLate
                              ? "bg-orange-100 text-orange-700 border-orange-200"
                              : "bg-green-100 text-green-700 border-green-200"
                          }
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

          {/* Recent Leave Requests */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#333333] flex items-center gap-2">
                <Calendar size={16} className="text-[#006B3F]" />
                Pending Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentLeaves.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No pending requests</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentLeaves.map((l) => (
                    <div key={l.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-[#333333]">
                          {l.employee?.name ?? "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(parseISO(l.startDate), "dd MMM")} –{" "}
                          {format(parseISO(l.endDate), "dd MMM yyyy")} · {l.leaveType}
                        </p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200" variant="outline">
                        Pending
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
