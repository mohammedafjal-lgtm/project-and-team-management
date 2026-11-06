import Link from "next/link";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/money";

export default async function ClientsPage() {
  const ctx = await getTenantContext();
  const clients = await prisma.client.findMany({
    where: { tenantId: ctx.tenantId },
    include: { _count: { select: { projects: true, invoices: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-neutral-500 mt-1">{clients.length} total</p>
        </div>
        <Button asChild><Link href="/clients/new">New client</Link></Button>
      </div>

      {clients.length === 0 ? (
        <div className="border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-12 text-center">
          <p className="font-medium">No clients yet</p>
          <p className="text-sm text-neutral-500 mt-1">
            Create your first client to start adding projects.
          </p>
          <Button asChild className="mt-4"><Link href="/clients/new">New client</Link></Button>
        </div>
      ) : (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-xs text-neutral-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium text-right">Default rate</th>
                <th className="px-4 py-2 font-medium text-right">Projects</th>
                <th className="px-4 py-2 font-medium text-right">Invoices</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {c.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.defaultRateCents ? `${money(c.defaultRateCents, c.currency)}/hr` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">{c._count.projects}</td>
                  <td className="px-4 py-3 text-right">{c._count.invoices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}