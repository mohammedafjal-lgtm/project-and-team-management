import mongoose, { Schema, type Model } from 'mongoose';

export interface WebhookEventDoc {
  providerEventId: string;
  type: string;
  processedAt: Date;
}

const WebhookEventSchema = new Schema<WebhookEventDoc>({
  providerEventId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  processedAt: { type: Date, default: Date.now },
});

export const WebhookEvent: Model<WebhookEventDoc> =
  (mongoose.models.WebhookEvent as Model<WebhookEventDoc> | undefined) ??
  mongoose.model<WebhookEventDoc>('WebhookEvent', WebhookEventSchema);