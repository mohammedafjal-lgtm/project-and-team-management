"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/date";
import { FormError, type FormErrors } from "@/components/ui/form-error";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type Entry = {
  id: string;
  date: string;
  durationMinutes: number;
  billable: boolean;
  status: string;
  projectName: string;
  userName: string;
  notes: string | null;
};

type Project = { id: string; name: string; clientName: string; defaultRateCents: number };

const timeEntrySchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  date: z.string().min(1, "Date is required"),
  hours: z.number().min(0.01, "Hours must be greater than 0"),
  notes: z.string().optional(),
  billable: z.boolean(),
});

export function TimeList({
  initialEntries,
  projects,
  canApprove,
}: {
  initialEntries: Entry[];
  projects: Project[];
  canApprove: boolean;
}) {
  const qc = useQueryClient();
  const qKey = ["time"];
  const { data: entries = initialEntries } = useQuery<Entry[]>({
    queryKey: qKey,
    queryFn: async () => (await api.get("/time")).data,
    initialData: initialEntries,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    projectId: projects[0]?.id ?? "",
    date: new Date().toISOString().slice(0, 10),
    hours: 1,
    notes: "",
    billable: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const [editing, setEditing] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    hours: 1,
    notes: "",
    billable: true,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: qKey });

  const create = useMutation({
    mutationFn: async () => {
      const project = projects.find((p) => p.id === form.projectId);
      if (!project) throw new Error("Select a project");
      await api.post("/time", {
        projectId: project.id,
        date: form.date,
        durationMinutes: Math.round(form.hours * 60),
        billable: form.billable,
        notes: form.notes || undefined,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Time logged");
      setOpen(false);
      setForm((f) => ({ ...f, notes: "", hours: 1, billable: true }));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await api.patch(`/time/${editing.id}`, {
        date: editForm.date,
        durationMinutes: Math.round(editForm.hours * 60),
        billable: editForm.billable,
        notes: editForm.notes || null,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Time entry updated");
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const action = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "submit" | "approve" | "reject" }) => {
      await api.post(`/time/${id}/${action}`);
    },
    onSuccess: (_d, v) => {
      invalidate();
      toast.success(v.action === "submit" ? "Submitted" : v.action === "approve" ? "Approved" : "Rejected");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggleBillable = useMutation({
    mutationFn: async ({ id, billable }: { id: string; billable: boolean }) => {
      await api.patch(`/time/${id}`, { billable });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Updated billable flag");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function openEdit(entry: Entry) {
    setEditing(entry);
    setEditForm({
      date: entry.date.slice(0, 10),
      hours: Math.round((entry.durationMinutes / 60) * 100) / 100,
      notes: entry.notes ?? "",
      billable: entry.billable,
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    
    const result = timeEntrySchema.safeParse(form);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }
    create.mutate();
  }

  function actions(entry: Entry) {
    if (entry.status === "DRAFT") {
      return (
        <div className="flex gap-2">
          <Button size="xs" variant="outline" onClick={() => openEdit(entry)}>
            Edit
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => toggleBillable.mutate({ id: entry.id, billable: !entry.billable })}
          >
            {entry.billable ? "Make non-billable" : "Make billable"}
          </Button>
          <Button size="xs" variant="outline" onClick={() => action.mutate({ id: entry.id, action: "submit" })}>
            Submit
          </Button>
        </div>
      );
    }
    if (entry.status === "SUBMITTED" && canApprove) {
      return (
        <div className="flex gap-2">
          <Button size="xs" onClick={() => action.mutate({ id: entry.id, action: "approve" })}>Approve</Button>
          <Button size="xs" variant="outline" onClick={() => action.mutate({ id: entry.id, action: "reject" })}>Reject</Button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>Log time</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log time</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Project</Label>
                <select
                  className={cn("w-full h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50", errors.projectId && "border-destructive")}
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.clientName} · {p.name}</option>
                  ))}
                </select>
                <FormError errors={errors} field="projectId" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={cn(errors.date && "border-destructive")} />
                  <FormError errors={errors} field="date" />
                </div>
                <div className="space-y-1.5">
                  <Label>Hours</Label>
                  <Input type="number" min={0.01} step={0.25} value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })}
                    className={cn(errors.hours && "border-destructive")} />
                  <FormError errors={errors} field="hours" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.billable}
                  onChange={(e) => setForm({ ...form, billable: e.target.checked })}
                  className="rounded border-input"
                />
                Billable
              </label>
              <Button type="submit" disabled={create.isPending} className="w-full">
                {create.isPending ? "Saving…" : "Save entry"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(editing)} onOpenChange={(isOpen) => { if (!isOpen) setEditing(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit time entry</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {editing ? (
                <p className="text-sm text-muted-foreground">{editing.projectName}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={editForm.hours}
                    onChange={(e) => setEditForm({ ...editForm, hours: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.billable}
                  onChange={(e) => setEditForm({ ...editForm, billable: e.target.checked })}
                  className="rounded border-input"
                />
                Billable
              </label>
              <Button
                onClick={() => saveEdit.mutate()}
                disabled={saveEdit.isPending || editForm.hours < 0.25}
                className="w-full"
              >
                {saveEdit.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Project</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4 text-right">Hours</th>
              <th className="px-6 py-4">Billable</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No time logged yet.</td></tr>
            ) : entries.map((e) => (
              <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">{formatDate(e.date)}</td>
                <td className="px-6 py-4 font-medium">{e.projectName}</td>
                <td className="px-6 py-4 text-muted-foreground">{e.userName}</td>
                <td className="px-6 py-4 text-right tabular-nums">{(e.durationMinutes / 60).toFixed(2)}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={e.billable ? "ACTIVE" : "DRAFT"} />
                </td>
                <td className="px-6 py-4"><StatusBadge status={e.status} /></td>
                <td className="px-6 py-4">{actions(e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}