"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Camera, User, Phone, Briefcase, Building2, Settings, CheckCircle2, Loader2, FileText, Upload, X,
  CalendarDays, RefreshCw, RotateCcw, PlusCircle, Eye, EyeOff, Copy,
} from "lucide-react";
import { format, parseISO } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────
const DEPARTMENTS  = ["Lahore", "Islamabad", "Multan", "Peshawar", "Quetta", "Faisalabad", "Sialkot", "Gujranwala"];
const DESIGNATIONS = [
  "Deputy Director (Operations)", "Food Safety Officer", "Veterinary Specialist",
  "Dairy Technologist", "Assistant Food Safety Officer", "Senior Clerk", "Junior Clerk",
  "Driver", "Naib Qasid", "Junior Computer Operator", "Daak Rider", "Security Guard",
  "Chowkidar", "Sweeper", "Accountant", "Computer Operator", "IT Coordinator", "Analyst",
  "Lab Attendant", "Electrician", "Sanitary Worker", "IT Administrator",
  "Admin Trainee (Skilled-JCO)", "Admin Trainee (Skilled-DR)", "Admin Trainee (Skilled-EN)",
  "Admin Trainee (Unskilled)", "Consultant", "Food Safety Trainee Officer",
];
const GRADES       = ["BPS-12", "BPS-14", "BPS-16", "BPS-17", "BPS-18", "BPS-19", "BPS-20", "BPS-21"];
const SHIFTS       = ["Day", "Night", "Rotation"];
const EMP_STATUSES = ["Active", "On Leave", "Suspended", "Retired"];
const RELIGIONS    = ["Islam", "Christianity", "Sikhism", "Hinduism", "Other"];
const CITIES       = ["Lahore", "Islamabad", "Karachi", "Multan", "Faisalabad", "Peshawar", "Quetta", "Rawalpindi", "Sialkot", "Gujranwala", "Hyderabad", "Bahawalpur"];
const PFA_DISTRICTS = [
  "Lahore", "Kasur", "Sheikhupura", "Nankana", "Faisalabad", "Jhang",
  "Chiniot", "T.T.Singh", "Okara", "Sahiwal", "Pakpattan", "Murree",
  "Rawalpindi", "Attock", "Chakwal", "Jehlum", "Gujranwala", "Gujrat",
  "M.B.Din", "Hafizabad", "Sialkot", "Narowal", "Bhakkar", "Mianwali",
  "Khushab", "Sargodha", "Bahawalnagar", "Bahawalpur", "Multan", "Lodhran",
  "Khanewal", "Vehari", "R.Y.Khan", "D.G.Khan", "Layyah", "Muzaffargarh", "Rajanpur",
];
const ROLES        = [
  { value: "employee", label: "Employee", sub: "Can view own data only" },
  { value: "manager",  label: "Manager",  sub: "Can approve leaves, view team" },
  { value: "admin",    label: "Admin",    sub: "Full system access" },
];
const SECTIONS = [
  { id: "personal",   label: "Personal Info",     icon: User },
  { id: "contact",    label: "Contact & Address",  icon: Phone },
  { id: "employment", label: "Employment",         icon: Briefcase },
  { id: "official",   label: "Official / Finance", icon: Building2 },
  { id: "leaves",     label: "Leave Balances",     icon: CalendarDays },
  { id: "documents",  label: "Documents",          icon: FileText },
  { id: "system",     label: "Account & System",   icon: Settings },
];

type Form = Record<string, string | boolean | undefined>;

// ─── Reusable field wrapper ───────────────────────────────────────────────────
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// Text input
function Inp({ value, onChange, placeholder, type = "text", readOnly }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; readOnly?: boolean;
}) {
  return (
    <Input type={type} value={value} onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      readOnly={readOnly} placeholder={placeholder}
      className={`h-10 border-gray-200 text-sm focus-visible:border-[#006B3F] focus-visible:ring-2 focus-visible:ring-[#006B3F]/20 transition-colors
        ${readOnly ? "bg-gray-50 text-gray-400 cursor-not-allowed font-mono" : "bg-white hover:border-gray-300"}`} />
  );
}

