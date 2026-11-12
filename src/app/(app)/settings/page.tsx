import { Role } from "@prisma/client";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { canManageBilling, hasRole } from "@/lib/auth/permissions";
import { zohoConfigured } from "@/lib/zoho/config";
import { ZohoSettings } from "@/components/integrations/zoho-settings";
import { WorkspaceNameForm } from "@/components/settings/workspace-name-form";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ zoho?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getTenantContext();
  const canEditWorkspace = hasRole(ctx.role, Role.ADMIN);
  const [tenant, members, connection] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: ctx.tenantId } }),
    prisma.membership.findMany({
      where: { tenantId: ctx.tenantId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.zohoConnection.findUnique({
      where: { tenantId: ctx.tenantId },
      select: { organizationId: true, connectedAt: true },
    }),
  ]);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Workspace: {tenant?.name}</p>
        {params.zoho === "connected" ? (
          <p className="mt-2 text-sm text-emerald-600">Zoho Books connected successfully.</p>
        ) : null}
        {params.zoho === "error" ? (
          <p className="mt-2 text-sm text-red-600">
            Zoho connection failed{params.reason ? `: ${params.reason}` : ""}.
          </p>
        ) : null}
      </div>

      <section>
        <WorkspaceNameForm
          key={tenant?.name ?? "workspace"}
          initialName={tenant?.name ?? ""}
          canEdit={canEditWorkspace}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Members</h2>
        <div className="border border-border rounded-lg divide-y divide-border bg-card">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{m.user.name ?? m.user.email}</p>
                <p className="text-xs text-muted-foreground">{m.user.email}</p>
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{m.role}</span>
            </div>
          ))}
        </div>
      </section>

      <ZohoSettings
        configured={zohoConfigured()}
        connected={Boolean(connection)}
        organizationId={connection?.organizationId ?? null}
        connectedAt={connection?.connectedAt?.toISOString() ?? null}
        canManage={canManageBilling(ctx.role)}
      />
    </div>
  );
}
