"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function SuperAdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid credentials or insufficient privileges.");
    } else if (result?.ok) {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1e0533 0%, #3b0764 50%, #4c0888 100%)" }}
      >
        {/* Decorative orbs */}
        <div className="absolute top-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-[260px] h-[260px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />

        {/* Shield icon */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 shadow-2xl"
            style={{ background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.4)" }}>
            <ShieldCheck size={48} className="text-purple-300" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">PFA System</h1>
          <p className="text-purple-300 text-lg font-semibold mt-2">Super Admin Portal</p>
          <p className="text-purple-400 text-sm mt-4 max-w-xs leading-relaxed">
            Highest-privilege access for system-wide administration, user management, and audit oversight.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-3 w-full max-w-xs">
            {["Admin Management", "System Settings", "Audit Logs", "Security Controls", "Analytics"].map((f) => (
              <div key={f} className="flex items-center gap-3 px-4 py-2 rounded-lg"
                style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                <span className="text-purple-200 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <p className="font-black text-gray-900 leading-none">PFA System</p>
              <p className="text-xs text-purple-600 font-semibold">Super Admin Portal</p>
            </div>
          </div>

          <h2 className="text-3xl font-black text-gray-900">Welcome back</h2>
          <p className="text-gray-500 mt-1 text-sm">Sign in with your Super Admin credentials</p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <Lock size={14} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="super@pfa.gov.pk"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  required
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: loading ? "#9333ea" : "linear-gradient(135deg, #7c3aed, #a855f7)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Authenticating…
                </span>
              ) : (
                "Sign In as Super Admin"
              )}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6 flex items-center justify-center gap-1.5">
            <Lock size={11} />
            Authorized personnel only · All activity is logged
          </p>
        </div>
      </div>
    </div>
  );
}
