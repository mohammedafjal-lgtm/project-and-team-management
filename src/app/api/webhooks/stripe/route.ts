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

  const existing = await prisma.processedStripeEvent.findUnique({ where: { id: event.id } });
  if (existing) return NextResponse.json({ received: true, duplicate: true });

  let tenantId: string | undefined;

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const metaTenantId  = pi.metadata?.tenantId;
        const metaInvoiceId = pi.metadata?.invoiceId;

        // If the PaymentIntent is missing our metadata, we cannot apply it.
        // Record the event as processed so Stripe stops retrying — this is a
        // data bug on the creating side, not a transient failure.
        if (!metaTenantId || !metaInvoiceId) {
          console.warn(
            `[stripe] payment_intent.succeeded ${pi.id} missing tenantId/invoiceId metadata; skipping`
          );
          break;
        }

        tenantId = metaTenantId;
        await applyPaymentToInvoice({
          tenantId: metaTenantId,
          invoiceId: metaInvoiceId,
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
  } catch (err) {
    console.error("[stripe] handler failed", err);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}

export const runtime = "nodejs";