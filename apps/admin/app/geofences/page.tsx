"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { GeofenceZone } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  centerLat: "",
  centerLng: "",
  radiusMeters: "",
};

export default function GeofencesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GeofenceZone | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<GeofenceZone | null>(null);

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["geofences"],
    queryFn: () =>
      api.get<GeofenceZone[]>("/geofence").then((r) =>
        Array.isArray(r.data) ? r.data : []
      ),
  });

  const filtered = zones.filter((z) =>
    z.name.toLowerCase().includes(search.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (body: { name: string; centerLat: number; centerLng: number; radiusMeters: number }) =>
      api.post("/geofence", body),
    onSuccess: () => {
      toast.success("Geofence zone created");
      qc.invalidateQueries({ queryKey: ["geofences"] });
      setAddOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? "Failed to create zone"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { name: string; centerLat: number; centerLng: number; radiusMeters: number };
    }) => api.patch(`/geofence/${id}`, body),
    onSuccess: () => {
      toast.success("Geofence updated");
      qc.invalidateQueries({ queryKey: ["geofences"] });
      setEditOpen(false);
    },
    onError: () => toast.error("Failed to update zone"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/geofence/${id}/${active ? "activate" : "deactivate"}`),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["geofences"] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/geofence/${id}`),
    onSuccess: () => {
      toast.success("Geofence deleted");
      qc.invalidateQueries({ queryKey: ["geofences"] });
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete geofence"),
  });

  function openEdit(zone: GeofenceZone) {
    setEditTarget(zone);
    setEditForm({
      name: zone.name,
      centerLat: String(zone.centerLat),
      centerLng: String(zone.centerLng),
      radiusMeters: String(zone.radiusMeters),
    });
    setEditOpen(true);
  }

  function submitCreate() {
    createMutation.mutate({
      name: form.name,
      centerLat: parseFloat(form.centerLat),
      centerLng: parseFloat(form.centerLng),
      radiusMeters: parseFloat(form.radiusMeters),
    });
  }

  function submitEdit() {
    if (!editTarget) return;
    updateMutation.mutate({
      id: editTarget.id,
      body: {
        name: editForm.name,
        centerLat: parseFloat(editForm.centerLat),
        centerLng: parseFloat(editForm.centerLng),
        radiusMeters: parseFloat(editForm.radiusMeters),
      },
    });
  }

  const formFields = (f: typeof EMPTY_FORM, set: (v: typeof EMPTY_FORM) => void) => (
    <>
      <div className="space-y-1">
        <Label>Zone Name</Label>
        <Input
          value={f.name}
          onChange={(e) => set({ ...f, name: e.target.value })}
          placeholder="e.g. PFA Headquarters"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Center Latitude</Label>
          <Input
            type="number"
            step="any"
            value={f.centerLat}
            onChange={(e) => set({ ...f, centerLat: e.target.value })}
            placeholder="31.5204"
          />
        </div>
        <div className="space-y-1">
          <Label>Center Longitude</Label>
          <Input
            type="number"
            step="any"
            value={f.centerLng}
            onChange={(e) => set({ ...f, centerLng: e.target.value })}
            placeholder="74.3587"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Radius (meters)</Label>
        <Input
          type="number"
          value={f.radiusMeters}
          onChange={(e) => set({ ...f, radiusMeters: e.target.value })}
          placeholder="100"
        />
      </div>
    </>
  );

  return (
    <DashboardLayout title="Geofences">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex gap-3 items-center justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-[#006B3F] hover:bg-[#005530] text-white h-9 gap-2"
          >
            <Plus className="w-4 h-4" /> Create Geofence
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="text-xs font-semibold">Name</TableHead>
                <TableHead className="text-xs font-semibold">Latitude</TableHead>
                <TableHead className="text-xs font-semibold">Longitude</TableHead>
                <TableHead className="text-xs font-semibold">Radius (m)</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                    No geofence zones found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((zone) => (
                  <TableRow key={zone.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-sm">{zone.name}</TableCell>
                    <TableCell className="text-sm text-gray-600 font-mono">
                      {zone.centerLat.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 font-mono">
                      {zone.centerLng.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {zone.radiusMeters.toLocaleString()} m
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          zone.active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }
                      >
                        {zone.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-gray-500 hover:text-[#006B3F] hover:bg-green-50"
                          title={zone.active ? "Deactivate" : "Activate"}
                          onClick={() =>
                            toggleMutation.mutate({ id: zone.id, active: !zone.active })
                          }
                        >
                          {zone.active ? (
                            <ToggleRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => openEdit(zone)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteTarget(zone)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#006B3F]">Create Geofence Zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {formFields(form, setForm)}
            <Button
              className="w-full bg-[#006B3F] hover:bg-[#005530] text-white"
              disabled={
                createMutation.isPending ||
                !form.name ||
                !form.centerLat ||
                !form.centerLng ||
                !form.radiusMeters
              }
              onClick={submitCreate}
            >
              {createMutation.isPending ? "Creating..." : "Create Zone"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#006B3F]">Edit Geofence Zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {formFields(editForm, setEditForm)}
            <Button
              className="w-full bg-[#006B3F] hover:bg-[#005530] text-white"
              disabled={updateMutation.isPending || !editForm.name}
              onClick={submitEdit}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Geofence Zone?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
