"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectRole, ProjectVisibility } from "@prisma/client";
import { z } from "zod";
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
import { cn } from "@/lib/utils";
import { FormError, type FormErrors } from "@/components/ui/form-error";

type Client = { id: string; name: string; currency: string };

const projectSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100, "Name is too long"),
    clientId: z.string().min(1, "Client is required"),
    code: z.string().max(50, "Code is too long").optional(),
    visibility: z.nativeEnum(ProjectVisibility),
    budgetType: z.enum(["NONE", "HOURS", "AMOUNT"]),
    budgetHours: z.string().optional(),
    budgetDollars: z.string().optional(),
    members: z
      .array(
        z.object({
          userId: z.string(),
          role: z.nativeEnum(ProjectRole),
        })
      )
      .min(1, "At least one member is required"),
  })
  .refine(
    (data) => {
      if (data.budgetType !== "HOURS") return true;
      return (
        data.budgetHours !== undefined &&
        data.budgetHours !== "" &&
        !isNaN(Number(data.budgetHours)) &&
        Number(data.budgetHours) >= 0
      );
    },
    { message: "Please enter valid hours", path: ["budgetHours"] }
  )
  .refine(
    (data) => {
      if (data.budgetType !== "AMOUNT") return true;
      return (
        data.budgetDollars !== undefined &&
        data.budgetDollars !== "" &&
        !isNaN(Number(data.budgetDollars)) &&
        Number(data.budgetDollars) >= 0
      );
    },
    { message: "Please enter a valid amount", path: ["budgetDollars"] }
  );

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
  const [errors, setErrors] = useState<FormErrors>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = projectSchema.safeParse({ ...form, members });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

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
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          autoFocus
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={cn(errors.name && "border-destructive focus-visible:ring-destructive/30")}
        />
        <FormError errors={errors} field="name" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="client">Client</Label>
        <select
          id="client"
          value={form.clientId}
          onChange={(e) => setForm({ ...form, clientId: e.target.value })}
          className={cn(
            "w-full h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            errors.clientId && "border-destructive focus-visible:ring-destructive/30"
          )}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <FormError errors={errors} field="clientId" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="code">Code (optional)</Label>
        <Input
          id="code"
          placeholder="ACME-001"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          className={cn(errors.code && "border-destructive focus-visible:ring-destructive/30")}
        />
        <FormError errors={errors} field="code" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="visibility">Visibility</Label>
        <select
          id="visibility"
          value={form.visibility}
          onChange={(e) => setForm({ ...form, visibility: e.target.value as ProjectVisibility })}
          className="w-full h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value={ProjectVisibility.PUBLIC}>Public — all workspace members</option>
          <option value={ProjectVisibility.PRIVATE}>Private — assigned members only</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Project members</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Assign people and set their project role (Admin can change settings).
        </p>
        <ProjectMembersPicker team={team} value={members} onChange={setMembers} />
        <FormError errors={errors} field="members" />
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
            className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="NONE">None</option>
            <option value="HOURS">Hours</option>
            <option value="AMOUNT">Amount</option>
          </select>
          {form.budgetType === "HOURS" ? (
            <div className="flex-1">
              <Input
                type="number"
                min={0}
                step="0.5"
                placeholder="Hours"
                value={form.budgetHours}
                onChange={(e) => setForm({ ...form, budgetHours: e.target.value })}
                className={cn(errors.budgetHours && "border-destructive focus-visible:ring-destructive/30")}
              />
              <FormError errors={errors} field="budgetHours" />
            </div>
          ) : null}
          {form.budgetType === "AMOUNT" ? (
            <div className="flex-1">
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Amount"
                value={form.budgetDollars}
                onChange={(e) => setForm({ ...form, budgetDollars: e.target.value })}
                className={cn(errors.budgetDollars && "border-destructive focus-visible:ring-destructive/30")}
              />
              <FormError errors={errors} field="budgetDollars" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        <Button type="submit" disabled={loading || !form.name.trim() || !form.clientId}>
          {loading ? "Creating…" : "Create project"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}