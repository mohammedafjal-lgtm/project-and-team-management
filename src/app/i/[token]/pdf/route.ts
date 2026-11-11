import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db/prisma";
import { InvoicePdf } from "@/lib/pdf/invoice-pdf";
import { markInvoiceViewed } from "@/domains/billing/invoice.service";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      client: true,
      tenant: true,
    },
  });
  if (!invoice) return new NextResponse("Not found", { status: 404 });

  if (invoice.status === "SENT") {
    await markInvoiceViewed(invoice.id).catch(() => {});
  }

  const buffer = await renderToBuffer(
    InvoicePdf({
      data: {
        tenantName: invoice.tenant.name,
        clientName: invoice.client.name,
        clientEmail: invoice.client.email,
        clientAddress: invoice.client.billingAddress,
        number: invoice.number,
        status: invoice.status,
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
        amountPaidCents: invoice.amountPaidCents,
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