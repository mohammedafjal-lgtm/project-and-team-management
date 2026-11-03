import { NextResponse } from 'next/server';
import { withTenant } from '@/lib/tenant/with-tenant';
import { WRITE_ROLES } from '@/lib/tenant/roles';
import { Invoice } from '@/models/invoice.model';
import { createInvoiceSchema } from '@/lib/schemas/invoice';
import { allocateInvoiceNumber } from '@/lib/services/invoice.service';

export const GET = withTenant(async () => {
  const invoices = await Invoice.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(invoices);
});

export const POST = withTenant(
  async (req, ctx) => {
    const parsed = createInvoiceSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    // Recompute per-line amount and invoice total on the server.
    const lines = parsed.data.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitAmountCents: l.unitAmountCents,
      amountCents: Math.round(l.quantity * l.unitAmountCents),
    }));

    if (lines.some((l) => !Number.isInteger(l.amountCents) || l.amountCents < 0)) {
      return NextResponse.json({ error: 'Invalid line amount' }, { status: 400 });
    }

    const totalCents = lines.reduce((s, l) => s + l.amountCents, 0);
    const invoiceNumber = await allocateInvoiceNumber(ctx.tenantId);

    const invoice = await Invoice.create({
      tenantId: ctx.tenantId,
      invoiceNumber,
      clientName: parsed.data.clientName,
      currency: 'INR',
      lines,
      totalCents,
      status: 'draft',
    });

    return NextResponse.json(invoice.toObject(), { status: 201 });
  },
  { roles: WRITE_ROLES },
);