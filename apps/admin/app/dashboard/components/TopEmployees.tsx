"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

type Employee = { rank: number; name: string; department: string; presentDays?: number; absentDays?: number; attendanceRate: string };

const MEDALS = ["🥇", "🥈", "🥉"];
const MONTHS = [
  { label: "This Month", month: new Date().getMonth() + 1, year: new Date().getFullYear() },
  { label: "Last Month", month: new Date().getMonth() === 0 ? 12 : new Date().getMonth(), year: new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear() },
];

function Leaderboard({ title, data, valueKey, color }: { title: string; data: Employee[]; valueKey: "presentDays" | "absentDays"; color: string }) {
  return (
    <Card className="border-0 shadow-sm flex-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-[#333333]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 max-h-64 overflow-y-auto">
        {data.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No data</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.map((e) => (
              <div key={e.rank} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-base w-6 text-center">{e.rank <= 3 ? MEDALS[e.rank - 1] : <span className="text-xs text-gray-400 font-medium">#{e.rank}</span>}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#333333] truncate">{e.name}</p>
                  <p className="text-xs text-gray-400">{e.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color }}>{e[valueKey] ?? 0}d</p>
                  <p className="text-xs text-gray-400">{e.attendanceRate}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TopEmployees() {
  const [selected, setSelected] = useState(0);
  const [present, setPresent] = useState<Employee[]>([]);
  const [absent, setAbsent] = useState<Employee[]>([]);

  useEffect(() => {
    const { month, year } = MONTHS[selected];
    Promise.all([
      api.get<Employee[]>(`/analytics/top-present-employees?month=${month}&year=${year}`),
      api.get<Employee[]>(`/analytics/top-absent-employees?month=${month}&year=${year}`),
    ]).then(([p, a]) => { setPresent(p.data); setAbsent(a.data); }).catch(() => {});
  }, [selected]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#006B3F] tracking-wide">TOP EMPLOYEES</h3>
        <select value={selected} onChange={(e) => setSelected(+e.target.value)} className="text-xs border rounded px-2 py-1 bg-white">
          {MONTHS.map((m, i) => <option key={i} value={i}>{m.label}</option>)}
        </select>
      </div>
      <div className="flex gap-4">
        <Leaderboard title="🏆 Top 10 Present" data={present} valueKey="presentDays" color="#2E7D32" />
        <Leaderboard title="⚠️ Top 10 Absent" data={absent} valueKey="absentDays" color="#C62828" />
      </div>
    </div>
  );
}
