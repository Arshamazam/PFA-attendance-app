"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEF2F7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-[3px] border-[#006B3F] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#EEF2F7",
        backgroundImage: "radial-gradient(circle, #c9d3e0 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <Sidebar />
      <div className="ml-60 flex flex-col min-h-screen">
        <Header title={title} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
