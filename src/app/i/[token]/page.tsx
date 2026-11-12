import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { markInvoiceViewed } from "@/domains/billing/invoice.service";
import { money } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { PayButton } from "@/components/invoices/pay-button";

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const { paid } = await searchParams;

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      tenant: { select: { name: true } },
      client: { select: { name: true, email: true, billingAddress: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) notFound();

  if (invoice.status === "SENT") {
    await markInvoiceViewed(invoice.id).catch(() => {});
  }

  const outstanding = invoice.totalCents - invoice.amountPaidCents;
  const payable =
    invoice.status !== "VOID" &&
    invoice.status !== "DRAFT" &&
    invoice.status !== "PAID" &&
    outstanding > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-8 space-y-8">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{invoice.tenant.name}</p>
            <h1 className="text-2xl font-semibold tracking-tight mt-1">
              Invoice #{invoice.number}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {invoice.client.name} · Issued {formatDate(invoice.issueDate)} · Due{" "}
              {formatDate(invoice.dueDate)}
            </p>
          </div>
          {invoice.status === "VOID" ? (
            <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
              VOID
            </span>
          ) : invoice.status === "PAID" ? (
            <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
              PAID
            </span>
          ) : null}
        </header>

        {paid === "1" && invoice.status !== "PAID" ? (
          <div className="border border-border rounded-lg p-4 text-sm bg-card">
            Payment received — this page will update once the webhook confirms it.
          </div>
        ) : null}

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
                  <td className="px-4 py-3 text-right">
                    {money(l.unitPriceCents, invoice.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {money(l.amountCents, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border p-4 flex flex-col items-end gap-1 text-sm">
            <div className="flex w-64 justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{money(invoice.subtotalCents, invoice.currency)}</span>
            </div>
            <div className="flex w-64 justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{money(invoice.taxCents, invoice.currency)}</span>
            </div>
            <div className="flex w-64 justify-between font-semibold border-t border-border pt-2 mt-1">
              <span>Total</span>
              <span>{money(invoice.totalCents, invoice.currency)}</span>
            </div>
            {invoice.amountPaidCents > 0 && invoice.amountPaidCents < invoice.totalCents ? (
              <div className="flex w-64 justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span>− {money(invoice.amountPaidCents, invoice.currency)}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <a
            href={`/i/${token}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline underline-offset-4"
          >
            View PDF
          </a>
          {payable ? (
            <PayButton token={token} amountLabel={money(outstanding, invoice.currency)} />
          ) : null}
        </div>
      </div>
    </div>
  );
}