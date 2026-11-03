import mongoose, { Schema, type Model } from 'mongoose';
import { tenantPlugin } from '@/plugins/mongoose-tenant';

export interface JournalLine {
  accountId: string;
  debitCents: number;
  creditCents: number;
}

export interface JournalEntryDoc {
  tenantId: string;
  entryNumber: number;
  entryDate: Date;
  memo: string;
  status: 'draft' | 'posted' | 'reversed';
  sourceType: string; // 'invoice' | 'payment' | 'manual'
  sourceId?: string;
  postedAt?: Date;
  lines: JournalLine[];
  createdAt: Date;
  updatedAt: Date;
}

const JournalLineSchema = new Schema<JournalLine>(
  {
    accountId: { type: String, required: true },
    debitCents: { type: Number, required: true, min: 0, default: 0 },
    creditCents: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const JournalEntrySchema = new Schema<JournalEntryDoc>(
  {
    tenantId: { type: String, required: true, index: true },
    entryNumber: { type: Number, required: true },
    entryDate: { type: Date, required: true },
    memo: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'posted', 'reversed'], default: 'draft' },
    sourceType: { type: String, default: 'manual' },
    sourceId: { type: String },
    postedAt: { type: Date },
    lines: { type: [JournalLineSchema], default: [] },
  },
  { timestamps: true },
);

JournalEntrySchema.index({ tenantId: 1, entryNumber: 1 }, { unique: true });
JournalEntrySchema.plugin(tenantPlugin);

export const JournalEntry: Model<JournalEntryDoc> =
  (mongoose.models.JournalEntry as Model<JournalEntryDoc> | undefined) ??
  mongoose.model<JournalEntryDoc>('JournalEntry', JournalEntrySchema);
