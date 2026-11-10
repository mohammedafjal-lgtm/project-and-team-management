import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/lib/tenancy/context";
import { postJournalEntry, SYSTEM_ACCOUNTS, ensureChartOfAccounts } from "@/domains/bookkeeping/ledger.service";

export async function applyPaymentToInvoice(input: {
  tenantId: string;
  invoiceId: string;
  amountCents: number;
  method: string;
  reference?: string;
  idempotencyKey?: string;
}) {
  if (input.idempotencyKey) {
    const existing = await prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;
  }

  const ctx: TenantContext = {
    tenantId: input.tenantId,
    userId: "system",
    role: Role.ADMIN,
    email: "system",
    tenantSlug: "",
  };

  await ensureChartOfAccounts(ctx);

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId, tenantId: input.tenantId },
    });
    if (!invoice) throw new Error("Invoice not found");

    const newPaid = invoice.amountPaidCents + input.amountCents;
    const newStatus = newPaid >= invoice.totalCents ? "PAID" : "PARTIALLY_PAID";

    const payment = await tx.payment.create({
      data: {
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        amountCents: input.amountCents,
        method: input.method,
        reference: input.reference,
        idempotencyKey: input.idempotencyKey,
      },
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaidCents: newPaid,
        status: newStatus,
        // Preserve an existing paidAt; set it only on the transition to PAID.
        paidAt: newStatus === "PAID" ? (invoice.paidAt ?? new Date()) : invoice.paidAt,
      },
    });

    await postJournalEntry(
      ctx,
      {
        date: new Date(),
        description: `Payment for invoice ${invoice.number}`,
        referenceType: "PAYMENT",
        referenceId: payment.id,
        lines: [
          { accountCode: SYSTEM_ACCOUNTS.CASH.code, debitCents: input.amountCents },
          { accountCode: SYSTEM_ACCOUNTS.AR.code,   creditCents: input.amountCents },
        ],
      },
      tx
    );

    return payment;
  });
}