import Link from "next/link";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function InvoicesPage() {
  const ctx = await getTenantContext();
  const invoices = await prisma.invoice.findMany({
    where: { tenantId: ctx.tenantId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">{invoices.length} total</p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">New invoice</Link>
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <p className="font-medium">No invoices yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first invoice to start billing your clients.
          </p>
          <Button asChild className="mt-4">
            <Link href="/invoices/new">New invoice</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Number</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Due</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((i) => (
                <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/invoices/${i.id}`} className="font-medium hover:underline">
                      #{i.number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{i.client.name}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(i.dueDate)}</td>
                  <td className="px-6 py-4 text-right tabular-nums">{money(i.totalCents, i.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}