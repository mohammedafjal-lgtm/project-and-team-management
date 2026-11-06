import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";

export default async function SettingsPage() {
  const ctx = await getTenantContext();
  const tenant = await prisma.tenant.findUnique({ where: { id: ctx.tenantId } });
  const members = await prisma.membership.findMany({
    where: { tenantId: ctx.tenantId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Workspace: {tenant?.name}</p>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Members</h2>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-950">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{m.user.name ?? m.user.email}</p>
                <p className="text-xs text-neutral-500">{m.user.email}</p>
              </div>
              <span className="text-xs text-neutral-500 uppercase tracking-wider">{m.role}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}