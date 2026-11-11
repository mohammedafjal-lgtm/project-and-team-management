import { prisma } from "@/lib/db/prisma";
import { TenantContext } from "@/lib/tenancy/context";
import { ensureChartOfAccounts, postJournalEntry, reverseJournalEntry, SYSTEM_ACCOUNTS } from "@/domains/bookkeeping/ledger.service";
import { allocateTax } from "./tax";
import { sendInvoiceEmail } from "@/lib/email/resend";
import { renderInvoiceEmail } from "@/lib/email/templates/invoice";
import { tenantUrl } from "@/lib/auth/tenant-redirect";
import { generatePublicToken } from "./public-token";

export function computeInvoiceTotals(
  lineItems: { unitPriceCents: number; quantity: number }[],
  taxRateBps: number
) {
  const amounts = lineItems.map((l) => ({ amountCents: l.unitPriceCents * l.quantity }));
  const alloc = allocateTax(amounts, taxRateBps);
  return {
    subtotalCents: alloc.netCents,
    taxCents: alloc.totalTaxCents,
    totalCents: alloc.grossCents,
    perLineTax: alloc.perLine,
  };
}

export type CreateInvoiceInput = {
  clientId: string;
  issueDate: Date;
  dueDate: Date;
  lineItems: { description: string; quantity: number; unitPriceCents: number; amountCents?: number }[];
  taxRateBps: number;
  /** Optional: time entries to lock when this invoice is created. */
  lockTimeEntryIds?: string[];
};

/**
 * Creates a DRAFT invoice atomically:
 *  - increments Tenant.nextInvoiceSeq (no read-then-write race)
 *  - persists line items and pre-computed totals
 *  - optionally locks linked time entries
 */
export async function createInvoice(ctx: TenantContext, input: CreateInvoiceInput) {
  await ensureChartOfAccounts(ctx);

  // Amounts: use explicit amountCents when supplied (from-time), else unit*qty
  const computedLines = input.lineItems.map((l) => ({
    description: l.description,
    quantity: l.quantity,
    unitPriceCents: l.unitPriceCents,
    amountCents: l.amountCents ?? l.unitPriceCents * l.quantity,
  }));

  const subtotalCents = computedLines.reduce((s, l) => s + l.amountCents, 0);
  const taxAlloc = allocateTax(computedLines.map((l) => ({ amountCents: l.amountCents })), input.taxRateBps);
  const taxCents = taxAlloc.totalTaxCents;
  const totalCents = subtotalCents + taxCents;

  return prisma.$transaction(
    async (tx) => {
      const seq = await tx.tenant.update({
        where: { id: ctx.tenantId },
        data: { nextInvoiceSeq: { increment: 1 } },
        select: { nextInvoiceSeq: true },
      });
      // The value we just incremented to is seq.nextInvoiceSeq; the invoice being
      // created gets the *previous* number.
      const number = String(seq.nextInvoiceSeq - 1);

      const invoice = await tx.invoice.create({
        data: {
          tenantId: ctx.tenantId,
          clientId: input.clientId,
          number,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          subtotalCents,
          taxCents,
          totalCents,
          lineItems: {
            create: computedLines.map((l, i) => ({
              tenantId: ctx.tenantId,
              description: l.description,
              quantity: l.quantity,
              unitPriceCents: l.unitPriceCents,
              amountCents: l.amountCents,
              sortOrder: i,
            })),
          },
        },
      });

      if (input.lockTimeEntryIds?.length) {
        await tx.timeEntry.updateMany({
          where: {
            tenantId: ctx.tenantId,
            id: { in: input.lockTimeEntryIds },
            status: { in: ["DRAFT", "SUBMITTED", "APPROVED"] },
            invoiceId: null,
          },
          data: { status: "LOCKED", invoiceId: invoice.id },
        });
      }

      return invoice;
    },
    { isolationLevel: "Serializable" }
  );
}

export type UpdateInvoiceInput = {
  clientId: string;
  issueDate: Date;
  dueDate: Date;
  lineItems: { description: string; quantity: number; unitPriceCents: number; amountCents?: number }[];
  taxRateBps: number;
};

/**
 * Updates a DRAFT invoice: replaces line items and recomputes totals.
 * Client change is blocked when time entries are already locked to the invoice.
 */
