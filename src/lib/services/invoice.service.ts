import { type QueryFilter } from 'mongoose';
import { InvoiceCounter, type InvoiceCounterDoc } from '@/models/invoice-counter.model';

export async function allocateInvoiceNumber(tenantId: string): Promise<number> {
  const filter: QueryFilter<InvoiceCounterDoc> = { tenantId };

  const doc = await InvoiceCounter.findOneAndUpdate(
    filter,
    { $inc: { nextNumber: 1 } },
    { returnDocument: 'after', upsert: true },
  ).lean();

  return doc.nextNumber - 1;
}