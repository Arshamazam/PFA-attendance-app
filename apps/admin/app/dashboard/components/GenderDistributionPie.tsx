"use client";
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

const DEPARTMENTS = ["All", "Lahore", "Islamabad", "Karachi", "Multan"];
const COLORS = { male: "#003D82", female: "#E91E8C", other: "#9E9E9E" };

export default function GenderDistributionPie() {
  const [dept, setDept] = useState("All");
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const url = dept === "All" ? "/analytics/gender-count" : `/analytics/gender-count?department=${dept}`;
    api.get<{ male: number; female: number; other: number; total: number }>(url).then((r) => {
      setData([
        { name: "Male", value: r.data.male },
        { name: "Female", value: r.data.female },
        { name: "Other", value: r.data.other },
      ].filter((d) => d.value > 0));
      setTotal(r.data.total);
    }).catch(() => {});
  }, [dept]);

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-[#333333]">Gender Distribution</CardTitle>
        <select value={dept} onChange={(e) => setDept(e.target.value)}
          className="text-xs border rounded px-2 py-1 bg-white">
          {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] ?? "#ccc"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} employees`]} />
                <Legend iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-center text-xs text-gray-400 mt-1">Total: {total} employees</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
