"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";

type Entry = {
  id: string; date: string; durationMinutes: number; billable: boolean;
  status: string; projectName: string; userName: string; notes: string | null;
};

type Project = { id: string; name: string; clientName: string; defaultRateCents: number };

export function TimeList({ initialEntries, projects }: { initialEntries: Entry[]; projects: Project[] }) {
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
  });

  const create = useMutation({
    mutationFn: async () => {
      const project = projects.find((p) => p.id === form.projectId);
      if (!project) throw new Error("Select a project");
      await api.post("/time", {
        projectId: project.id,
        date: form.date,
        durationMinutes: Math.round(form.hours * 60),
        billable: true,
        // rateCentsSnapshot intentionally omitted — server derives it.
        notes: form.notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qKey });
      toast.success("Time logged");
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>Log time</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log time</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Project</Label>
                <select
                  className="w-full h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2 text-sm"
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.clientName} · {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Hours</Label>
                  <Input type="number" min={0.25} step={0.25} value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full">
                {create.isPending ? "Saving…" : "Save entry"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-xs text-neutral-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Project</th>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium text-right">Hours</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-500">No time logged yet.</td></tr>
            ) : entries.map((e) => (
              <tr key={e.id} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-4 py-3">{formatDate(e.date)}</td>
                <td className="px-4 py-3">{e.projectName}</td>
                <td className="px-4 py-3">{e.userName}</td>
                <td className="px-4 py-3 text-right">{(e.durationMinutes / 60).toFixed(2)}</td>
                <td className="px-4 py-3"><Badge variant="outline">{e.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}