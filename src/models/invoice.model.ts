import mongoose, { Schema, type Model } from 'mongoose';
import { tenantPlugin } from '@/plugins/mongoose-tenant';

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
}

export interface InvoiceDoc {
  tenantId: string;
  invoiceNumber: number;
  clientName: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
  currency: string;
  lines: InvoiceLine[];
  totalCents: number;
  issuedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceLineSchema = new Schema<InvoiceLine>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitAmountCents: { type: Number, required: true, min: 0 },
    amountCents: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const InvoiceSchema = new Schema<InvoiceDoc>(
  {
    tenantId: { type: String, required: true, index: true },
    invoiceNumber: { type: Number, required: true },
    clientName: { type: String, required: true },
    status: { type: String, enum: ['draft', 'sent', 'paid', 'void'], default: 'draft' },
    currency: { type: String, default: 'INR' },
    lines: { type: [InvoiceLineSchema], default: [] },
    totalCents: { type: Number, required: true, min: 0 },
    issuedAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

InvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
InvoiceSchema.plugin(tenantPlugin);

export const Invoice: Model<InvoiceDoc> =
  (mongoose.models.Invoice as Model<InvoiceDoc> | undefined) ??
  mongoose.model<InvoiceDoc>('Invoice', InvoiceSchema);
