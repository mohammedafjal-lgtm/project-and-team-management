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
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">{clients.length} total</p>
        </div>
        <Button asChild><Link href="/clients/new">New client</Link></Button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <p className="font-medium">No clients yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first client to start adding projects.
          </p>
          <Button asChild className="mt-4"><Link href="/clients/new">New client</Link></Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4 text-right">Default rate</th>
                <th className="px-6 py-4 text-right">Projects</th>
                <th className="px-6 py-4 text-right">Invoices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {c.email ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">
                    {c.defaultRateCents ? `${money(c.defaultRateCents, c.currency)}/hr` : "—"}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">{c._count.projects}</td>
                  <td className="px-6 py-4 text-right tabular-nums">{c._count.invoices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}