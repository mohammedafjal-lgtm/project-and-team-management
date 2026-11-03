import { z } from 'zod';

// Client submits quantity + unit price. The server recomputes amountCents and
// totalCents — never trust a client-provided monetary total.
export const invoiceLineInputSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitAmountCents: z.number().int().nonnegative(),
});

export const createInvoiceSchema = z.object({
  clientName: z.string().min(1),
  lines: z.array(invoiceLineInputSchema).min(1),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;