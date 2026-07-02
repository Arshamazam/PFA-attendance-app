"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Pre-check: get token + decode role before deciding auth path
      const preRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!preRes.ok) {
        toast.error("Invalid credentials or insufficient permissions");
        setLoading(false);
        return;
      }

      const preData = await preRes.json();
      const rawToken: string = preData.token || preData.access_token;
      // Decode JWT payload (base64url → base64 → JSON)
      const b64 = rawToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const padding = "=".repeat((4 - (b64.length % 4)) % 4);
      const role: string = JSON.parse(atob(b64 + padding)).role || "";

      if (!["admin", "manager", "super_admin"].includes(role)) {
        toast.error("Invalid credentials or insufficient permissions");
        setLoading(false);
        return;
      }

      if (role === "super_admin") {
        // Skip signIn() — never create an admin-panel cookie for super_admin;
        // admin's existing cookie stays untouched
        window.location.href = `http://localhost:3002/sso?token=${encodeURIComponent(rawToken)}`;
        return;
      }

      // admin / manager — let NextAuth create the admin.session-token cookie
      const result = await signIn("credentials", { email, password, redirect: false });
      setLoading(false);
      if (result?.ok) {
        router.replace("/dashboard");
      } else {
        toast.error("Invalid credentials or insufficient permissions");
      }
    } catch {
      toast.error("Login failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#003D2E] via-[#005C3A] to-[#00A651] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-[-30px] w-24 h-24 rounded-full bg-white/5" />

        <div
          className={`flex flex-col items-center gap-10 transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          {/* Logos row */}
          <div className="flex items-center gap-8">
            <div className="bg-white rounded-2xl p-3 shadow-xl flex items-center justify-center w-24 h-24 animate-[logoFloat_3s_ease-in-out_infinite]">
              <Image
                src="/govt_logo.png"
                alt="Government of Punjab"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>

            <div className="h-16 w-px bg-white/30" />

            <div className="bg-white rounded-2xl p-3 shadow-xl flex items-center justify-center w-24 h-24 animate-[logoFloat_3s_ease-in-out_0.5s_infinite]">
              <Image
                src="/pfa_logo.png"
                alt="Punjab Food Authority"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-white tracking-wide">Punjab Food Authority</h1>
            <p className="text-green-200 mt-2 text-base">Attendance Management System</p>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
            {["Secure Access", "Real-time Data", "Full Control"].map((label, i) => (
              <div
                key={label}
                className="bg-white/10 rounded-xl p-3 text-center text-white text-xs font-medium backdrop-blur-sm border border-white/10"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — login form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8">
        {/* Mobile logos */}
        <div className="flex lg:hidden items-center gap-5 mb-8">
          <div className="bg-white rounded-xl p-2 shadow-md border border-gray-100 w-14 h-14 flex items-center justify-center animate-[logoFloat_3s_ease-in-out_infinite]">
            <Image src="/govt_logo.png" alt="Government of Punjab" width={44} height={44} className="object-contain" />
          </div>
          <div className="h-10 w-px bg-gray-200" />
          <div className="bg-white rounded-xl p-2 shadow-md border border-gray-100 w-14 h-14 flex items-center justify-center animate-[logoFloat_3s_ease-in-out_0.5s_infinite]">
            <Image src="/pfa_logo.png" alt="Punjab Food Authority" width={44} height={44} className="object-contain" />
          </div>
        </div>

        <div
          className={`w-full max-w-sm transition-all duration-700 delay-150 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-gray-900">Admin Sign In</h2>
            <p className="text-gray-500 text-sm mt-1">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700 font-medium text-sm">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pfa.gov.pk"
                required
                className="h-11 border-gray-200 focus-visible:ring-[#006B3F] focus-visible:border-[#006B3F] rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-gray-700 font-medium text-sm">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 pr-10 border-gray-200 focus-visible:ring-[#006B3F] focus-visible:border-[#006B3F] rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-[#006B3F] hover:bg-[#005530] active:bg-[#004425] text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              © 2026 Punjab Food Authority · Government of Punjab
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
