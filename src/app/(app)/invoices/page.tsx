import Link from "next/link";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/money";
import { Badge } from "@/components/ui/badge";

export default async function InvoicesPage() {
  const ctx = await getTenantContext();
  const invoices = await prisma.invoice.findMany({
    where: { tenantId: ctx.tenantId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-neutral-500 mt-1">{invoices.length} total</p>
      </div>
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
            {invoices.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-500">No invoices yet.</td></tr>
            ) : invoices.map((i) => (
              <tr key={i.id} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-4 py-3">
                  <Link href={`/invoices/${i.id}`} className="font-medium hover:underline">#{i.number}</Link>
                </td>
                <td className="px-4 py-3">{i.client.name}</td>
                <td className="px-4 py-3"><Badge variant="outline">{i.status}</Badge></td>
                <td className="px-4 py-3">{i.dueDate.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">{money(i.totalCents, i.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}