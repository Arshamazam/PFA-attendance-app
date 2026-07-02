"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

type DeptData = { department: string; count: number; percentage: number };

const DEPT_COLORS = ["#006B3F", "#003D82", "#E65100", "#6A1B9A", "#00838F", "#C62828"];

export default function EmployeesByDepartment() {
  const [data, setData] = useState<DeptData[]>([]);

  useEffect(() => {
    api.get<DeptData[]>("/analytics/employees-by-department").then((r) => setData(r.data)).catch(() => {});
  }, []);

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-[#333333]">Employees by Department</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={80} />
            <Tooltip formatter={(v, _name, item) => [`${v} employees (${(item?.payload as DeptData | undefined)?.percentage ?? 0}%)`]} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Employees">
              {data.map((_, idx) => <Cell key={idx} fill={DEPT_COLORS[idx % DEPT_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
