"use client";

import { useEffect, useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

function SsoHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("No token provided. Please log in directly.");
      return;
    }

    signIn("token-auth", { token, redirect: false }).then((result) => {
      if (result?.ok) {
        router.replace("/dashboard");
      } else {
        setError("Single sign-on failed. Please log in directly.");
      }
    });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-100">
          <ShieldCheck size={24} className="text-red-500" />
        </div>
        <p className="text-red-600 text-sm font-medium">{error}</p>
        <a
          href="/login"
          className="text-xs text-purple-600 underline hover:text-purple-800"
        >
          Go to login
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
      >
        <ShieldCheck size={26} className="text-white" />
      </div>
      <div className="flex items-center gap-2">
        <svg className="animate-spin h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-sm text-gray-600 font-medium">Signing you in…</p>
      </div>
      <p className="text-xs text-gray-400">Verifying Super Admin credentials</p>
    </div>
  );
}

export default function SsoPage() {
  return (
    <Suspense>
      <SsoHandler />
    </Suspense>
  );
}
