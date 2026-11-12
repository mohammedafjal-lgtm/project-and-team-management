"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Role } from "@prisma/client";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/date";
import { ASSIGNABLE_ROLES } from "@/lib/auth/permissions";
import { toast } from "sonner";
import { FormError, type FormErrors } from "@/components/ui/form-error";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type MemberRow = {
  id: string;
  role: Role;
  status: string;
  createdAt: string;
  user: { name: string | null; email: string };
};

type InviteRow = {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt: string;
};

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.nativeEnum(Role),
});

const roleOptions = ASSIGNABLE_ROLES;

export function TeamManager({
  canManage,
  members,
  invitations,
}: {
  canManage: boolean;
  members: MemberRow[];
  invitations: InviteRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(Role.MEMBER);
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = inviteSchema.safeParse({ email, role });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Invite failed");
      toast.success(`Invite sent to ${email}`);
      setEmail("");
      setRole(Role.MEMBER);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(membershipId: string, nextRole: Role) {
    setBusyId(membershipId);
    try {
      const res = await fetch(`/api/team/members/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not update role");
      toast.success("Role updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update role");
    } finally {
      setBusyId(null);
    }
  }

  async function revoke(invitationId: string) {
    setBusyId(invitationId);
    try {
      const res = await fetch(`/api/team/invites/${invitationId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not revoke invite");
      toast.success("Invite revoked");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke invite");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {canManage && (
        <form
          onSubmit={invite}
          className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-4"
        >
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Invite teammate</h2>
            <p className="text-sm text-muted-foreground mt-1">
              They’ll receive an email with a link to join this workspace.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                className={cn(errors.email && "border-destructive focus-visible:ring-destructive/30")}
              />
              <FormError errors={errors} field="email" />
            </div>
            <div className="sm:w-48 space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={inviting}>
                {inviting ? "Sending…" : "Send invite"}
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-medium">{m.user.name ?? "—"}</td>
                <td className="px-6 py-4 text-muted-foreground">
                  {m.user.email}
                </td>
                <td className="px-6 py-4">
                  {canManage && m.role !== Role.OWNER ? (
                    <select
                      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={m.role}
                      disabled={busyId === m.id}
                      onChange={(e) => changeRole(m.id, e.target.value as Role)}
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge status={m.role} />
                  )}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={m.status} />
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {formatDate(new Date(m.createdAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && invitations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Pending invitations</h2>
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Expires</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">{inv.email}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inv.role} />
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(new Date(inv.expiresAt))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyId === inv.id}
                        onClick={() => revoke(inv.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}