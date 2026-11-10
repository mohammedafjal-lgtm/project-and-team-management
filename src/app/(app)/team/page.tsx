import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { canManageTeam } from "@/lib/auth/permissions";
import { TeamManager } from "@/components/team/team-manager";

export default async function TeamPage() {
  const ctx = await getTenantContext();
  const canManage = canManageTeam(ctx.role);

  const [memberships, invitations] = await Promise.all([
    prisma.membership.findMany({
      where: { tenantId: ctx.tenantId },
      include: { user: true },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    }),
    canManage
      ? prisma.invitation.findMany({
          where: { tenantId: ctx.tenantId, acceptedAt: null },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {memberships.length} members
          {canManage && invitations.length > 0
            ? ` · ${invitations.length} pending invite${invitations.length === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>

      <TeamManager
        canManage={canManage}
        members={memberships.map((m) => ({
          id: m.id,
          role: m.role,
          status: m.status,
          createdAt: m.createdAt.toISOString(),
          user: { name: m.user.name, email: m.user.email },
        }))}
        invitations={invitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
