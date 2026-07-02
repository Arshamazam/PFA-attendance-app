"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, CalendarDays } from "lucide-react";

interface Category {
  id: string; name: string; description: string | null; isActive: boolean;
  annualLeaves: number; casualLeaves: number; medicalLeaves: number; sickLeaves: number;
  extraordinaryLeaves: number; earnedLeaves: number; compensatoryLeaves: number; unpaidLeaves: number;
  requiresApproval: boolean; carryForwardLimit: number; maxConsecutiveDays: number; advanceNoticeDays: number;
  _count: { employees: number };
}

const BLANK = {
  name: "", description: "",
  annualLeaves: 20, casualLeaves: 8, medicalLeaves: 5, sickLeaves: 10,
  extraordinaryLeaves: 2, earnedLeaves: 5, compensatoryLeaves: 3, unpaidLeaves: 0,
  carryForwardLimit: 5, maxConsecutiveDays: 30, advanceNoticeDays: 3,
};

type Draft = typeof BLANK;

function Num({ label, field, val, set }: { label: string; field: string; val: number; set: (f: string, v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</Label>
      <Input type="number" min={0} value={val}
        onChange={(e) => set(field, Number(e.target.value))}
        className="h-8 text-sm text-center" />
    </div>
  );
}

export default function EmployeeCategoriesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [draft, setDraft] = useState<Draft>(BLANK);

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["employee-categories"],
    queryFn: () => api.get("/employee-categories").then((r) => r.data as Category[]),
  });

  const setField = (field: string, val: number | string) =>
    setDraft((d) => ({ ...d, [field]: val }));

  function openCreate() { setEditing(null); setDraft(BLANK); setDialogOpen(true); }
  function openEdit(cat: Category) {
    setEditing(cat);
    setDraft({ name: cat.name, description: cat.description ?? "", annualLeaves: cat.annualLeaves, casualLeaves: cat.casualLeaves, medicalLeaves: cat.medicalLeaves, sickLeaves: cat.sickLeaves, extraordinaryLeaves: cat.extraordinaryLeaves, earnedLeaves: cat.earnedLeaves, compensatoryLeaves: cat.compensatoryLeaves, unpaidLeaves: cat.unpaidLeaves, carryForwardLimit: cat.carryForwardLimit, maxConsecutiveDays: cat.maxConsecutiveDays, advanceNoticeDays: cat.advanceNoticeDays });
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? api.patch(`/employee-categories/${editing.id}`, draft)
      : api.post("/employee-categories", draft),
    onSuccess: () => {
      toast.success(editing ? "Category updated" : "Category created");
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["employee-categories"] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employee-categories/${id}`),
    onSuccess: () => { toast.success("Category deleted"); qc.invalidateQueries({ queryKey: ["employee-categories"] }); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? "Delete failed"),
  });

  const totalPaid = (d: Draft) =>
    d.annualLeaves + d.casualLeaves + d.medicalLeaves + d.sickLeaves +
    d.extraordinaryLeaves + d.earnedLeaves + d.compensatoryLeaves;

  return (
    <DashboardLayout title="Employee Categories">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Employee Categories</h1>
          <p className="text-sm text-gray-400 mt-0.5">Define leave allocations per category</p>
        </div>
        <Button onClick={openCreate} className="bg-[#006B3F] hover:bg-[#005530] text-white gap-2 rounded-xl">
          <Plus className="w-4 h-4" /> New Category
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-48 items-center">
          <div className="w-7 h-7 border-[3px] border-[#006B3F] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const total = cat.annualLeaves + cat.casualLeaves + cat.medicalLeaves + cat.sickLeaves +
              cat.extraordinaryLeaves + cat.earnedLeaves + cat.compensatoryLeaves;
            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{cat.name}</h3>
                    {cat.description && <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteMutation.mutate(cat.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Annual", val: cat.annualLeaves },
                    { label: "Casual", val: cat.casualLeaves },
                    { label: "Medical", val: cat.medicalLeaves },
                    { label: "Sick", val: cat.sickLeaves },
                    { label: "Extra", val: cat.extraordinaryLeaves },
                    { label: "Earned", val: cat.earnedLeaves },
                    { label: "Comp.", val: cat.compensatoryLeaves },
                    { label: "Unpaid", val: cat.unpaidLeaves === 0 ? "∞" : cat.unpaidLeaves },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-gray-50 rounded-lg py-1.5 px-1">
                      <p className="text-sm font-bold text-[#006B3F]">{val}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-50">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {total} paid days/yr</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {cat._count.employees} employees</span>
                </div>

                <div className="text-[10px] text-gray-400 space-y-0.5">
                  <p>Carry forward: {cat.carryForwardLimit} days · Max consecutive: {cat.maxConsecutiveDays} days</p>
                  <p>Advance notice: {cat.advanceNoticeDays} days</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit — ${editing.name}` : "New Employee Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-5 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name *</Label>
                <Input value={draft.name} onChange={(e) => setField("name", e.target.value)} required placeholder="Grade A" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</Label>
                <Input value={draft.description} onChange={(e) => setField("description", e.target.value)} placeholder="Senior Inspector" className="h-9" />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Leave Allocation (days/year)</p>
              <div className="grid grid-cols-4 gap-3">
                <Num label="Annual" field="annualLeaves" val={draft.annualLeaves} set={setField} />
                <Num label="Casual" field="casualLeaves" val={draft.casualLeaves} set={setField} />
                <Num label="Medical" field="medicalLeaves" val={draft.medicalLeaves} set={setField} />
                <Num label="Sick" field="sickLeaves" val={draft.sickLeaves} set={setField} />
                <Num label="Extraordinary" field="extraordinaryLeaves" val={draft.extraordinaryLeaves} set={setField} />
                <Num label="Earned" field="earnedLeaves" val={draft.earnedLeaves} set={setField} />
                <Num label="Compensatory" field="compensatoryLeaves" val={draft.compensatoryLeaves} set={setField} />
                <Num label="Unpaid (0=∞)" field="unpaidLeaves" val={draft.unpaidLeaves} set={setField} />
              </div>
              <p className="text-xs text-[#006B3F] font-semibold mt-2">Total paid: {totalPaid(draft)} days/year</p>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Policy</p>
              <div className="grid grid-cols-3 gap-3">
                <Num label="Carry-forward limit (days)" field="carryForwardLimit" val={draft.carryForwardLimit} set={setField} />
                <Num label="Max consecutive days" field="maxConsecutiveDays" val={draft.maxConsecutiveDays} set={setField} />
                <Num label="Advance notice (days)" field="advanceNoticeDays" val={draft.advanceNoticeDays} set={setField} />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-[#006B3F] hover:bg-[#005530] text-white rounded-xl">
                {saveMutation.isPending ? "Saving…" : editing ? "Update Category" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