export async function updateInvoice(ctx: TenantContext, invoiceId: string, input: UpdateInvoiceInput) {
  const computedLines = input.lineItems.map((l) => ({
    description: l.description,
    quantity: l.quantity,
    unitPriceCents: l.unitPriceCents,
    amountCents: l.amountCents ?? l.unitPriceCents * l.quantity,
  }));

  const subtotalCents = computedLines.reduce((s, l) => s + l.amountCents, 0);
  const taxAlloc = allocateTax(computedLines.map((l) => ({ amountCents: l.amountCents })), input.taxRateBps);
  const taxCents = taxAlloc.totalTaxCents;
  const totalCents = subtotalCents + taxCents;

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId: ctx.tenantId },
      include: { timeEntries: { select: { id: true }, take: 1 } },
    });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be edited");

    if (input.clientId !== invoice.clientId && invoice.timeEntries.length > 0) {
      throw new Error("Cannot change client on an invoice linked to time entries");
    }

    const client = await tx.client.findFirst({
      where: { id: input.clientId, tenantId: ctx.tenantId },
      select: { id: true, currency: true },
    });
    if (!client) throw new Error("Client not found");

    await tx.invoiceLineItem.deleteMany({
      where: { invoiceId: invoice.id, tenantId: ctx.tenantId },
    });

    return tx.invoice.update({
      where: { id: invoice.id },
      data: {
        clientId: client.id,
        currency: client.currency,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        subtotalCents,
        taxCents,
        totalCents,
        lineItems: {
          create: computedLines.map((l, i) => ({
            tenantId: ctx.tenantId,
            description: l.description,
            quantity: l.quantity,
            unitPriceCents: l.unitPriceCents,
            amountCents: l.amountCents,
            sortOrder: i,
          })),
        },
      },
      include: { lineItems: { orderBy: { sortOrder: "asc" } }, client: true },
    });
  });
}

/**
 * Issues a DRAFT invoice:
 *  1. In a transaction: set status=SENT, sentAt, generate publicToken, post revenue journal.
 *  2. After commit: send the email (failure does not roll back the invoice).
 */
export async function issueInvoice(ctx: TenantContext, invoiceId: string) {
  await ensureChartOfAccounts(ctx);

  const committed = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId: ctx.tenantId },
      include: { client: true, tenant: true, lineItems: true },
    });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be issued");

    const publicToken = invoice.publicToken ?? (await uniquePublicToken(tx));

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "SENT", sentAt: new Date(), publicToken },
    });

    const lines: { accountCode: string; debitCents?: number; creditCents?: number; memo?: string }[] = [
      { accountCode: SYSTEM_ACCOUNTS.AR.code, debitCents: invoice.totalCents },
      { accountCode: SYSTEM_ACCOUNTS.REVENUE.code, creditCents: invoice.subtotalCents },
    ];
    if (invoice.taxCents > 0) {
      lines.push({ accountCode: SYSTEM_ACCOUNTS.TAX_PAYABLE.code, creditCents: invoice.taxCents });
    }

    await postJournalEntry(
      ctx,
      {
        date: new Date(),
        description: `Invoice ${invoice.number} issued`,
        referenceType: "INVOICE",
        referenceId: invoice.id,
        lines,
      },
      tx
    );

    return { invoice, tenant: invoice.tenant, client: invoice.client, publicToken };
  });

  // Email AFTER commit.
  try {
    const pdfUrl = tenantUrl(committed.tenant.slug, `/i/${committed.publicToken}`);
    const { html, subject } = await renderInvoiceEmail({
      clientName: committed.client.name,
      invoiceNumber: committed.invoice.number,
      totalCents: committed.invoice.totalCents,
      currency: committed.invoice.currency,
      dueDate: committed.invoice.dueDate,
      pdfUrl,
    });
    if (committed.client.email) {
      await sendInvoiceEmail({ to: committed.client.email, subject, html });
    } else {
      console.warn(`[invoice] ${committed.invoice.number} has no client email; skipping send`);
    }
  } catch (err) {
    console.error("[invoice] email send failed", err);
  }

  return prisma.invoice.findUniqueOrThrow({ where: { id: committed.invoice.id } });
}

/**
 * Voids an invoice. Only allowed for DRAFT / SENT / VIEWED / PARTIALLY_PAID.
 * Reverses the revenue journal if the invoice had been issued, and unlocks
 * any locked time entries back to APPROVED.
 */
export async function voidInvoice(ctx: TenantContext, invoiceId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId: ctx.tenantId },
    });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "PAID") throw new Error("Cannot void a fully paid invoice");
    if (invoice.status === "VOID") throw new Error("Invoice already voided");

    if (invoice.status !== "DRAFT") {
      await reverseJournalEntry(
        ctx,
        { referenceType: "INVOICE", referenceId: invoice.id, reason: reason ?? `Invoice ${invoice.number} voided` },
        tx
      );
    }

    await tx.timeEntry.updateMany({
      where: { tenantId: ctx.tenantId, invoiceId: invoice.id, status: "LOCKED" },
      data: { status: "APPROVED", invoiceId: null },
    });

    return tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "VOID", voidedAt: new Date() },
    });
  });
}

/** Marks a SENT invoice as VIEWED (idempotent). */
export async function markInvoiceViewed(invoiceId: string) {
  await prisma.invoice.updateMany({
    where: { id: invoiceId, status: "SENT", viewedAt: null },
    data: { status: "VIEWED", viewedAt: new Date() },
  });
}

async function uniquePublicToken(tx: import("@prisma/client").Prisma.TransactionClient): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const t = generatePublicToken();
    const exists = await tx.invoice.findUnique({ where: { publicToken: t }, select: { id: true } });
    if (!exists) return t;
  }
  throw new Error("Could not generate a unique public token");
}