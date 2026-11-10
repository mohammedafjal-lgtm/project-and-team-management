import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { applyPaymentToInvoice } from "@/domains/billing/payment.service";

const apiVersion = "2025-08-27.basil" as const;

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return new NextResponse("Stripe not configured", { status: 400 });
  }

  const stripe = new Stripe(secretKey, { apiVersion });
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return new NextResponse("Bad signature", { status: 400 });
  }

  const existing = await prisma.processedStripeEvent.findUnique({ where: { id: event.id } });
  if (existing) return NextResponse.json({ received: true, duplicate: true });

  let tenantId: string | undefined;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metaTenantId = session.metadata?.tenantId;
        const metaInvoiceId = session.metadata?.invoiceId;
        if (!metaTenantId || !metaInvoiceId) {
          console.warn(`[stripe] ${event.type} ${session.id} missing metadata; skipping`);
          break;
        }
        if (session.payment_status !== "paid") break;
        tenantId = metaTenantId;
        await applyPaymentToInvoice({
          tenantId: metaTenantId,
          invoiceId: metaInvoiceId,
          amountCents: session.amount_total ?? 0,
          method: "STRIPE",
          reference: session.payment_intent as string | undefined,
          idempotencyKey: `checkout:${session.id}`,
        });
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const metaTenantId = pi.metadata?.tenantId;
        const metaInvoiceId = pi.metadata?.invoiceId;
        if (!metaTenantId || !metaInvoiceId) {
          console.warn(`[stripe] ${event.type} ${pi.id} missing metadata; skipping`);
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