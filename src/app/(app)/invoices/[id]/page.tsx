import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { money } from "@/lib/money";
import { formatDate } from "@/lib/date";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getTenantContext();
  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { client: true, lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) notFound();

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Invoice</p>
          <h1 className="text-2xl font-semibold tracking-tight">#{invoice.number}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {invoice.client.name} · {invoice.status} · due{" "}
            {formatDate(invoice.dueDate)}
          </p>
        </div>
        <InvoiceActions id={invoice.id} status={invoice.status} />
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-xs text-neutral-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium text-right">Qty</th>
              <th className="px-4 py-2 font-medium text-right">Rate</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((l) => (
              <tr key={l.id} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-4 py-3">{l.description}</td>
                <td className="px-4 py-3 text-right">{l.quantity}</td>
                <td className="px-4 py-3 text-right">{money(l.unitPriceCents, invoice.currency)}</td>
                <td className="px-4 py-3 text-right">{money(l.amountCents, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex w-56 justify-between">
            <span className="text-neutral-500">Subtotal</span>
            <span>{money(invoice.subtotalCents, invoice.currency)}</span>
          </div>
          <div className="flex w-56 justify-between">
            <span className="text-neutral-500">Tax</span>
            <span>{money(invoice.taxCents, invoice.currency)}</span>
          </div>
          <div className="flex w-56 justify-between font-semibold border-t border-neutral-200 dark:border-neutral-800 pt-2 mt-1">
            <span>Total</span>
            <span>{money(invoice.totalCents, invoice.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}