"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

type MonthData = { month: string; approved: number; rejected: number; pending: number };

export default function LeaveHistory6Months() {
  const [data, setData] = useState<MonthData[]>([]);

  useEffect(() => {
    api.get<MonthData[]>("/analytics/leave-history-6months").then((r) => setData(r.data)).catch(() => {});
  }, []);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-[#333333]">Leave History — Last 6 Months</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend iconSize={10} />
            <Bar dataKey="approved" name="Approved" stackId="a" fill="#2E7D32" radius={[0, 0, 0, 0]} />
            <Bar dataKey="rejected" name="Rejected" stackId="a" fill="#C62828" />
            <Bar dataKey="pending" name="Pending" stackId="a" fill="#F57C00" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
