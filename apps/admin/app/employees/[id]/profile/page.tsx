"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Printer, ArrowLeftRight, ArrowRight, FileText, Download, ExternalLink, Star, KeyRound, Eye, EyeOff } from "lucide-react";
import { format, parseISO } from "date-fns";

const DEPARTMENTS = ["Lahore", "Islamabad", "Multan", "Peshawar", "Quetta", "Faisalabad"];

interface EmpDetail {
  id: string; name: string; email: string; role: string; employeeCode?: string;
  fathersName?: string; cnic?: string; dateOfBirth?: string; gender?: string;
  maritalStatus?: string; religion?: string; mobilePhone?: string; landlinePhone?: string;
  addressStreet?: string; addressCity?: string; addressDistrict?: string; addressPostalCode?: string;
  emergencyContactName?: string; emergencyContactPhone?: string; emergencyContactRel?: string;
  dateOfJoining?: string; department?: string; designation?: string; serviceCadre?: string;
  grade?: string; salary?: string; shiftType?: string; employmentStatus?: string;
  bankAccount?: string; iban?: string; tfn?: string; pensionAccount?: string;
  officeLocation?: string; badgeNumber?: string;
  profilePhotoUrl?: string | null;
  cnicCopyUrl?: string; degreeCertificateUrl?: string; medicalCertificateUrl?: string;
  active?: boolean; createdAt?: string;
}

