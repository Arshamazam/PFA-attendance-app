"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  ChevronDown, ChevronRight, Plus, Trash2, Edit3,
  CheckCircle, XCircle, ListChecks, RefreshCw, X, Check,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DropdownValue { id: string; value: string; label: string; displayOrder: number; isActive: boolean }
interface DropdownMaster { id: string; fieldName: string; fieldLabel: string; fieldType: string; displayOrder: number; isActive: boolean; values: DropdownValue[] }

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-5 rounded-full flex-shrink-0"
        style={{ background: "linear-gradient(to bottom, #a855f7, #7c3aed)" }} />
      <h2 className="font-bold text-gray-800 text-base">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-purple-200 to-transparent" />
    </div>
  );
}

// ── Add Value Modal ───────────────────────────────────────────────────────────
function AddValueModal({
  dropdown,
  onClose,
  onSuccess,
}: { dropdown: DropdownMaster; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ value: "", label: "", displayOrder: dropdown.values.length + 1 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.value.trim() || !form.label.trim()) { toast.error("Both value and label are required"); return; }
    setSaving(true);
    try {
      await api.post(`/dropdown-master/${dropdown.id}/values`, form);
      toast.success(`Added "${form.label}" to ${dropdown.fieldLabel}`);
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to add value");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(168,85,247,0.06))" }}>
          <div>
            <h3 className="font-bold text-gray-900">Add Value</h3>
            <p className="text-xs text-purple-600 mt-0.5">to {dropdown.fieldLabel}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Display Label *</label>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value, value: e.target.value })}
              placeholder="e.g. Lahore Division" autoFocus
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Stored Value *</label>
            <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder="e.g. lahore_division"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
            <p className="text-xs text-gray-400 mt-1">Auto-filled from label. Change if needed.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Display Order</label>
            <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
              {saving ? "Adding…" : "Add Value"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Value Inline ─────────────────────────────────────────────────────────
function ValueRow({
  value, dropdown, onRefresh,
}: { value: DropdownValue; dropdown: DropdownMaster; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(value.label);

  const handleUpdate = async () => {
    try {
      await api.patch(`/dropdown-master/${dropdown.id}/values/${value.id}`, { label: editLabel });
      toast.success("Updated");
      setEditing(false);
      onRefresh();
    } catch { toast.error("Failed to update"); }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove "${value.label}" from ${dropdown.fieldLabel}?`)) return;
    try {
      await api.delete(`/dropdown-master/${dropdown.id}/values/${value.id}`);
      toast.success(`Removed "${value.label}"`);
      onRefresh();
    } catch { toast.error("Failed to remove value"); }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl group transition-colors hover:bg-purple-50/50">
      <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-purple-600"
        style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
        {value.displayOrder}
      </div>
      {editing ? (
        <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} autoFocus
          className="flex-1 px-2 py-1 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
          onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(); if (e.key === "Escape") { setEditing(false); setEditLabel(value.label); } }} />
      ) : (
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-800">{value.label}</span>
          <span className="ml-2 text-xs text-gray-400 font-mono">{value.value}</span>
        </div>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {editing ? (
          <>
            <button onClick={handleUpdate} className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50">
              <Check size={13} />
            </button>
            <button onClick={() => { setEditing(false); setEditLabel(value.label); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="w-7 h-7 rounded-lg flex items-center justify-center text-purple-500 hover:bg-purple-50">
              <Edit3 size={13} />
            </button>
            <button onClick={handleDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50">
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Dropdown Card ─────────────────────────────────────────────────────────────
function DropdownCard({ dropdown, onRefresh }: { dropdown: DropdownMaster; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const qc = useQueryClient();

  const toggleActive = useMutation({
    mutationFn: () => api.patch(`/dropdown-master/${dropdown.id}`, { isActive: !dropdown.isActive }),
    onSuccess: () => { toast.success(dropdown.isActive ? "Dropdown deactivated" : "Dropdown activated"); onRefresh(); },
  });

  const activeValues = dropdown.values.filter((v) => v.isActive);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
        {/* Header */}
        <div
          className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/80 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: dropdown.isActive ? "rgba(168,85,247,0.1)" : "rgba(156,163,175,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
            <ListChecks size={16} className={dropdown.isActive ? "text-purple-600" : "text-gray-400"} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-sm">{dropdown.fieldLabel}</p>
              <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{dropdown.fieldType}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeValues.length} active {activeValues.length === 1 ? "value" : "values"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => toggleActive.mutate()}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${dropdown.isActive ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "text-gray-500 bg-gray-100 hover:bg-gray-200"}`}
            >
              {dropdown.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
              {dropdown.isActive ? "Active" : "Inactive"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              <Plus size={12} /> Add Value
            </button>
          </div>
          <div className="text-gray-400 ml-1">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </div>

        {/* Values */}
        {expanded && (
          <div className="border-t border-gray-100 p-3">
            {activeValues.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <ListChecks size={24} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No values yet</p>
                <button onClick={() => setShowAddModal(true)}
                  className="mt-2 text-xs text-purple-600 font-medium hover:underline">Add the first value</button>
              </div>
            ) : (
              <div className="space-y-0.5">
                {activeValues.map((v) => (
                  <ValueRow key={v.id} value={v} dropdown={dropdown} onRefresh={() => { qc.invalidateQueries({ queryKey: ["dropdowns"] }); onRefresh(); }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddValueModal
          dropdown={dropdown}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ["dropdowns"] }); onRefresh(); }}
        />
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DropdownsPage() {
  const qc = useQueryClient();

  const { data: dropdowns = [], isLoading, refetch } = useQuery<DropdownMaster[]>({
    queryKey: ["dropdowns"],
    queryFn: () => api.get("/dropdown-master").then((r) => r.data),
  });

  const totalValues = dropdowns.reduce((n, d) => n + d.values.filter((v) => v.isActive).length, 0);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dropdown Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage the values that appear in dropdown menus across the admin panel and mobile app.
          </p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:border-purple-300 text-gray-600 hover:text-purple-700 transition-all shadow-sm">
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Dropdown Categories", value: dropdowns.length },
          { label: "Total Active Values", value: totalValues },
          { label: "Active Categories", value: dropdowns.filter((d) => d.isActive).length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className="text-3xl font-black mt-1" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Dropdown list */}
      <div>
        <SectionHeader title="Dropdown Categories" />
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-7 w-7 text-purple-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-sm text-gray-400">Loading dropdowns…</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {dropdowns.map((d) => (
              <DropdownCard key={d.id} dropdown={d} onRefresh={() => qc.invalidateQueries({ queryKey: ["dropdowns"] })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
