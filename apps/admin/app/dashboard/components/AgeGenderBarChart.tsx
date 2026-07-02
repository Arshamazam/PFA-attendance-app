"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

type AgeGroup = { ageGroup: string; male: number; female: number };

export default function AgeGenderBarChart() {
  const [data, setData] = useState<AgeGroup[]>([]);

  useEffect(() => {
    api.get<AgeGroup[]>("/analytics/age-gender-distribution").then((r) => setData(r.data)).catch(() => {});
  }, []);

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-[#333333]">Age-Wise Gender Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="ageGroup" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend iconSize={10} />
            <Bar dataKey="male" name="Male" fill="#003D82" radius={[3, 3, 0, 0]} />
            <Bar dataKey="female" name="Female" fill="#E91E8C" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
