import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/money";
import { hasRole } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const ctx = await getTenantContext();

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: ctx.tenantId },
    include: {
      projects: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!client) notFound();

  const canEdit = hasRole(ctx.role, Role.MANAGER);

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{client.name}</h1>
          {client.email ? (
            <p className="text-sm text-muted-foreground mt-1">{client.email}</p>
          ) : null}
          {client.billingAddress ? (
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{client.billingAddress}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          {canEdit ? (
            <Button variant="outline" asChild>
              <Link href={`/clients/${client.id}/edit`}>Edit</Link>
            </Button>
          ) : null}
          <Button asChild>
            <Link href={`/projects/new?clientId=${client.id}`}>New project</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Default rate</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {client.defaultRateCents ? `${money(client.defaultRateCents, client.currency)}/hr` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tax rate</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {(client.taxRateBps / 100).toFixed(2)}%
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Currency</p>
          <p className="mt-2 text-2xl font-bold">{client.currency}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Projects</h2>
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {client.projects.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground text-center">No projects yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {client.projects.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/projects/${p.id}/board`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Invoices</h2>
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {client.invoices.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground text-center">No invoices yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Number</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {client.invoices.map((i) => (
                  <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/invoices/${i.id}`} className="font-medium hover:underline">
                        #{i.number}
                      </Link>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={i.status} /></td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      {money(i.totalCents, i.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}