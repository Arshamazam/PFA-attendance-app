"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, X } from "lucide-react";
import api from "@/lib/api";

type Goal = { id: string; goalTitle: string; targetValue: number; currentProgress: number; percentage: number; status: string; endDate: string; employee: { id: string; name: string; department: string } };
type Emp = { id: string; name: string; department: string };

const STATUS_COLORS: Record<string, string> = {
  "On Track": "bg-green-100 text-green-700 border-green-200",
  Completed: "bg-gray-100 text-gray-600 border-gray-200",
  "In Progress": "bg-blue-100 text-blue-700 border-blue-200",
  "At Risk": "bg-red-100 text-red-700 border-red-200",
};

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "#2E7D32" : pct >= 50 ? "#F57C00" : "#C62828";
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

export default function PerformanceGoals() {
  const [dept, setDept] = useState("");
  const [depts, setDepts] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [empId, setEmpId] = useState("");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [updateId, setUpdateId] = useState<string | null>(null);
  const [newProgress, setNewProgress] = useState("");
  const [form, setForm] = useState({ goalTitle: "", targetValue: "", startDate: "", endDate: "" });

  useEffect(() => {
    api.get<{ data: Emp[] }>("/employees?limit=100").then((r) => {
      const list = r.data.data ?? [];
      setEmployees(list);
      const uniqueDepts = [...new Set(list.map((e: Emp) => e.department).filter(Boolean))];
      setDepts(uniqueDepts);
    }).catch(() => {});
  }, []);

  const deptEmployees = employees.filter((e) => !dept || e.department === dept);

  useEffect(() => {
    if (!empId) { setGoals([]); return; }
    api.get<Goal[]>(`/performance-goals?employeeId=${empId}`).then((r) => setGoals(r.data)).catch(() => {});
  }, [empId]);

  const addGoal = async () => {
    if (!empId || !form.goalTitle || !form.targetValue) return;
    await api.post("/performance-goals", { employeeId: empId, goalTitle: form.goalTitle, targetValue: +form.targetValue, startDate: form.startDate, endDate: form.endDate }).catch(() => {});
    setShowModal(false);
    setForm({ goalTitle: "", targetValue: "", startDate: "", endDate: "" });
    api.get<Goal[]>(`/performance-goals?employeeId=${empId}`).then((r) => setGoals(r.data)).catch(() => {});
  };

  const updateProgress = async (id: string) => {
    await api.patch(`/performance-goals/${id}`, { currentProgress: +newProgress }).catch(() => {});
    setUpdateId(null);
    api.get<Goal[]>(`/performance-goals?employeeId=${empId}`).then((r) => setGoals(r.data)).catch(() => {});
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold text-[#333333] flex items-center gap-2">
            <Target size={15} className="text-[#006B3F]" /> Performance Goals
          </CardTitle>
          {empId && (
            <button onClick={() => setShowModal(true)} className="text-xs bg-[#006B3F] text-white px-3 py-1.5 rounded flex items-center gap-1 hover:bg-[#004d2c]">
              <Plus size={12} /> Add Goal
            </button>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <select value={dept} onChange={(e) => { setDept(e.target.value); setEmpId(""); }} className="text-xs border rounded px-2 py-1 bg-white flex-1">
            <option value="">Select Department</option>
            {depts.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select value={empId} onChange={(e) => setEmpId(e.target.value)} disabled={!dept} className="text-xs border rounded px-2 py-1 bg-white flex-1 disabled:opacity-50">
            <option value="">Select Employee</option>
            {deptEmployees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!empId ? (
          <p className="text-gray-400 text-sm text-center py-8">Select a department and employee to view goals</p>
        ) : goals.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No goals found for this employee</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {goals.map((g) => (
              <div key={g.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[#333333]">{g.goalTitle}</p>
                      <Badge className={`text-xs ${STATUS_COLORS[g.status] ?? ""}`} variant="outline">{g.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">{g.currentProgress} / {g.targetValue}</span>
                      <span className="text-xs font-bold" style={{ color: g.percentage >= 80 ? "#2E7D32" : g.percentage >= 50 ? "#F57C00" : "#C62828" }}>{g.percentage}%</span>
                    </div>
                    <ProgressBar pct={g.percentage} />
                    <p className="text-xs text-gray-400 mt-1">Due: {new Date(g.endDate).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => { setUpdateId(g.id); setNewProgress(String(g.currentProgress)); }} className="text-xs text-[#006B3F] border border-[#006B3F] px-2 py-1 rounded hover:bg-green-50 shrink-0">Update</button>
                </div>
                {updateId === g.id && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input type="number" value={newProgress} onChange={(e) => setNewProgress(e.target.value)} className="text-xs border rounded px-2 py-1 w-24" placeholder="Progress" />
                    <button onClick={() => updateProgress(g.id)} className="text-xs bg-[#006B3F] text-white px-2 py-1 rounded">Save</button>
                    <button onClick={() => setUpdateId(null)} className="text-xs text-gray-400">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold text-[#333333]">Add Performance Goal</h3>
              <button onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full text-sm border rounded px-3 py-2" placeholder="Goal Title" value={form.goalTitle} onChange={(e) => setForm({ ...form, goalTitle: e.target.value })} />
              <input type="number" className="w-full text-sm border rounded px-3 py-2" placeholder="Target Value" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} />
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-xs text-gray-500">Start Date</label><input type="date" className="w-full text-sm border rounded px-3 py-2" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                <div className="flex-1"><label className="text-xs text-gray-500">End Date</label><input type="date" className="w-full text-sm border rounded px-3 py-2" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
              </div>
              <button onClick={addGoal} className="w-full bg-[#006B3F] text-white py-2 rounded text-sm font-medium hover:bg-[#004d2c]">Add Goal</button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
