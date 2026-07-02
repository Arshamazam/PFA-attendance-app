"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

const DEPARTMENTS = ["All", "Lahore", "Islamabad", "Karachi", "Multan"];
const LEAVE_COLORS: Record<string, string> = {
  Casual: "bg-blue-100 text-blue-700",
  Medical: "bg-red-100 text-red-700",
  Annual: "bg-purple-100 text-purple-700",
  "Extra Ordinary": "bg-orange-100 text-orange-700",
};

type OnLeaveEmployee = { id: string; name: string; department: string; leaveType: string; returnDate: string; reason: string };

export default function OnLeaveToday() {
  const [dept, setDept] = useState("All");
  const [employees, setEmployees] = useState<OnLeaveEmployee[]>([]);
  const [count, setCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const url = dept === "All" ? "/analytics/on-leave-today" : `/analytics/on-leave-today?department=${dept}`;
    api.get<{ count: number; employees: OnLeaveEmployee[] }>(url).then((r) => {
      setCount(r.data.count);
      setEmployees(r.data.employees ?? []);
    }).catch(() => {});
  }, [dept]);

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-[#333333]">
          On Leave Today <span className="text-[#006B3F] font-bold ml-1">{count}</span>
        </CardTitle>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className="text-xs border rounded px-2 py-1 bg-white">
          {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </CardHeader>
      <CardContent className="p-0 max-h-64 overflow-y-auto">
        {employees.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No employees on leave today</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {employees.map((e, i) => (
              <div key={i} className="px-5 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#333333]">{e.name}</p>
                    <p className="text-xs text-gray-400">{e.department} · Returns {e.returnDate ? new Date(e.returnDate).toLocaleDateString() : "—"}</p>
                  </div>
                  <Badge className={`text-xs ${LEAVE_COLORS[e.leaveType] ?? "bg-gray-100 text-gray-700"}`} variant="outline">{e.leaveType}</Badge>
                </div>
                {expandedId === e.id && e.reason && (
                  <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">{e.reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
