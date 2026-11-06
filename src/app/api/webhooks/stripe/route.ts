import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { applyPaymentToInvoice } from "@/domains/billing/payment.service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-08-27.basil" });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new NextResponse("Bad signature", { status: 400 });
  }

  // Durable idempotency: unique constraint on event ID.
  const existing = await prisma.processedStripeEvent.findUnique({ where: { id: event.id } });
  if (existing) return NextResponse.json({ received: true, duplicate: true });

  let tenantId: string | undefined;

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        tenantId = pi.metadata.tenantId;
        await applyPaymentToInvoice({
          tenantId: pi.metadata.tenantId,
          invoiceId: pi.metadata.invoiceId,
          amountCents: pi.amount_received,
          method: "STRIPE",
          reference: pi.id,
          idempotencyKey: pi.id,
        });
        break;
      }
    }

    await prisma.processedStripeEvent.create({
      data: { id: event.id, type: event.type, tenantId },
    });

    return NextResponse.json({ received: true });
  } catch {
    // Do not mark as processed so Stripe retries.
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}

export const runtime = "nodejs";