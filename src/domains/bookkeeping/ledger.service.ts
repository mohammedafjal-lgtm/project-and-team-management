import { prisma } from "@/lib/db/prisma";
import { TenantContext } from "@/lib/tenancy/context";
import { AccountType } from "@prisma/client";

export const SYSTEM_ACCOUNTS = {
  CASH: { code: "1000", name: "Cash", type: AccountType.ASSET, normalBalance: "DEBIT" },
  AR: { code: "1100", name: "Accounts Receivable", type: AccountType.ASSET, normalBalance: "DEBIT" },
  TAX_PAYABLE: { code: "2100", name: "Tax Payable", type: AccountType.LIABILITY, normalBalance: "CREDIT" },
  REVENUE: { code: "4000", name: "Service Revenue", type: AccountType.REVENUE, normalBalance: "CREDIT" },
} as const;

/**
 * Ensures the tenant has the system chart of accounts.
 */
export async function ensureChartOfAccounts(ctx: TenantContext) {
  for (const account of Object.values(SYSTEM_ACCOUNTS)) {
    await prisma.ledgerAccount.upsert({
      where: { tenantId_code: { tenantId: ctx.tenantId, code: account.code } },
      update: {},
      create: {
        tenantId: ctx.tenantId,
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        isSystem: true,
      },
    });
  }
}

/**
 * Posts a balanced journal entry. Throws if debits !== credits.
 * This is the ONLY way ledger lines are created.
 */
export async function postJournalEntry(
  ctx: TenantContext,
  input: {
    date: Date;
    description: string;
    referenceType: string;
    referenceId: string;
    lines: { accountCode: string; debitCents?: number; creditCents?: number; memo?: string }[];
  }
) {
  const totalDebit = input.lines.reduce((sum, l) => sum + (l.debitCents ?? 0), 0);
  const totalCredit = input.lines.reduce((sum, l) => sum + (l.creditCents ?? 0), 0);

  if (totalDebit !== totalCredit) {
    throw new Error(`Unbalanced journal: debits ${totalDebit} !== credits ${totalCredit}`);
  }

  const accounts = await prisma.ledgerAccount.findMany({
    where: { tenantId: ctx.tenantId, code: { in: input.lines.map((l) => l.accountCode) } },
  });
  const accountMap = new Map(accounts.map((a) => [a.code, a.id]));

  return prisma.$transaction(async (tx) => {
    const journal = await tx.journalEntry.create({
      data: {
        tenantId: ctx.tenantId,
        date: input.date,
        description: input.description,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        status: "POSTED",
        createdBy: ctx.userId,
      },
    });

    for (const line of input.lines) {
      const accountId = accountMap.get(line.accountCode);
      if (!accountId) throw new Error(`Account ${line.accountCode} not found`);
      await tx.journalLine.create({
        data: {
          tenantId: ctx.tenantId,
          journalEntryId: journal.id,
          accountId,
          debitCents: line.debitCents ?? 0,
          creditCents: line.creditCents ?? 0,
          memo: line.memo,
        },
      });
    }

    return journal;
  });
}