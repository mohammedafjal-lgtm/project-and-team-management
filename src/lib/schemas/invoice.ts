import { z } from 'zod';

export const invoiceLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitAmountCents: z.number().int().nonnegative(),
  amountCents: z.number().int().nonnegative(),
});

export const createInvoiceSchema = z.object({
  clientName: z.string().min(1),
  lines: z.array(invoiceLineSchema).min(1),
});