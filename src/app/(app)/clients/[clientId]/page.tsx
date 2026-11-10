import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";

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

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Client</p>
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          {client.email ? (
            <p className="text-sm text-neutral-500 mt-1">{client.email}</p>
          ) : null}
        </div>
        <Button asChild>
          <Link href={`/projects/new?clientId=${client.id}`}>New project</Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Default rate</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">
            {client.defaultRateCents ? `${money(client.defaultRateCents, client.currency)}/hr` : "—"}
          </p>
        </div>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Tax rate</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">
            {(client.taxRateBps / 100).toFixed(2)}%
          </p>
        </div>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Currency</p>
          <p className="mt-2 text-lg font-semibold">{client.currency}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Projects</h2>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
          {client.projects.length === 0 ? (
            <p className="px-4 py-6 text-sm text-neutral-500 text-center">No projects yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-xs text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {client.projects.map((p) => (
                  <tr key={p.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${p.id}/board`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline">{p.status}</Badge></td>
                    <td className="px-4 py-3 text-neutral-500">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Invoices</h2>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
          {client.invoices.length === 0 ? (
            <p className="px-4 py-6 text-sm text-neutral-500 text-center">No invoices yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-xs text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 font-medium">Number</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {client.invoices.map((i) => (
                  <tr key={i.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${i.id}`} className="font-medium hover:underline">
                        #{i.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline">{i.status}</Badge></td>
                    <td className="px-4 py-3 text-right tabular-nums">
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