interface Transfer {
  id: string;
  fromDepartment: string;
  toDepartment: string;
  transferDate: string;
  status: string;
  reason?: string;
  approver?: { name: string };
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  Approved: "bg-green-50 text-green-700 border-green-200",
  Pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <dt className="text-xs font-semibold text-gray-400 w-44 shrink-0 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-800 font-medium mt-0.5 sm:mt-0">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-xs font-bold text-[#006B3F] uppercase tracking-widest mb-4 pb-2.5 border-b border-gray-100">
        {title}
      </h3>
      <dl>{children}</dl>
    </div>
  );
}

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [transferOpen, setTransferOpen] = useState(false);
  const [toDept, setToDept] = useState("");
  const [transferDate, setTransferDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reason, setReason] = useState("");

  const [reviewOpen, setReviewOpen]       = useState(false);
  const [reviewDate, setReviewDate]       = useState(format(new Date(), "yyyy-MM-dd"));
  const [reviewPeriod, setReviewPeriod]   = useState("");

  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [newPw, setNewPw]             = useState("");
  const [showNewPw, setShowNewPw]     = useState(false);

  const { data: emp, isLoading } = useQuery<EmpDetail>({
    queryKey: ["employee", id],
    queryFn: () => api.get(`/employees/${id}`).then((r) => r.data as EmpDetail),
  });

  const { data: transferHistory } = useQuery<{ data: Transfer[]; total: number }>({
    queryKey: ["employee-transfers", id],
    queryFn: () =>
      api
        .get<{ data: Transfer[]; total: number }>(`/employee-transfers?employeeId=${id}&limit=50`)
        .then((r) => r.data),
    enabled: !!id,
  });

  const createTransfer = useMutation({
    mutationFn: () =>
      api.post("/employee-transfers", {
        employeeId: id,
        fromDepartment: emp!.department ?? "Unknown",
        toDepartment: toDept,
        transferDate,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Transfer request submitted — pending approval");
      setTransferOpen(false);
      setToDept("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["employee-transfers", id] });
      qc.invalidateQueries({ queryKey: ["transfers-summary"] });
    },
    onError: () => toast.error("Failed to submit transfer request"),
  });

  const resetPassword = useMutation({
    mutationFn: () => api.patch(`/employees/${id}/reset-password`, { newPassword: newPw }),
    onSuccess: () => {
      toast.success("Password reset successfully");
      setResetPwOpen(false);
      setNewPw("");
    },
    onError: () => toast.error("Failed to reset password"),
  });

  const createReview = useMutation({
    mutationFn: () =>
      api.post("/performance-reviews", { employeeId: id, reviewDate, reviewPeriod }).then((r) => r.data as { id: string }),
    onSuccess: (data) => {
      setReviewOpen(false);
      router.push(`/performance-reviews/${data.id}`);
    },
    onError: () => toast.error("Failed to create review"),
  });

  function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toDept) { toast.error("Please select a destination department"); return; }
    if (toDept === emp?.department) { toast.error("Destination must differ from current department"); return; }
    createTransfer.mutate();
  }

  if (isLoading) return (
    <DashboardLayout title="Employee Profile">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-[3px] border-[#006B3F] border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!emp) return (
    <DashboardLayout title="Employee Profile">
      <div className="text-center py-16 text-gray-400"><p>Employee not found.</p></div>
    </DashboardLayout>
  );

  const transfers = transferHistory?.data ?? [];

  return (
    <DashboardLayout title="Employee Profile">

      {/* ── Top action bar ─────────────────────────── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">{emp.name}</h2>
          <p className="text-sm text-gray-500">{emp.employeeCode ?? emp.id} · {emp.designation ?? emp.role}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Print
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={() => { setReviewPeriod(""); setReviewDate(format(new Date(), "yyyy-MM-dd")); setReviewOpen(true); }}
        >
          <Star className="w-4 h-4" /> Start Review
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 rounded-xl border-[#006B3F]/40 text-[#006B3F] hover:bg-[#006B3F]/5"
          onClick={() => {
            setToDept("");
            setTransferDate(format(new Date(), "yyyy-MM-dd"));
            setReason("");
            setTransferOpen(true);
          }}
        >
          <ArrowLeftRight className="w-4 h-4" /> Transfer
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
          onClick={() => { setNewPw(""); setShowNewPw(false); setResetPwOpen(true); }}
        >
          <KeyRound className="w-4 h-4" /> Reset Password
        </Button>
        <Button
          size="sm"
          className="bg-[#006B3F] hover:bg-[#005530] text-white gap-2 rounded-xl"
          onClick={() => router.push(`/employees/${id}/edit`)}
        >
          <Pencil className="w-4 h-4" /> Edit
        </Button>
      </div>

      {/* ── Hero profile card ──────────────────────── */}
      <div
        className="relative flex items-center gap-5 rounded-2xl p-6 mb-6 text-white overflow-hidden shadow-lg"
        style={{ background: "linear-gradient(135deg, #002D1E 0%, #004D30 50%, #006B3F 100%)" }}
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-16 bottom-0 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
          {emp.profilePhotoUrl
            ? <img src={emp.profilePhotoUrl} alt={emp.name} className="w-full h-full object-cover" />
            : <span className="text-2xl font-black text-white">{emp.name.slice(0, 2).toUpperCase()}</span>
          }
        </div>
        <div className="flex-1 min-w-0 relative">
          <h3 className="text-xl font-bold truncate">{emp.name}</h3>
          <p className="text-green-200/80 text-sm truncate">{emp.email}</p>
          <div className="flex flex-wrap gap-2 mt-2.5">
            <Badge className="bg-white/15 text-white border-white/20 text-xs">{emp.role}</Badge>
            {emp.department && (
              <Badge className="bg-white/15 text-white border-white/20 text-xs">{emp.department}</Badge>
            )}
            <Badge
              className={`border-0 text-xs font-semibold ${
                emp.active !== false ? "bg-emerald-400 text-emerald-900" : "bg-gray-400 text-gray-900"
              }`}
            >
              {emp.active !== false ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        {emp.createdAt && (
          <div className="text-right text-xs text-green-200/70 shrink-0 relative">
            <p>Joined</p>
            <p className="font-bold text-white text-sm mt-0.5">{format(parseISO(emp.createdAt), "dd MMM yyyy")}</p>
          </div>
        )}
      </div>

      {/* ── Documents — full width standalone card ──── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <h3 className="text-xs font-bold text-[#006B3F] uppercase tracking-widest mb-5 pb-2.5 border-b border-gray-100">
          Documents
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "CNIC Copy", url: emp.cnicCopyUrl },
            { label: "Degree Certificate", url: emp.degreeCertificateUrl },
            { label: "Medical Certificate", url: emp.medicalCertificateUrl },
          ].map(({ label, url }) => {
            const isImage = url && /\.(png|jpg|jpeg|webp)$/i.test(url);
            const isPdf   = url && /\.pdf$/i.test(url);
            return (
              <div key={label} className={`rounded-xl border-2 overflow-hidden transition-colors ${url ? "border-green-100 bg-green-50/30" : "border-dashed border-gray-200 bg-gray-50"}`}>
                {/* Preview area */}
                <div className="h-32 flex items-center justify-center bg-gray-50 border-b border-gray-100">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url!} alt={label} className="h-full w-full object-cover" />
                  ) : isPdf ? (
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                      <FileText className="w-10 h-10 text-red-400" />
                      <span className="text-xs font-medium text-red-500">PDF</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-300">
                      <FileText className="w-10 h-10" />
                      <span className="text-xs">Not uploaded</span>
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-700 truncate">{label}</span>
                  {url ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-[#006B3F] font-medium px-2 py-1 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </a>
                      <a
                        href={url}
                        download
                        className="flex items-center gap-1 text-xs text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Download className="w-3 h-3" /> Save
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300 italic shrink-0">Not uploaded</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Info sections ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Section title="Personal Information">
          <Row label="Full Name" value={emp.name} />
          <Row label="Father's Name" value={emp.fathersName} />
          <Row label="CNIC" value={emp.cnic} />
          <Row label="Date of Birth" value={emp.dateOfBirth ? format(parseISO(emp.dateOfBirth), "dd MMM yyyy") : undefined} />
          <Row label="Gender" value={emp.gender} />
          <Row label="Marital Status" value={emp.maritalStatus} />
          <Row label="Religion" value={emp.religion} />
        </Section>

        <Section title="Contact Information">
          <Row label="Email" value={emp.email} />
          <Row label="Mobile Phone" value={emp.mobilePhone} />
          <Row label="Landline" value={emp.landlinePhone} />
          <Row label="Street" value={emp.addressStreet} />
          <Row label="City" value={emp.addressCity} />
          <Row label="District" value={emp.addressDistrict} />
          <Row label="Postal Code" value={emp.addressPostalCode} />
        </Section>

        <Section title="Emergency Contact">
          <Row label="Name" value={emp.emergencyContactName} />
          <Row label="Phone" value={emp.emergencyContactPhone} />
          <Row label="Relationship" value={emp.emergencyContactRel} />
        </Section>

        <Section title="Employment Details">
          <Row label="Employee ID" value={emp.employeeCode} />
          <Row label="Date of Joining" value={emp.dateOfJoining ? format(parseISO(emp.dateOfJoining), "dd MMM yyyy") : undefined} />
          <Row label="Department" value={emp.department} />
          <Row label="Designation" value={emp.designation} />
          <Row label="Service Cadre" value={emp.serviceCadre} />
          <Row label="Grade" value={emp.grade} />
          <Row label="Salary (PKR)" value={emp.salary ? `PKR ${Number(emp.salary).toLocaleString()}` : undefined} />
          <Row label="Shift Type" value={emp.shiftType} />
          <Row label="Employment Status" value={emp.employmentStatus} />
        </Section>

        <Section title="Official / Financial">
          <Row label="Bank Account" value={emp.bankAccount} />
          <Row label="IBAN" value={emp.iban} />
          <Row label="Tax File Number" value={emp.tfn} />
          <Row label="Pension Account" value={emp.pensionAccount} />
          <Row label="Office Location" value={emp.officeLocation} />
          <Row label="Badge Number" value={emp.badgeNumber} />
        </Section>

      </div>

      {/* ── Transfer History ───────────────────────── */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={15} className="text-[#006B3F]" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Transfer History</h3>
            {transfers.length > 0 && (
              <span className="text-[10px] bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                {transfers.length}
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl text-xs border-[#006B3F]/30 text-[#006B3F] hover:bg-[#006B3F]/5 h-8"
            onClick={() => {
              setToDept("");
              setTransferDate(format(new Date(), "yyyy-MM-dd"));
              setReason("");
              setTransferOpen(true);
            }}
          >
            <ArrowLeftRight size={12} />
            New Transfer
          </Button>
        </div>

        {transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
            <ArrowLeftRight size={28} className="opacity-25" />
            <p className="text-sm">No transfer records yet</p>
            <p className="text-xs text-gray-300">Use the Transfer button to initiate one</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[320px]">
            <table className="w-full min-w-[600px] text-sm border-collapse">
              <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                <tr>
                  {["#", "From", "", "To", "Transfer Date", "Submitted", "Status", "Approved By"].map((h, i) => (
                    <th
                      key={i}
                      className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 border-b border-gray-100 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transfers.map((t, idx) => (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-50/60 transition-colors"
                    style={{ borderBottom: "1px solid #F8FAFC" }}
                  >
                    <td className="px-4 py-3 text-xs text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-medium">{t.fromDepartment}</td>
                    <td className="px-1 py-3 text-gray-300"><ArrowRight size={13} /></td>
                    <td className="px-4 py-3 font-semibold text-[#006B3F] whitespace-nowrap">{t.toDepartment}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {format(parseISO(t.transferDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {format(parseISO(t.createdAt), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={`text-[11px] font-semibold ${STATUS_STYLE[t.status] ?? ""}`} variant="outline">
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {t.approver?.name ?? <span className="italic text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Transfer Dialog ────────────────────────── */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ArrowLeftRight size={16} className="text-[#006B3F]" />
              Transfer Employee
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleTransferSubmit} className="space-y-4 mt-1">
            {/* Employee name (readonly) */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#006B3F]/10 flex items-center justify-center text-[#006B3F] text-sm font-bold shrink-0">
                {emp.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{emp.name}</p>
                <p className="text-xs text-gray-400">{emp.employeeCode ?? emp.id}</p>
              </div>
            </div>

            {/* From → To row */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From</Label>
                <Input
                  value={emp.department ?? "Not set"}
                  readOnly
                  className="bg-gray-50 text-gray-500 rounded-xl h-10 text-sm cursor-not-allowed"
                />
              </div>
              <div className="mb-[2px] flex items-center justify-center">
                <ArrowRight size={16} className="text-gray-300" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="toDept" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  To <span className="text-red-500">*</span>
                </Label>
                <select
                  id="toDept"
                  value={toDept}
                  onChange={(e) => setToDept(e.target.value)}
                  required
                  className="w-full h-10 text-sm border border-gray-200 rounded-xl px-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30 focus:border-[#006B3F]/50"
                >
                  <option value="">Select dept…</option>
                  {DEPARTMENTS.filter((d) => d !== emp.department).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transfer date */}
            <div className="space-y-1.5">
              <Label htmlFor="transferDate" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Transfer Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="transferDate"
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
                className="h-10 rounded-xl text-sm focus-visible:ring-[#006B3F]/40"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Reason <span className="text-gray-300 font-normal">(optional)</span>
              </Label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. Departmental restructuring, employee request…"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30 focus:border-[#006B3F]/50"
              />
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setTransferOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTransfer.isPending}
                className="bg-[#006B3F] hover:bg-[#005530] text-white rounded-xl gap-2"
              >
                {createTransfer.isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <ArrowLeftRight size={14} />
                    Submit Transfer
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Start Review Dialog ───────────────────── */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Star size={16} className="text-amber-500" />
              Start Performance Review
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); if (!reviewPeriod.trim()) { toast.error("Enter a review period"); return; } createReview.mutate(); }}
            className="space-y-4 mt-1"
          >
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#006B3F]/10 flex items-center justify-center text-[#006B3F] text-sm font-bold shrink-0">
                {emp.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{emp.name}</p>
                <p className="text-xs text-gray-400">{emp.designation ?? emp.role}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Review Period <span className="text-red-500">*</span>
              </Label>
              <Input
                value={reviewPeriod}
                onChange={(e) => setReviewPeriod(e.target.value)}
                placeholder="e.g. Q1 2026, Annual 2025"
                required
                className="h-10 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Review Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                required
                className="h-10 rounded-xl text-sm"
              />
            </div>
            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setReviewOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createReview.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl gap-2"
              >
                {createReview.isPending ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Star size={14} />
                )}
                Create Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ─────────────────── */}
      <Dialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <KeyRound size={16} className="text-red-500" />
              Reset Password
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newPw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
              resetPassword.mutate();
            }}
            className="space-y-4 mt-1"
          >
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 text-sm font-bold shrink-0">
                {emp.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{emp.name}</p>
                <p className="text-xs text-gray-400">{emp.email}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                New Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showNewPw ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Enter new password"
                  className="h-10 rounded-xl text-sm pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPw && (
                <p className="text-xs text-green-600 font-mono bg-green-50 px-2 py-1 rounded-lg">
                  New password: {newPw}
                </p>
              )}
            </div>
            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setResetPwOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={resetPassword.isPending || newPw.length < 6}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2"
              >
                {resetPassword.isPending ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <KeyRound size={14} />
                )}
                Reset Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
