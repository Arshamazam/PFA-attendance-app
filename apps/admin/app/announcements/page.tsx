"use client";

import { useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus } from "lucide-react";
import AnnouncementStats from "./components/AnnouncementStats";
import AnnouncementsTable from "./components/AnnouncementsTable";
import AnnouncementForm from "./components/AnnouncementForm";

export default function AnnouncementsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [refresh, setRefresh] = useState(0);

  const handleSuccess = useCallback(() => {
    setShowForm(false);
    setEditItem(null);
    setRefresh((r) => r + 1);
  }, []);

  const handleEdit = useCallback((item: Record<string, unknown>) => {
    setEditItem(item);
    setShowForm(true);
  }, []);

  const handleView = useCallback((_item: Record<string, unknown>) => {
    // View is handled inside the table component modal
  }, []);

  return (
    <DashboardLayout title="Announcements Management">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#333333]">Announcements</h1>
            <p className="text-sm text-gray-400 mt-0.5">Create and manage announcements for employees</p>
          </div>
          <button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#006B3F] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#004d2c] shadow-sm transition-colors"
          >
            <Plus size={16} /> Create Announcement
          </button>
        </div>

        {/* Stats */}
        <AnnouncementStats refresh={refresh} />

        {/* Table */}
        <AnnouncementsTable
          onEdit={(item) => handleEdit(item as unknown as Record<string, unknown>)}
          onView={(item) => handleView(item as unknown as Record<string, unknown>)}
          refresh={refresh}
        />
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <AnnouncementForm
          initial={editItem ?? undefined}
          onSuccess={handleSuccess}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </DashboardLayout>
  );
}
