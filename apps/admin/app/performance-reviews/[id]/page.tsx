"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Star, CheckCircle2, Send, ThumbsUp, ThumbsDown, Loader2, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Criteria { id: string; name: string; weight: number; displayOrder: number; description?: string }
interface ReviewScore { criteriaId: string; score: number; feedback: string | null; criteria: Criteria }
interface Review {
  id: string; employeeId: string; reviewPeriod: string; reviewDate: string;
  status: string; overallScore: number | null; strengths: string | null;
  improvements: string | null; comments: string | null; reviewerName: string | null;
  submittedAt: string | null; approvedAt: string | null;
  employee: { id: string; name: string; department: string | null; designation: string | null; profilePhotoUrl: string | null; employeeCode: string | null };
  scores: ReviewScore[];
}
interface TrendPoint { id: string; reviewPeriod: string; reviewDate: string; overallScore: number | null }

const STATUS_COLOR: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600",
  submitted: "bg-blue-50 text-blue-700",
  approved:  "bg-green-50 text-green-700",
  rejected:  "bg-red-50 text-red-700",
};

// ── Star rater ──────────────────────────────────────────────────────────────
function StarRater({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          className="focus:outline-none disabled:cursor-default"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              n <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-200 fill-gray-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ── Score ring ──────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number | null }) {
  if (!score) return null;
  const pct = (score / 5) * 100;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = score >= 4 ? "#16a34a" : score >= 3 ? "#d97706" : "#dc2626";
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90 absolute">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="text-center z-10">
        <p className="text-xl font-black" style={{ color }}>{score.toFixed(1)}</p>
        <p className="text-[10px] text-gray-400 font-medium">/ 5.0</p>
      </div>
    </div>
  );
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [scores, setScores]           = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks]     = useState<Record<string, string>>({});
  const [strengths, setStrengths]     = useState("");
  const [improvements, setImprovements] = useState("");
  const [comments, setComments]       = useState("");

  const { data: review, isLoading } = useQuery<Review>({
    queryKey: ["review", id],
    queryFn: () => api.get(`/performance-reviews/${id}`).then((r) => r.data as Review),
  });

  const { data: criteria = [] } = useQuery<Criteria[]>({
    queryKey: ["review-criteria"],
    queryFn: () => api.get("/performance-reviews/criteria").then((r) => r.data as Criteria[]),
  });

  const { data: trends = [] } = useQuery<TrendPoint[]>({
    queryKey: ["review-trends", review?.employeeId],
    queryFn: () =>
      api.get(`/performance-reviews/trends/${review!.employeeId}`).then((r) => r.data as TrendPoint[]),
    enabled: !!review?.employeeId,
  });

  // Populate form from existing scores
  useEffect(() => {
    if (!review) return;
    const s: Record<string, number> = {};
    const f: Record<string, string> = {};
    review.scores.forEach((sc) => { s[sc.criteriaId] = sc.score; f[sc.criteriaId] = sc.feedback ?? ""; });
    setScores(s);
    setFeedbacks(f);
    setStrengths(review.strengths ?? "");
    setImprovements(review.improvements ?? "");
    setComments(review.comments ?? "");
  }, [review]);

  const submitMutation = useMutation({
    mutationFn: () =>
      api.post(`/performance-reviews/${id}/submit`, {
        strengths,
        improvements,
        comments,
        scores: criteria.map((c) => ({ criteriaId: c.id, score: scores[c.id] ?? 0, feedback: feedbacks[c.id] ?? "" })),
      }),
    onSuccess: () => {
      toast.success("Review submitted successfully");
      qc.invalidateQueries({ queryKey: ["review", id] });
      qc.invalidateQueries({ queryKey: ["performance-reviews"] });
    },
    onError: () => toast.error("Failed to submit review"),
  });

  const approveMutation = useMutation({
    mutationFn: () => api.patch(`/performance-reviews/${id}/approve`, {}),
    onSuccess: () => {
      toast.success("Review approved");
      qc.invalidateQueries({ queryKey: ["review", id] });
      qc.invalidateQueries({ queryKey: ["performance-reviews"] });
    },
    onError: () => toast.error("Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.patch(`/performance-reviews/${id}/reject`, {}),
    onSuccess: () => {
      toast.success("Review rejected");
      qc.invalidateQueries({ queryKey: ["review", id] });
      qc.invalidateQueries({ queryKey: ["performance-reviews"] });
    },
    onError: () => toast.error("Failed to reject"),
  });

  const readonly = review?.status === "approved" || review?.status === "rejected";

  if (isLoading || !review) return (
    <DashboardLayout title="Performance Review">
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#006B3F] animate-spin" />
      </div>
    </DashboardLayout>
  );

  const allRated = criteria.length > 0 && criteria.every((c) => (scores[c.id] ?? 0) > 0);
  const prevTrends = trends.filter((t) => t.id !== id);

  return (
    <DashboardLayout title="Performance Review">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900">
            {review.reviewPeriod} — {review.employee.name}
          </h1>
          <p className="text-sm text-gray-400">
            {review.employee.designation ?? review.employee.department ?? ""} ·{" "}
            {format(parseISO(review.reviewDate), "dd MMM yyyy")}
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${STATUS_COLOR[review.status]}`}>
          {review.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── LEFT: Employee card + score ring + trends ── */}
        <div className="space-y-4">
          {/* Employee card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[#006B3F] flex items-center justify-center">
              {review.employee.profilePhotoUrl
                ? <img src={review.employee.profilePhotoUrl} alt={review.employee.name} className="w-full h-full object-cover" />
                : <span className="text-2xl font-black text-white">{review.employee.name.slice(0, 2).toUpperCase()}</span>
              }
            </div>
            <div>
              <p className="font-bold text-gray-900">{review.employee.name}</p>
              <p className="text-xs text-gray-400">{review.employee.employeeCode}</p>
              <p className="text-xs text-gray-500 mt-0.5">{review.employee.designation ?? "—"}</p>
            </div>
            <ScoreRing score={review.overallScore} />
            {review.overallScore && (
              <p className="text-xs text-gray-400">
                {review.overallScore >= 4.5 ? "Outstanding" :
                 review.overallScore >= 4   ? "Exceeds Expectations" :
                 review.overallScore >= 3   ? "Meets Expectations" :
                 review.overallScore >= 2   ? "Needs Improvement" : "Unsatisfactory"}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs rounded-xl"
              onClick={() => router.push(`/employees/${review.employee.id}/profile`)}
            >
              View Profile
            </Button>
          </div>

          {/* Trend history */}
          {prevTrends.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-[#006B3F]" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Previous Reviews</h3>
              </div>
              <div className="space-y-2">
                {prevTrends.slice(-5).reverse().map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/performance-reviews/${t.id}`)}
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{t.reviewPeriod}</p>
                      <p className="text-[10px] text-gray-400">{format(parseISO(t.reviewDate), "dd MMM yyyy")}</p>
                    </div>
                    {t.overallScore ? (
                      <span className={`text-sm font-bold flex items-center gap-0.5 ${t.overallScore >= 4 ? "text-green-600" : t.overallScore >= 3 ? "text-yellow-600" : "text-red-500"}`}>
                        <Star className="w-3 h-3 fill-current" />{t.overallScore.toFixed(1)}
                      </span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Rating form ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Criteria ratings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-xs font-bold text-[#006B3F] uppercase tracking-widest mb-5 pb-3 border-b border-gray-100">
              Performance Ratings
            </h3>
            <div className="space-y-5">
              {criteria.map((c) => (
                <div key={c.id} className={`rounded-xl border p-4 transition-colors ${(scores[c.id] ?? 0) > 0 ? "border-green-100 bg-green-50/30" : "border-gray-100 bg-gray-50/50"}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{c.weight}%</span>
                        {(scores[c.id] ?? 0) > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                      </div>
                      {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                    </div>
                    <StarRater
                      value={scores[c.id] ?? 0}
                      onChange={readonly ? undefined : (v) => setScores((s) => ({ ...s, [c.id]: v }))}
                      readonly={readonly}
                    />
                  </div>
                  {!readonly && (scores[c.id] ?? 0) > 0 && (
                    <textarea
                      value={feedbacks[c.id] ?? ""}
                      onChange={(e) => setFeedbacks((f) => ({ ...f, [c.id]: e.target.value }))}
                      placeholder="Add feedback for this criterion (optional)…"
                      rows={2}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30 bg-white"
                    />
                  )}
                  {readonly && feedbacks[c.id] && (
                    <p className="text-xs text-gray-500 mt-1 italic">"{feedbacks[c.id]}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Narrative sections */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-xs font-bold text-[#006B3F] uppercase tracking-widest mb-5 pb-3 border-b border-gray-100">
              Feedback &amp; Comments
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Strengths
                </label>
                <textarea
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  disabled={readonly}
                  placeholder="What does this employee do well?…"
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Areas for Improvement
                </label>
                <textarea
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  disabled={readonly}
                  placeholder="What should this employee work on?…"
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Additional Comments
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  disabled={readonly}
                  placeholder="Any other notes or observations…"
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          {!readonly && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-xs text-gray-400">
                  {allRated
                    ? <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> All criteria rated — ready to submit</span>
                    : "Rate all criteria above before submitting"}
                </div>
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={!allRated || submitMutation.isPending}
                  className="bg-[#006B3F] hover:bg-[#005530] text-white gap-2 rounded-xl"
                >
                  {submitMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
                    : <><Send className="w-4 h-4" />Submit Review</>}
                </Button>
              </div>
            </div>
          )}

          {/* Approve / Reject (submitted reviews) */}
          {review.status === "submitted" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-gray-600 font-medium">This review is awaiting approval.</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  className="gap-2 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                >
                  <ThumbsDown className="w-4 h-4" /> Reject
                </Button>
                <Button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="bg-[#006B3F] hover:bg-[#005530] text-white gap-2 rounded-xl"
                >
                  <ThumbsUp className="w-4 h-4" /> Approve
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
