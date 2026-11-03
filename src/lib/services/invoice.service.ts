import { InvoiceCounter } from '@/models/invoice-counter.model';

/**
 * Atomically reserves the next invoice number for a tenant.
 * First call returns 1. Concurrent calls return strictly-increasing unique
 * numbers (no read-then-write race).
 */
export async function allocateInvoiceNumber(tenantId: string): Promise<number> {
  const doc = await InvoiceCounter.findOneAndUpdate(
    { tenantId },
    { $inc: { nextNumber: 1 } },
    { upsert: true, returnDocument: 'after' },
  ).lean();

  if (!doc) {
    throw new Error('Failed to allocate invoice number');
  }

  return doc.nextNumber;
}