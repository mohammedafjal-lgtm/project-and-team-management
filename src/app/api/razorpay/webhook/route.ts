import crypto from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { WebhookEvent } from '@/models/webhook-event.model';

interface RazorpayWebhook {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        notes?: { tenant_id?: string };
      };
    };
  };
}

export async function POST(req: NextRequest) {
  await dbConnect();

  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const receivedBuf = Buffer.from(signature, 'hex');

  if (
    expectedBuf.length === 0 ||
    expectedBuf.length !== receivedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as RazorpayWebhook;
  const providerEventId = event.payload?.payment?.entity?.id ?? crypto.randomUUID();

  try {
    await WebhookEvent.create({ providerEventId, type: event.event });
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: number }).code === 11000
    ) {
      return NextResponse.json({ received: true });
    }
    throw err;
  }

  const tenantId = event.payload?.payment?.entity?.notes?.tenant_id;
  if (event.event === 'payment.captured' && tenantId) {
    // TODO: post balanced journal entry
  }

  return NextResponse.json({ received: true });
}