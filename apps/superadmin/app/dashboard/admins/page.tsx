"use client";

import { Users, UserPlus } from "lucide-react";

export default function AdminsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Admin Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Create, edit, and manage admin users across the system.</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
        >
          <UserPlus size={15} />
          Add Admin
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(168,85,247,0.12))", border: "1px solid rgba(168,85,247,0.2)" }}>
          <Users size={28} className="text-purple-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-800">Admin Management</h2>
        <p className="text-gray-400 text-sm mt-1 max-w-xs">Admin user management will be implemented here. Create, edit, disable, and assign roles to admin users.</p>
      </div>
    </div>
  );
}
