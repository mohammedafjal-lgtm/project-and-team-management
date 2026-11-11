"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectRole, ProjectVisibility } from "@prisma/client";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ProjectMembersPicker,
  type ProjectMemberSelection,
  type TeamMemberOption,
} from "@/components/projects/project-members-picker";
import { toast } from "sonner";

type Client = { id: string; name: string; currency: string };

export function NewProjectForm({
  clients,
  team,
  currentUserId,
  defaultClientId,
}: {
  clients: Client[];
  team: TeamMemberOption[];
  currentUserId: string;
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    clientId: defaultClientId ?? clients[0]?.id ?? "",
    code: "",
    visibility: ProjectVisibility.PUBLIC as ProjectVisibility,
    budgetType: "NONE" as "NONE" | "HOURS" | "AMOUNT",
    budgetHours: "",
    budgetDollars: "",
  });
  const [members, setMembers] = useState<ProjectMemberSelection[]>([
    { userId: currentUserId, role: ProjectRole.ADMIN },
  ]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ id: string }>("/projects", {
        name: form.name.trim(),
        clientId: form.clientId,
        code: form.code.trim() || undefined,
        visibility: form.visibility,
        budgetType: form.budgetType,
        budgetMinutes:
          form.budgetType === "HOURS"
            ? Math.round((parseFloat(form.budgetHours) || 0) * 60)
            : undefined,
        budgetCents:
          form.budgetType === "AMOUNT"
            ? Math.round((parseFloat(form.budgetDollars) || 0) * 100)
            : undefined,
        members,
      });
      toast.success("Project created");
      router.push(`/projects/${res.data.id}/board`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create project");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          autoFocus
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="client">Client</Label>
        <select
          id="client"
          required
          value={form.clientId}
          onChange={(e) => setForm({ ...form, clientId: e.target.value })}
          className="w-full h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2 text-sm"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="code">Code (optional)</Label>
        <Input
          id="code"
          placeholder="ACME-001"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="visibility">Visibility</Label>
        <select
          id="visibility"
          value={form.visibility}
          onChange={(e) => setForm({ ...form, visibility: e.target.value as ProjectVisibility })}
          className="w-full h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2 text-sm"
        >
          <option value={ProjectVisibility.PUBLIC}>Public — all workspace members</option>
          <option value={ProjectVisibility.PRIVATE}>Private — assigned members only</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Project members</Label>
        <p className="text-xs text-neutral-500 mb-2">
          Assign people and set their project role (Admin can change settings).
        </p>
        <ProjectMembersPicker team={team} value={members} onChange={setMembers} />
      </div>

      <div className="space-y-1.5">
        <Label>Budget</Label>
        <div className="flex gap-2">
          <select
            value={form.budgetType}
            onChange={(e) =>
              setForm({
                ...form,
                budgetType: e.target.value as "NONE" | "HOURS" | "AMOUNT",
              })
            }
            className="h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2 text-sm"
          >
            <option value="NONE">None</option>
            <option value="HOURS">Hours</option>
            <option value="AMOUNT">Amount</option>
          </select>
          {form.budgetType === "HOURS" ? (
            <Input
              type="number"
              min={0}
              step="0.5"
              placeholder="Hours"
              value={form.budgetHours}
              onChange={(e) => setForm({ ...form, budgetHours: e.target.value })}
            />
          ) : null}
          {form.budgetType === "AMOUNT" ? (
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Amount"
              value={form.budgetDollars}
              onChange={(e) => setForm({ ...form, budgetDollars: e.target.value })}
            />
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading || !form.name.trim() || !form.clientId}>
          {loading ? "Creating…" : "Create project"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
