"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/date";
import { ASSIGNABLE_ROLES } from "@/lib/auth/permissions";
import { toast } from "sonner";

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

  async function invite(e: React.FormEvent) {
    e.preventDefault();
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
          className="border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-950 p-4 space-y-3"
        >
          <div>
            <h2 className="text-sm font-medium">Invite teammate</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              They’ll receive an email with a link to join this workspace.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                required
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="sm:w-40 space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
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

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-xs text-neutral-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-4 py-3 font-medium">{m.user.name ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  {m.user.email}
                </td>
                <td className="px-4 py-3">
                  {canManage && m.role !== Role.OWNER ? (
                    <select
                      className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
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
                    <Badge variant="outline">{m.role}</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={m.status === "ACTIVE" ? "default" : "secondary"}>
                    {m.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {formatDate(new Date(m.createdAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && invitations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium">Pending invitations</h2>
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-xs text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Expires</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-4 py-3">{inv.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{inv.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {formatDate(new Date(inv.expiresAt))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyId === inv.id}
                        onClick={() => revoke(inv.id)}
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
