import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { hasRole } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { EditInvoiceForm } from "@/components/invoices/edit-invoice-form";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getTenantContext();

  const [invoice, clients] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        timeEntries: { select: { id: true }, take: 1 },
        client: { select: { taxRateBps: true } },
      },
    }),
    prisma.client.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, currency: true, taxRateBps: true },
    }),
  ]);

  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") redirect(`/invoices/${invoice.id}`);

  const canEdit = hasRole(ctx.role, Role.MANAGER);
  const derivedTaxRateBps =
    invoice.subtotalCents > 0
      ? Math.round((invoice.taxCents * 10000) / invoice.subtotalCents)
      : invoice.client.taxRateBps;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Invoice</p>
        <h1 className="text-2xl font-semibold tracking-tight">Edit #{invoice.number}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update draft details, line items, and tax before sending.
        </p>
      </div>

      {canEdit ? (
        <EditInvoiceForm
          invoice={{
            id: invoice.id,
            clientId: invoice.clientId,
            issueDate: invoice.issueDate.toISOString(),
            dueDate: invoice.dueDate.toISOString(),
            taxRateBps: derivedTaxRateBps,
            lockClient: invoice.timeEntries.length > 0,
            lineItems: invoice.lineItems.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitPriceCents: l.unitPriceCents,
            })),
          }}
          clients={clients}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Only managers can edit invoices.</p>
          <Button variant="outline" asChild>
            <Link href={`/invoices/${invoice.id}`}>Back to invoice</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
