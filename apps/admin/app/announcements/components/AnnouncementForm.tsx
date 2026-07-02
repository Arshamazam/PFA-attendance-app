"use client";
import { useState, useRef } from "react";
import { X, Upload, ChevronRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";

type FormData = {
  title: string; type: string; priority: string; description: string;
  content: string; imageUrl: string; targetAudience: string; targetDepartment: string;
  scheduledDate: string; scheduledTime: string; expiryDate: string; autoPublish: boolean;
};

const TYPES = ["Important", "General", "Holiday", "Maintenance", "Alert"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const AUDIENCES = ["All", "Employees", "Admins", "Department"];
const DEPARTMENTS = ["Lahore", "Islamabad", "Karachi", "Faisalabad", "Multan", "Peshawar", "Quetta"];

const TYPE_COLORS: Record<string, string> = {
  Important: "bg-purple-100 text-purple-700", General: "bg-gray-100 text-gray-700",
  Holiday: "bg-green-100 text-green-700", Maintenance: "bg-red-100 text-red-700", Alert: "bg-orange-100 text-orange-700",
};
const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "bg-red-100 text-red-700", High: "bg-orange-100 text-orange-700", Medium: "bg-yellow-100 text-yellow-700", Low: "bg-blue-100 text-blue-700",
};

const EMPTY: FormData = {
  title: "", type: "General", priority: "Medium", description: "",
  content: "", imageUrl: "", targetAudience: "All", targetDepartment: "",
  scheduledDate: "", scheduledTime: "09:00", expiryDate: "", autoPublish: true,
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1">{children}{required && <span className="text-red-400 ml-1">*</span>}</label>;
}

export default function AnnouncementForm({ initial, onSuccess, onClose }: {
  initial?: Record<string, unknown>;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const editing = !!initial?.id;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initial ? {
    title: (initial.title as string) ?? "",
    type: (initial.type as string) ?? "General",
    priority: (initial.priority as string) ?? "Medium",
    description: (initial.description as string) ?? "",
    content: (initial.content as string) ?? "",
    imageUrl: (initial.imageUrl as string) ?? "",
    targetAudience: (initial.targetAudience as string) ?? "All",
    targetDepartment: (initial.targetDepartment as string) ?? "",
    scheduledDate: initial.scheduledDate ? format(parseISO(initial.scheduledDate as string), "yyyy-MM-dd") : "",
    scheduledTime: (initial.scheduledTime as string) ?? "09:00",
    expiryDate: initial.expiryDate ? format(parseISO(initial.expiryDate as string), "yyyy-MM-dd") : "",
    autoPublish: (initial.autoPublish as boolean) ?? true,
  } : { ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof FormData, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const uploadImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setErrors((e) => ({ ...e, imageUrl: "Max file size is 5MB" })); return; }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext ?? "")) { setErrors((e) => ({ ...e, imageUrl: "Only JPG, PNG, WebP allowed" })); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const r = await api.post<{ url: string }>("/announcements/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      set("imageUrl", r.data.url);
      setErrors((e) => ({ ...e, imageUrl: "" }));
    } catch (_) { setErrors((e) => ({ ...e, imageUrl: "Upload failed" })); }
    setUploading(false);
  };

  const validateStep = (s: number) => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!form.title.trim()) errs.title = "Required";
      else if (form.title.length > 255) errs.title = "Max 255 characters";
      if (!form.description.trim()) errs.description = "Required";
      else if (form.description.length > 500) errs.description = "Max 500 characters";
    }
    if (s === 2) {
      if (!form.content.trim()) errs.content = "Required";
      if (form.targetAudience === "Department" && !form.targetDepartment) errs.targetDepartment = "Required";
    }
    if (s === 3) {
      if (!form.scheduledDate) errs.scheduledDate = "Required";
      else if (!editing && isBefore(new Date(form.scheduledDate), startOfDay(new Date()))) errs.scheduledDate = "Cannot be in the past";
      if (form.expiryDate && form.scheduledDate && isBefore(new Date(form.expiryDate), new Date(form.scheduledDate))) {
        errs.expiryDate = "Must be ≥ scheduled date";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (validateStep(step)) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);

  const submit = async () => {
    if (!validateStep(3)) return;
    setSubmitting(true);
    const body = {
      title: form.title, type: form.type, priority: form.priority, description: form.description,
      content: form.content, imageUrl: form.imageUrl || undefined,
      targetAudience: form.targetAudience,
      targetDepartment: form.targetAudience === "Department" ? form.targetDepartment : undefined,
      scheduledDate: new Date(`${form.scheduledDate}T${form.scheduledTime}`).toISOString(),
      scheduledTime: form.scheduledTime,
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
      autoPublish: form.autoPublish,
    };
    try {
      if (editing) await api.patch(`/announcements/${initial!.id}`, body);
      else await api.post("/announcements", body);
      onSuccess();
    } catch (_) {}
    setSubmitting(false);
  };

  const STEP_LABELS = ["Basic Info", "Content & Media", "Schedule & Publish"];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-xl shadow-xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-semibold text-[#333333]">{editing ? "Edit" : "Create"} Announcement</h2>
            <p className="text-xs text-gray-400 mt-0.5">Step {step} of 3 — {STEP_LABELS[step - 1]}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        {/* Step dots */}
        <div className="flex gap-2 px-6 py-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? "bg-[#006B3F]" : "bg-gray-200"}`} />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-4">
          {/* Step 1 */}
          {step === 1 && (
            <>
              <div>
                <Label required>Title</Label>
                <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={255} className={`w-full text-sm border rounded px-3 py-2 ${errors.title ? "border-red-400" : ""}`} placeholder="Announcement title" />
                <div className="flex justify-between mt-0.5"><span className="text-xs text-red-400">{errors.title}</span><span className="text-xs text-gray-400">{form.title.length}/255</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>Type</Label>
                  <select value={form.type} onChange={(e) => set("type", e.target.value)} className="w-full text-sm border rounded px-3 py-2 bg-white">
                    {TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label required>Priority</Label>
                  <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className="w-full text-sm border rounded px-3 py-2 bg-white">
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label required>Description <span className="text-gray-400 font-normal">(brief summary)</span></Label>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={500} rows={3}
                  className={`w-full text-sm border rounded px-3 py-2 resize-none ${errors.description ? "border-red-400" : ""}`} placeholder="Short summary visible in list view..." />
                <div className="flex justify-between mt-0.5"><span className="text-xs text-red-400">{errors.description}</span><span className="text-xs text-gray-400">{form.description.length}/500</span></div>
              </div>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <div>
                <Label required>Full Content</Label>
                <textarea value={form.content} onChange={(e) => set("content", e.target.value)} rows={6}
                  className={`w-full text-sm border rounded px-3 py-2 resize-none ${errors.content ? "border-red-400" : ""}`} placeholder="Detailed announcement content..." />
                {errors.content && <p className="text-xs text-red-400 mt-0.5">{errors.content}</p>}
              </div>

              <div>
                <Label>Upload Image <span className="text-gray-400 font-normal">(optional, max 5MB)</span></Label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadImage(f); }}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 cursor-pointer text-center transition-colors ${dragOver ? "border-[#006B3F] bg-green-50" : "border-gray-200 hover:border-[#006B3F]"}`}
                >
                  {form.imageUrl ? (
                    <div className="relative">
                      <img src={form.imageUrl.startsWith("/") ? `http://localhost:3000${form.imageUrl}` : form.imageUrl} alt="" className="max-h-32 mx-auto rounded object-cover" />
                      <button onClick={(e) => { e.stopPropagation(); set("imageUrl", ""); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button>
                    </div>
                  ) : uploading ? (
                    <p className="text-sm text-gray-400">Uploading…</p>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload size={24} className="text-gray-300" />
                      <p className="text-xs text-gray-400">Drag & drop or click to upload</p>
                      <p className="text-xs text-gray-300">JPG, PNG, WebP · Max 5MB</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
                {errors.imageUrl && <p className="text-xs text-red-400 mt-0.5">{errors.imageUrl}</p>}
              </div>

              <div>
                <Label required>Target Audience</Label>
                <select value={form.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} className="w-full text-sm border rounded px-3 py-2 bg-white">
                  {AUDIENCES.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              {form.targetAudience === "Department" && (
                <div>
                  <Label required>Department</Label>
                  <select value={form.targetDepartment} onChange={(e) => set("targetDepartment", e.target.value)} className={`w-full text-sm border rounded px-3 py-2 bg-white ${errors.targetDepartment ? "border-red-400" : ""}`}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                  {errors.targetDepartment && <p className="text-xs text-red-400 mt-0.5">{errors.targetDepartment}</p>}
                </div>
              )}
            </>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>Scheduled Date</Label>
                  <input type="date" value={form.scheduledDate} onChange={(e) => set("scheduledDate", e.target.value)} className={`w-full text-sm border rounded px-3 py-2 ${errors.scheduledDate ? "border-red-400" : ""}`} />
                  {errors.scheduledDate && <p className="text-xs text-red-400 mt-0.5">{errors.scheduledDate}</p>}
                </div>
                <div>
                  <Label required>Time (24h)</Label>
                  <input type="time" value={form.scheduledTime} onChange={(e) => set("scheduledTime", e.target.value)} className="w-full text-sm border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <Label>Expiry Date <span className="text-gray-400 font-normal">(optional — leave empty for no expiry)</span></Label>
                <input type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} className={`w-full text-sm border rounded px-3 py-2 ${errors.expiryDate ? "border-red-400" : ""}`} />
                {errors.expiryDate && <p className="text-xs text-red-400 mt-0.5">{errors.expiryDate}</p>}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.autoPublish} onChange={(e) => set("autoPublish", e.target.checked)} className="w-4 h-4 accent-[#006B3F]" />
                <div>
                  <p className="text-sm font-medium text-[#333333]">Auto-Publish</p>
                  <p className="text-xs text-gray-400">Automatically publish when scheduled date/time arrives</p>
                </div>
              </label>

              {/* Preview */}
              {form.title && form.scheduledDate && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Preview</p>
                  <div className="border rounded-xl p-4 bg-gray-50">
                    <p className="font-semibold text-[#333333] text-sm">{form.title}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[form.type] ?? ""}`}>{form.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[form.priority] ?? ""}`}>{form.priority}</span>
                    </div>
                    {form.description && <p className="text-xs text-gray-500 mt-2">{form.description}</p>}
                    <div className="mt-3 text-xs text-gray-400 space-y-0.5">
                      <p>Scheduled: {form.scheduledDate ? format(new Date(`${form.scheduledDate}T${form.scheduledTime}`), "MMM d, yyyy 'at' h:mm a") : "—"}</p>
                      {form.expiryDate && <p>Expires: {format(new Date(form.expiryDate), "MMM d, yyyy")}</p>}
                      <p>Audience: {form.targetAudience}{form.targetDepartment ? ` — ${form.targetDepartment}` : ""}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t mt-2">
          <button onClick={step === 1 ? onClose : back} className="text-sm px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-1">
            <ChevronLeft size={14} />{step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 3 ? (
            <button onClick={next} className="text-sm px-5 py-2 bg-[#006B3F] text-white rounded hover:bg-[#004d2c] flex items-center gap-1">
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="text-sm px-5 py-2 bg-[#006B3F] text-white rounded hover:bg-[#004d2c] disabled:opacity-50">
              {submitting ? "Saving…" : editing ? "Save Changes" : "Create Announcement"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
