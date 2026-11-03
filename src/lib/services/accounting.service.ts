import { JournalEntry } from '@/models/journal-entry.model';
import { JournalCounter } from '@/models/journal-counter.model';

export interface JournalLineInput {
  accountId: string;
  debitCents: number;
  creditCents: number;
}

async function allocateEntryNumber(tenantId: string): Promise<number> {
  const doc = await JournalCounter.findOneAndUpdate(
    { tenantId },
    { $inc: { nextNumber: 1 } },
    { upsert: true, returnDocument: 'after' },
  ).lean();

  if (!doc) throw new Error('Failed to allocate journal entry number');
  return doc.nextNumber;
}

/**
 * Posts a balanced journal entry. Invariants:
 *   - Σdebits === Σcredits (in cents)
 *   - entryNumber is unique per tenant, allocated atomically
 *   - status is 'posted' with postedAt stamped on write
 */
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

  const entryNumber = await allocateEntryNumber(params.tenantId);

  return JournalEntry.create({
    ...params,
    entryNumber,
    status: 'posted',
    postedAt: new Date(),
  });
}