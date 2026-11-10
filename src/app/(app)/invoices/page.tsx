import Link from "next/link";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";

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
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-neutral-500 mt-1">{invoices.length} total</p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">New invoice</Link>
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-12 text-center">
          <p className="font-medium">No invoices yet</p>
          <p className="text-sm text-neutral-500 mt-1">
            Create your first invoice to start billing your clients.
          </p>
          <Button asChild className="mt-4">
            <Link href="/invoices/new">New invoice</Link>
          </Button>
        </div>
      ) : (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-xs text-neutral-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${i.id}`} className="font-medium hover:underline">
                      #{i.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{i.client.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{i.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{formatDate(i.dueDate)}</td>
                  <td className="px-4 py-3 text-right">{money(i.totalCents, i.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}