// Short-list Select (≤5 options)
function Sel({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[] | string[]; placeholder?: string;
}) {
  const opts = options.map((o) => typeof o === "string" ? { value: o, label: o } : o);
  return (
    <Select value={value || ""} onValueChange={(v) => { if (v) onChange(v); }}>
      <SelectTrigger className="h-10 w-full border-2 border-gray-300 text-sm hover:border-gray-400 focus-visible:border-[#006B3F] focus-visible:ring-2 focus-visible:ring-[#006B3F]/20 transition-all">
        <SelectValue placeholder={placeholder ?? "Select…"} />
      </SelectTrigger>
      <SelectContent>
        {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const fileRef     = useRef<HTMLInputElement>(null);
  const cnicRef     = useRef<HTMLInputElement>(null);
  const degreeRef   = useRef<HTMLInputElement>(null);
  const medicalRef  = useRef<HTMLInputElement>(null);

  const [activeSection,    setActiveSection]    = useState("personal");
  const [form,             setForm]             = useState<Form>({});
  const [loaded,           setLoaded]           = useState(false);
  const [reportingDistrict, setReportingDistrict] = useState("");
  const [photoPreview,     setPhotoPreview]     = useState<string | null>(null);
  const [uploadingPhoto,   setUploadingPhoto]   = useState(false);
  const [uploadingDoc,     setUploadingDoc]     = useState<Record<string, boolean>>({});
  const [savedSections,    setSavedSections]    = useState<Set<string>>(new Set());

  const { data: emp } = useQuery({
    queryKey: ["employee", id],
    queryFn:  () => api.get(`/employees/${id}`).then((r) => r.data as Form),
  });

  // Fetch employees for Reporting Officer — filtered by selected district
  const { data: managersData } = useQuery({
    queryKey: ["managers-by-district", reportingDistrict],
    queryFn:  () => {
      const url = reportingDistrict
        ? `/employees?department=${encodeURIComponent(reportingDistrict)}&limit=300`
        : `/employees?limit=300`;
      return api.get(url).then((r) =>
        (r.data as { data: { id: string; name: string; role: string; designation?: string }[] }).data
      );
    },
  });
  const managers = (managersData ?? [])
    .map((m) => ({ value: m.id, label: m.name, sub: m.designation ?? m.role }));

  // Leave balance state
  const [adjustLeaveType, setAdjustLeaveType] = useState("Annual");
  const [adjustDays,      setAdjustDays]      = useState("");
  const [adjustReason,    setAdjustReason]    = useState("");
  const [reverseLogId,    setReverseLogId]    = useState<string | null>(null);
  const [reverseReason,   setReverseReason]   = useState("");
  const [showCurrentPw,   setShowCurrentPw]   = useState(false);

  const { data: balanceData, refetch: refetchBalances } = useQuery<{
    fiscalYear: string;
    balances: { id: string; leaveType: string; totalAllocation: number; carriedForward: number; totalUsed: number; balanceRemaining: number; deductionLogs: { id: string; daysDeducted: number; deductionType: string; reason: string | null; createdAt: string; isReversed: boolean }[] }[];
  }>({
    queryKey: ["leave-balances", id],
    queryFn: () => api.get(`/leave-balance/employee/${id}`).then((r) => r.data as { fiscalYear: string; balances: { id: string; leaveType: string; totalAllocation: number; carriedForward: number; totalUsed: number; balanceRemaining: number; deductionLogs: { id: string; daysDeducted: number; deductionType: string; reason: string | null; createdAt: string; isReversed: boolean }[] }[] }),
    enabled: activeSection === "leaves",
  });

  const { data: categories = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["employee-categories"],
    queryFn: () => api.get("/employee-categories").then((r) => r.data as { id: string; name: string }[]),
  });

  const initBalancesMutation = useMutation({
    mutationFn: () => api.post(`/leave-balance/employee/${id}/init`, { categoryId: f("categoryId") }),
    onSuccess: () => { toast.success("Leave balances initialised from category"); refetchBalances(); },
    onError: () => toast.error("Failed to initialise balances"),
  });

  const adjustMutation = useMutation({
    mutationFn: () => api.post(`/leave-balance/employee/${id}/adjust`, { leaveType: adjustLeaveType, days: Number(adjustDays), reason: adjustReason }),
    onSuccess: () => { toast.success("Balance adjusted"); setAdjustDays(""); setAdjustReason(""); refetchBalances(); },
    onError: () => toast.error("Adjustment failed"),
  });

  const reverseMutation = useMutation({
    mutationFn: () => api.post(`/leave-balance/reverse/${reverseLogId}`, { reason: reverseReason }),
    onSuccess: () => { toast.success("Deduction reversed"); setReverseLogId(null); setReverseReason(""); refetchBalances(); },
    onError: () => toast.error("Reversal failed"),
  });

  const LEAVE_TYPES = ["Annual", "Casual", "Medical", "Sick", "Extraordinary", "Earned", "Compensatory", "Unpaid"];

  // Fetch geofence zones for assignment
  const { data: zonesData } = useQuery({
    queryKey: ["geofences-edit"],
    queryFn: () => api.get("/geofence").then((r) => r.data as { id: string; name: string; centerLat: number; centerLng: number; radiusMeters: number; active: boolean }[]),
  });
  const editZones = Array.isArray(zonesData) ? zonesData : ((zonesData as { data?: unknown[] } | undefined)?.data ?? []) as { id: string; name: string; centerLat: number; centerLng: number; radiusMeters: number; active: boolean }[];

  function getZoneIds(): string[] {
    const v = (form["geofenceZoneIds"] as string) ?? "[]";
    try { return JSON.parse(v) as string[]; } catch { return []; }
  }

  function selectEditZone(zoneId: string) {
    set("geofenceZoneIds", JSON.stringify([zoneId]));
  }

  useEffect(() => {
    if (emp && !loaded) {
      const f: Form = {};
      Object.entries(emp).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          f[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
        }
      });
      setForm(f);
      if (emp.profilePhotoUrl) setPhotoPreview(emp.profilePhotoUrl as string);
      if (emp.department) setReportingDistrict(emp.department as string);
      setLoaded(true);
    }
  }, [emp, loaded]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  // ─── Photo upload ─────────────────────────────────────────────────────────
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Photo must be under 3 MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setPhotoPreview(URL.createObjectURL(file));
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "avatars");
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      set("profilePhotoUrl", data.url);
      toast.success("Photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setPhotoPreview(emp?.profilePhotoUrl as string ?? null);
    } finally {
      setUploadingPhoto(false);
    }
  }

  // ─── Document upload ──────────────────────────────────────────────────────
  async function handleDocChange(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "cnicCopyUrl" | "degreeCertificateUrl" | "medicalCertificateUrl",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10 MB"); return; }
    setUploadingDoc((s) => ({ ...s, [field]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "docs");
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      set(field, data.url!);
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingDoc((s) => ({ ...s, [field]: false }));
      e.target.value = "";
    }
  }

  // ─── Save mutation ────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (payload: Form) => api.patch(`/employees/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee", id] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      setSavedSections((s) => new Set(s).add(activeSection));
      toast.success("Changes saved");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "Save failed");
    },
  });

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (!loaded) return (
    <DashboardLayout title="Edit Employee">
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#006B3F] animate-spin" />
          <p className="text-sm text-gray-400">Loading employee data…</p>
        </div>
      </div>
    </DashboardLayout>
  );

  const f = (key: string) => (form[key] as string) ?? "";

  // Date helper — safely parse ISO dates for <input type="date">
  function dateVal(key: string) {
    const v = f(key);
    if (!v) return "";
    try { return format(parseISO(v), "yyyy-MM-dd"); } catch { return v.slice(0, 10); }
  }

  // ─── Section content ──────────────────────────────────────────────────────
  const sections: Record<string, React.ReactNode> = {

    personal: (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Full Name" required>
            <Inp value={f("name")} onChange={(v) => set("name", v)} placeholder="Muhammad Ali Khan" />
          </Field>
          <Field label="Father's Name">
            <Inp value={f("fathersName")} onChange={(v) => set("fathersName", v)} placeholder="Abdul Rahman Khan" />
          </Field>
          <Field label="CNIC" hint="Format: XXXXX-XXXXXXX-X">
            <Inp value={f("cnic")} onChange={(v) => set("cnic", v)} placeholder="35202-1234567-8" />
          </Field>
          <Field label="Date of Birth">
            <Inp type="date" value={dateVal("dateOfBirth")} onChange={(v) => set("dateOfBirth", v)} />
          </Field>
          <Field label="Gender">
            <Sel value={f("gender")} onChange={(v) => set("gender", v)} options={["Male", "Female", "Other"]} placeholder="Select gender" />
          </Field>
          <Field label="Marital Status">
            <Sel value={f("maritalStatus")} onChange={(v) => set("maritalStatus", v)} options={["Single", "Married", "Divorced", "Widowed"]} placeholder="Select status" />
          </Field>
          <Field label="Religion">
            <Sel value={f("religion")} onChange={(v) => set("religion", v)} options={RELIGIONS} placeholder="Select religion" />
          </Field>
        </div>
      </div>
    ),

    contact: (
      <div className="space-y-7">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contact Details</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Email" required>
              <Inp type="email" value={f("email")} onChange={(v) => set("email", v)} placeholder="name@pfa.gov.pk" />
            </Field>
            <Field label="Mobile Phone">
              <Inp value={f("mobilePhone")} onChange={(v) => set("mobilePhone", v)} placeholder="+923001234567" />
            </Field>
            <Field label="Landline">
              <Inp value={f("landlinePhone")} onChange={(v) => set("landlinePhone", v)} placeholder="+92-42-35761234" />
            </Field>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Home Address</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Field label="Street Address">
                <Inp value={f("addressStreet")} onChange={(v) => set("addressStreet", v)} placeholder="House 12, Street 4, Model Town" />
              </Field>
            </div>
            <Field label="City">
              <SearchableSelect
                value={f("addressCity")} onChange={(v) => set("addressCity", v)}
                options={CITIES} placeholder="Select city" searchPlaceholder="Search city…"
              />
            </Field>
            <Field label="District">
              <SearchableSelect value={f("addressDistrict")} onChange={(v) => set("addressDistrict", v)} options={PFA_DISTRICTS} placeholder="Select district" searchPlaceholder="Search district…" />
            </Field>
            <Field label="Postal Code">
              <Inp value={f("addressPostalCode")} onChange={(v) => set("addressPostalCode", v)} placeholder="54000" />
            </Field>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Emergency Contact</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Name">
              <Inp value={f("emergencyContactName")} onChange={(v) => set("emergencyContactName", v)} />
            </Field>
            <Field label="Phone">
              <Inp value={f("emergencyContactPhone")} onChange={(v) => set("emergencyContactPhone", v)} />
            </Field>
            <Field label="Relationship">
              <Sel value={f("emergencyContactRel")} onChange={(v) => set("emergencyContactRel", v)}
                options={["Spouse", "Parent", "Sibling", "Child", "Other"]} placeholder="Select relationship" />
            </Field>
          </div>
        </div>
      </div>
    ),

    employment: (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Employee ID" hint="Auto-assigned — cannot be changed">
            <Inp value={f("employeeCode")} readOnly />
          </Field>
          <Field label="Date of Joining">
            <Inp type="date" value={dateVal("dateOfJoining")} onChange={(v) => set("dateOfJoining", v)}
              placeholder="" />
          </Field>
          <Field label="Department">
            <SearchableSelect
              value={f("department")} onChange={(v) => set("department", v)}
              options={DEPARTMENTS} placeholder="Select department" searchPlaceholder="Search department…"
            />
          </Field>
          <Field label="Designation">
            <SearchableSelect
              value={f("designation")} onChange={(v) => set("designation", v)}
              options={DESIGNATIONS} placeholder="Select designation" searchPlaceholder="Search designation…"
            />
          </Field>
          <Field label="Service Cadre">
            <Sel value={f("serviceCadre")} onChange={(v) => set("serviceCadre", v)}
              options={["FPSC", "Direct Recruitment", "Contract"]} placeholder="Select cadre" />
          </Field>
          <Field label="Grade / BPS Level">
            <SearchableSelect
              value={f("grade")} onChange={(v) => set("grade", v)}
              options={GRADES} placeholder="Select grade" searchPlaceholder="Search grade…"
            />
          </Field>
          <Field label="Gross Salary (PKR)">
            <Inp type="number" value={f("salary")} onChange={(v) => set("salary", v)} placeholder="50000" />
          </Field>
          <Field label="Reporting Officer District" hint="Filter reporting officer list by district">
            <SearchableSelect
              value={reportingDistrict}
              onChange={(v) => { setReportingDistrict(v); set("reportingOfficerId", ""); }}
              options={PFA_DISTRICTS} placeholder="Select district first…" searchPlaceholder="Search district…"
            />
          </Field>
          <Field label="Reporting Officer">
            <SearchableSelect
              value={f("reportingOfficerId")} onChange={(v) => set("reportingOfficerId", v)}
              options={managers.length ? managers : [{ value: "", label: "No employees found", sub: "No employees available" }]}
              placeholder={reportingDistrict ? "Search & select officer…" : "Select a district first…"} searchPlaceholder="Search by name…"
            />
          </Field>
          <Field label="Shift Type">
            <Sel value={f("shiftType")} onChange={(v) => set("shiftType", v)} options={SHIFTS} placeholder="Select shift" />
          </Field>
          <Field label="Employment Status">
            <Sel value={f("employmentStatus")} onChange={(v) => set("employmentStatus", v)} options={EMP_STATUSES} placeholder="Select status" />
          </Field>
        </div>
      </div>
    ),

    official: (() => {
      const zoneIds = getZoneIds();
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Bank Account Number">
              <Inp value={f("bankAccount")} onChange={(v) => set("bankAccount", v)} placeholder="1234567890123456" />
            </Field>
            <Field label="IBAN">
              <Inp value={f("iban")} onChange={(v) => set("iban", v)} placeholder="PK94ABCD0000000000000000" />
            </Field>
            <Field label="Tax File Number (TFN)">
              <Inp value={f("tfn")} onChange={(v) => set("tfn", v)} />
            </Field>
            <Field label="Pension Account">
              <Inp value={f("pensionAccount")} onChange={(v) => set("pensionAccount", v)} />
            </Field>
            <Field label="Office Location">
              <Inp value={f("officeLocation")} onChange={(v) => set("officeLocation", v)} placeholder="PFA Head Office, Lahore" />
            </Field>
            <Field label="Badge / ID Number">
              <Inp value={f("badgeNumber")} onChange={(v) => set("badgeNumber", v)} placeholder="PFA-2026-001" />
            </Field>
          </div>

          {/* Geofence Zone Assignment */}
          <div className="pt-5 border-t border-gray-100">
            <div className="mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Geofence Zone Assignment</p>
              <p className="text-xs text-gray-400 mt-1">Select one zone — the employee can only check in from this location</p>
            </div>
            {editZones.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-3">No geofence zones configured. Ask Super Admin to create zones first.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-3">
                {editZones.map((z) => {
                  const selected = zoneIds[0] === z.id;
                  return (
                    <label key={z.id} onClick={() => selectEditZone(z.id)} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected ? "border-[#006B3F] bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selected ? "border-[#006B3F]" : "border-gray-300"}`}>
                        {selected && <span className="w-2 h-2 rounded-full bg-[#006B3F]" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{z.name}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{z.centerLat.toFixed(4)}, {z.centerLng.toFixed(4)} · {z.radiusMeters}m</p>
                        <p className={`text-xs font-semibold mt-0.5 ${z.active ? "text-green-600" : "text-gray-400"}`}>
                          {z.active ? "● Active" : "○ Inactive"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {zoneIds.length > 0 && (
              <p className="text-xs text-[#006B3F] font-medium mt-2">
                ✓ Assigned to: {editZones.find((z) => z.id === zoneIds[0])?.name}
              </p>
            )}
          </div>
        </div>
      );
    })(),

    leaves: (() => {
      const balances = balanceData?.balances ?? [];
      const fy = balanceData?.fiscalYear ?? new Date().getFullYear().toString();
      return (
        <div className="space-y-5">
          {/* Header row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-gray-400">Fiscal year: <strong>{fy}</strong></p>
            <div className="flex gap-2">
              {f("categoryId") && (
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs rounded-xl"
                  disabled={initBalancesMutation.isPending}
                  onClick={() => initBalancesMutation.mutate()}>
                  <RefreshCw className={`w-3.5 h-3.5 ${initBalancesMutation.isPending ? "animate-spin" : ""}`} />
                  Reset from Category
                </Button>
              )}
            </div>
          </div>

          {/* Category selector */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <CalendarDays className="w-4 h-4 text-[#006B3F] shrink-0" />
            <span className="text-xs font-semibold text-gray-600 w-32 shrink-0">Employee Category</span>
            <select
              value={f("categoryId")}
              onChange={(e) => set("categoryId", e.target.value)}
              className="flex-1 h-8 text-sm border border-gray-200 rounded-lg px-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30"
            >
              <option value="">— No category —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Balance table */}
          {balances.length === 0 ? (
            <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No leave balances found for {fy}</p>
              <p className="text-xs mt-1">Assign a category above and click "Reset from Category"</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Leave Type", "Allocated", "Used", "Remaining", ""].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {balances.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{b.leaveType}</td>
                      <td className="px-4 py-2.5 text-gray-500">{b.totalAllocation}</td>
                      <td className="px-4 py-2.5 text-red-500 font-medium">{b.totalUsed}</td>
                      <td className="px-4 py-2.5">
                        <span className={`font-bold ${b.balanceRemaining <= 2 ? "text-red-600" : b.balanceRemaining <= 5 ? "text-yellow-600" : "text-green-600"}`}>
                          {b.balanceRemaining}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {b.deductionLogs.filter((l) => !l.isReversed && l.deductionType !== "REVERSAL").map((log) => (
                          <button key={log.id} onClick={() => { setReverseLogId(log.id); setReverseReason(""); }}
                            className="text-[10px] text-orange-600 hover:text-orange-800 underline mr-2">
                            Reverse -{log.daysDeducted}d
                          </button>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Reversal dialog (inline) */}
          {reverseLogId && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Reverse Deduction
              </p>
              <textarea value={reverseReason} onChange={(e) => setReverseReason(e.target.value)}
                placeholder="Reason for reversal (required)…" rows={2}
                className="w-full text-sm border border-orange-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs" onClick={() => setReverseLogId(null)}>Cancel</Button>
                <Button size="sm" disabled={!reverseReason.trim() || reverseMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-8 text-xs gap-1"
                  onClick={() => reverseMutation.mutate()}>
                  {reverseMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                  Confirm Reversal
                </Button>
              </div>
            </div>
          )}

          {/* Manual adjustment */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
              <PlusCircle className="w-3.5 h-3.5 text-[#006B3F]" /> Manual Adjustment
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Leave Type</label>
                <select value={adjustLeaveType} onChange={(e) => setAdjustLeaveType(e.target.value)}
                  className="w-full h-8 text-sm border border-gray-200 rounded-lg px-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30">
                  {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Days (+add / −remove)</label>
                <input type="number" value={adjustDays} onChange={(e) => setAdjustDays(e.target.value)}
                  placeholder="+2 or -1" className="w-full h-8 text-sm border border-gray-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Reason</label>
                <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Promotion" className="w-full h-8 text-sm border border-gray-200 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30" />
              </div>
            </div>
            <Button size="sm" disabled={!adjustDays || !adjustReason.trim() || adjustMutation.isPending}
              className="bg-[#006B3F] hover:bg-[#005530] text-white rounded-xl h-8 text-xs gap-1.5"
              onClick={() => adjustMutation.mutate()}>
              {adjustMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
              Apply Adjustment
            </Button>
          </div>

          {/* Deduction log */}
          {balances.some((b) => b.deductionLogs.length > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Deduction History</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {balances.flatMap((b) => b.deductionLogs.map((l) => ({ ...l, leaveType: b.leaveType })))
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((log) => (
                    <div key={log.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${log.isReversed ? "bg-gray-50 text-gray-400 line-through" : log.deductionType === "REVERSAL" ? "bg-green-50 text-green-700" : "bg-red-50/60 text-red-700"}`}>
                      <span className="font-medium">{log.leaveType}</span>
                      <span>{log.deductionType === "REVERSAL" ? `+${Math.abs(log.daysDeducted)}d restored` : `-${log.daysDeducted}d`}</span>
                      <span className="text-gray-400 capitalize">{log.deductionType.toLowerCase()}</span>
                      <span className="text-gray-400">{new Date(log.createdAt).toLocaleDateString()}</span>
                      <span className="truncate max-w-[120px] text-gray-400">{log.reason ?? "—"}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      );
    })(),

    documents: (() => {
      const docs = [
        { label: "CNIC Copy",           field: "cnicCopyUrl"           as const, ref: cnicRef },
        { label: "Degree Certificate",  field: "degreeCertificateUrl"  as const, ref: degreeRef },
        { label: "Medical Certificate", field: "medicalCertificateUrl" as const, ref: medicalRef },
      ];
      return (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">Accepted formats: PDF, JPG, PNG · Max 10 MB each</p>
          {docs.map(({ label, field, ref }) => {
            const url       = f(field);
            const isImage   = url && /\.(png|jpg|jpeg|webp)$/i.test(url);
            const isPdf     = url && /\.pdf$/i.test(url);
            const uploading = uploadingDoc[field];
            return (
              <div key={field} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 transition-colors">
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={label} className="w-full h-full object-cover" />
                  ) : isPdf ? (
                    <FileText className="w-6 h-6 text-red-400" />
                  ) : (
                    <FileText className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  {url ? (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{url.split("/").pop()}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5 italic">No file uploaded</p>
                  )}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {url && (
                    <>
                      <a href={url} target="_blank" rel="noreferrer"
                        className="text-xs text-[#006B3F] font-medium px-2.5 py-1.5 rounded-lg border border-[#006B3F]/30 hover:bg-green-50 transition-colors">
                        View
                      </a>
                      <a href={url} download
                        className="text-xs text-gray-600 font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                        Download
                      </a>
                      <button onClick={() => set(field, "")}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Remove">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <input ref={ref} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                    onChange={(e) => handleDocChange(e, field)} />
                  <button onClick={() => ref.current?.click()} disabled={uploading}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#006B3F] hover:bg-[#005530] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {url ? "Replace" : "Upload"}
                  </button>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-gray-400 pt-2">
            Click <strong>Save Changes</strong> after uploading to persist the links.
          </p>
        </div>
      );
    })(),

    system: (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="System Role">
            <SearchableSelect
              value={f("role")} onChange={(v) => set("role", v)}
              options={ROLES} placeholder="Select role" searchPlaceholder="Search role…"
            />
          </Field>
          <Field label="Account Status">
            <Sel
              value={form.active === "false" || form.active === false ? "inactive" : "active"}
              onChange={(v) => set("active", v === "active" ? "true" : "false")}
              options={[
                { value: "active",   label: "● Active" },
                { value: "inactive", label: "○ Inactive" },
              ]}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Current Password" hint="The employee's active login password">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showCurrentPw ? "text" : "password"}
                    value={(emp?.plainPassword as string) ?? ""}
                    readOnly
                    placeholder="Not recorded"
                    className="h-10 border-gray-200 text-sm bg-gray-50 text-gray-600 font-mono pr-10 cursor-default"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const pw = (emp?.plainPassword as string) ?? "";
                    if (pw) { navigator.clipboard.writeText(pw); }
                  }}
                  title="Copy password"
                  className="h-10 w-10 flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Copy size={14} />
                </button>
              </div>
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Set New Password" hint="Leave blank to keep the current password — minimum 8 characters">
              <Input type="password" value={(form.password as string) ?? ""} onChange={(e) => set("password", e.target.value)}
                placeholder="Enter new password to change"
                className="h-10 border-gray-200 text-sm focus-visible:border-[#006B3F] focus-visible:ring-2 focus-visible:ring-[#006B3F]/20 hover:border-gray-300" />
            </Field>
          </div>
        </div>
      </div>
    ),
  };

  const initials = (emp?.name as string ?? "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <DashboardLayout title="Edit Employee">
      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">Edit Employee</h1>
          <p className="text-xs text-gray-400">{f("employeeCode")} · {f("designation") || f("role")}</p>
        </div>
        <Button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}
          className="bg-[#006B3F] hover:bg-[#005530] text-white gap-2 min-w-32 shadow-sm">
          {updateMutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <><Save className="w-4 h-4" /> Save Changes</>}
        </Button>
      </div>

      <div className="flex gap-5 items-start">
        {/* ── Left: avatar + nav ── */}
        <div className="w-56 shrink-0 space-y-3">

          {/* Avatar upload card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-[#006B3F]/10 bg-gradient-to-br from-[#003D2E] to-[#006B3F] flex items-center justify-center">
                {photoPreview
                  ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-white select-none">{initials}</span>}
              </div>
              <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all duration-200">
                {uploadingPhoto
                  ? <Loader2 className="w-6 h-6 text-white animate-spin opacity-0 group-hover:opacity-100 transition-opacity" />
                  : <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900 text-sm truncate max-w-[140px]">{emp?.name as string}</p>
              <p className="text-xs text-gray-400 truncate max-w-[140px]">{emp?.email as string}</p>
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto}
              className="w-full text-xs text-[#006B3F] font-semibold border border-[#006B3F]/30 rounded-lg py-1.5 hover:bg-green-50 transition-colors disabled:opacity-50">
              {uploadingPhoto ? "Uploading…" : photoPreview ? "Change Photo" : "Upload Photo"}
            </button>
            <p className="text-[10px] text-gray-300">JPG or PNG · max 3 MB</p>
          </div>

          {/* Section nav */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {SECTIONS.map((s) => {
              const Icon   = s.icon;
              const active = activeSection === s.id;
              const done   = savedSections.has(s.id);
              return (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all border-b border-gray-50 last:border-0
                    ${active
                      ? "bg-[#006B3F]/5 text-[#006B3F] border-l-[3px] border-l-[#006B3F]"
                      : "text-gray-600 hover:bg-gray-50 border-l-[3px] border-l-transparent"}`}>
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#006B3F]" : "text-gray-400"}`} />
                  <span className="truncate flex-1 text-left text-xs">{s.label}</span>
                  {done && !active && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                </button>
              );
            })}
          </div>

          <Button variant="outline" className="w-full text-sm text-gray-500" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>

        {/* ── Right: form card ── */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          {/* Section header */}
          {(() => {
            const sec  = SECTIONS.find((s) => s.id === activeSection)!;
            const Icon = sec.icon;
            return (
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-[#006B3F]/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-[#006B3F]" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900 text-sm">{sec.label}</h2>
                  <p className="text-xs text-gray-400">Update fields and click Save Changes</p>
                </div>
                {savedSections.has(activeSection) && (
                  <div className="flex items-center gap-1.5 text-green-600 bg-green-50 rounded-full px-3 py-1 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                  </div>
                )}
              </div>
            );
          })()}

          {sections[activeSection]}

          {/* Footer */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {SECTIONS.map((s) => (
                <button key={s.id} onClick={() => setActiveSection(s.id)} title={s.label}
                  className={`rounded-full transition-all duration-200 ${activeSection === s.id
                    ? "w-5 h-2 bg-[#006B3F]"
                    : savedSections.has(s.id)
                      ? "w-2 h-2 bg-green-400"
                      : "w-2 h-2 bg-gray-200 hover:bg-gray-300"}`} />
              ))}
            </div>
            {/* Navigation */}
            <div className="flex gap-2">
              {(() => {
                const idx  = SECTIONS.findIndex((s) => s.id === activeSection);
                const prev = SECTIONS[idx - 1];
                const next = SECTIONS[idx + 1];
                return (
                  <>
                    {prev && (
                      <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={() => setActiveSection(prev.id)}>
                        ← {prev.label}
                      </Button>
                    )}
                    {next && (
                      <Button variant="outline" size="sm"
                        className="h-8 text-xs px-3 border-[#006B3F]/40 text-[#006B3F] hover:bg-green-50"
                        onClick={() => setActiveSection(next.id)}>
                        {next.label} →
                      </Button>
                    )}
                    <Button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}
                      className="bg-[#006B3F] hover:bg-[#005530] text-white gap-1.5 h-8 px-4 text-xs">
                      {updateMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5" />Save</>}
                    </Button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
