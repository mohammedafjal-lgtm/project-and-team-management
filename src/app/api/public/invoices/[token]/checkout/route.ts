import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { stripe, stripeConfigured } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!stripeConfigured()) {
    return NextResponse.json({ message: "Payments are not configured" }, { status: 503 });
  }
  const { token } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: { tenant: true },
  });
  if (!invoice) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (invoice.status === "VOID" || invoice.status === "DRAFT") {
    return NextResponse.json({ message: "Invoice is not payable" }, { status: 400 });
  }
  if (invoice.status === "PAID") {
    return NextResponse.json({ message: "Invoice is already paid" }, { status: 400 });
  }

  const outstanding = invoice.totalCents - invoice.amountPaidCents;
  if (outstanding <= 0) {
    return NextResponse.json({ message: "Nothing to pay" }, { status: 400 });
  }

  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").host;
  const proto =
    req.headers.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const base = `${proto}://${host}`;

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: invoice.currency.toLowerCase(),
          unit_amount: outstanding,
          product_data: {
            name: `Invoice ${invoice.number}`,
            description: `${invoice.tenant.name} — Invoice ${invoice.number}`,
          },
        },
      },
    ],
    success_url: `${base}/i/${token}?paid=1`,
    cancel_url: `${base}/i/${token}`,
    metadata: {
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
    },
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { stripeSessionId: session.id },
  });

  return NextResponse.json({ url: session.url });
}