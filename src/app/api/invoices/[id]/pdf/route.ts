import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireTenantContext } from "@/lib/tenancy/context";
import { prisma } from "@/lib/db/prisma";
import { InvoicePdf } from "@/lib/pdf/invoice-pdf";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { lineItems: { orderBy: { sortOrder: "asc" } }, client: true, tenant: true },
  });
  if (!invoice) return new NextResponse("Not found", { status: 404 });

  const buffer = await renderToBuffer(
    InvoicePdf({
      data: {
        tenantName: invoice.tenant.name,
        clientName: invoice.client.name,
        clientEmail: invoice.client.email,
        clientAddress: invoice.client.billingAddress,
        number: invoice.number,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
        lineItems: invoice.lineItems.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
          amountCents: l.amountCents,
        })),
        subtotalCents: invoice.subtotalCents,
        taxCents: invoice.taxCents,
        totalCents: invoice.totalCents,
      },
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoice.number}.pdf"`,
    },
  });
}