"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import { Bell } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "super_admin") {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header
          className="flex-shrink-0 px-8 py-3 flex items-center justify-between border-b border-gray-100"
          style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-1 h-5 rounded-full"
              style={{ background: "linear-gradient(to bottom, #a855f7, #7c3aed)" }}
            />
            <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Super Admin Console</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-purple-50 transition-colors">
              <Bell size={16} className="text-gray-500" />
            </button>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(168,85,247,0.08))", border: "1px solid rgba(168,85,247,0.2)" }}
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                {(session?.user?.name ?? "S").charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-gray-800 leading-none">{session?.user?.name ?? "Super Admin"}</p>
                <p className="text-[10px] text-purple-600 font-medium">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-auto p-8"
          style={{
            backgroundColor: "#F3EEF9",
            backgroundImage: "radial-gradient(circle, #d4bdf0 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
