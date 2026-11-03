import mongoose, { Schema, type Model } from 'mongoose';

export interface InvoiceCounterDoc {
  tenantId: string;
  nextNumber: number;
}

const InvoiceCounterSchema = new Schema<InvoiceCounterDoc>({
  tenantId: { type: String, required: true, unique: true },
  // 0 so that $inc starts at 1 on first call. Do NOT use default: 1 —
  // combined with $inc that produces 2 on the first invoice.
  nextNumber: { type: Number, required: true, default: 0 },
});

export const InvoiceCounter: Model<InvoiceCounterDoc> =
  (mongoose.models.InvoiceCounter as Model<InvoiceCounterDoc> | undefined) ??
  mongoose.model<InvoiceCounterDoc>('InvoiceCounter', InvoiceCounterSchema);
