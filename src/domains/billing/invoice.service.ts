import { prisma } from "@/lib/db/prisma";
import { TenantContext } from "@/lib/tenancy/context";
import { ensureChartOfAccounts, postJournalEntry, SYSTEM_ACCOUNTS } from "@/domains/bookkeeping/ledger.service";
import { allocateTax } from "./tax";
import { sendInvoiceEmail } from "@/lib/email/resend";
import { renderInvoiceEmail } from "@/lib/email/templates/invoice";
import { tenantUrl } from "@/lib/auth/tenant-redirect";

/**
 * Computes totals deterministically from line items + tax rate.
 * Called whenever an invoice is created or edited.
 */
export function computeInvoiceTotals(
  lineItems: { unitPriceCents: number; quantity: number }[],
  taxRateBps: number
) {
  const amounts = lineItems.map((l) => ({ amountCents: l.unitPriceCents * l.quantity }));
  const alloc = allocateTax(amounts, taxRateBps);
  const subtotalCents = alloc.netCents;
  const taxCents = alloc.totalTaxCents;
  const totalCents = alloc.grossCents;
  return { subtotalCents, taxCents, totalCents, perLineTax: alloc.perLine };
}

export async function issueInvoice(ctx: TenantContext, invoiceId: string) {
  await ensureChartOfAccounts(ctx);

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId: ctx.tenantId },
      include: { lineItems: true, client: true, tenant: true }, // Added tenant: true
    });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be issued");

    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "SENT", sentAt: new Date() },
    });

    type JournalLineInput = {
      accountCode: string;
      debitCents?: number;
      creditCents?: number;
      memo?: string;
    };
    
    const lines: JournalLineInput[] = [
      { accountCode: SYSTEM_ACCOUNTS.AR.code, debitCents: invoice.totalCents },
      { accountCode: SYSTEM_ACCOUNTS.REVENUE.code, creditCents: invoice.subtotalCents },
    ];
   
    if (invoice.taxCents > 0) {
      lines.push({ accountCode: SYSTEM_ACCOUNTS.TAX_PAYABLE.code, creditCents: invoice.taxCents });
    }

    await postJournalEntry(ctx, {
      date: new Date(),
      description: `Invoice ${invoice.number} issued`,
      referenceType: "INVOICE",
      referenceId: invoice.id,
      lines,
    }, tx); // Added tx to ensure atomicity

    // Send email outside the transaction so a mail failure does not roll back
    // financial state. Failure is logged and the invoice is still SENT.
    try {
      // Use tenantUrl so the PDF link points to the subdomain, not localhost root
      const pdfUrl = tenantUrl(invoice.tenant.slug, `/api/invoices/${invoice.id}/pdf`);
      
      const { html, subject } = await renderInvoiceEmail({
        clientName: invoice.client.name,
        invoiceNumber: invoice.number,
        totalCents: invoice.totalCents,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        pdfUrl,
      });
      await sendInvoiceEmail({
        to: invoice.client.email ?? "",
        subject,
        html,
      });
    } catch (err) {
      // Log and continue. Surface via audit log or monitoring.
      console.error("Invoice email failed", err);
    }

    return updated;
  });
}