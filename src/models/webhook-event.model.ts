import mongoose, { Schema, type Model } from 'mongoose';

export type WebhookEventStatus = 'pending' | 'processed' | 'failed';

export interface WebhookEventDoc {
  providerEventId: string;
  type: string;
  status: WebhookEventStatus;
  attempts: number;
  processedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<WebhookEventDoc>(
  {
    providerEventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    processedAt: { type: Date },
    lastError: { type: String },
  },
  { timestamps: true },
);

export const WebhookEvent: Model<WebhookEventDoc> =
  (mongoose.models.WebhookEvent as Model<WebhookEventDoc> | undefined) ??
  mongoose.model<WebhookEventDoc>('WebhookEvent', WebhookEventSchema);
