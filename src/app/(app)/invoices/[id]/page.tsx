import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { money } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { canManageBilling } from "@/lib/auth/permissions";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getTenantContext();
  const [invoice, zoho] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: { client: true, lineItems: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.zohoConnection.findUnique({
      where: { tenantId: ctx.tenantId },
      select: { tenantId: true },
    }),
  ]);
  if (!invoice) notFound();

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Invoice</p>
          <h1 className="text-2xl font-semibold tracking-tight">#{invoice.number}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {invoice.client.name} · {invoice.status} · due{" "}
            {formatDate(invoice.dueDate)}
          </p>
          {invoice.zohoInvoiceId ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Linked Zoho invoice: {invoice.zohoInvoiceNumber ?? invoice.zohoInvoiceId}
            </p>
          ) : null}
          {invoice.publicToken ? (
            <a
              href={`/i/${invoice.publicToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Public link
            </a>
          ) : null}
        </div>
        <InvoiceActions
          id={invoice.id}
          status={invoice.status}
          totalCents={invoice.totalCents}
          amountPaidCents={invoice.amountPaidCents}
          currency={invoice.currency}
          zohoInvoiceId={invoice.zohoInvoiceId}
          zohoInvoiceNumber={invoice.zohoInvoiceNumber}
          zohoConnected={Boolean(zoho)}
          canManageBilling={canManageBilling(ctx.role)}
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium text-right">Qty</th>
              <th className="px-4 py-2 font-medium text-right">Rate</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="px-4 py-3">{l.description}</td>
                <td className="px-4 py-3 text-right">{l.quantity}</td>
                <td className="px-4 py-3 text-right">{money(l.unitPriceCents, invoice.currency)}</td>
                <td className="px-4 py-3 text-right">{money(l.amountCents, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border p-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex w-56 justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{money(invoice.subtotalCents, invoice.currency)}</span>
          </div>
          <div className="flex w-56 justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{money(invoice.taxCents, invoice.currency)}</span>
          </div>
          <div className="flex w-56 justify-between font-semibold border-t border-border pt-2 mt-1">
            <span>Total</span>
            <span>{money(invoice.totalCents, invoice.currency)}</span>
          </div>
          {invoice.amountPaidCents > 0 ? (
            <>
              <div className="flex w-56 justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span>− {money(invoice.amountPaidCents, invoice.currency)}</span>
              </div>
              {invoice.amountPaidCents < invoice.totalCents ? (
                <div className="flex w-56 justify-between font-medium">
                  <span className="text-muted-foreground">Outstanding</span>
                  <span>{money(invoice.totalCents - invoice.amountPaidCents, invoice.currency)}</span>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
