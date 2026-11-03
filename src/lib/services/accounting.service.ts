import { type QueryFilter } from 'mongoose';
import { JournalEntry, type JournalEntryDoc } from '@/models/journal-entry.model';

export interface JournalLineInput {
  accountId: string;
  debitCents: number;
  creditCents: number;
}

export async function postJournalEntry(params: {
  tenantId: string;
  entryDate: Date;
  memo: string;
  sourceType: string;
  sourceId?: string;
  lines: JournalLineInput[];
}) {
  const totalDebit = params.lines.reduce((s, l) => s + l.debitCents, 0);
  const totalCredit = params.lines.reduce((s, l) => s + l.creditCents, 0);

  if (totalDebit !== totalCredit) {
    throw new Error(
      `Unbalanced entry: debit ${String(totalDebit)} ≠ credit ${String(totalCredit)}`,
    );
  }

  const filter: QueryFilter<JournalEntryDoc> = { tenantId: params.tenantId };
  const last = await JournalEntry.findOne(filter).sort({ entryNumber: -1 }).lean();
  const entryNumber = (last?.entryNumber ?? 0) + 1;

  return JournalEntry.create({
    ...params,
    entryNumber,
    status: 'posted',
    postedAt: new Date(),
  });
}