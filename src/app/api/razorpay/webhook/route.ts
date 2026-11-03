import crypto from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { Account } from '@/models/account.model';
import { WebhookEvent } from '@/models/webhook-event.model';
import { postJournalEntry } from '@/lib/services/accounting.service';
import { tenantStorage } from '@/lib/tenant/tenant-context';

interface RazorpayWebhook {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        amount?: number;
        currency?: string;
        notes?: { tenant_id?: string };
      };
    };
  };
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expectedHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expected = Buffer.from(expectedHex, 'hex');
  const received = Buffer.from(signature, 'hex');
  if (expected.length === 0 || expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

function deriveEventId(req: NextRequest, rawBody: string, event: RazorpayWebhook): string {
  const header = req.headers.get('x-razorpay-event-id');
  if (header) return header;

  const paymentId = event.payload?.payment?.entity?.id ?? 'unknown';
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 16);
  return `${event.event}:${paymentId}:${bodyHash}`;
}

async function postPaymentJournalEntry(
  event: RazorpayWebhook,
  tenantId: string,
): Promise<void> {
  const payment = event.payload?.payment?.entity;
  const amount = payment?.amount;
  if (typeof amount !== 'number' || amount <= 0) return;

  await tenantStorage.run({ tenantId }, async () => {
    const cash = await Account.findOne({ code: '1000' }).lean();
    const revenue = await Account.findOne({ code: '4000' }).lean();
    if (!cash || !revenue) {
      throw new Error(`System accounts missing for tenant ${tenantId}`);
    }

    await postJournalEntry({
      tenantId,
      entryDate: new Date(),
      memo: `Razorpay payment ${payment?.id ?? ''}`,
      sourceType: 'payment',
      sourceId: payment?.id,
      lines: [
        { accountId: String(cash._id), debitCents: amount, creditCents: 0 },
        { accountId: String(revenue._id), debitCents: 0, creditCents: amount },
      ],
    });
  });
}

export async function POST(req: NextRequest) {
  await dbConnect();

  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 },
    );
  }

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as RazorpayWebhook;
  const providerEventId = deriveEventId(req, rawBody, event);

  const existing = await WebhookEvent.findOne({ providerEventId }).lean();
  if (existing?.status === 'processed') {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await WebhookEvent.updateOne(
    { providerEventId },
    {
      $setOnInsert: { type: event.event, status: 'pending' },
      $inc: { attempts: 1 },
    },
    { upsert: true },
  );

  try {
    const tenantId = event.payload?.payment?.entity?.notes?.tenant_id;
    if (event.event === 'payment.captured' && tenantId) {
      await postPaymentJournalEntry(event, tenantId);
    }

    await WebhookEvent.updateOne(
      { providerEventId },
      {
        $set: { status: 'processed', processedAt: new Date() },
        $unset: { lastError: 1 },
      },
    );
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    await WebhookEvent.updateOne(
      { providerEventId },
      { $set: { status: 'failed', lastError: message } },
    );
    // 5xx so Razorpay retries. The WebhookEvent row is `failed`, so the
    // retry will re-run the handler instead of short-circuiting as duplicate.
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}