"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  User,
  Phone,
  Briefcase,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

// ── Zod schemas per step ────────────────────────────────────────────────────

const cnicRegex = /^\d{5}-\d{7}-\d$/;
const pkPhoneRegex = /^(\+92|03)\d{9,10}$/;

const step1Schema = z.object({
  name: z.string().min(3, "Min 3 characters").max(100),
  fathersName: z.string().min(2, "Required"),
  cnic: z.string().regex(cnicRegex, "Format: XXXXX-XXXXXXX-X"),
  dateOfBirth: z.string().refine((d) => {
    const age = (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 18;
  }, "Must be at least 18 years old"),
  gender: z.string().min(1, "Required"),
  maritalStatus: z.string().min(1, "Required"),
  religion: z.string().min(1, "Required"),
});

const step2Schema = z.object({
  email: z.string().email("Invalid email"),
  mobilePhone: z.string().regex(pkPhoneRegex, "Format: +92XXXXXXXXXX or 03XXXXXXXXX"),
  landlinePhone: z.string().optional(),
  addressStreet: z.string().min(2, "Required"),
  addressCity: z.string().min(1, "Required"),
  addressDistrict: z.string().min(2, "Required"),
  addressPostalCode: z.string().regex(/^\d{5}$/, "5-digit postal code"),
  emergencyContactName: z.string().min(2, "Required"),
  emergencyContactPhone: z.string().regex(pkPhoneRegex, "Format: +92XXXXXXXXXX or 03XXXXXXXXX"),
  emergencyContactRel: z.string().min(1, "Required"),
});

const step3Schema = z.object({
  dateOfJoining: z.string().refine((d) => new Date(d) <= new Date(), "Cannot be a future date"),
  department: z.string().min(1, "Required"),
  designation: z.string().min(1, "Required"),
  serviceCadre: z.string().min(1, "Required"),
  grade: z.string().min(1, "Required"),
  salary: z.string().optional(),
  reportingOfficerId: z.string().min(1, "Required"),
  shiftType: z.string().min(1, "Required"),
  employmentStatus: z.string().min(1, "Required"),
});

const step4Schema = z.object({
  bankAccount: z.string().regex(/^\d{16,24}$/, "16–24 digits"),
  iban: z.string().regex(/^PK\d{2}[A-Z0-9]{4}\d{16}$/, "Format: PK94XXXX0000000000XXXXXXXX"),
  tfn: z.string().optional(),
  pensionAccount: z.string().optional(),
  officeLocation: z.string().min(2, "Required"),
  badgeNumber: z.string().min(2, "Required"),
  geofenceZoneIds: z.array(z.string()).min(1, "Select at least one zone"),
});

const step5Schema = z.object({
  password: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
  confirmPassword: z.string(),
  role: z.string().min(1, "Required"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof step1Schema> &
  z.infer<typeof step2Schema> &
  z.infer<typeof step3Schema> &
  z.infer<typeof step4Schema> &
  z.infer<typeof step5Schema> & {
    cnicCopyUrl?: string;
    degreeCertificateUrl?: string;
    medicalCertificateUrl?: string;
  };

const STEP_SCHEMAS = [step1Schema, step2Schema, step3Schema, step4Schema, step5Schema];

const STEPS = [
  { label: "Personal", icon: User },
  { label: "Contact", icon: Phone },
  { label: "Employment", icon: Briefcase },
  { label: "Official", icon: Building2 },
  { label: "Documents", icon: Settings },
];

const CITIES = ["Lahore", "Islamabad", "Karachi", "Multan", "Faisalabad", "Peshawar", "Quetta", "Rawalpindi", "Sialkot", "Gujranwala"];
const DEPARTMENTS = ["Lahore", "Islamabad", "Multan", "Peshawar", "Quetta", "Faisalabad"];
const DESIGNATIONS = ["Food Inspector", "Senior Inspector", "Supervisor", "Manager", "Admin", "Other"];
const CADRES = ["FPSC", "Direct Recruitment", "Contract"];
const GRADES = ["BPS-12", "BPS-14", "BPS-16", "BPS-17", "BPS-18", "BPS-19", "BPS-20"];
const SHIFTS = ["Day", "Night", "Rotation"];
const EMP_STATUSES = ["Active", "On Leave", "Suspended", "Retired"];
const RELATIONSHIPS = ["Spouse", "Parent", "Sibling", "Child", "Other"];
const RELIGIONS = ["Islam", "Christianity", "Sikhism", "Hinduism", "Other"];

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score === 2) return { score, label: "Fair", color: "bg-orange-400" };
  if (score === 3) return { score, label: "Good", color: "bg-yellow-400" };
  if (score === 4) return { score, label: "Strong", color: "bg-green-400" };
  return { score, label: "Very Strong", color: "bg-green-600" };
}

// ── Field Components ─────────────────────────────────────────────────────────

function Field({ label, error, children, required }: { label: string; error?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Sel({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <Select value={value || ""} onValueChange={(v) => { if (v) onChange(v); }}>
      <SelectTrigger className="h-9 text-sm border-gray-200 focus:ring-[#006B3F]">
        <SelectValue placeholder={placeholder ?? "Select..."} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── File Upload Component ────────────────────────────────────────────────────

function FileUpload({ label, required, onUpload, value }: { label: string; required?: boolean; onUpload: (url: string) => void; value?: string }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) { toast.error("Only PDF, JPG, PNG allowed"); return; }
    setUploading(true);
    try {
      if (file.type.startsWith("image/")) setPreview(URL.createObjectURL(file));
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "docs");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) { onUpload(data.url); toast.success("Uploaded"); }
      else toast.error(data.error ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <label
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
          value ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-[#006B3F] hover:bg-green-50"
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }} />
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-[#006B3F] border-t-transparent rounded-full animate-spin" />
            Uploading...
          </div>
        ) : value ? (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check className="w-4 h-4" /> File uploaded
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-gray-400" />
            <p className="text-xs text-gray-500 text-center">Drag & drop or click · PDF, JPG, PNG · Max 5MB</p>
          </>
        )}
      </label>
      {preview && (
        <div className="relative w-20 h-20 mt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="preview" className="w-full h-full object-cover rounded border" />
          <button type="button" onClick={() => { setPreview(null); onUpload(""); }}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AddEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [uploads, setUploads] = useState({ cnicCopyUrl: "", degreeCertificateUrl: "", medicalCertificateUrl: "" });

  const { register, formState: { errors }, setValue, watch, setError, clearErrors, getValues } = useForm<FormData>({
    mode: "onChange",
    defaultValues: {
      role: "employee",
      employmentStatus: "Active",
      geofenceZoneIds: [],
    },
  });

  const watched = watch();
  const pwStrength = passwordStrength(watched.password || "");

  // Fetch geofence zones
  const { data: zonesData } = useQuery({
    queryKey: ["geofences-add"],
    queryFn: () => api.get("/geofence").then((r) => r.data as { id: string; name: string; centerLat: number; centerLng: number; radiusMeters: number }[]),
  });
  const zones = Array.isArray(zonesData) ? zonesData : ((zonesData as unknown as { data?: unknown[] })?.data ?? []);

  // Fetch managers
  const { data: managersData } = useQuery({
    queryKey: ["managers"],
    queryFn: () => api.get("/employees?limit=100").then((r) => (r.data as { data: { id: string; name: string; role: string }[] }).data),
  });
  const managers = (managersData ?? []).filter((m: { role: string }) => ["manager", "admin"].includes(m.role));

  const validateStep = (s: number) => {
    const data = getValues();
    clearErrors();
    const result = (STEP_SCHEMAS[s] as z.ZodTypeAny).safeParse(data);
    if (result.success) return true;
    result.error.issues.forEach((err: z.ZodIssue) => {
      const path = err.path[0] as keyof FormData;
      if (path) setError(path, { message: err.message });
    });
    return false;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep((s) => s + 1);
  };

  const handlePrev = () => setStep((s) => s - 1);

  // Toggle geofence zone selection
  const toggleZone = (id: string) => {
    const current = watched.geofenceZoneIds ?? [];
    const next = current.includes(id) ? current.filter((z) => z !== id) : [...current, id];
    setValue("geofenceZoneIds", next, { shouldValidate: true });
  };

  const onFinalSubmit = async () => {
    if (!validateStep(step)) return;
    const data = getValues();
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        salary: data.salary ? parseFloat(data.salary) : undefined,
        ...uploads,
        active: true,
      };
      const res = await api.post("/employees", payload);
      const emp = res.data as { employeeCode?: string };
      toast.success(`Employee added — ID: ${emp.employeeCode ?? "—"}`);
      router.push("/employees");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create employee";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step renders ────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Field label="Full Name" required error={errors.name?.message}>
        <Input {...register("name")} placeholder="Muhammad Ali Khan" className="h-9 border-gray-200" />
      </Field>
      <Field label="Father's Name" required error={errors.fathersName?.message}>
        <Input {...register("fathersName")} placeholder="Abdul Rahman Khan" className="h-9 border-gray-200" />
      </Field>
      <Field label="CNIC" required error={errors.cnic?.message}>
        <Input {...register("cnic")} placeholder="35202-1234567-8" className="h-9 border-gray-200 font-mono" maxLength={15} />
      </Field>
      <Field label="Date of Birth" required error={errors.dateOfBirth?.message}>
        <Input {...register("dateOfBirth")} type="date" className="h-9 border-gray-200" max={new Date(Date.now() - 18 * 365.25 * 86400000).toISOString().split("T")[0]} />
      </Field>
      <Field label="Gender" required error={errors.gender?.message}>
        <Sel value={watched.gender ?? ""} onChange={(v) => setValue("gender", v, { shouldValidate: true })} options={["Male", "Female", "Other"]} />
      </Field>
      <Field label="Marital Status" required error={errors.maritalStatus?.message}>
        <Sel value={watched.maritalStatus ?? ""} onChange={(v) => setValue("maritalStatus", v, { shouldValidate: true })} options={["Single", "Married", "Divorced", "Widowed"]} />
      </Field>
      <Field label="Religion" required error={(errors as { religion?: { message?: string } }).religion?.message}>
        <Sel value={watched.religion ?? ""} onChange={(v) => setValue("religion", v, { shouldValidate: true })} options={RELIGIONS} />
      </Field>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Contact Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Email Address" required error={errors.email?.message}>
            <Input {...register("email")} type="email" placeholder="employee@pfa.gov.pk" className="h-9 border-gray-200" />
          </Field>
          <Field label="Mobile Phone" required error={errors.mobilePhone?.message}>
            <Input {...register("mobilePhone")} placeholder="+923001234567" className="h-9 border-gray-200 font-mono" />
          </Field>
          <Field label="Landline / Office Phone" error={errors.landlinePhone?.message}>
            <Input {...register("landlinePhone")} placeholder="+92-42-35761234" className="h-9 border-gray-200 font-mono" />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Home Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Field label="Street Address" required error={errors.addressStreet?.message}>
              <Input {...register("addressStreet")} placeholder="House 12, Street 4, Model Town" className="h-9 border-gray-200" />
            </Field>
          </div>
          <Field label="City" required error={errors.addressCity?.message}>
            <Sel value={watched.addressCity ?? ""} onChange={(v) => setValue("addressCity", v, { shouldValidate: true })} options={CITIES} />
          </Field>
          <Field label="District" required error={errors.addressDistrict?.message}>
            <Input {...register("addressDistrict")} placeholder="Lahore" className="h-9 border-gray-200" />
          </Field>
          <Field label="Postal Code" required error={errors.addressPostalCode?.message}>
            <Input {...register("addressPostalCode")} placeholder="54000" maxLength={5} className="h-9 border-gray-200 font-mono" />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Contact Name" required error={errors.emergencyContactName?.message}>
            <Input {...register("emergencyContactName")} placeholder="Full name" className="h-9 border-gray-200" />
          </Field>
          <Field label="Contact Phone" required error={errors.emergencyContactPhone?.message}>
            <Input {...register("emergencyContactPhone")} placeholder="+923001234567" className="h-9 border-gray-200 font-mono" />
          </Field>
          <Field label="Relationship" required error={errors.emergencyContactRel?.message}>
            <Sel value={watched.emergencyContactRel ?? ""} onChange={(v) => setValue("emergencyContactRel", v, { shouldValidate: true })} options={RELATIONSHIPS} />
          </Field>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const empCode = `EMP-${Date.now().toString().slice(-6)}`;
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Employee ID (Auto-generated)" error={undefined}>
            <Input value={empCode} readOnly className="h-9 border-gray-200 bg-gray-50 font-mono text-gray-500 cursor-not-allowed" />
          </Field>
          <Field label="Date of Joining" required error={errors.dateOfJoining?.message}>
            <Input {...register("dateOfJoining")} type="date" max={new Date().toISOString().split("T")[0]} className="h-9 border-gray-200" />
          </Field>
          <Field label="Department" required error={errors.department?.message}>
            <Sel value={watched.department ?? ""} onChange={(v) => setValue("department", v, { shouldValidate: true })} options={DEPARTMENTS} placeholder="Select department..." />
          </Field>
          <Field label="Designation / Position" required error={errors.designation?.message}>
            <Sel value={watched.designation ?? ""} onChange={(v) => setValue("designation", v, { shouldValidate: true })} options={DESIGNATIONS} />
          </Field>
          <Field label="Service Cadre" required error={errors.serviceCadre?.message}>
            <Sel value={watched.serviceCadre ?? ""} onChange={(v) => setValue("serviceCadre", v, { shouldValidate: true })} options={CADRES} />
          </Field>
          <Field label="Grade / Level" required error={errors.grade?.message}>
            <Sel value={watched.grade ?? ""} onChange={(v) => setValue("grade", v, { shouldValidate: true })} options={GRADES} />
          </Field>
          <Field label="Basic Salary (PKR)" error={errors.salary?.message}>
            <Input {...register("salary")} type="number" placeholder="50000" className="h-9 border-gray-200" />
          </Field>
          <Field label="Reporting Officer" required error={errors.reportingOfficerId?.message}>
            <Select value={watched.reportingOfficerId ?? ""} onValueChange={(v) => { if (v) setValue("reportingOfficerId", v, { shouldValidate: true }); }}>
              <SelectTrigger className="h-9 text-sm border-gray-200">
                <SelectValue placeholder="Select manager..." />
              </SelectTrigger>
              <SelectContent>
                {managers.map((m: { id: string; name: string; role: string }) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} <span className="text-gray-400 text-xs">({m.role})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Shift Type" required error={errors.shiftType?.message}>
            <Sel value={watched.shiftType ?? ""} onChange={(v) => setValue("shiftType", v, { shouldValidate: true })} options={SHIFTS} />
          </Field>
          <Field label="Employment Status" required error={errors.employmentStatus?.message}>
            <Sel value={watched.employmentStatus ?? "Active"} onChange={(v) => setValue("employmentStatus", v, { shouldValidate: true })} options={EMP_STATUSES} />
          </Field>
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Financial Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Bank Account Number" required error={errors.bankAccount?.message}>
            <Input {...register("bankAccount")} placeholder="1234567890123456" className="h-9 border-gray-200 font-mono" />
          </Field>
          <Field label="IBAN" required error={errors.iban?.message}>
            <Input {...register("iban")} placeholder="PK94ABCD0000000000000000" className="h-9 border-gray-200 font-mono uppercase" />
          </Field>
          <Field label="Tax File Number (TFN)" error={errors.tfn?.message}>
            <Input {...register("tfn")} placeholder="123456789-0" className="h-9 border-gray-200 font-mono" />
          </Field>
          <Field label="Pension Account Number" error={errors.pensionAccount?.message}>
            <Input {...register("pensionAccount")} placeholder="Optional" className="h-9 border-gray-200" />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Official Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Office Location / Building" required error={errors.officeLocation?.message}>
            <Input {...register("officeLocation")} placeholder="PFA Head Office, Lahore" className="h-9 border-gray-200" />
          </Field>
          <Field label="Badge / ID Card Number" required error={errors.badgeNumber?.message}>
            <Input {...register("badgeNumber")} placeholder="PFA-2026-001" className="h-9 border-gray-200 font-mono" />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Geofence Zone Assignment</h3>
        {(errors.geofenceZoneIds as { message?: string } | undefined)?.message && (
          <p className="text-xs text-red-500 mb-2">{(errors.geofenceZoneIds as { message?: string }).message}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
          {(zones as { id: string; name: string; centerLat: number; centerLng: number; radiusMeters: number }[]).map((z) => {
            const checked = (watched.geofenceZoneIds ?? []).includes(z.id);
            return (
              <label key={z.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? "border-[#006B3F] bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleZone(z.id)}
                  className="mt-0.5 data-[state=checked]:bg-[#006B3F] data-[state=checked]:border-[#006B3F]"
                />
                <div>
                  <p className="text-sm font-medium">{z.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{z.centerLat.toFixed(4)}, {z.centerLng.toFixed(4)} · {z.radiusMeters}m</p>
                </div>
              </label>
            );
          })}
          {(zones as unknown[]).length === 0 && (
            <p className="text-sm text-gray-400 col-span-2 text-center py-4">No geofence zones found</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Document Uploads</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FileUpload label="CNIC Copy" required value={uploads.cnicCopyUrl} onUpload={(url) => setUploads((u) => ({ ...u, cnicCopyUrl: url }))} />
          <FileUpload label="Degree Certificate" required value={uploads.degreeCertificateUrl} onUpload={(url) => setUploads((u) => ({ ...u, degreeCertificateUrl: url }))} />
          <FileUpload label="Medical Certificate" value={uploads.medicalCertificateUrl} onUpload={(url) => setUploads((u) => ({ ...u, medicalCertificateUrl: url }))} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">System Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <Field label="Password" required error={errors.password?.message}>
              <div className="relative">
                <Input {...register("password")} type={showPw ? "text" : "password"} placeholder="••••••••" className="h-9 border-gray-200 pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            {watched.password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < pwStrength.score ? pwStrength.color : "bg-gray-200"}`} />
                  ))}
                </div>
                <p className={`text-xs font-medium ${pwStrength.score <= 1 ? "text-red-500" : pwStrength.score <= 2 ? "text-orange-500" : pwStrength.score <= 3 ? "text-yellow-600" : "text-green-600"}`}>
                  {pwStrength.label}
                </p>
              </div>
            )}
          </div>
          <Field label="Confirm Password" required error={errors.confirmPassword?.message}>
            <div className="relative">
              <Input {...register("confirmPassword")} type={showConfirmPw ? "text" : "password"} placeholder="••••••••" className="h-9 border-gray-200 pr-10" />
              <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="System Role" required error={errors.role?.message}>
            <Select value={watched.role ?? "employee"} onValueChange={(v) => { if (v) setValue("role", v, { shouldValidate: true }); }}>
              <SelectTrigger className="h-9 text-sm border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[["employee", "Employee — Can view own data"], ["manager", "Manager — Can approve leaves, view team"], ["admin", "Admin — Full access"]].map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
    </div>
  );

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <DashboardLayout title="Add New Employee">
      <div className="max-w-4xl mx-auto">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0">
              <div className="h-full bg-[#006B3F] transition-all duration-500" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
            </div>
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <div key={i} className="flex flex-col items-center gap-2 z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${done ? "bg-[#006B3F] border-[#006B3F]" : active ? "bg-white border-[#006B3F]" : "bg-white border-gray-200"}`}>
                    {done ? <Check className="w-5 h-5 text-white" /> : <Icon className={`w-5 h-5 ${active ? "text-[#006B3F]" : "text-gray-400"}`} />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${active ? "text-[#006B3F]" : done ? "text-gray-600" : "text-gray-400"}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-center">
            <Badge variant="outline" className="text-xs bg-green-50 text-[#006B3F] border-green-200">
              Step {step + 1} of {STEPS.length}: {STEPS[step].label}
            </Badge>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={(e) => e.preventDefault()}>
            {stepContent[step]()}
          </form>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <Button variant="outline" onClick={handlePrev} disabled={step === 0} className="gap-2">
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <span className="text-xs text-gray-400">{step + 1} / {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <Button onClick={handleNext} className="bg-[#006B3F] hover:bg-[#005530] text-white gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={onFinalSubmit} disabled={submitting} className="bg-[#006B3F] hover:bg-[#005530] text-white gap-2 min-w-32">
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
                ) : (
                  <><Check className="w-4 h-4" /> Submit</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
