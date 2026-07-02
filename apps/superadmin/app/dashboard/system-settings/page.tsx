"use client";

import { Settings } from "lucide-react";

export default function SystemSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">System Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Configure system-wide settings, environment variables, and feature flags.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(168,85,247,0.12))", border: "1px solid rgba(168,85,247,0.2)" }}>
          <Settings size={28} className="text-purple-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-800">System Configuration</h2>
        <p className="text-gray-400 text-sm mt-1 max-w-xs">Global system settings, feature toggles, API keys, and environment configuration will be managed here.</p>
      </div>
    </div>
  );
}
