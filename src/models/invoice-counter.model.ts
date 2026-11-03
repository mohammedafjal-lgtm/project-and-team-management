import mongoose, { Schema, type Model } from 'mongoose';

export interface InvoiceCounterDoc {
  tenantId: string;
  nextNumber: number;
}

const InvoiceCounterSchema = new Schema<InvoiceCounterDoc>({
  tenantId: { type: String, required: true, unique: true },
  nextNumber: { type: Number, required: true, default: 1 },
});

export const InvoiceCounter: Model<InvoiceCounterDoc> =
  (mongoose.models.InvoiceCounter as Model<InvoiceCounterDoc> | undefined) ??
  mongoose.model<InvoiceCounterDoc>('InvoiceCounter', InvoiceCounterSchema);